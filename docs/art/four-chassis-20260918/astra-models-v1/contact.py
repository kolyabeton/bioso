from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
P=Path(__file__).resolve().parent
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',30)
small=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',21)
keys=['demolition','regulator','sentinel','assembler'];names=['Демонтажник','Регулировщик','Дозорный','Сборщик']
for assembly in [False,True]:
 canvas=Image.new('RGB',(1800,570),(23,31,33));draw=ImageDraw.Draw(canvas)
 for i,(k,n) in enumerate(zip(keys,names)):
  draw.text((i*450+225,18),n,font=font,fill='#e5e0d5',anchor='mt')
  im=Image.open(P/(k+('-assembly.png' if assembly else '-game-camera.png')))
  im.thumbnail((450,450));canvas.paste(im,(i*450+(450-im.width)//2,62),im)
  slots=['3 руки · 4 ноги · 3 органа','2 руки · 3 ноги · 4 органа','2 руки · 5 ног · 3 органа','3 руки · 3 ноги · 5 органов'][i]
  draw.text((i*450+225,520),slots,font=small,fill='#bbc9c7',anchor='mt')
 canvas.save(P/('assembly-review.jpg' if assembly else 'models-review.jpg'),quality=95)
