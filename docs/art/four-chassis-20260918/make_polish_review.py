"""Review sheets from unchanged source PNGs and actual GLB renders."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
BASE=Path(__file__).resolve().parent
KEYS=['demolition','regulator','sentinel','assembler']
NAMES=['Демонтажник','Регулировщик','Дозорный','Сборщик']
DIRS=[BASE/'astra-models-v5',BASE/'astra-regulator-polish',BASE/'astra-sentinel-polish',BASE/'astra-assembler-polish']
BG=(24,32,34);WHITE=(230,230,216);GRAY=(167,187,181)
FONT=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',29)
SMALL=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',21)
def picture(canvas,path,box):
 image=Image.open(path).convert('RGBA');image=image.crop(image.getbbox());image.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS)
 canvas.paste(image,(box[0]+(box[2]-image.width)//2,box[1]+(box[3]-image.height)//2),image)
def single(suffix,filename,heading):
 canvas=Image.new('RGB',(1800,650),BG);draw=ImageDraw.Draw(canvas)
 draw.text((900,22),heading,font=FONT,fill=WHITE,anchor='mt')
 for i,(key,name,directory) in enumerate(zip(KEYS,NAMES,DIRS)):
  draw.text((i*450+225,75),name,font=FONT,fill=WHITE,anchor='mt')
  picture(canvas,directory/f'{key}-{suffix}.png',(i*450+15,130,420,430))
 draw.text((900,602),'Рендеры реальных новых 3D-моделей · на согласование перед подключением в игру',font=SMALL,fill=GRAY,anchor='mt')
 canvas.save(BASE/filename,quality=95)
single('game-camera','polished-models-review.jpg','ЧЕТЫРЕ КОРПУСА · ДОРАБОТКА АСТРЫ')
single('assembly','polished-assemblies-review.jpg','НОВЫЕ КОРПУСА С ИГРОВЫМИ ДЕТАЛЯМИ')
canvas=Image.new('RGB',(1800,1630),BG);draw=ImageDraw.Draw(canvas)
for row,heading in enumerate(['Выбранные исходные концепты','Предыдущие реальные 3D-модели','Новые реальные 3D-модели · Астра']):
 y=row*520
 draw.text((900,y+22),heading,font=FONT,fill=WHITE,anchor='mt')
 for i,(key,name,directory) in enumerate(zip(KEYS,NAMES,DIRS)):
  draw.text((i*450+225,y+75),name,font=FONT,fill=WHITE,anchor='mt')
  path=BASE/f'concepts-v3/{key}-concept-v3.png' if row==0 else BASE/f'astra-models-v4/{key}-game-camera.png' if row==1 else directory/f'{key}-game-camera.png'
  picture(canvas,path,(i*450+15,y+128,420,370))
draw.text((900,1585),'Износ и мелкая детализация концептов богаче. Новая геометрия ещё не подключена в игру.',font=SMALL,fill=GRAY,anchor='mt')
canvas.save(BASE/'polished-models-comparison.jpg',quality=94)
