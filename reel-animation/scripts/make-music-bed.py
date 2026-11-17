"""Soft background music bed (pads + light pulse), no copyright. Usage: python3 make-music-bed.py out.wav seconds"""
import sys, wave
import numpy as np
SR, secs = 44100, float(sys.argv[2])
N = int(SR * secs); t = np.arange(N) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
prog = [(57, 64, 72), (53, 60, 69), (48, 55, 64), (55, 62, 71)]
bar = 60 / 90 * 4
out = np.zeros(N)
for i in range(int(secs / bar) + 1):
    s, e = int(i * bar * SR), min(N, int((i + 1) * bar * SR + SR))
    tt = t[: e - s]
    env = np.clip(tt / 0.8, 0, 1) * np.clip((bar + 1 - tt) / 1.0, 0, 1)
    for m in prog[i % 4]:
        out[s:e] += (np.sin(2*np.pi*hz(m)*tt) + 0.3*np.sin(2*np.pi*hz(m)*2.003*tt)) * env * 0.12
    for b in range(8):  # soft plucks
        ps = min(N, s + int(b * bar / 8 * SR)); pe = min(N, ps + int(0.4 * SR)); pt = t[: pe - ps]
        m = prog[i % 4][b % 3] + 12
        out[ps:pe] += np.sin(2*np.pi*hz(m)*pt) * np.exp(-pt*9) * 0.08
fade = np.clip(t / 1.5, 0, 1) * np.clip((secs - t) / 2, 0, 1)
out = out * fade / np.max(np.abs(out)) * 0.8
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32767).astype(np.int16).tobytes())
