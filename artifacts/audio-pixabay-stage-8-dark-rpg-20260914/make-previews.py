#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import wave


ROOT = Path(__file__).resolve().parent


def preview(source: str, target: str, start: float, duration: float, peak: float, fade_ms: int = 25, max_boost: float = 1.0) -> None:
    with TemporaryDirectory(prefix="bioso-dark-rpg-") as temp:
        decoded = Path(temp) / f"{target}.wav"
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16@44100", "-c", "1", str(ROOT / "originals" / source), str(decoded)],
            check=True,
        )
        with wave.open(str(decoded), "rb") as wav:
            params = wav.getparams()
            start_frame = min(wav.getnframes(), int(wav.getframerate() * start))
            wav.setpos(start_frame)
            frame_count = min(wav.getnframes() - start_frame, int(wav.getframerate() * duration))
            frames = bytearray(wav.readframes(frame_count))

    samples = [int.from_bytes(frames[i:i + 2], "little", signed=True) for i in range(0, len(frames), 2)]
    current_peak = max((abs(sample) for sample in samples), default=1)
    scale = min(max_boost, peak * 32767 / current_peak)
    fade_frames = min(frame_count // 2, int(params.framerate * fade_ms / 1000))
    for index, sample in enumerate(samples):
        gain = scale
        if index < fade_frames:
            gain *= index / max(1, fade_frames)
        if index >= frame_count - fade_frames:
            gain *= (frame_count - index) / max(1, fade_frames)
        frames[index * 2:index * 2 + 2] = int(sample * gain).to_bytes(2, "little", signed=True)

    with wave.open(str(ROOT / "previews" / f"{target}.wav"), "wb") as target_wav:
        target_wav.setparams(params)
        target_wav.writeframes(frames)


for item in (
    ("level-up-source.mp3", "level-up-dark", 0.0, 3.10, 0.78, 30),
    ("wet-footsteps-source.mp3", "footsteps-wet-ground", 5.0, 6.0, 0.62, 45),
    ("wet-footsteps-source.mp3", "footstep-wet-single", 5.65, 0.70, 0.72, 18, 5.0),
    ("shield-block-source.mp3", "shield-block", 0.0, 0.86, 0.78, 15),
    ("player-death-source.mp3", "player-death", 0.0, 2.35, 0.78, 25),
    ("boss-arrival-source.mp3", "boss-arrival", 0.0, 4.25, 0.78, 30),
):
    preview(*item)
