# BIOSO · выбранный вариант 02 «Живопись»

## Восстановление 7 сентября 2026

По подтверждению пользователя возвращены исходный фон, портретный экран и фиксированная камера. Поверх них работает механика 0.3: независимые руки, сборка тела, инвентарь, прокачка, миссии и сохранение каталога. `src/painterly-stage.js` адаптирует границы и координаты миссий к одной террасе; большая процедурная карта не показывается. `src/mobile-stage.css` задаёт мобильную рамку и фон, `src/game-view.js` рисует прозрачный слой существ и теней без прежней светлой плоскости. HUD берётся из `src/reference-hud.css`; керамический HUD ниже описывает историческую версию и больше не активен.

Доказательство: `proof/painterly-restored-mobile.png`. Это действующая игра, не `hud-review.html`. Полный 40-минутный баланс и производительность на физическом телефоне отдельно не проверены.

Выбор пользователя: второй концепт целиком — живописное окружение и керамический HUD с бронзовой окантовкой. Концепт сохранён в `docs/references/approved-02-painterly.png`.

## Что реально работает

Фиксированная гибридная 2.5D-сцена: художественная плита окружения под прозрачным WebGL canvas, настоящие 3D-герой/враги, контактные и динамические тени, снаряды, разряды, пыльца и собираемые клетки. Художественный фон не содержит нарисованных врагов, персонажа, ресурсов или HUD. Управление и бой не заменены видео или картинкой.

HUD — живой HTML/CSS. Палитра задана токенами в `src/painterly.css`; выбранная рука имеет бронзовую рамку и индикатор фактической перезарядки. Четвёртая ячейка — пассивное ядро, а не неработающая кнопка. Её шкала показывает клетки до следующего восстановления. Иконки снимаются с реальных модульных моделей один раз при загрузке (`src/module-icons.js`), затем используются как изображения.

Границы движения описаны поперечными сечениями в `src/simulation.js`. Камера и фоновый cover используют одинаковое кадрирование. За облака и скалы пройти нельзя. Декорации фона не являются интерактивными 3D-объектами; ветряки пока не анимированы. Свободное вращение камеры с таким фоном не поддерживается. Для новых зон понадобятся новые фоновые плиты и контуры или отдельный переход на объёмное окружение.

Старые `src/world.js` и `src/style.css` сохранены как исходники предыдущего визуального среза, но больше не импортируются активной сценой. Unity и Meshy не использовались.

## Изображения

- `docs/art/upper-gardens-v2-master.png` — мастер чистого окружения.
- `public/assets/art/upper-gardens-v2.jpg` — подключённая JPEG-копия для игры, quality 88. Это только перекодирование исходника, не перерисовка.
- `docs/references/approved-02-painterly.png` — утверждённый визуальный ориентир.

Использован встроенный image_gen (не CLI/API fallback). HUD дополнительно сформирован по frontend-design и using-ui-stack: единая палитра материалов, состояния кнопок, семантические элементы, крупные touch targets и фокус в меню паузы.

## Полный промпт чистого окружения

+Use case: precise-object-edit. Asset type: production background plate for a fixed-camera portrait mobile action game, 9:16.
Input image: selected BIOSO art-direction concept, EDIT TARGET.
Preserve the painterly premium 3D art direction, golden afternoon light from upper-left, olive grasses, aged stone, bronze/ivory wind turbines, small blue solar panels, cliff above an ocean of softly painted cream clouds. Keep the portrait composition, high overhead angled view, grounded material richness and palette.
Remove ALL UI, ALL words, all logos, all numerals, all frames, the bottom equipment dock, all robots, all enemies, all glowing collectibles and their shadows. Reconstruct uninterrupted landscape everywhere they were.
Important gameplay adjustment: make the central stone-paved path into a BROAD fairly flat open terrace/clearing, generously wide enough to dodge, covering x=23%..80% of image and y=35%..82%. Subtle irregular paving slabs, sparse fine moss between stones, low visual noise. The playable flat area should remain continuous, no large rocks or plants blocking its central part. Natural tapered ends; NOT a formal tiled rectangular platform. Dense vegetation and rocks hug the outer edges. Wind turbines and panels stay in upper third behind the playable terrace, never obscure it. Clouds occupy uppermost area and left exterior of cliff. Bottom 15% continues rocky ground and dark olive plants, suitable for a separate UI overlay. Do not add a building in the center. No circles or markings on ground. No interface or text anywhere. Output one beautifully finished clean background asset, full-bleed portrait.
