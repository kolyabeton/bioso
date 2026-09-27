#!/usr/bin/env python3
from pathlib import Path
import wave


ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "previews"


def trim(name: str, seconds: float, fade_ms: int = 25) -> None:
    path = PREVIEWS / name
    with wave.open(str(path), "rb") as source:
        params = source.getparams()
        frame_count = min(source.getnframes(), int(source.getframerate() * seconds))
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

    with wave.open(str(path), "wb") as target:
        target.setparams(params)
        target.writeframes(frames)


for preview, duration in {
    "dodge-wasp.wav": 2.0,
    "shield-activation.wav": 1.2,
    "armor-chitin-block.wav": 0.8,
    "spring-launch.wav": 0.8,
    "spring-alt-ruler.wav": 0.9,
    "spring-landing.wav": 0.8,
}.items():
    trim(preview, duration)
