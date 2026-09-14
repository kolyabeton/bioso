# Forest living asset pass — in progress

## Silhouette pass: forked trees and broken stumps (2026-09-09)

Added one real Blender model, `forest-tree-broad-v4`: a lower, wider forked tree
with sweeping branches, geometric folded leaves and vertex AO. It replaces the
secondary canopy tree and three of eight perimeter trees; it does not add more
tree instances. 8,676 triangles versus the tall tree's 12,218. The existing bark
atlas and leaf material are reused, with no new material textures or image cards.

The root bank's 5.15-metre tapering trunk was replaced with a broad broken stump,
jagged crown, blunt branch and fallen limb. Actual exported bounds are now 2.48 m
high, with the substantial root/stone footprint retained. Placement and collision
layout remain unchanged. Export scripts accept asset-name arguments after `--`
so this pass regenerated only the new tree and root bank, not unrelated models.
All seven direct-light maps were rebaked from the new geometry.

21 focused tests pass, including distinct tree proportions, bounded stump height,
largest-body navigation, separate mission contracts and perimeter placement.
This is another intermediate in-engine art pass; the reference-quality gate and
full performance/stress acceptance are still open.

Optimized new tree GLB: 608,248 bytes; revised root bank: 98,592 bytes. Full shared
production snapshot is 104,071,123 bytes. `shapes-built-390.png` is the real
390×844 Forest checkpoint, not a Blender render or a replacement background.
`shapes-built-390.mp4` was decoded and its sampled frames inspected: hero remains
readable during movement and combat; birds appear; no runtime errors. 31 samples
peak at 50 calls / 298,886 triangles / 23 textures, rolling render p95 2.8 ms.
Static frame: 41 calls / 277,656 triangles. The 45-call combat gate is still not
accepted. The east-edge 360×640 still was also inspected (`shapes-built-360.png`).
Wide still inspected too: portrait stage 405×720 at left 437.5 in 1280×720
(`shapes-built-wide.png` and JSON). Temporary proof tab and server closed.

## Forest edge correction (2026-09-09)

The user specifically rejected the straight wall of perimeter trees. The former
9 equal-spaced trees per outer tile edge have been replaced by 8 irregular trees
distributed in near/far groups, with independent heights, widths, rotations and
depths. Low boulders, ferns and separate undergrowth islands interrupt the tree
silhouette. Every new anchor stays beyond the existing playable bounds; interior
tile seams, collisions and safe-point navigation are unchanged. No new models or
material textures were added. Existing instanced batches are reused.

The ground transitions from paving to soil beyond the boundary. Directional
visibility maps now cover 128×128 world units per tile (formerly 64×64), so shadows
continue into the real outer geometry instead of stretching the last texel.
All seven maps were rebaked; boundary maps were iterated with the tree placement.
The Blender bake command now exports the lossless runtime WebP itself.

Three composition rounds checked actual east/north game routes, addressing both
the old hedge and excessive empty space exposed by the first thinning pass.
`?review=forest-living&edge=east` / `edge=north` are explicit diagnostic starts,
not changes to normal player spawns. Overall reference and long stress acceptance
remain open; this section records the targeted perimeter correction only.

