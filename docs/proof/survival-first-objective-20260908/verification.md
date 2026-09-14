# Survival opening objective

Verified through the normal Home → Survival → Loadout → Start route in the Codex in-app browser. Production bundle preview used for stable captures after development hot reloads interrupted the first check.

- New run: visible `Убейте первого босса` / `Kill First Boss` badge; compass targets `Первый босс` / `First Boss`.
- Map and compass both open the map with the introductory boss marker selected (`aria-pressed=true`).
- 360×640: game width 360; Russian badge width 155.33, height 20; text scroll width equals client width (153). Map width 344, no horizontal overflow.
- 390×844: game width 390; Russian badge width 155.33, height 20; no text overflow. Map width 374, no horizontal overflow.
- 1280×720: centered portrait stage width 405; badge remains inside the stage with no text overflow.
- Saved mobile and desktop screenshots inspected visually.
- 14 focused tests passed: survival objective, waypoint behavior, introductory boss, mission UI regressions. Includes four seeds, tracking, death/removal, manual waypoint preservation and mission isolation.
- `npm run build` passed. `git diff --check` passed for touched files.
- Broader checks have unrelated failures: `hud.test.mjs` cannot import existing CSS in Node; the full i18n coverage check lists untranslated credits and existing map phrases. No claim that the entire suite passes.

Boss defeat completion is covered by simulation tests; the browser verification covers the actual opening state and map selection.
