"""Synthesise the pack-reveal chimes: assets/sounds/reveal-<rarity>.wav.

Original sounds made from sine partials with simple envelopes (no samples, no
third-party audio). Each rarity is one step richer than the last:
  common     soft paper tick
  uncommon   two-note pluck
  rare       three-note bell
  epic       four-note arpeggio with a shimmer
  legendary  arpeggio into a held major chord with sparkles

Run: python scripts/audio/make-chimes.py   (stdlib only; keep this file ASCII)
"""

import math
import os
import random
import struct
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "sounds")

C5, E5, G5, A5, C6, E6, G4 = 523.25, 659.25, 783.99, 880.0, 1046.5, 1318.5, 392.0


def buffer(seconds):
    return [0.0] * int(RATE * seconds)


def add_tone(buf, start, freq, amp, decay, partials=((1.0, 1.0),), attack=0.004):
    """A struck tone: fast attack, exponential decay. partials = (ratio, gain)."""
    s0 = int(start * RATE)
    length = int(min(len(buf) - s0, RATE * decay * 6))
    for n in range(max(0, length)):
        t = n / RATE
        env = min(1.0, t / attack) * math.exp(-t / decay)
        v = 0.0
        for ratio, gain in partials:
            v += gain * math.sin(2 * math.pi * freq * ratio * t)
        buf[s0 + n] += amp * env * v


def add_swell(buf, start, freq, amp, rise, hold, fall):
    """A held tone that swells in and fades out (the legendary chord)."""
    s0 = int(start * RATE)
    total = rise + hold + fall
    for n in range(int(min(len(buf) - s0, RATE * total))):
        t = n / RATE
        if t < rise:
            env = math.sin(0.5 * math.pi * t / rise)
        elif t < rise + hold:
            env = 1.0
        else:
            env = math.cos(0.5 * math.pi * (t - rise - hold) / fall)
        # A slow, gentle vibrato keeps the chord alive.
        vib = 1 + 0.002 * math.sin(2 * math.pi * 5 * t)
        v = math.sin(2 * math.pi * freq * vib * t) + 0.25 * math.sin(4 * math.pi * freq * t)
        buf[s0 + n] += amp * env * v


def add_noise(buf, start, amp, decay, seed):
    """A soft, lowpassed noise burst (paper)."""
    rnd = random.Random(seed)
    s0 = int(start * RATE)
    prev = 0.0
    for n in range(int(min(len(buf) - s0, RATE * decay * 6))):
        t = n / RATE
        prev = prev * 0.6 + (rnd.random() * 2 - 1) * 0.4
        buf[s0 + n] += amp * math.exp(-t / decay) * prev


def add_sparkles(buf, start, span, count, amp, seed):
    rnd = random.Random(seed)
    for _ in range(count):
        at = start + rnd.random() * span
        f = 2200 + rnd.random() * 2200
        add_tone(buf, at, f, amp * (0.5 + rnd.random() * 0.5), 0.05)


BELL = ((1.0, 1.0), (2.0, 0.35), (3.01, 0.12), (4.2, 0.05))
PLUCK = ((1.0, 1.0), (2.0, 0.2))


def common():
    b = buffer(0.25)
    add_noise(b, 0.0, 0.5, 0.018, seed=1)
    add_tone(b, 0.004, 1320, 0.25, 0.035)
    return b


def uncommon():
    b = buffer(0.7)
    add_tone(b, 0.0, E5, 0.6, 0.16, PLUCK)
    add_tone(b, 0.09, A5, 0.6, 0.2, PLUCK)
    return b


def rare():
    b = buffer(1.1)
    for i, f in enumerate((C5, E5, G5)):
        add_tone(b, i * 0.08, f, 0.5, 0.28, BELL)
    return b


def epic():
    b = buffer(1.4)
    for i, f in enumerate((C5, E5, G5, C6)):
        add_tone(b, i * 0.065, f, 0.45, 0.32, BELL)
    add_sparkles(b, 0.2, 0.7, 10, 0.12, seed=4)
    return b


def legendary():
    b = buffer(1.9)
    for i, f in enumerate((G4, C5, E5, G5, C6)):
        add_tone(b, i * 0.055, f, 0.42, 0.3, BELL)
    for f in (C5, E5, G5, C6):
        add_swell(b, 0.25, f, 0.13, rise=0.25, hold=0.55, fall=0.75)
    add_tone(b, 0.3, E6, 0.18, 0.5, BELL)
    add_sparkles(b, 0.3, 1.1, 22, 0.1, seed=5)
    return b


# Peak level per file: commons stay quiet, the legendary is the loudest.
SOUNDS = {
    "common": (common, 0.35),
    "uncommon": (uncommon, 0.55),
    "rare": (rare, 0.7),
    "epic": (epic, 0.8),
    "legendary": (legendary, 0.9),
}


def write(name, samples, peak):
    top = max(1e-9, max(abs(v) for v in samples))
    # 3 ms fade-out so no file ends in a click.
    fade = int(RATE * 0.003)
    for i in range(fade):
        samples[-1 - i] *= i / fade
    frames = b"".join(struct.pack("<h", int(max(-1, min(1, v / top * peak)) * 32767)) for v in samples)
    path = os.path.join(OUT, "reveal-%s.wav" % name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(frames)
    print("%s  %d bytes" % (os.path.normpath(path), os.path.getsize(path)))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for name, (make, peak) in SOUNDS.items():
        write(name, make(), peak)
