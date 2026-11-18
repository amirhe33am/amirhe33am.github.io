"""Give every word of a hand-checked transcript a start time, by spreading the
words over the *voiced* parts of each phrase (proportional to word length).

Usage: python3 scripts/align-words.py <voice.wav> scripts/script-goals.json src/timeline-goals.json
"""
import json, sys
import numpy as np
import soundfile as sf

wav, script_path, out_path = sys.argv[1:4]
a, sr = sf.read(wav, dtype="float32")
if a.ndim > 1: a = a.mean(axis=1)
hop = int(sr * 0.01)
rms = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
voiced = rms > rms.max() * 10 ** (-32 / 20)

data = json.load(open(script_path, encoding="utf-8"))
for ph in data["phrases"]:
    i0, i1 = int(ph["start"] * 100), int(ph["end"] * 100)
    v = voiced[i0:i1].astype(float) + 0.05  # small weight for unvoiced frames
    cum = np.concatenate([[0], np.cumsum(v)]); cum /= cum[-1]
    words = ph["text"].split(" ")
    w = np.array([len(x) + 1.5 for x in words]); frac = np.concatenate([[0], np.cumsum(w)[:-1]]) / w.sum()
    ph["words"] = []
    for word, f in zip(words, frac):
        idx = int(np.searchsorted(cum, f))
        clean = word.strip(".,،")
        ph["words"].append({"w": word, "t": round(ph["start"] + idx / 100, 3), "key": clean in ph["keys"]})
data["duration"] = round(len(a) / sr + 2.6, 2)  # + outro card
json.dump(data, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok", data["duration"])
