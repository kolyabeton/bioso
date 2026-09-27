#!/usr/bin/env python3
"""Build short audition previews from downloaded Pixabay field recordings."""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PREVIEWS = ROOT / "artifacts/audio-pixabay-candidates-20260914/previews"
RATE = 44_100


def read(name: str) -> list[float]:
    path = PREVIEWS / f"{name}-full.wav"
    with wave.open(str(path), "rb") as stream:
        if stream.getnchannels() != 1 or stream.getsampwidth() != 2 or stream.getframerate() != RATE:
            raise ValueError(f"Unexpected wave format: {path}")
        frames = stream.readframes(stream.getnframes())
    samples = struct.unpack(f"<{len(frames) // 2}h", frames)
    return [sample / 32768.0 for sample in samples]


def crop(samples: list[float], start: float, duration: float) -> list[float]:
    first = max(0, round(start * RATE))
    last = min(len(samples), first + round(duration * RATE))
    return samples[first:last]


def normalized(samples: list[float], peak: float) -> list[float]:
    current = max((abs(sample) for sample in samples), default=0.0)
    if current == 0:
        return samples
    gain = peak / current
    return [sample * gain for sample in samples]


def faded(samples: list[float], attack: float = 0.008, release: float = 0.035) -> list[float]:
    result = list(samples)
    attack_frames = min(len(result), round(attack * RATE))
    release_frames = min(len(result), round(release * RATE))
    for index in range(attack_frames):
        result[index] *= index / max(1, attack_frames - 1)
    for index in range(release_frames):
        result[-1 - index] *= index / max(1, release_frames - 1)
    return result


def pulse_train(samples: list[float], pulse: float = 0.028, gap: float = 0.017) -> list[float]:
    """Gate a field recording into a dry insect-like stridulation."""
    result = list(samples)
    pulse_frames = max(1, round(pulse * RATE))
    gap_frames = max(1, round(gap * RATE))
    period = pulse_frames + gap_frames
    edge = max(1, round(0.003 * RATE))
    for index in range(len(result)):
        phase = index % period
        if phase >= pulse_frames:
            result[index] = 0.0
        elif phase < edge:
            result[index] *= phase / edge
        elif phase >= pulse_frames - edge:
            result[index] *= (pulse_frames - phase) / edge
    return result


def mix(length: float, layers: list[tuple[float, list[float], float]]) -> list[float]:
    result = [0.0] * round(length * RATE)
    for offset, samples, gain in layers:
        first = round(offset * RATE)
        for index, sample in enumerate(samples):
            target = first + index
            if target >= len(result):
                break
            result[target] += sample * gain
    return [math.tanh(sample * 1.15) * 0.93 for sample in result]


def write(name: str, samples: list[float]) -> None:
    encoded = struct.pack(
        f"<{len(samples)}h",
        *(max(-32768, min(32767, round(sample * 32767))) for sample in samples),
    )
    with wave.open(str(PREVIEWS / name), "wb") as stream:
        stream.setnchannels(1)
        stream.setsampwidth(2)
        stream.setframerate(RATE)
        stream.writeframes(encoded)


wasp = faded(normalized(crop(read("wasp-wings-2"), 0.08, 0.82), 0.82), release=0.08)
chirp = faded(normalized(pulse_train(crop(read("wasp-wings-2"), 0.24, 0.46)), 0.62), release=0.04)
squelch = faded(normalized(crop(read("wet-squelch-impact"), 0.07, 0.58), 0.88), release=0.10)
washer = mix(1.18, [(0.0, wasp, 0.72), (0.18, chirp, 0.48), (0.40, squelch, 0.76)])
write("washer-pixabay-preview.wav", washer)

wings = faded(normalized(crop(read("wasp-wings-2"), 0.08, 0.22), 0.82), release=0.05)
click = faded(normalized(crop(read("insectoid-monster-clicking"), 0.60, 0.28), 0.82), release=0.04)
crunch = faded(normalized(crop(read("short-crunches"), 0.08, 0.52), 0.90), release=0.08)
drone = mix(0.82, [(0.0, wings, 0.62), (0.14, click, 0.74), (0.27, crunch, 0.78)])
write("drone-bite-pixabay-preview.wav", drone)
