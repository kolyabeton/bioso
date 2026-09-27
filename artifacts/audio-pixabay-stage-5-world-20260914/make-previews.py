#!/usr/bin/env python3
from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
import wave


ROOT = Path(__file__).resolve().parent
ORIGINALS = ROOT / "originals"
PREVIEWS = ROOT / "previews"


def preview(name: str, seconds: float, boost: float = 1.0, fade_ms: int = 25, start: float = 0) -> None:
    source = ORIGINALS / f"{name}.mp3"
    with TemporaryDirectory(prefix="bioso-world-audio-") as temp:
        decoded = Path(temp) / f"{name}.wav"
        subprocess.run(
            ["afconvert", "-f", "WAVE", "-d", "LEI16@44100", "-c", "1", str(source), str(decoded)],
            check=True,
        )
        with wave.open(str(decoded), "rb") as wav:
            params = wav.getparams()
            wav.setpos(min(wav.getnframes(), int(wav.getframerate() * start)))
            frame_count = min(wav.getnframes(), int(wav.getframerate() * seconds))
            frames = bytearray(wav.readframes(frame_count))

    channels = params.nchannels
    if boost != 1:
        for offset in range(0, len(frames), 2):
            sample = int.from_bytes(frames[offset:offset + 2], "little", signed=True)
            sample = max(-32768, min(32767, round(sample * boost)))
            frames[offset:offset + 2] = sample.to_bytes(2, "little", signed=True)
    fade_frames = min(frame_count // 2, int(params.framerate * fade_ms / 1000))
    for frame in range(fade_frames):
        gain_in = frame / max(1, fade_frames)
        gain_out = (fade_frames - frame) / max(1, fade_frames)
        for channel in range(channels):
            in_offset = (frame * channels + channel) * 2
            out_frame = frame_count - fade_frames + frame
            out_offset = (out_frame * channels + channel) * 2
            in_sample = int.from_bytes(frames[in_offset:in_offset + 2], "little", signed=True)
            out_sample = int.from_bytes(frames[out_offset:out_offset + 2], "little", signed=True)
            frames[in_offset:in_offset + 2] = int(in_sample * gain_in).to_bytes(2, "little", signed=True)
            frames[out_offset:out_offset + 2] = int(out_sample * gain_out).to_bytes(2, "little", signed=True)

    with wave.open(str(PREVIEWS / f"{name}.wav"), "wb") as target:
        target.setparams(params)
        target.writeframes(frames)


for source, duration, boost, start in (
    ("root-forest-wind", 24, 3, 0),
    ("upper-gardens-bees", 22, 1, 0),
    ("scrapyard-creak", 2.5, 5, 0),
    ("city-metal-rain", 20, 1, 0),
    ("brood-nursery-hive", 24, 1, 0),
    ("garden-water-pump", 18, 1, 0),
    ("scrap-turbine", 4, 1, 0),
    ("mission-gate", 1.6, 2, 0.3),
):
    preview(source, duration, boost, start=start)
