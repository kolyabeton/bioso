# Инкубатор: иконка v3

Runtime asset: `public/assets/ui/organs/parasite-womb-v3.png`. Старая `parasite-womb-v2.png` сохранена.

Use case: stylized-concept. Asset: one isolated transparent inventory icon for BIOSO's larva incubator organ (Инкубатор).
Reference 1 is authoritative world material/light style; reference 2 is the EXISTING ORGAN ICON FAMILY (`public/assets/ui/organs/*-v2.png`) to closely match in perspective, scale, fine mechanical detail, weathering and restrained color; reference 3 is the OLD `parasite-womb-v2.png`, whose vertical egg-sac identity should be retained but whose flat undetailed shell must be redesigned.
Generate ONE isolated biomechanical incubator organ, no limbs, no head, no chassis. A tall teardrop brood womb: fitted irregular warm-white ceramic armor plates over dark aged metal, split along the front by a narrow iris-like launch aperture ringed with finely machined dark bronze petals, held slightly open. Behind the aperture, two or three pale larvae are visible in dim desaturated green amniotic fluid — small, soft, clearly biological, not glowing plastic. Two compact side chambers with inset dark glass lenses in concentric worn metal collars. Narrow segmented base ending in a machined mounting collar. Same three-quarter elevated angle as the existing organ icons, aperture pointing toward bottom-left. Self-contained clean legible silhouette, realistic finely crafted assembly, avoid excessive noise or gore. Subject fills about 82 percent of a square 1024x1024 canvas with equal breathing room, entire object visible.
Style reference: attached `docs/references/biomecha-style-master.png` is authoritative for materials, palette, light and mood. Cinematic photorealistic grounded solarpunk, physically plausible weathered materials and natural proportions. Dirty warm-white ceramic panels, dark aged industrial metal, restrained rust. Low warm sunlight from upper left with cool ambient fill and deep detailed shadows. Realistic microtexture without exaggerated contrast. No cartoon, no painterly brush strokes, no storybook illustration, no toy diorama, no ornate gold, no glossy plastic, no heavy sepia wash, no text.
True transparent alpha background. No floor, scene, cast shadow, backing tile, frame, text, labels, watermark, grid or other objects. Only one icon.

## Код после генерации

В `src/ui/molecules.js` ветка `ORGAN_ART` собирает путь как `${ORGAN_ART[key]}-v2.png`. Чтобы подключить v3 без ломки остальных органов, хранить в карте суффикс версии: `parasite:'parasite-womb-v3'` и собирать путь из готового имени файла.
Иконка `broodNode` наследует `parasite` (`partArt('parasite',…)`) — отдельного ассета не требуется.
