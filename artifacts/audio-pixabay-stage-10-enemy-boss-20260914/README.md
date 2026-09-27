# Pixabay stage 10 — enemy and boss abilities

Status: candidates 1, 2 and 4 approved and connected to the game runtime. Candidates 3 and 5 remain audition-only.

All five detail pages showed “Free for use under the Pixabay Content License” and no AI-generated marker when checked on 2026-09-14.

| Candidate | Runtime target | Pixabay source | Author | Preview treatment |
| --- | --- | --- | --- | --- |
| Boss phase shift — approved | `boss-phase` | [Low Monster Roar](https://pixabay.com/sound-effects/horror-low-monster-roar-97413/) | Robson220pl / Freesound | first 2.35 s, mono, bounded normalization |
| Hive opens and releases swarm — approved | `boss-action: swarm` / `bees` | [Agressive Bees](https://pixabay.com/sound-effects/nature-agressive-bees-45822/) | dlp_coasters / Freesound | first 2.20 s, mono, bounded normalization |
| Enemy reflection | `enemy-reflect`; later mirror-family reuse only after approval | [bullet ricochet](https://pixabay.com/sound-effects/film-special-effects-bullet-ricochet-108110/) | aust_paul / Freesound | first 1.05 s, mono, bounded normalization |
| Heavy boss strike family — approved | `slam`, `root-slam`, `crush`, `hunter-pounce`, `ground-claws` | [Boulder Impact](https://pixabay.com/sound-effects/horror-boulder-impact-487673/) | DRAGON-STUDIO | first 1.55 s, mono, bounded normalization |
| Volatile enemy blast | `volatile-blast` | [Wet Squelch Impact](https://pixabay.com/sound-effects/film-special-effects-wet-squelch-impact-352302/) | Universfield | first 1.10 s, mono, bounded normalization |

The shield block is intentionally not mapped to the reflection candidate yet: frequent shield hits would make the same sound repetitive. The five runtime hooks above were prioritized by the Game Studio sound-agent audit.
