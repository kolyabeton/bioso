# Reference-driven 3D detail pass — 2026-09-10

Ten native Blender props, two silhouettes per environment. No bitmap scenery and no new runtime textures. Shared ceramic/bark/stone/soil atlas, vertex AO and procedural matte oxidised metal. Source: `scripts/art/environment-story-props-v1.py`; editable Blender files in `docs/art/forest-living-assets/`.

| Environment | New objects |
| --- | --- |
| Upper gardens | Open irrigation cylinder, broken drainage basin |
| Quiet scrapyard | Broken turbine with radial blades, hollow pipe bundle |
| Root forest | Hollow fallen trunk with shelf fungi, rooted utility cache |
| Overgrown city | Broken utility cabinet, exposed cable duct |
| Brood nursery | Ribbed seed clutch, layered organic fans |

All five mission families now use their own pair in place of the previous duplicated small companions. Four placements per ordinary room; boss layouts remain unchanged. Non-authored survival cells get two matching props. The authored survival Forest placement/lightmap contract remains unchanged; its new pair is currently mission-only.

Exact GLB-derived convex collision bounds are registered. New models total 990,820 bytes after the existing production optimiser (1,672,764 raw bytes). Latest whole production snapshot: 108,618,028 bytes. No claim that unrelated concurrent changes are part of this delta.

## Checks

`node --test tests/environment-story-props.test.mjs tests/environment-profiles.test.mjs tests/mission-environment.test.mjs tests/environment-pockets.test.mjs tests/biomes.test.mjs`: **26/26 passed**, including 100 survival seeds, traversable seams, mission central lanes, spawns and exact geometry bounds. Production and isolated acceptance builds pass.

Current game captures: `docs/proof/forest-living-20260909/story-*-v2-390.png` with matching diagnostic JSON; assembled `story-five-v2.png`. All five report zero asset errors and no failed models.

| Mission | Draw calls | Triangles | Textures |
| --- | ---: | ---: | ---: |
| Garden | 173 | 215372 | 25 |
| Quarantine | 178 | 196070 | 44 |
| Core | 183 | 384904 | 45 |
| Nursery | 187 | 363672 | 45 |
| Mother | 180 | 345784 | 42 |

Additional captures: `story-core-v2-360`, `story-core-v2-wide`, `story-survival-scrap-v2`. Scrapyard survival sample: 34 calls / 52360 triangles / 22 textures; zero loading or shader errors. These are review fixture snapshots, not sustained performance measurements. Wide capture retains a central portrait playing strip; the review canvas itself spans the browser width.

`story-props-inspection.png` is a separate Blender model inspection render, NOT the game and NOT evidence of runtime lighting. Its UV/material preview approximates the runtime atlas/metal treatment.

## Still open

Reference-level lighting, natural asymmetrical composition and less repetitive room dressing remain unfinished. Current pale edge walls and black off-road masks are visible, belong to the concurrent mission-boundary work, and were not replaced. The historical 45-draw-call/41-texture target is not met in these mission views. No 8/10 visual acceptance, long stress test, GPU residency acceptance or physical-phone thermal claim is made by this pass.
