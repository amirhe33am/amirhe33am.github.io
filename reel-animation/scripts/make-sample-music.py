"""Synthesise a 30 s sample track (drums + bass + chords + melody) as a WAV file.

Usage: python3 scripts/make-sample-music.py out.wav
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 112
BEAT = 60 / BPM
BARS = 14  # 14 bars * 4 beats @112bpm = 30 s
DUR = BARS * 4 * BEAT
N = int(SR * DUR) + SR
rng = np.random.default_rng(7)
mix = np.zeros(N)


def note_hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def add(sig, start_s, gain=1.0):
    i = int(start_s * SR)
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i] * gain


def env(n, attack=0.005, release=0.1):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    r = np.clip((n / SR - t) / release, 0, 1)
    return a * r


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 50 + 110 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare():
    t = np.arange(int(0.25 * SR)) / SR
    noise = rng.uniform(-1, 1, len(t)) * np.exp(-t * 18)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25)
    return noise * 0.7 + tone * 0.5


def hat(open_=False):
    t = np.arange(int((0.18 if open_ else 0.05) * SR)) / SR
    n = rng.uniform(-1, 1, len(t))
    n = np.diff(n, prepend=0)  # crude high-pass
    return n * np.exp(-t * (14 if open_ else 70))


def saw(hz, dur, bright=1.0):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for k in range(1, 9):
        out += np.sin(2 * np.pi * hz * k * t) / k * (bright ** (k - 1))
    return out


# chord progression (Am - F - C - G), one chord per bar
prog = [(57, 60, 64), (53, 57, 60), (48, 52, 55), (55, 59, 62)]
bass_roots = [45, 41, 36, 43]
melody = [76, 74, 72, 74, 76, 79, 76, 74, 72, 69, 72, 74, 76, 74, 72, 71]

K, S, H = kick(), snare(), hat()
for bar in range(BARS):
    t0 = bar * 4 * BEAT
    chord = prog[bar % 4]
    intro = bar < 2
    outro = bar >= BARS - 1
    # pads
    for m in chord:
        pad = saw(note_hz(m), 4 * BEAT, 0.45) * env(int(4 * BEAT * SR), 0.3, 0.6)
        add(pad, t0, 0.05)
    if intro:
        for b in range(4):
            add(H, t0 + b * BEAT, 0.15)
        if bar == 1:
            for s in range(8):  # snare build-up
                add(S, t0 + 2 * BEAT + s * BEAT / 4, 0.12 + s * 0.04)
        continue
    # drums
    for b in range(4):
        add(K, t0 + b * BEAT, 0.9)
        if b in (1, 3):
            add(S, t0 + b * BEAT, 0.45)
        for h in range(2):
            add(hat(open_=h == 1 and b == 3), t0 + b * BEAT + h * BEAT / 2, 0.2)
    if bar % 4 == 3:
        add(K, t0 + 3.5 * BEAT, 0.7)
    # bass (8th notes, octave jumps)
    root = bass_roots[bar % 4]
    for e in range(8):
        m = root + (12 if e % 4 == 3 else 0)
        b = saw(note_hz(m), BEAT / 2 * 0.9, 0.3) * env(int(BEAT / 2 * 0.9 * SR), 0.004, 0.05)
        add(b, t0 + e * BEAT / 2, 0.22)
    # melody from bar 6 on
    if bar >= 6 and not outro:
        for i in range(4):
            m = melody[((bar - 6) * 4 + i) % len(melody)]
            n = int(BEAT * 0.95 * SR)
            tt = np.arange(n) / SR
            lead = np.sin(2 * np.pi * note_hz(m) * tt + 0.4 * np.sin(2 * np.pi * 5.5 * tt))
            lead += 0.3 * np.sin(2 * np.pi * note_hz(m) * 2 * tt)
            add(lead * env(n, 0.01, 0.15), t0 + i * BEAT, 0.16)

# final hit
add(K, DUR - BEAT, 1.0)
add(S, DUR - BEAT, 0.5)

mix = mix[: int((DUR + 0.5) * SR)]
mix = np.tanh(mix * 1.2)
mix /= np.max(np.abs(mix)) * 1.05
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else "sample.wav", "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
