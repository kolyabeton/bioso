# Проверка 50 новых достижений выживания

Дата: 2026-09-14. Каталог: 86 достижений, из них 50 новых только для выживания; 46 жетонных наград и 4 предметных.

## Подтверждено

- Все тесты новой системы в `tests/survival-achievements.test.mjs` проходят: подсчёт смерти, режимы, наборы категорий, несколько сетов и мутаций, сохранение, награды, блокировка добычи, 20 отдельных забегов и получение всех 50 по функциональной симуляции.
- Уровневые награды выдаются сразу при начислении опыта; выдача не расходует RNG боя. Подготовленные дуэли с финальным боссом проходят.
- Производственная компиляция Vite: 317 модулей, PASS, `write:false`, без перезаписи общего dist. Это проверка кода, не новый оптимизированный пакет для публикации.
- В iab открыт реальный игровой маршрут с изолированным профилем и `sound=0`, режим Vite development (не playtest с открытым каталогом).
- Проверены 360×640, 390×844, 1280×720: карточки, список из 86 строк (50 новых), фильтры 15 полученных / 71 в процессе, возврат, прокрутка, финальная карточка, закрытый и открытый предмет в атласе, русские и английские подписи.
- Переполнения диалогов не обнаружены, все измеренные подписи действий однострочные; изображения доступны. На desktop диалоги сохраняют портретные 389 px, главное меню и мир занимают 1280 px.
- Из главного меню выполнен живой запуск выживания, затем пауза; ошибок консоли не было.

## Границы проверки

10–12 часов остаются целевым темпом. Полного человеческого прохождения на свежем профиле не проводилось; тест всех 50 условий не подтверждает длительность или баланс добычи.

Общий прогон: 1187 тестов, 1172 PASS, 15 FAIL. Эти 15 ошибок воспроизведены в изолированной копии с отключённой новой системой (без новых записей в каталоге, без записи новых счётчиков, с прежней доступностью предметов и условиями атласа). Это не чистый git HEAD: чужие текущие изменения намеренно сохранены. Для теста памяти трофея скопированы актуальные параллельные изменения описаний предметов.

В последнем целевом прогоне после добавления проверки немедленной выдачи: 67 тестов, 66 PASS, 1 FAIL — общая проверка переводов обнаружила строки в параллельно добавленном `src/systems/hand-compatibility.js`. Новая система достижений и её переводы проходят отдельные проверки. Рабочее дерево менялось другими задачами во время проверки.

Ошибки общего прогона:
- all five timed waves use mission bosses and leave generated habitats untouched
- primary CTAs are green-filled and last in horizontal action rows
- a guardian trophy exposes its memory trace in item details
- duplicate shields charge and block independently with a visible charge count
- health trades persist slots and missing health across body swaps and reject lethal trades
- displayed reload and regeneration use applied affixes, sets and legs
- installed body inspector includes event-granted organ mounts
- player health and armor item values use only whole or half units
- only slow leg ranks add half HP while every leg rank adds 15 percent weight
- plated ranks I through V grant half a segment per rank without percent bonuses
- paid plated upgrades add half a segment, retain speed and stop at ten
- level-24 player can beat the fourth habitat with tier-one melee or ranged gear, including a mistake
- every mission event offers decline and opens a traversable gate without a reward
- one rocket splash applies swarm boss damage once, only to elite and boss targets
- new settings default to High/60 and enabled 30 percent audio while preserving old values

## Воспроизведение UI

Запустить Vite с `--mode development`, открыть `?review=achievements&case=survival-progress&lang=ru&sound=0&quality=low`. Для награды: добавить `&id=survival:set-kills-hunter`; для полученной награды использовать `case=survival-earned&id=survival:level-30`. Маршруты review не записывают пользовательский профиль. Изображения показывают подготовленные состояния реальных игровых экранов, а не реальные 10 часов игры.
