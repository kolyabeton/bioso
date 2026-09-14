# Dungeon testbed verification — 2026-09-12

Route: `/?review=dungeons&lang=ru`, variants `dungeon=roots` / `dungeon=catacombs`.
Initially checked on the existing Vite server at 5178; final mobile check on the dedicated server at 5186 after 5178 stopped.

- Actual game route inspected in Codex IAB at 360×640, 390×844 and 1280×720.
- Panel widths: 336 / 366 / 381 CSS px; no horizontal overflow.
- All 11 controls measured at both mobile sizes: one line, text fits, height 44 px.
- Root dungeon: 12 enemies. Started real combat, paused at 6.3244 elapsed seconds; survival time remained 900. Jump, exit, return and clear worked; 12 real dungeon items appeared.
- Catacombs: 18 enemies. Clear produced 18 items (catacombs-clear.json); reset restored all 18. Immortality toggle, scroll to conditions and production encounter dialog verified.
- Production encounter dialog at 390×844: width 374, x=8; clientWidth=scrollWidth=364.
- 18 focused simulation/regression tests passed (tests.log).
- Vite acceptance compilation passed using publicDir:false to avoid copying the asset library or replacing another task's build. This is a compilation check, not a packaged release build. Existing large-chunk warning remains.

This proof captures the first linear testbed revision. The branching graph revision supersedes it; see `../dungeon-graph-20260912/README.md`.
