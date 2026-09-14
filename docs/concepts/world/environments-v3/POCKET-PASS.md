# Environment density pass — 2026-09-10

Request: continue; the world feels empty.

- Added deterministic, irregular low-growth pockets to all five mission families and non-authored survival environments. Safe points and central lanes remain clear. Authored survival Forest sculpture/bake is unchanged.
- Added four smaller companion 3D obstacles per normal mission room, using existing family models and normalized GLB collision bounds. Boss-room layouts unchanged.
- Forest/City/Nursery reuse the existing 324-triangle fern and shrub; gardens and scrap use bent opaque 3D grass geometry (84 triangles per tuft), not alpha cards.
- Removed the duplicated old mission ambient/foliage renderer. Pocket height uses each model's real bounds, avoiding flat ground-hugging plants. Grass reduced to half-height after screenshot inspection.
- No new runtime asset files, textures, lights, shadow maps or postprocessing passes. Per-model instancing and existing per-instance culling/disposal remain active.

22 focused tests pass: routes/spawns, model hulls, five families, seams, deterministic placement, safe points, central clearances and procedural geometry. Build passes with existing asset/CSS and chunk-size warnings.

Evidence in `docs/proof/forest-living-20260909`: `pockets-{garden,quarantine,core,nursery,mother}-v3-390.png/json`, overview `pockets-five-v3.png`, Forest `pockets-forest-before-after.png`. Screenshots are unretouched; comparison changes only size/padding/labels.

This is a density improvement, not final reference-quality acceptance. Existing other-task side walls/blackout remain unchanged. No physical-device heat test or long stress/resource stability claim.

Final 390×844 captures: all five report zero asset errors / failed models. Triangles: gardens 331,176; scrap 310,080; Forest 504,840; City 430,668; Nursery 435,062. Forest before this pass was 904,016 in the same middle-room fixture. This triangle reduction is not a claim of equivalent GPU-time or phone-temperature improvement. Total draw calls remain 168–177 with existing mission fences; original budget is not met.

Forest additionally checked at 360×640 and 1280×720 (`pockets-core-v3-360`, `pockets-core-v3-wide`). New growth does not cover the central hero; previously documented boundary masking still fails visual acceptance.
