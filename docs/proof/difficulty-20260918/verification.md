# Game difficulty verification

- Real home route: `/?review=home&sound=0`, Codex in-app browser.
- Home inspected at 360×640, 390×844 and 1280×720. No horizontal overflow; mobile actions fit and touch targets are at least 44 px. Desktop home and canvas occupy 1280 px.
- Slider keyboard Home/End and intermediate steps update the visible label. Opening settings and returning preserves the selection.
- Choosing Easy and launching the first mission sets the active run difficulty to 0, confirmed from the game DOM.
- Map and inventory routes at all three sizes: dialog widths 344, 374 and 389 px, matching the portrait token minus 16 px; no horizontal overflow. Desktop atlas also remains 389 px.
- Focused tests cover persistence, hard baseline, initial enemy stats, time growth, fixed habitats and mission boss overrides, plus survival and boss compatibility.
- Additional territories suite has an unrelated failure: expected public marker list still includes encounter-altar and encounter-altar_organs, which current encounter data no longer exposes. This task does not change the encounter catalog or marker logic.
