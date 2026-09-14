# Civilian part names — 2026-09-13

- Route: real local playtest at `http://127.0.0.1:5313/`; the frozen build on port 5194 was not used or changed.
- Languages: Russian and English.
- Viewports: 360×640, 390×844, and 1280×720.
- Screens: the Parts Atlas item list, all eight sets, loadout, and the in-run build screen.
- Result: all 43 item names and all eight set names are present; no horizontal overflow or clipped visible headings/buttons; the catalog and set lists scroll to their final entries.
- Automated checks: `npm test` — 1068 passed; `npm run build` — passed.

Mobile proof: `sets-390x844.png`.