20 focused tests passed after the final placement change. The seven updated
visibility maps total 318,144 bytes; no GLBs were added or changed in this edge
pass. Isolated optimized production build: 103,457,049 bytes (full shared tree,
including other tasks' current assets). This is not a Forest-only size delta.

Final built north-edge recording `edge-final-built-390.mp4` (390×844) was decoded
and its sampled frames inspected. Hero moves from z=-28 to -22.27; tree grouping
retains depth as the camera follows. 31 samples: peak 34 calls / 228,818 triangles /
23 textures; max observed rolling render p95 2.3 ms, no runtime errors. The east
edge was also inspected at 360×640 (`edge-final-built-360.png`). These are targeted
edge checks, not a controlled baseline performance or 30-minute stress result.
Wide route was inspected too: 405×720 portrait canvas at left 437.5 in 1280×720
(`edge-final-built-wide.png` plus JSON). Temporary proof tab/server closed.

## Current pass: real illumination and model depth (2026-09-09)

The previous volume milestone below was rejected for flat lighting and weak
models. This pass changes the rendering mechanism, not only exposure values:

- Authored Survival Forest ground now uses a lit Standard material, with subtle
  bump relief. Other biome and mission ground materials retain their own paths.
- Blender Cycles bakes the actual instanced geometry's direct-sun visibility for
  all seven Forest tiles. Runtime and baker share `forest-placements.js`; layouts
  are seed-independent and tested. Seven 768-square WebP maps total 469,408 bytes.
  They attenuate direct sunlight only; cool hemisphere fill remains in shade.
  No runtime shadow-map pass, additional real-time light or postprocessing pass.
- Shared Blender export bakes short-range occlusion into vertex colours (including
  leaves). Continuous three-axis material projection replaces per-face seams;
  ceramic and bark retain different roughness using the same existing atlas.
- Boulder rebuilt as an eroded, fractured volume; collider regenerated from that
  mesh. Arch panels have more natural bevels/normals and thicker binding roots.
  Middle-border tree groups and embedded low stones add actual spatial variation.
- Ground photographic warmth is reduced before the warm key light is applied,
  and micro-relief is moderated to avoid noisy, orange highlights.

30 focused tests pass: light isolation, shared atlas/vertex AO, deterministic
placements, all seven lightmaps, collision/large-body routes, ambient systems,
100 world seeds and separate mission contracts. Source checkpoint `light-v4b-390`
shows coherent tree shadows, 39 calls / 288,132 triangles / 23 textures, no errors.
This is an intermediate fidelity improvement, not an 8/10 visual acceptance.
Crowns and ceramic silhouette still need refinement against the reference.
The controlled p95 comparison, 50-transition stability and 30-minute browser
stress gates remain open; no physical-phone temperature result is claimed.

Optimized production for this lighting pass is **103,523,479 bytes**; the eight
shared Forest GLBs total **1,813,548 bytes**. `light-built-390.mp4` was decoded and
sampled frames inspected: coherent static illumination during camera-follow,
bounded hero movement and normal combat, birds in telemetry, no runtime/model
errors. Its 31 samples peak at 47 calls / 308,500 triangles / 23 textures; maximum
observed rolling render p95 is 1.9 ms. The 45-call gate remains open, and this
short observation is not a controlled baseline comparison or thermal test.

`light-built-360.mp4` and `light-built-wide.mp4` were likewise decoded and inspected.
360 peaks: 45 calls / 381,300 triangles / 23 textures, rolling render p95 1.9 ms.
Wide peaks: 51 calls / 381,300 triangles / 23 textures, rolling render p95 1.8 ms.
Both record movement, birds and combat with empty error arrays. Wide DOM bounds
are 405×720 at left 437.5 inside 1280×720, preserving the portrait stage.
The aggregate draw-call gate is still NOT passed (wide 51, 390 portrait 47).
`light-reduced-390.json` confirms zero birds/particles/wind with reduced motion,
while contact shadows and baked illumination remain. Setting restored afterwards.
Temporary proof tab and local evidence server were closed after these recordings.

## Latest direction: true 3D, user-approved 2026-09-09

The user rejected whole-environment image cards and explicitly requested light
Blender models with reused textures. This supersedes the hybrid strategy below.
Layout/collision changes in Forest are also explicitly approved; safe-point
access, largest-body routing, combat scale, portrait camera and HUD remain required.

Runtime now uses `forest-sculpt-view.js`: instanced Blender trees with scaffold
branches and individually folded leaves, geometric shrubs and fern pinnae,
fractured boulders, root banks, ceramic arch, fallen equipment and low bedrock.
Survival Forest no longer imports `forest-detail-view.js`, loads the environment
shell atlas, or renders the old flat perimeter and fern-spray pictures. Mission
environment profiles retain their existing separate implementation.

All hard surfaces reuse `materials-v2.webp`; foliage uses vertex colour on real
geometry. No new texture was generated for this pass. Sources are reproducible
with Blender scripts `scripts/art/forest-volume-v3.py` and `forest-sculpt-v2.py`.
The unused second tree GLB and rejected environment-card WebP have been moved
from runtime assets into this art directory; both remain recoverable here.

Forest layout is now authored asymmetrically in `src/forest-layout.js`. The new
boulder collider is derived from the exported Blender mesh; the arch uses two
rotated pillar colliders with a traversable opening, not an invisible solid box.
26 focused tests passed, including 100 world seeds without fallback, an actual
simulated full-ring traversal, largest-body Forest routes, mesh/collider parity,
ambient behaviour and unchanged mission-environment contracts.

This is a change of rendering approach, not a claim of reference-quality 8/10.
The 30-minute browser stress and 50-transition GPU-resource acceptance remain open.
No physical-device thermal claim is made. Older hybrid evidence below is history,
not the current runtime implementation.

Optimized production build of this volume pass: **102,592,269 bytes**. Its eight
Forest GLBs total **1,370,000 bytes** (shared by every instance): tree 659,484;
shrub 126,236; fern 17,892; boulder 21,808; relic 102,340; arch 343,788;
root bank 75,724; bedrock 22,728. The shared material atlas already existed.

`volume-built-390.mp4` was decoded and its sampled frames inspected: the hero
remains visible during bounded movement and combat, models retain volume as the
camera follows, birds and combat are recorded, and no asset/runtime errors are
reported. Peak 56 calls / 249,494 triangles / 21 textures. Static 390 CSS-pixel
frame: 45 calls / 228,132 triangles / 21 textures; capture cadence correctly 30.
The call budget (45) and +10% p95 baseline gate are NOT accepted. The observed
render p95 window reached 4.2 ms. Current visual fidelity also remains below the
approved reference: sparse middle-edge massing, overly regular ceramic segmentation,
and insufficient ground/plant material depth need another art pass. Do not call
the overall Dream-loop plan complete based on this replacement milestone.

Built-route 360×640 and wide 1280×720 clips were also decoded and sampled frames
inspected. Wide DOM measurement: centered 405×720 scene, left 437.5 CSS px.
360 clip peak: 55 calls / 282,808 triangles / 21 textures. Wide clip peak:
52 calls / 283,696 triangles / 21 textures. Both contain bounded movement,
birds and combat, with empty error arrays. Still frames and MP4s use the prefix
`volume-built-` under `docs/proof/forest-living-20260909`. These are honest
intermediate 3D evidence, not a passed final visual/performance gate.

`volume-reduced-390.json` verifies reduced motion on the built route: birds,
particles and wind are zero while static contact shadows remain. The setting
was switched back afterwards. No guaranteed background browser-cleanup timer
has been installed; proof tabs are closed explicitly after active recording.

## Structural pass after the user's rejection

Task-local process-memory ceiling: user explicitly authorized 20 GiB for this
task (not a global preference update). New assets are stored in this directory:

- `materials-source-v2.png`: built-in imagegen, 2×2 flat material atlas of worn
  ivory ceramic, dark bark, fractured gray limestone and fine forest soil/moss.
- `environment-source-v4.png`: selected built-in imagegen atlas of four isolated
  black-key environment clusters: root/stone/tree bank, rooted ceramic arch,
  fallen ceramic machine, forest shrub bank. Requested the approved 46° downward
  camera, warm upper-left light, cool fill, desaturated foliage and cinematic
  physically plausible materials. Master style image and approved target attached.
  Follow-up prompt corrected framing: complete silhouettes within cells, pure
  black margins, unchanged subjects/style. V3 is retained as a rejected cropped variant.
- `forest-ruin-arch-v2.blend`, `forest-root-bank-v2.blend`, `forest-bedrock-v2.blend`:
  authored by `scripts/art/forest-sculpt-v2.py` in a separate headless Blender
  process; GLB derivatives in `public/assets/kit`. No user Blender scene touched.

Runtime texture exports: `materials-v2.webp` and `environment-v3.webp` under
`public/assets/biomes/forest-living` (the latter contains selected source v4).
This is an explicitly hybrid 3D/2.5D implementation. The central arch and complex
foliage silhouettes use image-based detail shells, not fully reconstructed 3D
photoreal geometry. Outer-path arch, root banks and shallow bedrock are real meshes.
The shells share a single instanced batch per tile, keyed black background, and
wind in their foliage only. They require runtime occlusion/motion validation.

The authored three-mesh set costs 7,960 / 1,606 / 496 triangles respectively.
`hybrid-v2-390` is a development checkpoint, not an 8/10 acceptance: 42 calls,
49,346 triangles, 32 textures, observed render p95 1.2 ms. An isolated production
build before the latest seam correction measured 102,018,317 bytes.

At this historical checkpoint layout approval had been requested separately.
The user subsequently approved it; the new volume pass above replaces those
fixed collider islands. The original stress and full visual acceptance remain open.

19 focused tests passed in this structural pass. The first `hybrid-v2-360.mp4`
was decoded and inspected, and exposed a fixture problem: small directional input
was normalized by normal gameplay movement, carrying the hero out of the intended
Forest checkpoint. That clip is diagnostic only (peak 52 calls / 48 textures),
not Forest acceptance. The fixture now uses bounded destination points through
the ordinary movement system.

Corrected `structural-390.mp4` (390×844, 32 seconds) was decoded and its sampled
frames inspected. Hero x stayed 252.50–256 and z stayed 4–6.77; calm, movement,
birds and combat appear in telemetry, with no asset or runtime errors reported.
Peak 52 draw calls / 69,428 triangles / 36 textures. Draw-call acceptance is
therefore still OPEN, not passed. `structural-390.png`, `hybrid-v2-360.png` and
`hybrid-v2-wide.png` were inspected; wide stage remains 405×720 at 1280×720.
Latest measured related-process RSS before cleanup: 16.03 GiB, under this task's
authorized 20 GiB ceiling. No physical phone or 30-minute stress result is claimed.

2026-09-09: the user explicitly removed the 99,400,000-byte production cap.
Reference fidelity takes priority over download size. Portrait framing,
collision clearances and phone rendering/thermal checks remain required.
No new numeric size cap has been invented. The proof build still reports bytes.

Built-in imagegen was used, with `docs/references/biomecha-style-master.png`
attached as the authoritative material/light reference. No CLI/API fallback.

## Prompt set

- Ground: photorealistic seamless orthographic forest-path base colour; irregular
  weathered gray limestone embedded in brown earth, sparse moss and dry leaves;
  uniform exposure, no broad cast shadows, no perspective, characters or structures.
- Foliage: four separate botanical sprays in a 2×2 atlas: oval-leaf twig, fern,
  ivy and narrow-leaf branch; muted olive, natural veins and imperfect edges,
  warm upper-left highlights/cool fill, transparent holes and background requested.
- Foliage correction: remove the baked checkerboard only, preserve all four
  sprays and output true RGBA. The generator again returned RGB. This defect is
  documented, not represented as successful alpha generation.

- Replacement foliage prompt: same four botanical sprays, deliberately pure
  black RGB background, no checkerboard, no transparency request, soft photographic
  olive leaves and fine stems. Runtime luminance key rejects black before depth writes.

Selected sources: `ground-source-v1.png`, `foliage-source-v2.png` in this directory.
`foliage-source-v1.png` is a rejected checkerboard variant, retained for provenance.
Runtime WebP exports (quality 94, no rescaling):
`public/assets/biomes/forest-living/ground-v1.webp` (988,034 bytes),
`public/assets/biomes/forest-living/foliage-v1.webp` (black-key source v2).
The RGB foliage uses a material luminance mask. It is not an RGBA alpha atlas.

This is a real renderer iteration, not final Dream-loop acceptance. Remaining:
reference-quality architecture/composition, visual score ≥8/10, fresh built
390/360/wide clips, complete draw/triangle/texture/p95 budget assessment,
50-transition/reset resource stability and 30-minute browser stress run.
No physical-phone temperature claim is made.

## Current checkpoint (source/dev, not optimized production acceptance)

11 focused tests pass, including foliage geometry/mask, ambient state, clearance
and perimeter contracts. Real route screenshots: `art-v3-390`, `art-v3-360`,
`art-v3-wide` under `docs/proof/forest-living-20260909`.
390×844: 41 draws, 97,504 triangles, 31 textures, render p95 2.5 ms.
360×640: 42 draws, 107,357 triangles, 35 textures, render p95 5.1 ms.
Both captures: no asset/loading errors. Wide viewport is 1280×720 with an
unchanged centered 405×720 portrait stage. No browser console errors observed.
The timing difference requires fresh controlled optimized-build measurements;
this checkpoint does not establish the 10% p95 regression gate.
The new source assets total 1,254,366 bytes. A fresh complete production build
size has not yet been measured after this replacement.
