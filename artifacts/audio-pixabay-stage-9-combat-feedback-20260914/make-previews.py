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
        frames = wav.readframes(min(wav.getnframes() - start_frame, int(wav.getframerate() * duration)))
    return [int.from_bytes(frames[i:i + 2], "little", signed=True) for i in range(0, len(frames), 2)]


def normalize(samples: list[int], peak: float, max_boost: float = 5.0) -> list[int]:
    current = max((abs(sample) for sample in samples), default=1)
    scale = min(max_boost, peak * 32767 / current)
    return [round(sample * scale) for sample in samples]


def write(target: str, samples: list[int], fade_ms: int = 25) -> None:
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


def preview(source: str, target: str, start: float, duration: float, peak: float, fade_ms: int = 25) -> None:
    with TemporaryDirectory(prefix="bioso-combat-feedback-") as temp:
        decoded = Path(temp) / "source.wav"
        decode(source, decoded)
        write(target, normalize(read_samples(decoded, start, duration), peak), fade_ms)


def organic_blast() -> None:
    with TemporaryDirectory(prefix="bioso-organic-blast-") as temp:
        wet_path, boom_path = Path(temp) / "wet.wav", Path(temp) / "boom.wav"
        decode("organic-wet-source.mp3", wet_path)
        decode("organic-boom-source.mp3", boom_path)
        wet = normalize(read_samples(wet_path, 0.0, 2.35), 0.65)
        boom = normalize(read_samples(boom_path, 0.0, 2.80), 0.52)
        length = max(len(wet), len(boom))
        wet.extend([0] * (length - len(wet)))
        boom.extend([0] * (length - len(boom)))
        mixed = [round(w * 0.92 + b * 0.72) for w, b in zip(wet, boom)]
        write("organic-reactor-blast", normalize(mixed, 0.78, 1.0), 35)


preview("player-hit-source.mp3", "player-hit", 0.0, 1.20, 0.72, 18)
preview("reload-source.mp3", "weapon-reload", 0.0, 1.06, 0.72, 12)
preview("recovery-source.mp3", "recovery-flask", 0.0, 1.60, 0.72, 18)
organic_blast()
preview("victory-source.mp3", "victory-dark-gong", 0.0, 4.50, 0.72, 40)
