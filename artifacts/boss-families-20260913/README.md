# Boss families correction — 2026-09-13

Current evidence supersedes the prior `boss-level4-20260913` Collector-as-habitat screenshots.

- Map habitats use five existing distinct generated assemblies: Warden, Stalker, Orchid, Root Warden and Mother. No mission controller or mission boss GLB is assigned to a habitat.
- Four ordinary habitats use fixed `SURVIVAL_HABITAT_BALANCE` stats. Their radius and placement no longer depend on mission models. The second/third habitat HP budgets were preserved; this is not a complete rebalance of every habitat.
- The generated Mother uses the map curve's 40,000 HP, 35 armor and speed 2.65, plus the existing post-15-minute growth. No extra wave level multiplier is applied.
- Wave bosses still use mission models and mechanics, unchanged wave HP calculation, and the separately named `SURVIVAL_WAVE_BOSS_LEVELS` table.

Validation:

- `tests.log`: all 86 focused tests pass, including all five families, habitats across seeds, final-boss mechanics/growth, wave scheduling and the level-four duel.
- `build.log`: production build succeeded.
- The current map curve is 182 / 1,800 / 4,800 / 12,500 / 40,000 HP with displayed levels 1 / 8 / 16 / 24 / 30.
- Current fourth-habitat duels use a level-24 character, tier-one claw or pistol, 23 earned choices and a hit through starter armor. All six focused runs won in 200.7–288.7 seconds. Background waves and obstacles are excluded; these are not full survival playthroughs.
- `map-level4.json/png`, `map-mother.json/png`, `wave-collector.json/png` are refreshed when the current local fixture is run. Screenshots prove the family/model separation and displayed level, not victories.
- `map-level4-orbit-controller.json/png`: retained failed live-controller run. A simple orbit-only controller died at 19.9 seconds on real terrain with 60 boss HP remaining. It lacks obstacle/telegraph avoidance; no live-browser victory is claimed.

Run the local fixture from repository root using `node artifacts/boss-families-20260913/proof-server.mjs`. Add `&boss=5` for Mother, `&family=wave` for mission-based wave bosses, or `&play=1` for the retained orbit-only controller. Fixture code is outside production sources and uses isolated review storage.
