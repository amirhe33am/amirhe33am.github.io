"""Dark cinematic music bed: drone + pulse + impact hits on every scene start (from src/timeline.json).
Usage: python3 scripts/make-cinematic-bed.py out.wav"""
import json, os, sys, wave
import numpy as np
SR = 44100
here = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(here, "..", "src", "timeline.json"), encoding="utf-8"))
secs = tl["duration"] + 1.0
N = int(SR * secs); t = np.arange(N) / SR
rng = np.random.default_rng(3)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
out = np.zeros(N)
# drone: D minor, slowly breathing, detuned
for m, g in [(38, 0.5), (45, 0.3), (50, 0.25), (53, 0.18), (57, 0.12)]:
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * (0.07 + m * 0.001) * t)
    out += (np.sin(2*np.pi*hz(m)*t) + 0.5*np.sin(2*np.pi*hz(m)*1.004*t)) * g * lfo * 0.25
# heartbeat-like sub pulse (70 bpm)
beat = 60 / 70
for k in range(int(secs / beat)):
    for off, g in [(0, 1.0), (0.22, 0.6)]:
        s = int((k * beat + off) * SR); n = min(N - s, int(0.35 * SR))
        if n <= 0: continue
        tt = np.arange(n) / SR
        f = 45 + 40 * np.exp(-tt * 30)
        out[s:s+n] += np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt * 10) * g * 0.55
# impacts + reverse swells at each scene start
for seg in tl["segments"]:
    s = int(max(0, seg["start"] - 0.25) * SR)
    n = min(N - s, int(2.5 * SR)); tt = np.arange(n) / SR
    f = 30 + 90 * np.exp(-tt * 12)
    boom = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-tt * 2.2)
    noise = rng.uniform(-1, 1, n); noise = np.convolve(noise, np.ones(30)/30, "same") * np.exp(-tt * 4)
    out[s:s+n] += boom * 1.1 + noise * 0.6
    ws = max(0, s - int(1.0 * SR)); wn = s - ws
    if wn > 0:
        wt = np.arange(wn) / SR
        sw = rng.uniform(-1, 1, wn); sw = np.convolve(sw, np.ones(12)/12, "same")
        out[ws:s] += sw * (wt / wt[-1]) ** 3 * 0.35
fade = np.clip(t / 1.0, 0, 1) * np.clip((secs - t) / 2.0, 0, 1)
out = np.tanh(out * fade * 0.9)
out /= np.max(np.abs(out)) * 1.1
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
