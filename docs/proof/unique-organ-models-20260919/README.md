# Unique organ models — 2026-09-19

Replaced the remaining shared organ silhouettes with three separately authored GLBs:

- `reverseStomach` → `organ-reverseStomach-icon-v1`: curved stomach chamber, broad side inlet and narrow lower outlet, matching the current stomach icon.
- `revivalCore` → `organ-revivalCore-icon-v1`: asymmetric heart, three upper arteries and protected restart optic, based on its current heart icon.
- `broodNode` → `organ-broodNode-icon-v2`: ceramic cocoon retained from the shared icon, differentiated from the Incubator by twin antennae and three control nodes.

Existing models remain on disk. The generator reuses its current geometry helpers,
leg-worker PBR atlas, canonical UV windows and original olive tissue texture.
Generate only these variants with:

`node scripts/asset-kit/organ-icon-parity.mjs --only=reverseStomach,revivalCore,broodNode`

## Verification

`validation.json`: all 17 catalog organs have unique model IDs and binary geometry;
valid indices, normals, dimensions, metadata, manifest byte counts, atlas UVs and
byte-identical canonical material maps. New models contain 8,321 / 10,444 / 13,331 triangles.

`tests.txt`: 6 focused checks pass, including all organs mounted on every catalog
chassis, sparse slots, asynchronous retirement, pickup/equip/discard identity,
ground rendering and real catalog GLBs.

Inspected the current game in muted Codex IAB at:
`http://127.0.0.1:5173/?review=organs&organs=reverseStomach,revivalCore,broodNode&lang=ru&sound=0`

`game-ground.png` and `game-assembly.png`: actual game world and assembly preview.
`runtime.json`: all three ground models present, no failed or missing models,
61 loaded models, sound disabled. Both game and gallery console checks were empty.

`models.png`: close-up render of the same shipped GLBs on `review.html`, using
separate inspection lighting. This gallery is model evidence, not a gameplay screenshot.

No UI geometry, labels, item stats, socket logic or save keys were changed.
