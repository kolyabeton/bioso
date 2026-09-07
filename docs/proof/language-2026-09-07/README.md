# English / Russian verification

- English is the default for new settings and settings saved before language support.
- Settings → Language → EN / RU switches immediately. Russian persisted after reloading the real `/` game route; English was restored afterward.
- Checked `/`: home, loadout, running HUD, pause, settings, switching languages during a paused run, return to pause, and scrolling settings to the final controls.
- Checked the real game renderer with development fixtures: `?review=level` (select and apply an ability), `?review=catalog` (items, sets and expanded set bonuses), `?review=map`, and `?review=assembly` (including the part inspector).
- Both languages checked at 360×640, 390×844 and 1280×720 in Codex's in-app browser. No horizontal overflow or wrapped settings action labels. Dialog widths: 344, 366 and 389 px; game-stage widths: 360, 390 and 405 px. See `viewport-checks.json`.
- Current mobile screenshots: `settings-en-360.png`, `settings-en-390.png`, `settings-ru-390.png`. Wide view: `settings-en-wide.png`.
- `node --test tests/i18n.test.mjs`: 4/4 pass, including production-copy coverage, persistence, migration and dynamic text. See `i18n-tests.log`.
- `npm run build`: PASS; Vite retains its large-chunk warning. See `build.log`.
- Full `npm test`: 375 passed, 9 failed. Five failures concern Node importing existing CSS dependencies; four concern event notices, organ mounts and item comparison expectations in untouched modules. These unrelated failures were not changed in this task. See `full-tests.log`.
- Final browser console inspection returned no warnings or errors.
