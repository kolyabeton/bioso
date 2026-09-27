#!/usr/bin/env python3
from pathlib import Path
import wave


ROOT = Path(__file__).resolve().parent
SOURCES = ROOT / "sources-wav"
PREVIEWS = ROOT / "previews"


def trim(source_name: str, preview_name: str, start_seconds: float, duration_seconds: float, boost: float = 1.0, fade_ms: int = 25) -> None:
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

    with wave.open(str(PREVIEWS / preview_name), "wb") as target:
        target.setparams(params)
        target.writeframes(frames)


for source, preview, start, duration, boost in (
    ("shield-ceramic.wav", "shield-ceramic.wav", 0.0, 0.5, 1),
    ("reload-ratchet.wav", "reload-ratchet.wav", 0.0, 0.55, 1),
    ("unlock-chirp.wav", "unlock-chirp.wav", 40.2, 0.45, 5),
    ("reward-seedpods.wav", "reward-seedpods.wav", 13.2, 0.85, 1),
    ("victory-bees.wav", "victory-bees.wav", 0.0, 1.6, 1),
    ("lore-wasp-scratch.wav", "lore-wasp-scratch.wav", 0.75, 1.0, 1),
    ("consumable-insect-wings.wav", "consumable-insect-wings.wav", 13.5, 0.8, 28),
    ("important-death-crunch.wav", "important-death-crunch.wav", 0.0, 0.95, 1),
):
    trim(source, preview, start, duration, boost)
