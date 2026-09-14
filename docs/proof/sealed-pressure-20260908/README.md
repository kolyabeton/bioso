# Sealed Nursery continuous pressure

- Reinforcement groups arrive every 1.5 / 1.25 / 1 seconds during the three 15-second phases. Below three living challenge enemies the next wait is shortened to 0.5 seconds.
- Group sizes are 3–5 / 4–6 / 5–7 for challenge tiers I / II / III. Living-enemy caps are 12–16 / 16–20 / 20–24 across the phases. Blocked emergence positions are retried on subsequent pulses; no backlog accumulates.
- Enemies emerge on walkable arena edges at least three metres from the player. Reinforcements preserve challenge health scaling and bypass the ambient every-30th elite promotion.
- Spawning stops at 45 seconds. Surviving challenge enemies must still be defeated before the reward is available.

Validation: `node --test tests/sealed-pressure.test.mjs tests/isaac.test.mjs tests/event-stages.test.mjs` — 42/42 PASS. `npm run build` — PASS (existing bundle-size warning).

The new tests cover first-pack clearance through the actual `step` coordinator, paused clocks, repeated clears throughout 45 seconds, increasing pressure, living-enemy caps, obstruction recovery, final cleanup, and placement across eight actual survival map seeds and all three tiers.

Browser evidence: Codex in-app browser, existing development route `http://127.0.0.1:5173/?review=isaac&screen=sealed`, prepared level-5 scenario, started with the normal Start action. All three captures show 11 enemies after the initial 8, with the global run timer remaining at 05:00. Screenshots were visually inspected. This is a short rendered reinforcement check; full 45-second completion was verified in simulation tests, not claimed as a manual victory with this starter loadout.

- `sealed-360.png`: 360×640.
- `sealed-390.png`: 390×844.
- `sealed-wide.png`: 1280×720, retaining the portrait game stage.

The temporary browser tab was closed after validation and the viewport override reset.
