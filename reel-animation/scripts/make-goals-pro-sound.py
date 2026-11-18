"""Sound design for GoalsPro, all generated in code:
voice + soft music bed ducked under the voice + whooshes on every transformation + soft thumps on impacts.
Usage: python3 scripts/make-goals-pro-sound.py <voice.wav (48k mono)> <out.wav>"""
import json, os, sys
import numpy as np
import soundfile as sf

SR = 48000
here = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(here, "..", "src", "timeline-goals.json"), encoding="utf-8"))
P = tl["phrases"]
key = lambda i: next((w["t"] for w in P[i]["words"] if w["key"]), P[i]["start"])
voice, sr = sf.read(sys.argv[1], dtype="float32")
if voice.ndim > 1: voice = voice.mean(axis=1)
assert sr == SR
N = int(tl["duration"] * SR) + SR // 2
t = np.arange(N) / SR
v = np.zeros(N, dtype=np.float32); v[: len(voice)] = voice[:N]
rng = np.random.default_rng(11)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

# --- music bed: warm pads + soft pulse, A minor, 100 bpm
music = np.zeros(N)
beat = 60 / 100
prog = [(57, 60, 64, 69), (53, 57, 60, 65), (48, 52, 55, 60), (55, 59, 62, 67)]
bar = 4 * beat
for b in range(int(tl["duration"] / bar) + 1):
    s, e = int(b * bar * SR), min(N, int((b + 1) * bar * SR + 0.8 * SR))
    if s >= N: break
    tt = t[: e - s]
    env = np.clip(tt / 0.5, 0, 1) * np.clip((bar + 0.8 - tt) / 0.8, 0, 1)
    for m in prog[b % 4]:
        music[s:e] += (np.sin(2 * np.pi * hz(m) * tt) + 0.25 * np.sin(2 * np.pi * hz(m) * 2.002 * tt)) * env * 0.06
    root = prog[b % 4][0] - 24
    for k in range(4):
        ps = s + int(k * beat * SR); pe = min(N, ps + int(0.5 * SR))
        if ps >= N: break
        pt = t[: pe - ps]
        music[ps:pe] += np.sin(2 * np.pi * hz(root) * pt) * np.exp(-pt * 6) * 0.22
# sidechain duck from the voice envelope
win = int(0.05 * SR)
env = np.sqrt(np.convolve(v ** 2, np.ones(win) / win, mode="same"))
env = env / (env.max() + 1e-9)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
sm = np.zeros(N); acc = 0.0
for i in range(0, N, 32):  # coarse smoothing for speed
    x = env[i]
    c = att if x > acc else rel ** 32
    acc = x + (acc - x) * (att ** 32 if x > acc else rel ** 32 / rel ** 31 if False else c)
    sm[i:i + 32] = acc
duck = 1 - 0.75 * np.clip(sm * 3, 0, 1)
music *= duck * 0.55
fade = np.clip(t / 0.8, 0, 1) * np.clip((tl["duration"] - t) / 1.2, 0, 1)
music *= fade

# --- whoosh: band-passed noise with a rising then falling sweep
def whoosh(at, dur=0.45, gain=0.22):
    n = int(dur * SR); s = int((at - dur * 0.6) * SR)
    if s < 0 or s + n > N: return
    noise = rng.standard_normal(n)
    out = np.zeros(n); y1 = y2 = 0.0
    for i in range(n):
        f = 300 + 3500 * np.sin(np.pi * i / n) ** 2
        a = np.exp(-2 * np.pi * f / SR)
        y1 = (1 - a) * noise[i] + a * y1
        y2 = (1 - a) * y1 + a * y2
        out[i] = y1 - y2
    e = np.sin(np.pi * np.arange(n) / n) ** 2
    out = out * e / (np.abs(out).max() + 1e-9)
    sfx[s:s + n] += out * gain

def thump(at, gain=0.5, f0=70):
    n = int(0.5 * SR); s = int(at * SR)
    if s + n > N: n = N - s
    tt = np.arange(n) / SR
    f = f0 + 90 * np.exp(-tt * 40)
    sfx[s:s + n] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * gain

def tick(at, gain=0.12):
    n = int(0.08 * SR); s = int(at * SR)
    tt = np.arange(n) / SR
    sfx[s:s + n] += np.sin(2 * np.pi * 1800 * tt) * np.exp(-tt * 60) * gain

sfx = np.zeros(N)
thump(0.75, 0.6)                                   # dot lands
for a in [2.2, 4.2, 7.1, 10.0, 12.5, 15.9, 19.6, 21.6, 27.2, 30.3, 33.7, 36.0, 39.6, 41.1]:
    whoosh(a)                                      # every transformation / camera move
for i in [2, 3, 4, 5]:
    tick(P[1]["words"][i]["t"])                    # bits of the goal given away
crush = key(8) + 0.22
thump(crush + np.sqrt(2 * 514 / 3000), 0.55)       # dream hits the ground
thump(key(9), 0.35, 90)                            # flag 2
thump(34.2, 0.35, 90)                              # goal into the chest

SFX_DB = -7.5  # sound effects were too sharp: 7–8 dB quieter
mix = v * 1.0 + music + sfx * 10 ** (SFX_DB / 20)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix *= 0.93 / np.abs(mix).max()
sf.write(sys.argv[2], np.stack([mix, mix], axis=1).astype(np.float32), SR, subtype="PCM_16")
print("ok", len(mix) / SR)
