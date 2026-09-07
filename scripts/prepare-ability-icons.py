"""Remove only edge-connected neutral checker background; preserve source artwork."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
import json
root=Path(__file__).resolve().parents[1]
source=root/'output/imagegen/ability-icons-v1'
out=root/'public/assets/ui/abilities'
out.mkdir(parents=True,exist_ok=True)
report=[]
for j in json.loads((source/'prompts.json').read_text())['jobs']:
 im=Image.open(source/j['filename']).convert('RGBA'); arr=np.array(im)
 if arr[:,:,3].min()==255:
  rgb=arr[:,:,:3].astype(float)
  neutral=(rgb.max(2)-rgb.min(2)<38)&(rgb.min(2)>155)
  seed=np.zeros(neutral.shape,bool); seed[0,:]=seed[-1,:]=True; seed[:,0]=seed[:,-1]=True
  exterior=ndi.binary_propagation(seed&neutral,mask=neutral)
  # A one-pixel soft edge removes the pale antialias fringe, without touching the emblem.
  distance=ndi.distance_transform_edt(~exterior)
  arr[:,:,3]=np.minimum(arr[:,:,3],np.clip((distance-.8)*255,0,255).astype('uint8'))
  arr[exterior,:3]=0
 clean=Image.fromarray(arr)
 assert clean.getchannel('A').getextrema()[0]==0,j['id']
 clean.resize((512,512),Image.Resampling.LANCZOS).save(out/j['filename'],optimize=True)
 report.append({'id':j['id'],'source':j['filename'],'alphaBounds':clean.getchannel('A').getbbox()})
(out/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Prepared',len(report),'transparent 512px PNGs')
