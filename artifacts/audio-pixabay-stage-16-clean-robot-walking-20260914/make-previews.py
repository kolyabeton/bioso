#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import math
import subprocess
import wave


ROOT = Path(__file__).resolve().parent
RATE = 44100
DURATION = 0.30


def decode(source: str, target: Path) -> None:
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", str(ROOT / "originals" / source), str(target)],
        check=True,
    )


def read_samples(path: Path, start: float, duration: float = DURATION) -> list[float]:
    with wave.open(str(path), "rb") as wav:
        wav.setpos(min(wav.getnframes(), int(wav.getframerate() * start)))
        count = min(wav.getnframes() - wav.tell(), int(wav.getframerate() * duration))
        frames = wav.readframes(count)
    result = [float(int.from_bytes(frames[index:index + 2], "little", signed=True)) for index in range(0, len(frames), 2)]
    return result + [0.0] * max(0, int(RATE * duration) - len(result))


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


def clean_gate(samples: list[float], threshold_ratio: float = 0.018) -> list[float]:
    peak = max((abs(sample) for sample in samples), default=1.0)
    threshold = peak * threshold_ratio
    attack = math.exp(-1 / (RATE * 0.002))
    release = math.exp(-1 / (RATE * 0.035))
    envelope = 0.0
    result = []
    for sample in samples:
        coefficient = attack if abs(sample) > envelope else release
        envelope = coefficient * envelope + (1 - coefficient) * abs(sample)
        gain = max(0.0, min(1.0, (envelope - threshold) / max(threshold * 1.5, 1.0)))
        gain = gain * gain * (3 - 2 * gain)
        result.append(sample * gain)
    return result


def clean_contact(samples: list[float]) -> list[float]:
    body = biquad(samples, "highpass", 90)
    low = biquad(body, "lowpass", 280)
    body = [full - low * 0.55 for full, low in zip(body, low)]
    body = biquad(body, "lowpass", 4800)
    body = biquad(body, "lowpass", 4800)
    return clean_gate(body)


def clean_mechanism(samples: list[float]) -> list[float]:
    body = biquad(samples, "highpass", 180)
    body = biquad(body, "lowpass", 4200)
    body = biquad(body, "lowpass", 4200)
    return clean_gate(body, 0.028)


def normalized(samples: list[float], peak: float) -> list[float]:
    current = max((abs(sample) for sample in samples), default=1.0)
    scale = peak * 32767 / current
    return [sample * scale for sample in samples]


def mix(contact: list[float], mechanism: list[float]) -> list[int]:
    contact = normalized(contact, 0.58)
    mechanism = normalized(mechanism, 0.14)
    mixed = [a + b for a, b in zip(contact, mechanism)]
    current = max((abs(sample) for sample in mixed), default=1.0)
    scale = min(1.0, 0.64 * 32767 / current)
    return [round(sample * scale) for sample in mixed]


def write(target: str, samples: list[int], fade_ms: int = 10) -> None:
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


def preview(contact_file: str, contact_start: float, mechanism_file: str, mechanism_start: float, target: str) -> None:
    with TemporaryDirectory(prefix="bioso-stage-16-") as temp:
        contact_wav, mechanism_wav = Path(temp) / "contact.wav", Path(temp) / "mechanism.wav"
        decode(contact_file, contact_wav)
        decode(mechanism_file, mechanism_wav)
        write(target, mix(clean_contact(read_samples(contact_wav, contact_start)), clean_mechanism(read_samples(mechanism_wav, mechanism_start))))


preview("st1.mp3", 0.0, "servo1.mp3", 14.54, "walking-option-17-clean-servo-a")
preview("st2.mp3", 0.0, "servo2.mp3", 0.72, "walking-option-18-clean-servo-b")
preview("st3.mp3", 0.0, "robot-mech-014.mp3", 0.36, "walking-option-19-clean-mechanism")
preview("generic2.mp3", 0.0, "servo1.mp3", 7.12, "walking-option-20-clean-light-robot")
preview("footstep-clean.mp3", 0.29, "servo2.mp3", 1.06, "walking-option-21-clean-solid-robot")
