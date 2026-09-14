# Five environments: mission + survival implementation plan

User scope, 2026-09-09: improve all five mission environments and their mixture
in survival. This supersedes the earlier Forest-only restriction. Preserve
portrait stage, largest-body routes, gates, combat and save contracts.

1. Shared five-environment catalog — implemented; original biome/save taxonomy preserved.
2. Distinct bounded terrain relief — implemented in both mesh and collision sampler; central lanes and tile seams stay flat. Visual relief needs more definition.
3. Upper Gardens — first pass: new Blender terrace bank, stone shoulders and real-leaf planting. Composition not accepted.
4. Quiet Scrapyard — first pass: new buckled service structures, sparse planting and earth treatment. Composition not accepted.
5. Root Forest — real tree/root models reused in missions; survival authored Forest and baked lighting preserved. Reference match not accepted.
6. Overgrown City — first pass: new broken foundations, masonry and open passages. Composition not accepted.
7. Brood Nursery — first pass: new ribbed nesting chambers, organic relief and separate survival tile. Composition not accepted.
8. Survival — all five identities present; shared modules/materials integrated. Close-range landmark framing and visual transitions still need work. Attempt to bring models nearer failed flying-clearance test and was reverted.
9. Materials/light — warm key/cool fill, soft approximate directional ground occlusion, contact shadows, textured relief and shared-clock plant motion implemented. No new realtime shadow pass. Atmospheric polish remains open.
10. Verification — 35 focused tests passed before final material polish; 18 passed after it. All five missions captured at 390×844 and five survival themes at 390×844; previous iteration also checked missions at 360×640 and 1280×720. A 32-second survival movement/combat clip was decoded and inspected. Full final responsive/performance acceptance remains open.

These are implementation tasks, not a declaration that each scene matches the
reference. Visual 8/10, full combat draw budgets, 50-transition resource stability,
30-minute stress and physical-device heat verification remain acceptance gates.

## Handoff at user-requested early stop

- Four new optimized GLBs total 673,744 bytes and reuse the existing material atlas. Blender sources: `scripts/art/environment-modules-v1.py` and `docs/art/forest-living-assets/`.
- Last visually inspected build: 104,840,461 production bytes (not a download/compressed-size claim).
- Proof: `docs/proof/forest-living-20260909/worlds-v5-five-missions.png`, `worlds-v5-five-survival.png`, individual PNG/JSON files and `worlds-v5-survival-brood-390.mp4`.
- Visual gates are NOT passed: room centres remain repetitive; important survival structures are too far from the usual camera; the legacy rounded architecture still contrasts with the new materials. Do not claim 8/10 or reference quality.
- Earlier mission captures exceeded the original Forest draw/triangle/texture targets; no controlled p95 comparison, 50-transition GPU audit or 30-minute stress was completed. No phone-temperature claim.
- Concurrent changes expanded the desktop canvas and updated `docs/UI_MOBILE_CONTRACT.md`. This pass did not author or revert those changes. The original same-portrait-stage desktop gate is therefore not passed.
- Worktree includes many unrelated concurrent changes. Do not reset or replace them.
