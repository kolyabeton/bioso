# Pixabay sound selection — stage 2: abilities and drones

Prepared on 2026-09-14 for selection only. None of these candidates is connected to the game runtime yet.

Each source page displayed “Free for use under the Pixabay Content License” when checked. No visible “AI Generated” marker was present on the source pages; that is a page-label check, not an independent provenance guarantee.

| Event | Candidate | Pixabay source | Local preview |
|---|---|---|---|
| Drone birth / cocoon opening | Crackly Egg Membrane Hatching Foley — Freesound | https://pixabay.com/sound-effects/household-crackly-egg-membrane-hatching-foley-27427/ | `previews/drone-birth-hatching.wav` |
| Drone death | egg crack sounds mixed — Freesound; user-approved first 0.5 s | https://pixabay.com/sound-effects/household-egg-crack-sounds-mixed-104392/ | `previews/drone-death-crack.wav` |
| Countershell | shells hitting metal — Freesound | https://pixabay.com/sound-effects/film-special-effects-shells-hitting-metal-105473/ | `previews/countershell-metal.wav` |
| Sporebrood A | Spray Puff — Homemade_SFX | https://pixabay.com/sound-effects/film-special-effects-spray-puff-272431/ | `previews/spore-spray.wav` |
| Sporebrood B | water bottle squirt-close — Freesound | https://pixabay.com/sound-effects/film-special-effects-water-bottle-squirt-close-79928/ | `previews/spore-squirt-alt.wav` |
| Cryotrail | Ice cracking — timbreknight / Freesound | https://pixabay.com/sound-effects/nature-ice-cracking-6825/ | `previews/cryo-ice.wav` |
| Overgrowth | Big plants (crops) growing quickly — Contant_aghony / Freesound | https://pixabay.com/sound-effects/film-special-effects-big-plants-crops-growing-quickly-43721/ | `previews/overgrowth-plants.wav` |
| Revive | Human Heartbeat (60 BPM) — FenrirFangs / Freesound | https://pixabay.com/sound-effects/film-special-effects-human-heartbeat-60-bpm-87143/ | `previews/revive-heartbeat.wav` |

The `originals/` directory keeps the untouched MP3 downloads. `make-previews.py` trims mono 44.1 kHz PCM WAV copies for quick listening and adds 25 ms edge fades.
