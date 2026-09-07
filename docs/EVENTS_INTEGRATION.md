# Events: world → map → interaction → outcome

Implemented 2026-09-07. Public events share presentation IDs in `src/gameplay-modules/event-presentation.js`.

| Event | Existing model | Behavior |
| --- | --- | --- |
| Хирургический алтарь | arch-stairs.glb | One confirmed trade per run; existing HP/slot and fused-hand rules |
| Запечатанный питомник | arch-gate.glb | Closed arena; 45 seconds and all challenge enemies defeated |
| Заражённый круг | arch-planter.glb | 30 seconds inside; leaving pauses progress; healing restrictions retained |
| Охота на носителя | arch-arch.glb | Marked elite, 60-second deadline, no reward on failure |

All models and their preview images come from the existing kit. No generated concept image is used as gameplay UI or as a world-model substitute. The round `arch-stairs` platform is reused as the altar; there was no separately named altar GLB in the kit.

World models are centred on the simulation node. Public events reserve extra clearance from world decorations when placed on the flat map, with a bounded 2000-candidate search. Legacy mission placement and the three secret sprites retain their existing behavior. Terrain and elevation source files are unchanged by this work. Async model loading cannot attach to a retired scene; fallback geometry stays until the existing GLB loads successfully.

Ready, active, reward, complete and failed states drive world labels, rings, map symbols and detail actions. The nearby card opens the actual closest available node, prioritizes rewards, and hides after completion. Simultaneous reveals produce one counted notice. A map selection allows inspection and a waypoint from afar, but actions still require simulation proximity. Rewards remain an explicit single selection, using the shared item inspector; completed nodes cannot pay again.

The mobile detail screen scrolls vertically when needed and keeps the footer visible. Button action labels are one line; hand names and reward names are outside action labels. No stage or shared dialog-width token was changed.

## Verification

- `tests/isaac.test.mjs`: 31 passing, including deterministic seven-node placement over seeds 1–20, legacy painted routes, rewards, trade atomicity, infection, sealed and hunt outcomes.
- `tests/gameplay-modules.test.mjs`, `tests/map-atlas.test.mjs`, `tests/territories.test.mjs`: 14 passing; includes real-model async ownership and one-time batched announcements.
- Acceptance Vite build passes. Existing bundle-size advisory remains.
- In-app browser: infection started through the real button, completed after 30 seconds, reward inspected and claimed, completed state shown, nearby button removed, item pickup observed. Altar trade cancelled, alternate trade accepted, HP price and completion displayed. Map inspection from a distance offers a route instead of starting a challenge.
- Viewports 360×640, 390×844, 1280×720: portrait stage retained, detail widths 344/374/389 respectively, no horizontal overflow; footer actions 44px high. Altar disclosure/scroll checked on 360×640. Map full event title and actions checked on 360×640.
- Current visual evidence: `outputs/events-integrated-20260907/`. Final test logs: `final-tests.txt`.
- Screenshots use the actual game route with opt-in `?review=isaac&screen=altar|sealed|infection|hunt` prepared start state, not a production playthrough from level 1. Review storage is ephemeral. Final preview: port 5401, `output/event-acceptance-final`.

## Reusable interaction highlight

`src/vfx/interaction-highlight.js` provides a local-space gold ground halo, deterministic rising particles and an optional warm emissive accent on the existing model. Options: radius, height, color and bounded particleCount (maximum 48). `setModel` clones only materials and restores their original shared references on dispose; geometry and textures remain owned by the kit. `update` accepts visibility, time, intensity and reducedMotion. No RNG, gameplay state, real lights, or postprocessing dependencies.

Public event models use this component while ready or holding an unclaimed reward. It fades with distance (full nearby, off at 28 world units), uses the paused combat clock, stops on active/completed/failed/dead states, and uses a static halo without particles for reduced motion. The challenge boundary ring remains a separate gameplay indicator. Two dedicated tests cover deterministic motion, material ownership/disposal and event lifecycle integration.

Highlight verification: 7 focused tests pass and acceptance build succeeds. Real game inspected at 360×640, 390×844 and wide 1280×720. Confirmed an altar trade through the UI and inspected the completed object with the highlight gone. Recorded real WebGL canvas at 390×844; `outputs/interaction-highlight-20260907/altar-particles.webm` decoded successfully (231 frames, 7.953 seconds), and early/late frames were visually inspected. This is the prepared review route, not a level-1 playthrough. Preview runs on port 5402.
