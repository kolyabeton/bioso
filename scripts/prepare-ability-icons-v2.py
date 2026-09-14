"""Clean generated checker backgrounds and deploy only the nine ability-v2 icons."""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy import ndimage as ndi
from rembg import remove
import json

root=Path(__file__).resolve().parents[1]
source=root/'output/imagegen/ability-icons-v2'
out=root/'public/assets/ui/abilities'
jobs=json.loads((source/'prompts.json').read_text())['jobs']
manifest_path=out/'manifest.json'
manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else []
records={entry['id']:entry for entry in manifest}

for job in jobs:
 im=Image.open(source/job['filename']).convert('RGBA')
 # Imagegen sometimes renders a checker instead of storing alpha. The local
 # foreground matte removes it before the conservative edge-connected cleanup.
 im=remove(im).convert('RGBA');arr=np.array(im)
 if arr[:,:,3].min()==255:
  rgb=arr[:,:,:3].astype(float)
  neutral=(rgb.max(2)-rgb.min(2)<38)&(rgb.min(2)>145)
  seed=np.zeros(neutral.shape,bool);seed[0,:]=seed[-1,:]=True;seed[:,0]=seed[:,-1]=True
  exterior=ndi.binary_propagation(seed&neutral,mask=neutral)
  distance=ndi.distance_transform_edt(~exterior)
  arr[:,:,3]=np.minimum(arr[:,:,3],np.clip((distance-.8)*255,0,255).astype('uint8'))
  arr[exterior,:3]=0
 clean=Image.fromarray(arr)
 assert clean.getchannel('A').getextrema()[0]==0,job['id']
 clean.resize((512,512),Image.Resampling.LANCZOS).save(out/job['filename'],optimize=True)
 records[job['id']]={'id':job['id'],'source':job['filename'],'alphaBounds':list(clean.getchannel('A').getbbox()),'generation':'ability-icons-v2'}

manifest_path.write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2)+'\n')
print(f'Prepared {len(jobs)} transparent 512px PNGs')
