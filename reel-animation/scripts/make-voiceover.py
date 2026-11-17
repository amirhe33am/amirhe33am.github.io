"""Turn scripts/script.json into a Persian voiceover + timing file.

Usage: python3 scripts/make-voiceover.py <piper-model-dir> <out-dir>
Writes <out-dir>/voice.wav and src/timeline.json (segment start/end in seconds).
"""
import json, os, sys
import numpy as np
import sherpa_onnx
import soundfile as sf

model_dir, out_dir = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
script = json.load(open(os.path.join(here, "script.json"), encoding="utf-8"))
onnx = [f for f in os.listdir(model_dir) if f.endswith(".onnx")][0]
tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
    vits=sherpa_onnx.OfflineTtsVitsModelConfig(
        model=os.path.join(model_dir, onnx), lexicon="", tokens=os.path.join(model_dir, "tokens.txt"),
        data_dir=os.path.join(model_dir, "espeak-ng-data"), length_scale=1.0),
    num_threads=4)))

LEAD, GAP = 0.3, 0.35
pieces, timeline, t = [np.zeros(int(LEAD * tts.sample_rate))], [], LEAD
for seg in script["segments"]:
    audio = tts.generate(seg["text"], sid=0, speed=1.15)
    a = np.array(audio.samples, dtype=np.float32)
    dur = len(a) / audio.sample_rate
    timeline.append({**seg, "start": round(t, 3), "end": round(t + dur, 3)})
    pieces += [a, np.zeros(int(GAP * audio.sample_rate))]
    t += dur + GAP
sf.write(os.path.join(out_dir, "voice.wav"), np.concatenate(pieces), tts.sample_rate)
json.dump({"title": script["title"], "duration": round(t + 0.6, 3), "segments": timeline},
          open(os.path.join(here, "..", "src", "timeline.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print("total", round(t, 2), "s")
for s in timeline: print(s["id"], s["start"], s["end"])
