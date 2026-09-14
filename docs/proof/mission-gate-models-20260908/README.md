# Existing 3D gate and barricade assets

Replaced the procedural box fence with `arch-gate.glb`, `arch-wall-straight.glb` and `arch-pillar.glb`. Original GLBs and their materials remain unchanged. The gate mesh is bisected at its centre seam at load time, preserving UVs and interpolating cut triangles; the two halves slide outward after clearance. Collision depth and height now match the fitted 12-unit-wide gate (approximately 3.92 deep and 9.14 high). The 9-unit clear opening and portrait stage bounds remain unchanged.

Current checks are recorded in `final-focused-tests.log` (8 passed), `final-build.log` and `browser-proof.json`. The earlier broader run in `tests.log` passed 50 checks; an independent mission-roster update landed during the visual verification, so the final focused run uses that newer roster and does not assume a fixed enemy count.

The actual GLB geometry tests verify preserved surface area, attributes, source material identity, unmodified source geometry, asynchronous loading, world reset and disposal. Gameplay tests cover the last defender, events, large-body passage and post-clearance reward pickup without duplication.

Browser verification uses the actual production mission/render/movement/damage functions in the isolated development checkpoint `?review=mission-environment&mission=garden`. Simulation is paused and the player invulnerable; test buttons defeat defenders. This is visual and interaction evidence, not an unaided playthrough.

- 390×844: closed gate blocks movement at Z −29; native GLB assets loaded without errors.
- 360×640: gate stays closed with one defender; last kill opens it; the side remains blocked, centre movement reaches room 2 at Z −41.
- 1280×720: game stays in the 405×720 portrait stage without horizontal overflow.
- `closed-390x844.png`, `last-enemy-360x640.png`, `open-360x640.png`, `wide-1280x720.png` were inspected after capture.

Temporary in-app browser tab closed; viewport override reset.
