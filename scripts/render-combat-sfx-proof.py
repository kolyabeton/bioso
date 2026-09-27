#!/usr/bin/env python3
"""Render a compact waveform sheet for the project-authored combat cues."""

from __future__ import annotations

import hashlib
import struct
import wave
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "public/assets/audio"
OUTPUT = ROOT / "docs/proof/audio-attack-20260914/waveforms.png"
ROWS = (
    ("generated-acid-wash.wav", "ACID WASH / wingbeat + stridulation + organic spray", "#9fdc77"),
    ("generated-symbiont-bite.wav", "SYMBIONT / wing buzz + chitin mandible bite", "#f0bd87"),
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    names = ("Arial Bold.ttf", "Arial.ttf") if bold else ("Arial.ttf", "Arial Bold.ttf")
    for name in names:
        path = Path("/System/Library/Fonts/Supplemental") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def pcm(path: Path) -> tuple[list[int], int]:
    with wave.open(str(path), "rb") as source:
        assert source.getnchannels() == 1 and source.getsampwidth() == 2
        rate = source.getframerate()
        frames = source.readframes(source.getnframes())
    return list(struct.unpack(f"<{len(frames) // 2}h", frames)), rate


canvas = Image.new("RGB", (1600, 860), "#101816")
draw = ImageDraw.Draw(canvas)
draw.text((70, 48), "BIOSO  /  COMBAT AUDIO PASS", fill="#eff7eb", font=font(34, True))
draw.text((70, 96), "Deterministic entomological synthesis · project-authored mono PCM · 14 Sep 2026", fill="#93a89f", font=font(21))

for index, (filename, title, color) in enumerate(ROWS):
    path = AUDIO / filename
    samples, rate = pcm(path)
    top = 160 + index * 320
    draw.rounded_rectangle((55, top, 1545, top + 270), radius=22, fill="#17231f", outline="#31443d", width=2)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
    duration = len(samples) / rate
    peak = max(abs(sample) for sample in samples) / 32767
    draw.text((85, top + 28), title, fill="#f4f8f0", font=font(26, True))
    draw.text((85, top + 70), f"{duration:.2f} s   ·   {rate // 1000} kHz / 16-bit mono   ·   peak {peak:.2f}   ·   sha256 {digest}…", fill="#a5b8b0", font=font(18))
    left, right, center, height = 85, 1515, top + 182, 82
    draw.line((left, center, right, center), fill="#385047", width=2)
    width = right - left
    for x in range(width):
        start = x * len(samples) // width
        end = max(start + 1, (x + 1) * len(samples) // width)
        low, high = min(samples[start:end]) / 32767, max(samples[start:end]) / 32767
        draw.line((left + x, center - high * height, left + x, center - low * height), fill=color, width=1)

draw.text((70, 814), "Runtime: Washer  gain .30 / 80 ms gate / 3 voices     ·     swarm bite  gain .27 / 65 ms gate / 4 voices", fill="#c8d8d0", font=font(18))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, optimize=True)
print(OUTPUT)
