# Elite variety verification — 2026-09-08

Changes: survival elites rotate between projectile, acid and melee recipes after ranged unlock at 30 seconds. Existing equipment, projectile visuals and acid warning/impact effects are reused. Ranged elites skip unreachable backup weapons and hold firing distance during recovery. Mission assembly rules and boss attack selection are unchanged.

Focused tests: 36/37 passed across elite-tactics, enemy-assembly, enemy-tactics, enemy-acid and final-survival-boss. All six new elite tests passed, covering natural promotions, recipe rotation, independent RNG, repeat fire, movement during recovery, repeat acid with dodging, melee fallback, freeze and visibility. The existing enemy-assembly phase-budget test expects 9,100 final-boss HP at time zero, while the current final-boss contract specifies 110,000. That separate final-boss assertion was left unchanged; all four final-survival-boss tests passed.

Production build passed (`npm run build`); Vite reports its existing large-chunk advisory. Scoped `git diff --check` passed.

Visual verification: Codex in-app browser, actual game renderer and simulation at `http://127.0.0.1:5173/?review=enemies&fixture=elite-tactics`. This is an explicitly labelled development fixture with three naturally selected elites, starting time 180 seconds, invulnerability, no player weapons, and suppressed timed waves. It is not a normal fresh-run or balance acceptance test. Inspected a travelling seed projectile, the acid impact around the player, and the approaching melee unit. No browser console errors were observed.

Screenshots: `elite-390.png`, `elite-360.png`, `elite-wide.png`. Viewports checked at 390×844, 360×640 and 1280×720; measured portrait stage at 360×640 and 405×720 respectively for the latter two, without page horizontal overflow. Temporary viewport overrides are reset after verification.
