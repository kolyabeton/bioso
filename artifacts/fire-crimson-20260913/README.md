# Fire spread replacement — 2026-09-13

Changed only `src/systems/soul-fx-view.js` in production code. Replaced the type-0 tapered triangle mask with soft advected billows, compacted shared flame bursts, and replaced the evenly spaced wildfire row with 8 irregular short-lived particles (5 low quality / 3 reduced motion). Burn damage, stacks, propagation rules and the separate body-attached fire renderer are unchanged.

The fixture runs the actual game renderer and invokes `onDeath` with a burning source and six living runtime enemies, producing real spread events. It overrides walkability and enemy health/movement only for a controlled visual comparison. Start with `node artifacts/fire-crimson-20260913/server.mjs`, then open `http://127.0.0.1:5311/?review=fire-proof`; add `&still=0.15` for a still. `--before` serves the saved original renderer.

- Reproduced the user's red spike chain with the original renderer.
- Inspected final fire at desktop and 390 × 844 through Codex iab. No browser console errors.
- Captured `fire-mobile.mp4` from the real WebGL canvas; decoded all 12 sampled frames (`video-inspection/contact-sheet.png`). Duration 3.098 s; rolling flame fades between repeated ignitions, no rigid spike row.
- `node --import ./scripts/register-test-loader.mjs --test tests/soul-fx.test.mjs tests/wildfire-stress.test.mjs`: 12/12 PASS.
- Vite production JS/CSS bundle check with `publicDir:false`: PASS, 299 modules. This is a code compilation check, not a packaged asset/export check.

`after-mobile.png` and `after-desktop.png` show the final implementation. `before-desktop.png` is the original shader at the same event phase; desktop window size differs between captures.
