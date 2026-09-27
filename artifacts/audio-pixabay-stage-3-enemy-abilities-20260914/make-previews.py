#!/usr/bin/env python3
from pathlib import Path
import wave


ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / "sources-wav"
PREVIEWS = ROOT / "previews"


def trim(source_name: str, preview_name: str, start_seconds: float, duration_seconds: float, fade_ms: int = 25) -> None:
    path = SOURCES / source_name
    with wave.open(str(path), "rb") as source:
        params = source.getparams()
        start_frame = min(source.getnframes(), int(source.getframerate() * start_seconds))
        source.setpos(start_frame)
        frame_count = min(source.getnframes() - start_frame, int(source.getframerate() * duration_seconds))
        frames = bytearray(source.readframes(frame_count))

    if params.sampwidth != 2:
        raise ValueError(f"Expected 16-bit PCM: {path}")

    channels = params.nchannels
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

    with wave.open(str(PREVIEWS / preview_name), "wb") as target:
        target.setparams(params)
        target.writeframes(frames)


for source, preview, start, duration in (
    ("wasp-volley.wav", "wasp-volley.wav", 0.0, 0.75),
    ("insect-clicking.wav", "insect-clicking-reflect.wav", 0.0, 0.65),
    ("insect-clicking.wav", "insect-clicking-mirror.wav", 1.0, 0.8),
    ("bees-swarming.wav", "bees-swarming.wav", 0.0, 1.6),
    ("wood-crack.wav", "wood-crack.wav", 0.0, 1.15),
    ("seed-crackle.wav", "seed-crackle.wav", 11.8, 0.85),
    ("metal-rattle.wav", "metal-rattle.wav", 0.0, 0.9),
    ("crack-crunch.wav", "crack-crunch.wav", 0.0, 0.95),
    ("wet-squish.wav", "wet-squish.wav", 26.65, 0.7),
):
    trim(source, preview, start, duration)
