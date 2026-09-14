"""Compose Gardener replies over real gameplay captures using the current radio-panel geometry."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from PIL import ImageFilter
import json, math, random

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/lore-film-step-by-step-20260912'
PLAN=json.loads((OUT/'step-plan.json').read_text())
FRAMES=OUT/'frames'
PANEL_BOX=(450,405,830,547)
FONT_REGULAR='/System/Library/Fonts/HelveticaNeue.ttc'
FONT_BOLD='/System/Library/Fonts/HelveticaNeue.ttc'

sources={
 'garden-01-gardener':'00-garden-01-child',
 'garden-02-gardener':'02-garden-02-hunter',
 'quarantine-02-gardener':'08-quarantine-02-leviathan',
 'core-01-gardener':'12-core-01-cathedral',
 'nursery-02-gardener':'20-nursery-02-collector',
 'mother-01-gardener':'24-mother-01-shepherd',
 'mother-03-gardener':'29-mother-03-shepherd',
 'survival-02-gardener':'32-survival-02-mother',
 'survival-03-gardener':'33-survival-03-child',
}

template=Image.open(FRAMES/'00-garden-01-child/frame-001.jpg').convert('RGB').crop(PANEL_BOX)
thought=Image.open(FRAMES/'04-thought-garden-launch-key/frame-001.jpg').convert('RGB')
soul=thought.crop((457,434,539,516)).resize((82,82),Image.Resampling.LANCZOS)
pixels=soul.load()
for y in range(soul.height):
 for x in range(soul.width):
  r,g,b=pixels[x,y]
  if 13<x<69 and 13<y<69 and r>105 and g>95 and b<180:
   light=max(r,g,b)/255
   pixels[x,y]=(int(75+95*light),int(125+90*light),int(112+92*light))
template.paste(soul,(7,6))

def blank_copy(panel):
 texture=Image.new('RGB',panel.size,(209,201,182));draw=ImageDraw.Draw(texture)
 random.seed(914)
 for y in range(8,137):
  t=(y-8)/128;base=(210-t,202-3*t,184-4*t)
  for x in range(100,338):
   v=random.choice((-4,-3,-2,-1,0,0,1,2,3,4));draw.point((x,y),fill=tuple(max(0,min(255,int(c+v))) for c in base))
 mask=Image.new('L',panel.size);ImageDraw.Draw(mask).rectangle((102,10,335,134),fill=255)
 mask=mask.filter(ImageFilter.GaussianBlur(5));panel.paste(texture,(0,0),mask)
 draw=ImageDraw.Draw(panel)
 # Restore the divider and compact live-signal bars from the DS.
 draw.line((99,8,99,134),fill=(140,143,122),width=1)
 for x,h in ((343,8),(348,18),(353,12),(358,22)):
  draw.rounded_rectangle((x,63-h//2,x+2,63+h//2),radius=1,fill=(89,137,121))
 return panel

def wrap(draw,text,font,width):
 words=text.split();lines=[];line=''
 for word in words:
  trial=f'{line} {word}'.strip()
  if draw.textbbox((0,0),trial,font=font)[2]<=width:line=trial
  else:
   if line:lines.append(line)
   line=word
 if line:lines.append(line)
 return lines

title_font=ImageFont.truetype(FONT_BOLD,11,index=1)
body_font=ImageFont.truetype(FONT_REGULAR,15,index=0)
for item in (x for x in PLAN['segments'] if x.get('voice')=='gardener'):
 target=FRAMES/item['frameDir'];target.mkdir(parents=True,exist_ok=True)
 source_files=sorted((FRAMES/sources[item['id']]).glob('frame-*.jpg'))
 if len(source_files)>20:source_files=source_files[8:]
 count=max(24,math.ceil(item['duration']*PLAN['fps']))
 for index in range(count):
  frame=Image.open(source_files[index%len(source_files)]).convert('RGB')
  panel=blank_copy(template.copy());draw=ImageDraw.Draw(panel)
  draw.text((112,15),'САДОВНИК',font=title_font,fill=(69,111,96),spacing=0)
  lines=wrap(draw,item['text'],body_font,215)
  for line_no,line in enumerate(lines[:4]):draw.text((112,41+line_no*22),line,font=body_font,fill=(40,51,45))
  frame.paste(panel,PANEL_BOX[:2])
  frame.save(target/f'frame-{index+1:03d}.jpg',quality=91,subsampling=0)
 print(item['id'],count)
