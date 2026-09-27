#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import wave


ROOT = Path(__file__).resolve().parent


def preview(name: str, seconds: float, fade_ms: int = 25) -> None:
    with TemporaryDirectory(prefix="bioso-level-up-") as temp:
        decoded = Path(temp) / f"{name}.wav"
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@44100", "-c", "1", str(ROOT / "originals" / f"{name}.mp3"), str(decoded)], check=True)
        with wave.open(str(decoded), "rb") as wav:
            params = wav.getparams()
            frame_count = min(wav.getnframes(), int(wav.getframerate() * seconds))
            frames = bytearray(wav.readframes(frame_count))
    fade_frames = min(frame_count // 2, int(params.framerate * fade_ms / 1000))
    for frame in range(fade_frames):
        gain_in = frame / max(1, fade_frames)
        gain_out = (fade_frames - frame) / max(1, fade_frames)
        in_offset = frame * 2
        out_offset = (frame_count - fade_frames + frame) * 2
        in_sample = int.from_bytes(frames[in_offset:in_offset + 2], "little", signed=True)
        out_sample = int.from_bytes(frames[out_offset:out_offset + 2], "little", signed=True)
        frames[in_offset:in_offset + 2] = int(in_sample * gain_in).to_bytes(2, "little", signed=True)
        frames[out_offset:out_offset + 2] = int(out_sample * gain_out).to_bytes(2, "little", signed=True)
    (ROOT / "previews").mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / "previews" / f"{name}.wav"), "wb") as target:
        target.setparams(params)
        target.writeframes(frames)


for source, duration in (
    ("level-up-classic", 1.85),
    ("level-up-magic", 2.45),
    ("level-up-fanfare", 2.60),
):
    preview(source, duration)
