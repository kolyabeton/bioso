# Pixabay sound selection — stage 6: residual runtime events

Prepared on 2026-09-14. Reverse-heart discharge and challenge result are approved and connected; the other candidates remain audition-only.

Every source page displayed “Free for use under the Pixabay Content License” when checked. No visible “AI Generated” or “AI modified” marker was present; this is a page-label check, not an independent provenance guarantee.

| Runtime event | Candidate | Pixabay source | Local preview |
|---|---|---|---|
| Organic-mechanical blast | VERY LOUD Eviscerating 2 — deleted_user_3277771 (Freesound) | https://pixabay.com/sound-effects/film-special-effects-very-loud-eviscerating-2-89000/ | `previews/organic-blast.wav` |
| Reverse-heart discharge — approved | Single Heartbeat HQ_BeatSmith — Lunardrive (Freesound) | https://pixabay.com/sound-effects/people-single-heartbeat-hq-beatsmith-108037/ | `previews/heart-discharge.wav` |
| Player death | Fast Body Fall Impact — Universfield | https://pixabay.com/sound-effects/film-special-effects-fast-body-fall-impact-352725/ | `previews/player-death.wav` |
| Level up — rejected | Fly insect — spinopel | https://pixabay.com/sound-effects/nature-fly-insect-381879/ | `previews/level-up.wav` |
| Boss arrival | Bee Buzzing — JonCon_Library (Freesound) | https://pixabay.com/sound-effects/nature-bee-buzzing-6254/ | `previews/boss-arrival.wav` |
| Challenge result — approved | Seeds — Prmodrai | https://pixabay.com/sound-effects/film-special-effects-seeds-404906/ | `previews/challenge-result.wav` |

Proposed mappings: one shared blast for `volatile-blast`, `blast:thermal` and `blast:reactor` (never rocket/swarm); one `heart-pulse` cue per discharge; new single-edge `player-death`; aggregated `level-up`; new single-edge `boss-arrival`; one `challenge-result` cue with a lower failure variant.

The untouched MP3 downloads are retained in `originals/`. `make-previews.py` reproducibly creates mono 44.1 kHz PCM audition cuts with short edge fades. Pitch and filtering recommendations are intentionally deferred until the candidates are approved.
