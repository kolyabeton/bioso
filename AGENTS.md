# bioso

## Game ZIP delivery

For requests such as «скинь зип игры», follow `.cursor/rules/bioso-game-zip.mdc`: deliver the current, fully compressed, packaged and verified game ZIP; compare its size with the last approved compressed archive before sending it.

## Mobile UI contract

For tasks that create, change, or review game UI geometry, interactions, or action labels, follow `docs/UI_MOBILE_CONTRACT.md`. On desktop, the world, HUD, and main menu expand as defined there; maps, inventory, and dialogs keep their mobile portrait bounds.

Run the contract's full route and viewport checks for implemented UI changes before calling them complete. For concepts without a game route, validate the requested sizes and mobile composition instead.

For new environment images or visual asset generations, first read `docs/art/VISUAL_STYLE.md` and attach `docs/references/biomecha-style-master.png` as the style reference. This user-approved cinematic realistic style supersedes older painterly/ornate interpretations. Preserve the requested game projection; the reference defines materials, palette and light, not the camera or robot content.

When editing Survival biome code in `src/biome-*.js` or `src/elevation.js`, preserve unrelated current work and compatibility with existing mission-world callers.

## Model and material reuse

For 3D model creation, generation, or modification, follow `.cursor/rules/bioso-model-material-reuse.mdc`.

## Item presentation contract

Before changing item parameters, labels, descriptions, cards, inspectors, atlas or build comparison, read `docs/UI_ITEM_CONTRACT.md` and follow `.cursor/rules/bioso-item-presentation.mdc`. The contract fixes row lists, order, units, conditions and shared presentation; do not add calculated stats (including item DPS) or item-specific exceptions without an explicit user request. Keep `tests/item-presentation-contract.test.mjs` aligned only with user-approved changes, never regenerate expectations just to pass a failing test.
