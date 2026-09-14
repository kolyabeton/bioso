# Level-four Collector balance verification

Scope: fixed survival habitat marked level 4 (Mirror Collector). Mission and timed-invader variants keep their budgets. Existing generated runs need a new run to receive the new habitat stats.

Changed: 67,600 -> 600 HP; 2 -> 0.5 damage; movement multiplier 1.35 -> 1; attack recovery multiplier 1 -> 1.25. Armor and both attack phases remain.

- `before-candidates.jsonl`: recorded before the production change. Three-minute moving baseline could not kill the boss; standing still died after one health hit.
- `after.json`: six prepared level-four duels, tier-one claw or pistol, three actual offered abilities, with one hit through armor. All six won in 40.1–84.2 seconds with 1.5 HP remaining. Isolated simulation, not complete survival playthroughs.
- `tests.log`: 48 focused tests passed, including stationary defeat, both phases, projectile/reflection damage, other habitats and mission/roaming boss behavior.
- `build.log`: successful production build.
- `runtime.json` / `runtime.png`: current in-app browser proof on the real survival map, prepared level-four character, live frame loop, background waves suspended. After 20 seconds the boss entered phase two with 243.47/600 HP; player retained 2 HP. No asset errors. This screenshot documents a fight in progress, not a browser victory.
- `proof-server.mjs` + `runtime-fixture.js`: local review instrumentation, outside production sources; run from repository root. URL printed by the server.
