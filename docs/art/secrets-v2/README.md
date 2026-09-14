# BIOSO — сооружения секретов v2

Три референса созданы встроенным image_gen с обязательным `biomecha-style-master.png`. Точные запросы: [prompts.json](prompts.json).

По референсам собраны отдельные модели в Blender: изогнутые сегментированные корпуса, крепления, вентиляция, трубопроводы, мембрана и инкубационные камеры. Это авторская сборка геометрии с переиспользованием ассетов BIOSO, не результат Meshy image-to-3D. Референсы задают направление; модели не являются точной реконструкцией всех деталей изображения.

| Сооружение | Референс | GLB | Исходник Blender | Старые модели в составе |
|---|---|---|---|---|
| Мембрана | [PNG](references/membrane.png) | [GLB](../../../output/secrets-v2/models/membrane/secret-membrane-v2.glb) | [BLEND](../../../output/secrets-v2/models/membrane/secret-membrane-v2.blend) | `arch-cistern.glb` — боковой резервуар |
| Плита | [PNG](references/slab.png) | [GLB](../../../output/secrets-v2/models/slab/secret-slab-v2.glb) | [BLEND](../../../output/secrets-v2/models/slab/secret-slab-v2.blend) | `environment-city-cabinet-v1.glb` — сервисный блок |
| Питомник | [PNG](references/nursery.png) | [GLB](../../../output/secrets-v2/models/nursery/secret-nursery-v2.glb) | [BLEND](../../../output/secrets-v2/models/nursery/secret-nursery-v2.blend) | `organ-reactor.glb`, `environment-scrap-pipes-v1.glb` — питание и трубный блок |

## Переиспользованные материалы

- `public/assets/textures/chassis-ceramic-v3.png`: керамические детали.
- `public/assets/biomes/forest-living/materials-v2.webp`: потёртая керамика, камень, кора; UV адресуют соответствующие ячейки исходного атласа.
- `public/assets/ui/materials/metal-olive-v1.jpg`: тёмные металлические детали.
- `public/assets/ui/materials/ceramic-green-v1.jpg`: зелёные поверхности.
- Встроенные PBR-карты старой цистерны и реактора сохранены вместе с их геометрией.

Исходные модели и текстуры не изменены. Новые материалы из промежуточной процедурной попытки не используются. Экспорт GLB содержит текстуры внутри файла, исходник Blender содержит упакованные ресурсы и референс.

## Проверка и границы результата

[Сводный рендер](../../../output/secrets-v2/exported-models-inspection.png) получен повторным импортом экспортированных GLB. Это осмотр моделей, не скриншот игры. [Проверка структуры](../../../output/secrets-v2/validation.json) фиксирует геометрию, UV, нормали, встроенные изображения и SHA-256.

Исходники лежат в `output/secrets-v2/models`; рабочие GLB подключены через `src/gameplay-modules/event-presentation.js` из `public/assets/kit/secret-*-v2.glb`. Исходные текстуры сохраняются; золотая подсветка больше не перекрашивает поверхности секретов.

В survival размещаются 9–10 секретов: по 3 каждого типа и случайный десятый. Большие события размещаются первыми. Проверка на 100 seed подтверждает количество, проходимость, дистанции и сохранение остальных 17 событий.

Живая проверка маршрута `?review=secret-glb` и вариантов `secret=membrane&tool=acid`, `secret=slab&tool=drill`, `secret=slab&tool=hammer`, `secret=nursery&tool=arc`: обычная автоатака открывает соответствующий объект при нуле врагов. Новые альтернативные активаторы пока обсуждаются, экономика и условия открытия не изменены. [Доказательства интеграции](../../proof/secrets-v2/README.md).

Сборка: `scripts/art/secrets-realism-v2.py`. Повторный осмотр GLB: `scripts/art/inspect-secrets-v2.py`. Оба сценария запускаются Blender с `--background --factory-startup --threads 2`.
