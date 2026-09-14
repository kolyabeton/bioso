# Landscape camera audit, 2026-09-08

Status: regenerated, cleaned RGBA atlas installed for the existing image-decoration renderer. Existing production 3D architecture placements are preserved.

The supplied screenshot's white utility building is the city cell in `public/assets/biomes/decor-atlas-v2.png`. Its broad facades and the forest cell's exposed trunks use a lower viewpoint than the live game. The normal orthographic camera has height 42, depth 32 and look-ahead 1.2: elevation atan2(42, 33.2), approximately 51.67 degrees.

The current worktree already assigns 3D architecture models to all three regular decorations per tile in `src/biome-world.js`. The atlas branch remains in `src/biome-view.js`, but these current decorations use the model branch. This task has not reverted that existing work or replaced any active model.

The forest perimeter is a separate set of ground-plane images in `public/assets/biomes/forest-perimeter-v1/`. Its visible canopy and small utility structures were inspected separately on the actual `/?review=forest-border&side=north` route. They are not the screenshot's utility building and have not been replaced by this draft.

`decor-overhead-draft.png` is the second built-in imagegen output using the canonical master reference. The building has a more prominent roof and shorter visible facade; trees have denser overhead crowns. The source and correction prompts are saved alongside it. Generation used built-in imagegen, followed by explicitly authorized local PNG processing with `scripts/prepare-landscape-atlas.py`.

Both raw generations failed export acceptance: RGB with an opaque painted checkerboard, upper subjects crossing the horizontal midpoint. The preparation script removes that background, decontaminates edge colors, removes detached compression specks, and packs the four cutouts into equal 768x512 cells without distorting their proportions. The unprocessed draft is retained for provenance only.

Final atlas: `public/assets/biomes/decor-atlas-v4.png`, RGBA 1536x1024. The existing `TERRAIN_ASSETS.decor` reference now points to it; v2 and v3 remain available. Individual cleaned cutouts and a dark-ground preview are saved in this directory. `alpha-report.json` records cell bounds and transparent/partial/opaque pixel counts. Outer edges and cell dividers are fully transparent.

User correction: v3 still had pale matte contamination on leaves. V4 replaces the binary edge treatment with a six-pixel trimap, estimates foreground coverage from nearby uncontaminated material, removes the checkerboard color contribution, and suppresses low-coverage bright fragments. Opaque interiors are protected. The supplied v3 screenshot showed a real defect; the earlier claim that its edges were clean was too strong. Comparison and fresh runtime captures are in `docs/proof/landscape-defringe-20260908/`.

Runtime proof uses `/?review=landscape-camera&biome=city` (also `forest`, `gardens`, `scrapyard`). This DEV/acceptance-only fixture adds one sample decoration to the real survival world and pauses simulation. It uses the actual camera, world ground, atlas UV selection and image-material branch. It does not change the production world's 3D placements. Screenshots are in `docs/proof/landscape-camera-20260908/`.

Validation: building at 360x640 and 390x844; all four cell subjects inspected at 390x844; wide 1280x720 browser keeps a 405x720 portrait stage. No painted checkerboard or neighboring atlas cell is visible. `npm run build` passes (existing large-chunk warning). Existing asset/biome/flat-survival tests: 11/11 PASS.
