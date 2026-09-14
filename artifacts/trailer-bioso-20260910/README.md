# BIOSO — 30-second gameplay trailer

**Latest revision:** [`v3/BIOSO-trailer-EN-16x9.mp4`](v3/BIOSO-trailer-EN-16x9.mp4), 22.23 seconds, current desktop home screen, no repeated shots or closing recap, English and original logo/DS. Earlier cuts are superseded.

Deliverable: `BIOSO-trailer-30s-16x9.mp4` — 1280×720, 16:9, H.264, 30 fps, AAC stereo.

The edit uses four fresh staged recordings of the current BIOSO engine: gardens, scrapyard, ruined city and Scrap Leviathan. Equipment, abilities, health protection and enemy populations were set up for filming. The recordings are promotional scenes, not evidence of a naturally progressed run. Playback speed is unchanged; cuts and crops provide the editing rhythm. The final three seconds use the existing promotional key art from the store kit.

No production game source files were changed. The Vite transform and filming controls in this directory are isolated development tools; profile writes use the game's review-mode memory storage.

## Audio

The music is the current boss battle track, verified in `src/game-music.js`: **105 Касание (Bleep Techno) — Владислав Заворин**, `public/assets/audio/touch-zavorin.mp3`, starting at 00:12. Game sound effects were recorded synchronously from the game's actual audio mixer. Music is mixed continuously over the cut footage. The master has a peak limiter and a short final fade.

Existing asset provenance and licenses: `public/assets/audio/CREDITS.md`. No soundtrack or footage from Vampire Survivors is included.

Reference supplied by the user: [Vampire Survivors — Epic Games Store Launch Trailer](https://www.youtube.com/watch?v=bYb-tJCKLcI).

## Reproduction and evidence

- `capture-server.mjs`, `capture-fixture.js`: isolated local recording setup, port 5298.
- `raw/*.json`: actual capture routes, granted loadouts, frame-rate samples and errors.
- `raw/*.mp4`: recorded picture and synchronized game sound.
- `render.py`: sequential render script using imageio-ffmpeg. Run from the project root with the bundled Python and `PYTHONPATH=temp/trailer-tools`.
- `manifest.json`: shot list, source offsets, music provenance and final SHA-256.
- `verification.json`: final full decode and audio measurements.
- `contact-sheet.jpg`: sampled final frames; `poster.jpg`: end card.
