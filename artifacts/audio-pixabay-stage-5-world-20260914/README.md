# Pixabay sound selection — stage 5: world and environment

Prepared on 2026-09-14. The five user-approved rows are connected to the game runtime; the other three remain audition-only.

Each source page displayed “Free for use under the Pixabay Content License” when checked. No visible “AI Generated” or “AI modified” marker was present; that is a page-label check, not an independent provenance guarantee.

| World state / object | Candidate | Pixabay source | Local preview |
|---|---|---|---|
| Root Forest ambience — approved | wind in the trees — deleted_user_229898 (Freesound); gain ×3 | https://pixabay.com/sound-effects/nature-wind-in-the-trees-24035/ | `previews/root-forest-wind.wav` |
| Upper Gardens ambience | bees in meadow close to a hive — inalchemy (Freesound) | https://pixabay.com/sound-effects/nature-bees-in-meadow-close-to-a-hive-24908/ | `previews/upper-gardens-bees.wav` |
| Quiet Scrapyard wind accent | Metal pole, rubbing, creaking — SpliceSound (Freesound); audition gain ×5 | https://pixabay.com/sound-effects/film-special-effects-metal-pole-rubbing-creaking-48952/ | `previews/scrapyard-creak.wav` |
| Overgrown City rain | Rain Drops Falling On A Metal Surface — tosha73 (Freesound) | https://pixabay.com/sound-effects/nature-rain-drops-falling-on-a-metal-surface-58229/ | `previews/city-metal-rain.wav` |
| Brood Nursery ambience — approved | Beehive contact microphone recording by an Aquarian H2a (France) — felix.blume (Freesound) | https://pixabay.com/sound-effects/nature-beehive-contact-microphone-recording-by-an-aquarian-h2a-france-16690/ | `previews/brood-nursery-hive.wav` |
| Garden irrigators and basins — approved | Underground Water Pumping Noise — pppBala (Freesound) | https://pixabay.com/sound-effects/film-special-effects-underground-water-pumping-noise-24224/ | `previews/garden-water-pump.wav` |
| Scrapyard turbines and engines — approved | Turbine Loop — Aelstraz (Freesound) | https://pixabay.com/sound-effects/technology-turbine-loop-36475/ | `previews/scrap-turbine.wav` |
| Mission gate opening — approved | Huge Heavy Metal Door Swinging — aryxmyth (Freesound); 0.30–1.90 s, gain ×2 | https://pixabay.com/sound-effects/household-huge-heavy-metal-door-swinging-48239/ | `previews/mission-gate.wav` |

Runtime proposal: crossfade environment beds by `weatherBlend`; keep at most two bed voices plus one nearest structure voice. Scrapyard creaks should be sparse one-shots. Garden pumps and scrapyard turbines should use one nearest-emitter voice rather than one voice per object. Mission gates should fire once on the actual closed-to-open edge.

The untouched MP3 files are retained in `originals/`. `make-previews.py` decodes them through macOS `afconvert` into temporary mono 44.1 kHz PCM and writes reproducible audition cuts with short edge fades.
