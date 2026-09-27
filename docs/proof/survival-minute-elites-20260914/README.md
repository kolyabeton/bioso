# Survival minute elites — 2026-09-14

Independent map elite schedule starts at 60 seconds and repeats at minute boundaries. Wave quotas, opening-boss survival and ordinary enemy caps do not suppress it. Placement uses the existing collision-aware elite spawner and home territory. Failed placement retries once per second without consuming the scheduled spawn; delayed schedules do not release a catch-up burst.

## Verification

- Focused cadence, quota, boss and minute-elite suites: 27/27 passed.
- Broader game, simulation, territories, first-boss, balance, objective and minute-elite suites: 72/73 passed. The rocket-bee area test fails with 9976 versus 10000 HP; the same failure was independently reproduced using a temporary copy with only this task's game.js import and tick call removed. Temporary copies were removed.
- Vite production code bundle passed (publicDir disabled; asset packaging was not run). Output: temp/survival-minute-elites-build.
- Browser: http://127.0.0.1:5173/?review=survival-boss&elite=1&sound=0&lang=ru
- Browser fixture uses the real Survival world and step at accelerated minute boundaries, removes weapons and protects the player. This verifies scheduling and rendering, not ordinary player difficulty.
- DOM report browser.json: 60 s / 1 elite, 120 s / 2 elites, 180 s / 3 elites, next spawn 240 s; inspected third elite has 853 HP and a walkable home point.
- Inspected game.png and map.png: live elite rendered, all three elite threat markers present, selected nearby marker has 14 m aggro radius. The existing map label for unnamed elites is “Босс”.
