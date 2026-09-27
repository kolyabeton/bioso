# Pixabay sound selection — stage 9: combat feedback and resolution

Prepared on 2026-09-14. Weapon reload is approved and connected; the other four candidates remain audition-only.

Every selected source page displayed “Free for use under the Pixabay Content License”. No selected page displayed an AI-generated or AI-modified marker. Pages were checked in the Codex in-app browser.

| Runtime event | Candidate | Author | Pixabay source | Preview treatment |
|---|---|---|---|---|
| Player takes health damage | Impact Thud | Universfield | https://pixabay.com/sound-effects/film-special-effects-impact-thud-291047/ | Short 1.20 s physical low impact; replaces the oscillator on real health loss only |
| Weapon reload — approved | 1911 Reload | nioczkus (Freesound) | https://pixabay.com/sound-effects/film-special-effects-1911-reload-6248/ | Full 1.06 s mechanical action on `reload-start`, with no duplicate at `reload-end` |
| Health or armor recovery pickup | bottle_open | drummy (Freesound) | https://pixabay.com/sound-effects/film-special-effects-bottle-open-99732/ | First 1.60 s physical flask opening; ordinary loot keeps its existing pickup cue |
| Organic reactor or mutation blast | Wet Squelch + Large Underwater Explosion | Universfield; DavidDumaisAudio | https://pixabay.com/sound-effects/film-special-effects-wet-squelch-276679/ and https://pixabay.com/sound-effects/film-special-effects-large-underwater-explosion-190270/ | 2.80 s composite: wet organic transient over a low pressure wave; excludes rockets |
| Mission or final-run victory | Black Gong | Black Boe (Freesound) | https://pixabay.com/sound-effects/film-special-effects-black-gong-28936/ | First 4.50 s of a real dark metal gong; no bright fanfare |

Untouched MP3 downloads are retained in `originals/`. `make-previews.py` reproducibly creates mono 44.1 kHz PCM audition files with bounded normalization and short edge fades.
