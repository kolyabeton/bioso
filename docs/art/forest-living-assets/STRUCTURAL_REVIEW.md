# Forest — structural rejection, 2026-09-09

Latest decision: layout/collision re-authoring has been approved, and the user
then rejected whole-object image cards in favour of lightweight Blender geometry.
See README.md, "Latest direction: true 3D". The historical rejection below must
not be mistaken for a current render or a pending approval request.

User rejected `art-v3-390`: monotonous terrain and environment, weak reference match.
Re-read: https://github.com/achimala/dream-loop/blob/main/SKILL.md
Target remains `docs/concepts/world/forest-living-target-v2.png`; do not lower it.
This is a self-review of the last inspected screenshot, not a fresh runtime pass
or independent judge result. No new implementation is claimed by this document.

## Gate assessment

At most 3/10: composition gate NOT passed. Do not use passing tests, reduced
triangle counts or a new texture as substitutes for visual acceptance.

1. Terrain: effectively a flat repeated cobblestone sheet. The shader's periodic
   sine modulation reads as broad camouflage, not light from real surrounding forms.
   Target has dominant stone plates, soil breaks, rubble shoulders and exposed roots.
2. Silhouette: four similar paired clumps with wide empty gaps dominate the frame.
   Target has asymmetric layers of low ferns, shrubs, trunks and ruined structures.
3. Landmark: thin bent pillar resembles a hoop. Target arch has substantial ceramic
   cladding, dark recessed inner frame, broken footings, root binding and tiny mint lights.
4. Depth: surface/material detail has been added without foreground, middle ground
   and background massing. Lighting does not consistently describe object volume.

## Required change of approach

- Author a real ruin asset, preferably in Blender: thick bevelled segmented ceramic
  shell, recessed structural metal, irregular broken ends, fitted root bundles.
  Do not bend another pillar mesh again. Use generated material maps, not flat primitives
  as the final environmental focal point. Root and ceramic surfaces need distinct roughness.
- Author distinct stone/soil/root surface patches with irregular boundaries and
  actual low-profile edge geometry; use multiple scales and orientations. Replace
  periodic ground light bands with a light/shadow pattern tied to authored silhouettes.
- Compose asymmetric vegetation layers inside verified blocked footprints; use
  different crown shapes, spreading fern clusters and trunks, not the same spray scaled
  up everywhere. Avoid converting open collision-free paths into visually solid walls.
- Integrate accent architecture and rock shoulders into the same clusters. Evaluate
  the whole 390×844 frame, not isolated new resources. Preserve hero/HUD readability.

## Constraints still in force

The download-size cap was removed by the user; keep reporting actual size. Runtime
performance and portrait stage constraints were not removed. Other biomes and legacy
mission profiles have separate ownership. Do not overwrite their recent changes to
`src/biome-view.js` (`groundStyle`, `ambientVegetation`, `edgeVegetation`, etc.).
Keep central passages, safe points and collision semantics. Visible large height changes
must be supported by real movement/collision checks, not a fake decorative cliff.

## Next acceptance

Use the unchanged target and identical camera checkpoint. Pass composition before
material-polish scoring. Record 390/360/wide actual-route evidence and inspect motion.
Final ≥8/10, render budgets, optimized build size, 50 transitions/reset and 30-minute
stress remain open. No physical phone heat claim.

## Execution pause

Read-only review found roughly 16 GiB RSS across Codex-related processes, above the
user's 15 GiB behavioural ceiling. Do not launch additional Blender/render/batch work
until memory is below the ceiling or the user explicitly revises it. Do not terminate
other tasks or touch Google Chrome to free resources.

User subsequently authorized 20 GiB for this task only. The pause is lifted;
continue sequentially, measure before heavy work, and retain the 15 GiB default
outside this task. This is a behavioural ceiling, not an OS-enforced limit.
