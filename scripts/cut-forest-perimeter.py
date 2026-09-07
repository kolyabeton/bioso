"""Cut the approved composed forest into edge strips and corners; no resynthesis."""
from pathlib import Path
from PIL import Image
im=Image.open('output/imagegen/forest-perimeter-v1/approved.png').convert('RGBA')
w,h=im.size
# Native image coordinates, preserving authored trees and solarpunk clusters.
x1,x2=round(w*.25),round(w*.76)
y1,y2=round(h*.21),round(h*.80)
boxes={'nw':(0,0,x1,y1),'ne':(x2,0,w,y1),'sw':(0,y2,x1,h),'se':(x2,y2,w,h),'north':(x1,0,x2,y1),'south':(x1,y2,x2,h)}
for side,left,right in [('west',0,x1),('east',x2,w)]:
 for i in range(2):boxes[f'{side}-{i}']=(left,y1+(y2-y1)*i//2,right,y1+(y2-y1)*(i+1)//2)
out=Path('public/assets/biomes/forest-perimeter-v1')
for name,box in boxes.items():
 crop=im.crop(box)
 # Blend the soil-facing lip into the existing ground, retain exterior foliage intact.
 px=crop.load();cw,ch=crop.size
 for y in range(ch):
  for x in range(cw):
   d=[]
   if name.startswith('west'):d.append(cw-1-x)
   if name.startswith('east'):d.append(x)
   if name=='north':d.append(ch-1-y)
   if name=='south':d.append(y)
   if d: px[x,y]=(*px[x,y][:3],round(255*min(1,min(d)/24)))
 crop.save(out/(name+'.png'))
print(im.size, list(boxes))
