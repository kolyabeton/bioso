# Harpoon projectile — 2026-09-10

Replaced the generic emissive projectile and mint trail with a lit steel shaft, a barbed spearhead, rear eye and a thin tendon cable attached to the firing arm. Rendering only: damage, speed, penetration, pulling and collision remain governed by the existing simulation.

Proof route: `http://127.0.0.1:5173/?review=isaac&weapon=harpoon&screen=battle&freeze=flight&lang=ru`.
This is the actual game renderer and combat simulation with prepared stationary targets. The development fixture freezes a fired projectile after 4.2 units of travel for inspection. Screenshots are from that frozen flight, not a completed gameplay playthrough.

Inspected captures: `mobile-390.png` (390×844), `mobile-360.png` (360×640), `wide.png` (1280×720). No browser errors were reported. The existing viewport layout was not modified.

Validation:
- Node geometry checks passed: heading and slope, multiple shots, capacity growth, tether removal for missing source, finite matrices, no simulation mutation, reset and disposal.
- Production JavaScript/CSS compilation passed using Vite with `publicDir:false`, output `temp/harpoon-build-check`. This is a bundle check, not the optimized asset packaging pipeline.
- Existing combat visual, rocket view and game tests: 37 passed, 3 failed. Failures concern weapon count (13 versus 12), elite/boss reward counts, and mission rewards. These simulation tests do not import the changed rendering files.
