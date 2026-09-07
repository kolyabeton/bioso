# Game languages

English is the default. Settings stores `language: "en" | "ru"` under the existing `biomecha.settings.v1` key. Older settings migrate to English without changing audio or graphics preferences. A language change applies immediately and does not restart a run.

The existing Russian copy is the source language. `en.json` contains English phrases for screens, HUD, catalog data, abilities, events and notifications. `translateText` matches the longest whole phrases, preserves numbers, and handles composed text and units. Add full phrases for new copy; use explicit patterns in `translateText` when dynamic grammar requires reordered words.

`createLocalizer` translates DOM text and accessible labels, titles, alt text and placeholders. It retains original values in weak maps for lossless switching back to Russian. Game identifiers, storage, HTML structure and event handlers are untouched. A scoped attribute filter avoids observing animation styles and classes; only changed or inserted content is processed. Screens also localize synchronously before pagination measures the text. Mark content `translate="no"` to keep it verbatim.

Run `node --test tests/i18n.test.mjs`. The coverage check scans production JavaScript literals, template fragments and the game HTML; developer-only review/debug text is excluded. Verify new copy in the actual game at 360×640, 390×844 and a wide browser, with one-line action buttons and unchanged portrait stage bounds.
