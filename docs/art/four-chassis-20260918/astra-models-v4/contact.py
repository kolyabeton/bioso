from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
P=Path(__file__).resolve().parent
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',30)
small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',21)
keys=['demolition','regulator','sentinel','assembler'];names=['Демонтажник','Регулировщик','Дозорный','Сборщик']
for assembly in ([False,True] if (P/"assembler-assembly.png").exists() else [False]):
 canvas=Image.new('RGB',(1800,570),(23,31,33));draw=ImageDraw.Draw(canvas)
 for i,(k,n) in enumerate(zip(keys,names)):
  draw.text((i*450+225,18),n,font=font,fill='#e5e0d5',anchor='mt')
  im=Image.open(P/(k+('-assembly.png' if assembly else '-game-camera.png')))
  im.thumbnail((450,450));canvas.paste(im,(i*450+(450-im.width)//2,62),im)
  slots=['3 руки · 4 ноги · 3 органа','2 руки · 3 ноги · 4 органа','2 руки · 5 ног · 3 органа','3 руки · 3 ноги · 5 органов'][i]
  draw.text((i*450+225,520),slots,font=small,fill='#bbc9c7',anchor='mt')
 canvas.save(P/('assembly-review.jpg' if assembly else 'models-review.jpg'),quality=95)

if all((P/(k+'-game-camera.png')).exists() for k in ['bastion','reactor','rootwalker','broodmother']):
 canvas=Image.new('RGB',(1800,1100),(23,31,33));draw=ImageDraw.Draw(canvas)
 for row,(ks,ns,title) in enumerate([(['bastion','reactor','rootwalker','broodmother'],['Бастион','Реактор','Корнеход','Матка'], 'ДЕЙСТВУЮЩИЕ КОРПУСА'),(keys,names,'НОВЫЕ КОРПУСА · V2 · НА СОГЛАСОВАНИИ')]):
  draw.text((900,row*550+12),title,font=small,fill='#91a9a7',anchor='mt')
  for i,(k,n) in enumerate(zip(ks,ns)):
   draw.text((i*450+225,row*550+49),n,font=font,fill='#e5e0d5',anchor='mt')
   im=Image.open(P/(k+'-game-camera.png'));im.thumbnail((450,450));canvas.paste(im,(i*450+(450-im.width)//2,row*550+89),im)
 canvas.save(P/'canonical-comparison.jpg',quality=95)

canvas=Image.new('RGB',(1800,1100),(23,31,33));draw=ImageDraw.Draw(canvas)
for row,title in enumerate(['ВЫБРАННЫЕ ИСХОДНЫЕ КОНЦЕПТЫ','ПЕРЕНОС В 3D · НА СОГЛАСОВАНИИ']):
 draw.text((900,row*550+12),title,font=small,fill='#91a9a7',anchor='mt')
 for i,(k,n) in enumerate(zip(keys,names)):
  draw.text((i*450+225,row*550+49),n,font=font,fill='#e5e0d5',anchor='mt')
  path=P.parent/'concepts-v3'/(k+'-concept-v3.png') if row==0 else P/(k+'-game-camera.png')
  im=Image.open(path).convert('RGBA');im.thumbnail((450,450));canvas.paste(im,(i*450+(450-im.width)//2,row*550+89),im)
canvas.save(P/'original-concept-vs-v4.jpg',quality=95)
canvas.crop((0,0,1800,550)).save(P.parent/'approved-source-review.jpg',quality=95)
