# bioso: five environment targets, pass 1

User direction: make a separate reference for each environment, implement against it, retain and improve Root Forest, reuse object textures. Generated with built-in imagegen. Full prompts and input roles: [PROMPTS.md](PROMPTS.md).

| Mission / shared survival family | Target | Visual contract |
| --- | --- | --- |
| Верхние сады / upper-gardens | [garden](garden-target-v1.png) | Pale broken limestone terraces, dry soil seams, slender trees, irrigation ceramic |
| Тихая свалка / quiet-scrapyard | [quarantine](quarantine-target-v1.png) | Compacted charcoal dirt, tracks, heavy engines, curved worn casings, sparse dry growth |
| Корневой лес / root-forest | [core](core-target-v1.png) | Gray stony track, rooted ceramic arch, layered ferns and broken canopy |
| Заросший город / overgrown-city | [nursery](nursery-target-v1.png) | Fractured concrete plates, utility ruins, rebar, vines, pioneer growth |
| Роевой питомник / brood-nursery | [mother](mother-target-v1.png) | Fibrous earth, radial roots, hollow ribs and clustered seed cocoons |

These targets refine the shared style; they are not screenshots or separately user-approved final art. The earlier approved Forest target is preserved. No concept image is a runtime background.

## Implemented in this pass

- All five targets saved outside production. No new runtime texture/model files added.
- Shared ground shader: larger material scales, overlapping sampling to reduce obvious repeats, family-specific wear/soil, clearer mineral Forest path.
- Shared lighting: caster height taken from real obstacle bounds; cool fill retained, only direct sunlight shadowed.
- Mission side relief reaches its full height nearer the visible shoulder. The central 9-metre combat strip stays flat.
- Forest mission uses existing sculpted root banks, relic and ceramic arch, with normalized mesh collision hulls. No new GLB.
- Existing forest/environment GLBs batched per model primitive, including repeated mission props.
- One instanced batch of ankle-high stone/steel fragments at existing scenery shoulders. No added solid obstacles or new textures.
- Shared materials/fragment rendering apply to survival families as well. Authored Forest survival sculpture/lightmap path is retained.

## Verification and remaining work

30 focused tests passed: five mission routes/spawns, normalized model bounds, 100 survival seeds, transitions and safe-point connectivity, shader bindings, one-batch fragment clearance and Forest arch.

This is NOT final visual acceptance and is not rated 8/10. Major remaining gaps: richer clustered vegetation and utility silhouettes, stronger coherent object/ground shading, authored compositions at all room variants, further repetition reduction. The target is not reached just because the surfaces differ.

The shared worktree concurrently changed mission side fences, off-road blackout and camera. Current side-wall rendering intrudes into the reference composition; those other-task changes were not overwritten. Resolve that boundary treatment before final visual acceptance. Current screenshots therefore include those boundaries.

No new 30-minute stress, 50-transition GPU resource audit or physical phone thermal test was performed. Existing scene draw-call budgets are not certified by this pass.

## Current browser evidence

Five missions captured at 390×844: `docs/proof/forest-living-20260909/targets-{garden,quarantine,core,nursery,mother}-v3-390.{png,json}`. All report zero asset errors and no failed models. Forest also captured at 360×640 and 1280×720 (`targets-core-v3-360`, `targets-core-v3-wide`).

The wide capture exposes black off-road panels and pale continuous side-wall strips; the side panels also occupy part of the 360×640 view. This fails the visual reference gate. Do not hide it by cropping the proof or report the portrait/desktop acceptance as passed.

Current complete scenes report 167–178 draw calls; Forest 904,016 triangles. These include the current separately changed side-fence/camera path and are not a controlled before/after benchmark. The original performance gate is NOT passed. Shared shader/model work is a first implementation pass, not a completed quality/performance deliverable.

Overview files: `targets-five-v3.png` (concept targets), `actual-five-v3.png` (actual clean-canvas captures) in the same proof folder. Comparisons use only resize/padding/labels, no retouching.
