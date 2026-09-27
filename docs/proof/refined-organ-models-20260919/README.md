# Refined organ models — 2026-09-19

Second pass after the user rejected the primitive-looking first versions.

- Stomach v2: thick fitted ceramic panels around a continuous curved chamber; smaller pressure indicator, recessed fibrous belly, clamped open inlet and lower bent outlet.
- Reanimator v2: compact tapered volume, nested ceramic halves, three hooked ribbed arteries, recessed dark pressure mechanism and small jade annulus.
- Controller v3: closed tapered cocoon, overlapping side ribs and three low-profile relay cartridges. Removed antennae and protruding glowing eyes.

Generator: `scripts/asset-kit/organ-icon-parity.mjs` with shape definitions in
`scripts/asset-kit/organ-refined-shapes.mjs`. Only these three organs were regenerated.
Previous GLBs remain available. Materials and atlas UV windows are unchanged.
The three new IDs are registered in `src/asset-models.js` and the kit manifest.

## Evidence

- `models.png`: actual new GLBs in the inspection gallery `review.html`.
- `game-ground.png`, `game-assembly.png`: inspected current game world and assembly preview in muted Codex IAB.
- `runtime.json`: 61 loaded models, all three requested organs present, no failed models or missing ground models, sound disabled. Console warning/error check empty.
- `validation.json`: all 17 organs have distinct IDs and geometry, valid indices/normals/bounds/UVs, exact manifest bytes and byte-identical canonical PBR maps.
- `tests.txt`: three existing organ attachment and lifecycle tests pass, covering all catalog organs on every chassis, sparse slots, retirement, pickup/equip/discard identity.

New triangle counts: stomach 9,598; Reanimator 11,246; Controller 13,924.

Current game route:
`http://127.0.0.1:5173/?review=organs&organs=reverseStomach,revivalCore,broodNode&lang=ru&sound=0`

No gameplay stats, item labels, UI geometry, save keys or mount logic changed.
