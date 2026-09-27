# Challenge start restriction removed

Actual game route tested in Codex in-app browser, silent mode:
`/?review=isaac&scenario=challenge-overlap&screen=hunt&sound=0&lang=ru`

Prepared initial state: level 15, an infection challenge with 12 seconds of saved progress, an engaged boss, and the hunt details open. Start enabled; old completion warning absent. Clicking Start closed the dialog and displayed the hunt timer. Later returned to the infection challenge.

Viewport checks: 360x640 (dialog 344px), 390x844 (374px), 1280x720 (389px; world canvas 1280px). No horizontal dialog overflow. Footer buttons 48px high with fully visible one-line labels. At 360x640, scroll reaches 64/64px and reveals the final reward above the footer.

Mobile screenshot: mobile-390.png.

Final UI, localization, event-stage and dungeon suite: 17/17 PASS. Focused behavior results attached. Initial wider run: 44/45; unrelated health trade expectation failed (health trades persist slots and missing health across body swaps and reject lethal trades, expected 2, actual 1).
