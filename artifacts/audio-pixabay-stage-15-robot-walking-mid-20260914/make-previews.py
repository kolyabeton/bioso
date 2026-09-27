#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import math
import subprocess
import wave


ROOT = Path(__file__).resolve().parent
SOURCE_ROOT = ROOT.parent / "audio-pixabay-stage-14-robot-walking-20260914" / "originals"
RATE = 44100


def decode(source: str, target: Path) -> None:
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", str(SOURCE_ROOT / source), str(target)],
        check=True,
    )


def read_samples(path: Path, start: float, duration: float) -> list[int]:
    with wave.open(str(path), "rb") as wav:
        wav.setpos(min(wav.getnframes(), int(wav.getframerate() * start)))
        count = min(wav.getnframes() - wav.tell(), int(wav.getframerate() * duration))
        frames = wav.readframes(count)
    return [int.from_bytes(frames[index:index + 2], "little", signed=True) for index in range(0, len(frames), 2)]


def pitch_up(samples: list[int], ratio: float = 1.25) -> list[float]:
    output_length = max(1, int(len(samples) / ratio))
    result = []
    for index in range(output_length):
        position = index * ratio
        left = min(len(samples) - 1, int(position))
        right = min(len(samples) - 1, left + 1)
        blend = position - left
        result.append(samples[left] * (1 - blend) + samples[right] * blend)
    return result


def biquad(samples: list[float], kind: str, cutoff: float, q: float = 0.7071) -> list[float]:
    omega = 2 * math.pi * cutoff / RATE
    cosine = math.cos(omega)
    alpha = math.sin(omega) / (2 * q)
    if kind == "lowpass":
        b0, b1, b2 = (1 - cosine) / 2, 1 - cosine, (1 - cosine) / 2
    else:
        b0, b1, b2 = (1 + cosine) / 2, -(1 + cosine), (1 + cosine) / 2
    a0, a1, a2 = 1 + alpha, -2 * cosine, 1 - alpha
    b0, b1, b2, a1, a2 = (value / a0 for value in (b0, b1, b2, a1, a2))
    x1 = x2 = y1 = y2 = 0.0
    result = []
    for x0 in samples:
        y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        result.append(y0)
        x2, x1, y2, y1 = x1, x0, y1, y0
    return result


def mid_robot_step(samples: list[int]) -> list[int]:
    body = pitch_up(samples)
    body = biquad(body, "highpass", 110)
    body = biquad(body, "highpass", 110)
    body = biquad(body, "lowpass", 2600)
    body = biquad(body, "lowpass", 2600)
    return [round(math.tanh(sample / 32768 * 1.6) * 32767) for sample in body]


def normalize(samples: list[int], peak: float = 0.64) -> list[int]:
    current = max((abs(sample) for sample in samples), default=1)
    scale = peak * 32767 / current
    return [round(sample * scale) for sample in samples]


def write(target: str, samples: list[int], fade_ms: int = 12) -> None:
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


def preview(source: str, target: str, start: float) -> None:
    with TemporaryDirectory(prefix="bioso-stage-15-") as temp:
        decoded = Path(temp) / "source.wav"
        decode(source, decoded)
        write(target, normalize(mid_robot_step(read_samples(decoded, start, 0.36))))


(ROOT / "previews").mkdir(parents=True, exist_ok=True)
preview("big-robot.mp3", "walking-option-12-mid-piston", 0.63)
preview("heavy-mechanical.mp3", "walking-option-13-mid-servo", 0.05)
preview("robot-006.mp3", "walking-option-14-mid-armor", 1.14)
preview("robot-014.mp3", "walking-option-15-mid-mechanism", 0.55)
preview("robot-017.mp3", "walking-option-16-mid-compact", 0.51)
