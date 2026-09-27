"""Presentation sheets only; original renders and generated assets stay untouched."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).parent
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
ITEMS = [('demolition', 'Демонтажник', 'guard', 'Тяжёлый землекоп'),
         ('regulator', 'Регулировщик', 'jade', 'Кислотник'),
         ('sentinel', 'Дозорный', 'carapace', 'Панцирник'),
         ('assembler', 'Сборщик', 'pod', 'Кукольник')]
ITEMS_V2 = [('demolition', 'Демонтажник', 'scout', 'Быстрый землекоп'),
            ('regulator', 'Регулировщик', 'seed', 'Мотылёк'),
            ('sentinel', 'Дозорный', 'heavy', 'Дробитель'),
            ('assembler', 'Сборщик', 'worker', 'Сеятель')]
ITEMS_V3 = [('demolition', 'Демонтажник', '', 'Перерабатывающий блок'),
            ('regulator', 'Регулировщик', '', 'Морозильный блок'),
            ('sentinel', 'Дозорный', '', 'Защитный корпус'),
            ('assembler', 'Сборщик', '', 'Сборочная станция')]

def sheet(kind):
    width, height = 1600, 530
    canvas = Image.new('RGB', (width, height), '#171e20')
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(FONT, 26)
    small_font = ImageFont.truetype(FONT, 19)
    items = ITEMS_V3 if kind == 'concepts-v3' else ITEMS_V2 if kind == 'models-v2' else ITEMS
    for col, (key, title, model, enemy) in enumerate(items):
        if kind == 'concepts-v3':
            path = ROOT / f'concepts-v3/{key}-concept-v3.png'
        elif kind == 'models-v2':
            path = ROOT / f'model-proposals-v2/{key}-body-{model}.png'
        elif kind == 'models':
            path = ROOT / f'model-proposals/{key}-body-{model}.png'
        else:
            path = ROOT / f'generated/{kind}-{key}-v1.png'
        with Image.open(path) as source:
            picture = source.convert('RGBA')
            picture.thumbnail((380, 380), Image.Resampling.LANCZOS)
            x = col * 400 + (400-picture.width)//2
            y = 72 + (380-picture.height)//2
            canvas.paste(picture, (x,y), picture)
        draw.text((col*400+200, 25), title, fill='#ebe8de', font=title_font, anchor='mt')
        subtitle = enemy if kind.startswith('models') or kind == 'concepts-v3' else ('Иконка корпуса' if kind == 'icon' else 'Ачивка')
        draw.text((col*400+200, 475), subtitle, fill='#a6b7b5', font=small_font, anchor='mt')
    if kind.startswith('models'):
        draw.text((800, 510), 'Существующие основы. Адаптация креплений — после согласования.', fill='#a6b7b5', font=small_font, anchor='mm')
    elif kind == 'concepts-v3':
        draw.text((800, 510), 'Концепты форм на согласование. 3D-модели ещё не созданы.', fill='#a6b7b5', font=small_font, anchor='mm')
    canvas.save(ROOT / f'{kind}-review.jpg', quality=94)

if __name__ == '__main__':
    import sys
    for requested in sys.argv[1:] or ['models', 'icon', 'achievement']:
        sheet(requested)
