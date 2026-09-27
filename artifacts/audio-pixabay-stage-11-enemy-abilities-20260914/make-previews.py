#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
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
        start_frame = min(wav.getnframes(), int(wav.getframerate() * start))
        wav.setpos(start_frame)
        count = min(wav.getnframes() - start_frame, int(wav.getframerate() * duration))
        frames = wav.readframes(count)
    return [int.from_bytes(frames[i:i + 2], "little", signed=True) for i in range(0, len(frames), 2)]


def normalize(samples: list[int], peak: float, max_boost: float = 4.0) -> list[int]:
    current = max((abs(sample) for sample in samples), default=1)
    scale = min(max_boost, peak * 32767 / current)
    return [round(sample * scale) for sample in samples]


def write(target: str, samples: list[int], fade_ms: int) -> None:
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


def preview(source: str, target: str, start: float, duration: float, peak: float, fade_ms: int = 20) -> None:
    with TemporaryDirectory(prefix="bioso-stage-11-") as temp:
        decoded = Path(temp) / "source.wav"
        decode(source, decoded)
        write(target, normalize(read_samples(decoded, start, duration), peak), fade_ms)


preview("enemy-split-source.mp3", "enemy-split-shell", 0.45, 1.05, 0.70, 18)
preview("enemy-shield-source.mp3", "enemy-shield-block", 0.0, 0.42, 0.66, 12)
preview("root-eruption-source.mp3", "boss-root-eruption", 0.70, 1.20, 0.70, 22)
preview("seed-barrage-source.mp3", "boss-seed-barrage", 0.0, 0.65, 0.66, 14)
preview("boss-sweep-source.mp3", "boss-heavy-sweep", 0.55, 0.90, 0.70, 18)
preview("player-step-soft-source.mp3", "player-step-soft-neutral", 0.0, 0.444, 0.56, 12)
