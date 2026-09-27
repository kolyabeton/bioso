#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import wave


ROOT = Path(__file__).resolve().parent
ORIGINALS = ROOT / "originals"
PREVIEWS = ROOT / "previews"


def preview(name: str, seconds: float, boost: float = 1.0, start: float = 0, fade_ms: int = 25) -> None:
    source = ORIGINALS / f"{name}.mp3"
    with TemporaryDirectory(prefix="bioso-residual-audio-") as temp:
        decoded = Path(temp) / f"{name}.wav"
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16@44100", "-c", "1", str(source), str(decoded)],
            check=True,
        )
        with wave.open(str(decoded), "rb") as wav:
            params = wav.getparams()
            wav.setpos(min(wav.getnframes(), int(wav.getframerate() * start)))
            frame_count = min(wav.getnframes() - wav.tell(), int(wav.getframerate() * seconds))
            frames = bytearray(wav.readframes(frame_count))

    for offset in range(0, len(frames), 2):
        sample = int.from_bytes(frames[offset:offset + 2], "little", signed=True)
        sample = max(-32768, min(32767, round(sample * boost)))
        frames[offset:offset + 2] = sample.to_bytes(2, "little", signed=True)
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

    PREVIEWS.mkdir(parents=True, exist_ok=True)
    with wave.open(str(PREVIEWS / f"{name}.wav"), "wb") as target:
        target.setparams(params)
        target.writeframes(frames)


for source, duration, boost, start in (
    ("organic-blast", 1.4, 1, 0),
    ("heart-discharge", 0.85, 1, 0),
    ("player-death", 0.95, 1, 0),
    ("level-up", 1.6, 1, 0),
    ("boss-arrival", 2.2, 1, 0),
    ("challenge-result", 1.1, 1, 0),
):
    preview(source, duration, boost, start)
