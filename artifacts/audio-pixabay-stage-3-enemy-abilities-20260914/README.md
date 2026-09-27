# Pixabay sound selection — stage 3: enemy and boss abilities

Prepared on 2026-09-14 for selection only. None of these candidates is connected to the game runtime.

Each source page displayed “Free for use under the Pixabay Content License” when checked. No visible “AI Generated” or “AI modified” marker was present; that is a page-label check, not an independent provenance guarantee.

| Ability family | Candidate | Pixabay source | Local preview |
|---|---|---|---|
| Needle / hive volleys | Wasp Wings 2 — Wakerone (Freesound) | https://pixabay.com/sound-effects/film-special-effects-wasp-wings-2-101131/ | `previews/wasp-volley.wav` |
| Reflective shell | insectoid monster clicking — LucasDuff (Freesound), first fragment | https://pixabay.com/sound-effects/film-special-effects-insectoid-monster-clicking-98623/ | `previews/insect-clicking-reflect.wav` |
| Mirror copy / volley | insectoid monster clicking — LucasDuff (Freesound), fragment from 1.0 s | https://pixabay.com/sound-effects/film-special-effects-insectoid-monster-clicking-98623/ | `previews/insect-clicking-mirror.wav` |
| Swarm summon / phase change | Bees swarming — Frederik_Sunne (Freesound) | https://pixabay.com/sound-effects/nature-bees-swarming-98657/ | `previews/bees-swarming.wav` |
| Roots / ground claws | Wood Crack 2 — utsuru (Freesound) | https://pixabay.com/sound-effects/wood-crack-2-88687/ | `previews/wood-crack.wav` |
| Seed volleys / spiral | 038827_Pumpkin Seed Crackle.flac — Freesound Community; fragment from 11.8 s | https://pixabay.com/sound-effects/038827-pumpkin-seed-crackleflac-76469/ | `previews/seed-crackle.wav` |
| Scrap volley / crush layer | Metal Rattle — jhyland (Freesound) | https://pixabay.com/sound-effects/film-special-effects-metal-rattle-38515/ | `previews/metal-rattle.wav` |
| Split / pounce / collapse / heavy sweep | Crack and Crunch — Aurelon (Freesound) | https://pixabay.com/sound-effects/film-special-effects-crack-and-crunch-14891/ | `previews/crack-crunch.wav` |
| Brood ring / acid bloom / vine sweep | wet squish 1 — 45t (Freesound); fragment from 26.65 s | https://pixabay.com/sound-effects/film-special-effects-wet-squish-1-79324/ | `previews/wet-squish.wav` |

The untouched MP3 files are in `originals/`; full mono 44.1 kHz conversion sources are in `sources-wav/`. `make-previews.py` creates reproducible short PCM WAV cuts with 25 ms edge fades.

Runtime audit notes: `swarm` and `bees` represent one summon and must share one cue. Survival boss moves currently lose their `bossAction` value when emitted as `enemy-strike`, and the Puppeteer summon has no event; those instrumentation gaps must be fixed before separate sounds can be wired safely.
