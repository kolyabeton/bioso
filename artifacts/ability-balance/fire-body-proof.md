# Burning body VFX — 2026-09-10

Replaced persistent burn with a dedicated procedural yellow/orange flame shader, attached to each living target. Camera-facing skin offset retains depth testing; expired/dead targets clear their particles. Stack density is capped; particles share the existing bounded two-batch renderer. Cold and gameplay burn damage/chance are unchanged.

Validation: `node --test tests/soul-fx.test.mjs tests/systems.test.mjs` — 43/43 passed, including movement/elevation attachment and death cleanup. No browser render errors observed.

Runtime route: `/?review=ability-vfx&synergy=burn&lang=ru`. This is a controlled fixture with a moving carapace creature, 50,000 HP, rank-five fire upgrades and forced successful on-hit rolls. It demonstrates presentation, not normal proc frequency. `record=1` only hides the diagnostic badge.

Inspected 360×640, 390×844 and 1280×720 screenshots. Existing desktop world expansion was left untouched. Current screenshots: `fire-body-360x640.jpg`, `fire-body-390x844.jpg`, `fire-body-1280x720.jpg`.

Video: `fire-body-crimson-inspired-390x844.mp4`, 390×844, 8.4 seconds, 15 fps. Captured through Codex in-app browser and resampled against actual capture timestamps. Decoded and inspected the video contact sheet in `fire-body-video-proof/contact-sheet.png`. Corrected the existing encoder's redundant vertical flip.
