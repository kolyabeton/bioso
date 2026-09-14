# bioso

## Mobile UI contract

For tasks that create, change, or review game UI geometry, interactions, or action labels, follow `docs/UI_MOBILE_CONTRACT.md`. On desktop, the world, HUD, and main menu expand as defined there; maps, inventory, and dialogs keep their mobile portrait bounds.

Run the contract's full route and viewport checks for implemented UI changes before calling them complete. For concepts without a game route, validate the requested sizes and mobile composition instead.

For new environment images or visual asset generations, first read `docs/art/VISUAL_STYLE.md` and attach `docs/references/biomecha-style-master.png` as the style reference. This user-approved cinematic realistic style supersedes older painterly/ornate interpretations. Preserve the requested game projection; the reference defines materials, palette and light, not the camera or robot content.

When editing Survival biome code in `src/biome-*.js` or `src/elevation.js`, preserve unrelated current work and compatibility with existing mission-world callers.

## Model and material reuse

For 3D model creation, generation, or modification, follow `.cursor/rules/bioso-model-material-reuse.mdc`.
