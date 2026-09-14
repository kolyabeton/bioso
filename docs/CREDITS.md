# BIOSO credits

Entry point: Settings → Credits (Настройки → Создатели), last button in settings.

`src/ui/credits.js` owns the contributor and third-party asset list. Add future
music, sounds, fonts and other resources to CREDITS with a verified name,
creator (or explicit uploader role), source URL and license. Add new labels
to `src/i18n/en.json`. Do not infer authorship from an uploader account.

Current creator: Сергей Дорощенко / Sergei Doroshchenko.

Audio sources and CC0 listings rechecked on 2026-09-08:
- Zambian (Lo-fi Loop), holizna: https://freesound.org/people/holizna/sounds/852235/
- Single Pistol Gunshot, uploaded by freesman: https://directory.audio/sound-effects/weapons/39507-single-pistol-gunshot

Original asset provenance remains in `public/assets/audio/CREDITS.md`.
Complete Onest OFL and Three.js MIT notices are copied from installed packages
into `public/licenses/` and displayed in expandable sections in the game.
Refresh these notices when updating the corresponding dependencies.

Validation, 2026-09-08:
- Production build passed.
- Actual home → settings → credits route checked in Codex in-app browser.
- 360×640: dialog 344 px, no horizontal overflow; credits opens at top;
  last settings button has a single-line label and a 48 px touch target.
- 390×844: dialog 374 px, no horizontal overflow; mobile screenshot inspected.
- 1280×720: portrait stage 405 px, dialog 389 px; screenshot inspected.
- RU/EN copy, back navigation, MIT scroll to bottom and OFL expansion checked.
- Existing i18n suite: 4 pass, 1 fails only on unrelated map strings.
  CTA contract test also fails on an unrelated event footer assertion.
- Evidence: `docs/proof/credits-20260908/`.
