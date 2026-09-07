# HUD по приложенному референсу — интеграция
Статус: 7 сентября 2026 HUD подключён к основной игровой версии 0.3 по указанию пользователя: механика из другой задачи, интерфейс из этой.

## Основная игра
- Возвращено окружение из этой задачи: исходный `upper-gardens-v2.jpg`, вертикальная мобильная рамка, фиксированная камера. Актуальная сцена и HUD вместе: `proof/painterly-restored-mobile.png`. Прежние скриншоты HUD на светлой процедурной плоскости теперь исторические.
- Уточнение пользователя: использовать именно стиль `hud-review.html`. Основная игра теперь напрямую импортирует тот же `src/reference-hud.css` (без изменений исходного скина); `src/hud-integration.css` адаптирует только разметку и живые данные. Шапка, рамки, иконки, таймер и компактный нижний док приведены к превью. Сборка перенесена в правую колонку кнопок, четыре демонстрационных предмета не подменяют фактически установленные руки.
- Актуальное доказательство подключения: `proof/hud-approved-skin-mobile.png` — игровая сцена с живым HUD, не статичное превью.
- `src/game-hud.css` — тёмная тема основного HUD и существующих диалогов, бронзовые рамки, мобильная компоновка.
- `src/hud-presentation.js` — отображение фактически установленных рук, их уровней и независимых перезарядок. Нажатие открывает сборку, не выбирает активное оружие.
- `index.html`, `src/main.js` — только разметка и точки подключения отображения. Симуляция, каталог, сборка данных и 3D-мир не менялись.
- Основной адрес: http://127.0.0.1:5179/ . Старый `hud-review.html` — историческое изолированное превью, не игра.
- Для claws/seed/drill используется подготовленная иллюстрация атласа; для остальных рук — различимые векторные силуэты. Полный набор предметных иллюстраций ещё не готов.
- `tests/hud-presentation.test.mjs` — отдельные тесты отображения; тесты владельца механики сохранены.

## История первоначальной остановки
Во время этой задачи другая работа заменила index.html и src/main.js новой игрой с картой, сборкой, динамическими слотами и одновременными атаками всех рук. Новая разметка не содержит прежних data-part/pause/core-charge. Общие файлы после обнаружения конфликта не перезаписывались. tests/hud.test.mjs также уже обновлён другим владельцем; его не менять.

## Готовые файлы
- hud-review.html — изолированный просмотр по адресу http://127.0.0.1:5178/hud-review.html (Vite dev).
- src/reference-hud.css — визуальные правила: тёмные панели, тонкая бронза, срезанные углы, таймер по центру, узкий док.
- public/assets/art/hud-module-atlas.png — единый 2x2 атлас предметных иллюстраций; это НЕ рендеры текущих игровых моделей.
- docs/references/hud-reference-03.png — пользовательский референс.
- proof/hud-reference-preview.png — текущий скриншот отдельного превью, не кадр игрового процесса.

Превью использует демонстрационные 08:24, 128 и I. Выделение предмета здесь проверяет только визуальное состояние. При подключении к новой версии показывать реально установленные руки/уровни/перезарядки; не возвращать механику выбора одной активной руки и не скрывать карту/сборку. Четыре слота на референсе — художественный пример, новая игра допускает другое количество креплений.

Рамки/текст/индикаторы реализованы HTML/CSS/SVG, предметы — raster atlas. Каждый квадрант отображается CSS background-position. Исходный запрос прозрачности дал непрозрачную шахматную сетку; этот вариант отвергнут. Финальная генерация использует тёмный фон и mix-blend-mode:lighten. Не называть атлас прозрачным.

Использованы frontend-design и using-ui-stack для компоновки и состояний; встроенный image_gen для иллюстраций, не CLI fallback.

## Первый промпт (исходник, фон отклонён)
Use case: stylized-concept. Asset type: ONE square 2x2 transparent inventory icon atlas for the BIOSO game HUD. Input image is STYLE REFERENCE ONLY: use precisely the richly rendered, weathered bronze/dark-metal/mint items shown in its four bottom inventory slots. DO NOT reproduce the game scene, frames, panels, Roman numerals, text, bars, labels, or HUD.
Four isolated objects on a genuinely transparent alpha background. Exact equal 2x2 cells. Each item centered at (25%,25%), (75%,25%), (25%,75%), (75%,75%) of the whole canvas, respectively. Each object entirely contained in its own quadrant, filling about 70% of the cell height with generous transparent margin. Same scale and upper-left studio key light, realistic premium game inventory rendering, clear silhouette, worn brass hardware, metallic highlights, teal glass accents, no drop shadow outside the object, no floor, no backdrop, no checkerboard drawn.
TOP LEFT: the reference's articulated open three-pronged biomechanical claw with pale metal hooked tips and a round teal energy socket at the wrist; this represents a chain-electric arm.
TOP RIGHT: reference-inspired conical spiral-ridged seed cannon, resembling the reference auger silhouette, metallic silver spiral barrel with a visible dark circular muzzle at its tip, bronze rear attachment socket and teal energy details. Diagonal upright.
BOTTOM LEFT: reference's oval defensive resonator shield, domed shell of hexagonal gray metal plates, dark rims and thin luminous green seams.
BOTTOM RIGHT: reference's short cylindrical mint-glass energy canister, black/brass bolted caps, mechanical attachment clips and teal core, slight three-quarter tilt.
No cartoony white blob models, no flat illustration, no UI elements. Output only the four detailed item cutouts, in one 2x2 square atlas, transparent background.

## Исправляющий промпт (финальный атлас)
Edit target: the provided 2x2 inventory atlas. Preserve the four objects, their detailed materials, silhouette, scale, exact positions and spacing. Replace ALL of the checkerboard background with perfectly uniform very dark brown-gray RGB 33,31,25 (#211f19). Not transparent. Flat solid background, no floor, no shadows, no border, no texture, NO checkerboard anywhere including through openings in the claw and around the canister. Also remove the checkerboard artifact seen inside the green glass canister, replace it with a softly glowing translucent mint-green glass core with no checker pattern. Do not add any text or change the 2x2 atlas layout. Keep the silver/bronze 3D item highlights and mint accents.
