"""Voiceover for the kinetic-typography reel: one TTS call per phrase so the
on-screen words can be timed exactly.

Usage: python3 scripts/make-voiceover-kinetic.py <piper-model-dir> <out-wav>
Writes <out-wav> and src/timeline-kinetic.json.
"""
import json, os, sys
import numpy as np
import sherpa_onnx
import soundfile as sf

model_dir, out_wav = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
script = json.load(open(os.path.join(here, "script-kinetic.json"), encoding="utf-8"))
onnx = [f for f in os.listdir(model_dir) if f.endswith(".onnx")][0]
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    vits=sherpa_onnx.OfflineTtsVitsModelConfig(
        model=os.path.join(model_dir, onnx), lexicon="", tokens=os.path.join(model_dir, "tokens.txt"),
        data_dir=os.path.join(model_dir, "espeak-ng-data")),
    num_threads=4)))
SR = tts.sample_rate

def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(0, idx[0] - 400): idx[-1] + 1200] if len(idx) else a

LEAD, PHRASE_GAP, SCENE_GAP = 0.5, 0.12, 0.45
pieces, t = [np.zeros(int(LEAD * SR), dtype=np.float32)], LEAD
for scene in script["scenes"]:
    for i, ph in enumerate(scene["phrases"]):
        a = trim(np.array(tts.generate(ph["text"], sid=0, speed=1.12).samples, dtype=np.float32))
        dur = len(a) / SR
        ph["start"], ph["end"] = round(t, 3), round(t + dur, 3)
        gap = PHRASE_GAP if i < len(scene["phrases"]) - 1 else SCENE_GAP
        pieces += [a, np.zeros(int(gap * SR), dtype=np.float32)]
        t += dur + gap
    scene["start"], scene["end"] = scene["phrases"][0]["start"], scene["phrases"][-1]["end"]
script["duration"] = round(t + 1.2, 3)
sf.write(out_wav, np.concatenate(pieces), SR)
json.dump(script, open(os.path.join(here, "..", "src", "timeline-kinetic.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("total", script["duration"])
