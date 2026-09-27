#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import math
import subprocess
import wave


ROOT = Path(__file__).resolve().parent
RATE = 44100


def decode(source: str, target: Path) -> None:
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", str(ROOT / "originals" / source), str(target)],
        check=True,
    )


def read_samples(path: Path, start: float, duration: float) -> list[int]:
    with wave.open(str(path), "rb") as wav:
        wav.setpos(min(wav.getnframes(), int(wav.getframerate() * start)))
        count = min(wav.getnframes() - wav.tell(), int(wav.getframerate() * duration))
        frames = wav.readframes(count)
    return [int.from_bytes(frames[index:index + 2], "little", signed=True) for index in range(0, len(frames), 2)]


def biquad(samples: list[float], kind: str, cutoff: float, q: float = 0.7071) -> list[float]:
    omega = 2 * math.pi * cutoff / RATE
    cosine = math.cos(omega)
    alpha = math.sin(omega) / (2 * q)
    if kind == "lowpass":
        b0 = (1 - cosine) / 2
        b1 = 1 - cosine
        b2 = b0
    else:
        b0 = (1 + cosine) / 2
        b1 = -(1 + cosine)
        b2 = b0
    a0 = 1 + alpha
    a1 = -2 * cosine
    a2 = 1 - alpha
    b0, b1, b2, a1, a2 = (value / a0 for value in (b0, b1, b2, a1, a2))
    x1 = x2 = y1 = y2 = 0.0
    result = []
    for x0 in samples:
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        result.append(y0)
        x2, x1, y2, y1 = x1, x0, y1, y0
    return result


def soften_highs(samples: list[int]) -> list[int]:
    original = [float(sample) for sample in samples]
    body = biquad(original, "lowpass", 2200)
    body = biquad(body, "lowpass", 2200)
    return [round(low + (full - low) * 0.30) for full, low in zip(original, body)]


def audible_soft_step(samples: list[int]) -> list[int]:
    saturated = [math.tanh(sample / 32768 * 4) * 32767 for sample in samples]
    body = biquad(saturated, "highpass", 80)
    body = biquad(body, "highpass", 80)
    body = biquad(body, "lowpass", 1800)
    body = biquad(body, "lowpass", 1800)
    return [round(sample) for sample in body]


def normalize(samples: list[int], peak: float = 0.50) -> list[int]:
    current = max((abs(sample) for sample in samples), default=1)
    scale = peak * 32767 / current
    return [round(sample * scale) for sample in samples]


def write(target: str, samples: list[int], fade_ms: int = 16) -> None:
    fade = min(len(samples) // 2, int(RATE * fade_ms / 1000))
    frames = bytearray()
    for index, sample in enumerate(samples):
        gain = 1.0
        if index < fade:
            gain *= index / max(1, fade)
        if index >= len(samples) - fade:
            gain *= (len(samples) - index) / max(1, fade)
        value = max(-32768, min(32767, round(sample * gain)))
        frames.extend(value.to_bytes(2, "little", signed=True))
    with wave.open(str(ROOT / "previews" / f"{target}.wav"), "wb") as wav:
        wav.setparams((1, 2, RATE, 0, "NONE", "not compressed"))
        wav.writeframes(frames)


def preview(source: str, target: str, start: float, duration: float, process=soften_highs, peak: float = 0.50) -> None:
    with TemporaryDirectory(prefix="bioso-stage-13-") as temp:
        decoded = Path(temp) / "source.wav"
        decode(source, decoded)
        samples = read_samples(decoded, start, duration)
        write(target, normalize(process(samples), peak))


preview("walk-carpet.mp3", "walking-option-4-soft-carpet", 1.94, 0.52)
preview("soft-floor.mp3", "walking-option-5-soft-floor", 5.04, 0.36, audible_soft_step, 0.72)
preview("generic-footstep-2.mp3", "walking-option-6-neutral-foley", 0.0, 0.50)
