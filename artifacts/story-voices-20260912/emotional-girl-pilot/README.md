# Emotional girl voice pilot

Generated with Qwen3-TTS Voice Design from the reproducible script
`scripts/build-emotional-girl-pilot.py`.

- `a-restrained-fear`: frightened, deliberately composed, restrained urgency.
- `b-vulnerable-hope`: exhausted and lonely, with fragile hope and a quiet plea.
- `c-controlled-panic`: immediate danger, uneven breath and controlled panic.

Each take is available as a clean WAV and as an in-game-style `-radio.m4a`
preview mixed with `public/assets/audio/story/radio-interference.m4a`.

The current production girl voice was not replaced during this pilot. After one
take is approved, use it as the consistent character reference for the remaining
Russian and English lines before applying radio processing.

Backends:

- Public no-key pilot: `python scripts/build-emotional-girl-pilot.py --backend space`
- Local Apple Silicon: `python scripts/build-emotional-girl-pilot.py --backend local`

Model: `Qwen3-TTS-12Hz-1.7B-VoiceDesign`, Apache-2.0.
