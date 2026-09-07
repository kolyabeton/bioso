# Biomecha

## Mandatory mobile UI contract

Biomecha is a portrait mobile game on every device, including desktop browsers. Before any UI concept, image generation, layout, screen, modal, HUD or UI review, read and follow `docs/UI_MOBILE_CONTRACT.md`.

- The portrait game stage owns UI width. Never override `--game-stage-width` or the shared dialog bounds to fit a screen, tree, inventory or sidebar into a wider desktop window.
- Button action labels must occupy exactly one line at every supported mobile size. Shorten the wording (for example, «Изучить») and put the ability name outside the button; never wrap, truncate, shrink the text or widen the dialog to make it fit.
- An approved image defines visual style and information hierarchy; it does not authorize changing the mobile viewport or existing size limits. Adapt the composition to the mobile stage.
- Validate the actual game route at 360×640 and 390×844, plus a wide browser with the same portrait stage. Desktop screenshots alone are not acceptance evidence.
- If content does not fit, simplify the mobile composition or use an explicit detail view/controlled vertical scroll. Never hide required content, shrink the entire UI, or enlarge the window to declare success.
- A change to the portrait format or shared stage bounds requires an explicit user request for that change; ordinary approval of a mockup is insufficient.

For new environment images or visual asset generations, first read `docs/art/VISUAL_STYLE.md` and attach `docs/references/biomecha-style-master.png` as the style reference. This user-approved cinematic realistic style supersedes older painterly/ornate interpretations. Preserve the requested game projection; the reference defines materials, palette and light, not the camera or robot content.

Do not replace or remove another task's work. Survival biome implementation lives in `src/biome-*.js` and `src/elevation.js`; legacy mission world behavior must remain compatible.
