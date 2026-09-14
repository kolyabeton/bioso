# Sealed Nursery timer audit — 2026-09-08

No gameplay rules changed. Added `tests/sealed-timer.test.mjs`.

`node --test tests/sealed-timer.test.mjs tests/sealed-pressure.test.mjs tests/isaac.test.mjs`: 43 passed, 0 failed.

The added game-loop regression starts via beginEncounter, resets stale elapsed time, clears enemies before every frame, denies reward collection before 45 active seconds at 20/30/60/120 FPS, and verifies a single reward at 45 seconds. Level-choice and boss-reward pauses do not advance the timer. Death cannot grant a reward. These are deterministic simulation tests, not a wall-clock browser victory recording.

Browser route: `/?review=isaac&screen=sealed`, real game with the existing isolated review profile and starter fixture. The primary development server at port 5173 reloaded the page during the attempt, returning it to the event-entry screen. Console recorded repeated Vite connections at 13:54:25.147, 13:54:33.517 and 13:55:15.884 UTC. This verifies an interruption during this audit, but does not establish the cause of the user's earlier report.

A temporary Vite instance at port 5297 with `hmr:false, watch:null` avoided automatic reloads. The unattended starter creature died during the trial and reached the defeat screen; early reward was not observed. No 45-second browser victory was established.

Screenshots show actual entry at 360×640, 390×844 and 1280×720, preserving the portrait stage and the separate `0 / 45 s` event counter. They document UI visibility at entry, not completion timing. The temporary tab and server were closed after inspection.
