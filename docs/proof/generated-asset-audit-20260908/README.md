# Generated image background audit

Scope: 48 PNGs, listed in `inventory.json`: terrain/decor atlases (including historical v2/v3), twelve forest-perimeter pieces, seven encounter assets, five boss cutouts, six organ cutouts, six item sources/cutouts, and seven equipment images. The four numbered JPEG contact sheets were visually inspected on dark green. This is not a review of every generated concept or all ability/achievement illustrations.

Findings:

- Three live encounter resources (`nursery-v1`, `slab-v1`, `membrane-v1`) contained an opaque painted checkerboard. `src/gameplay-modules/view.js` removed near-white pixels at runtime, which could also discard pale material highlights.
- Prepared corresponding v2 PNGs with real RGBA, clean edge colors and unchanged 1254x1254 dimensions/placement. Sources are retained. `scripts/prepare-encounter-alpha.py` records coverage and validates transparent outer borders.
- Updated the encounter renderer to use v2 alpha; removed the white-color-key shader. Opened/reward/exhausted object states remain on the same existing renderer.
- Forest-perimeter images have intentionally opaque forest/ground areas and authored edge fades; no white/checkerboard matte defect was found in their contact-sheet inspection.
- No matching white-fringe defect was found in the inspected current boss, organ, equipment and item cutouts. The opaque black `root-leg-v1` is an old source; runtime uses `root-leg-transparent-v1` instead. Historical decor v3 is already superseded by v4.

Proof: `encounters-cleaned.jpg` shows the three corrected images on dark green; `encounter-alpha.json` records exported pixel coverage. `/?review=landscape-camera&encounter=all` positions the three real encounter nodes near the player in the actual paused survival renderer. This changes only the DEV/acceptance fixture, not normal production placement.

Checks: production build PASS (existing bundle-size warning); five existing gameplay-module tests PASS, including sprite rendering and reward/completed states. Runtime screenshots cover 360x640, 390x844 and 1280x720 with a portrait stage.
