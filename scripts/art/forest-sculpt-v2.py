"""Authored ceramic ruin and root banks, sharing UV and baked vertex AO."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forest_sculpt_common import *

# Sculpted industrial arch: substantial ceramic shells over a recessed dark frame.
# Blender Z up; exporter converts to runtime Y up.
for side in [-1,1]:
 block('Recessed structural upright',(side*2.28,.12,1.72),(.7,1.36,3.44),1,.09)
 for row in range(3):
  o=block('Irregular ceramic upright',(side*2.33,-.13,.58+row*1.14),(1.05,1.68,1.1),0,.09,side*.018)
  if side==1 and row==0:o.rotation_euler.y=.045
 for h in [.62,2.3]:
  o=block('Recessed mint slit',(side*1.91,-1.002,h),(.075,.045,.52),0,.025)
  o.data.materials.clear();o.data.materials.append(mint)
for i in range(11):
 lo=i*math.pi/11+.012;hi=(i+1)*math.pi/11-.012;verts=[];faces=[];steps=4
 for y in [-.98,.84]:
  for r in [1.79,2.86]:
   for k in range(steps+1):
    a=lo+(hi-lo)*k/steps;rad=r+.045*math.sin(a*5+i*.7)+(.04 if i%4==0 else 0)*math.sin(k*2.1)
    verts.append((math.cos(a)*rad,y+.035*math.sin(a*3+i),3.33+math.sin(a)*rad))
 s=steps+1
 for k in range(steps):
  faces.extend([(k,k+1,s+k+1,s+k),(2*s+k,3*s+k,3*s+k+1,2*s+k+1),(k,2*s+k,2*s+k+1,k+1),(s+k,s+k+1,3*s+k+1,3*s+k)])
 faces.extend([(0,s,3*s,2*s),(s-1,3*s-1,4*s-1,2*s-1)])
 panel=mesh('Ceramic arch segment',verts,faces,0,.105)
 weighted=panel.modifiers.new('Weighted worn highlights','WEIGHTED_NORMAL');weighted.keep_sharp=True
 bpy.context.view_layer.objects.active=panel;bpy.ops.object.modifier_apply(modifier=weighted.name)
# Cables/ribs visible inside the arch opening.
for depth in [-.55,.52]:
 points=[(math.cos(a)*1.74,depth,3.33+math.sin(a)*1.74) for a in [i*math.pi/32 for i in range(33)]]
 tube('Dark inner arch rib',points,[.12]*len(points),1)
for side in [-1,1]:
 for j in range(4):
  lean=(j-1.5)*.21
  pts=[(side*(2.25+.23*math.sin(t*.9+j)), -.95+lean+.12*math.sin(t+j),t) for t in [0,.7,1.5,2.4,3.4,4.2,4.75]]
  pts.extend([(side*1.35,-.9+lean,5.7),(side*.3,-.6+lean,6.25)])
  tube('Binding root over ceramic',[(x,y-.13,z) for x,y,z in pts],[.25,.22,.19,.16,.145,.12,.10,.075,.025])
 for j in range(3):
  tube('Spreading footing root',[(side*2.2,-.7,.9),(side*2.4,-1.25,.35),(side*(2.5+j*.17),-1.7,.13),(side*(2.55+j*.18),-2.05,.04)],[.18,.13,.085,.01])
 for j in range(3):stone('Fractured footing rubble',side*(1.85+j*.32),-.6+j*.2,0,.48,.65,.44,32+j)
export('forest-ruin-arch-v2')

# One asymmetric root/stone bank: substantial low ledge, weathered trunk, exposed roots.
for args in [(-.5,.3,0,1.5,1.15,.78,1),(.83,.6,0,1.05,.88,1.3,4),(-1.05,-.8,0,.78,.9,.4,8)]:stone('Fractured root bank',*args)
stump=tube('Broad weathered stump',[(.5,.4,.2),(.38,.45,.9),(.45,.5,1.75),(.57,.52,2.22)],[.67,.60,.48,.43])
# A torn, blunt crown instead of a five-metre needle. The ring is actual geometry.
for i,v in enumerate(list(stump.data.vertices)[-9:]):v.co.z+=.12*math.sin(i*2.4)+(.18 if i in [2,6] else 0)
stump.data.update()
for j in range(9):
 a=j*math.tau/9
 tube('Buttress root',[(.48,.4,1.9),(.4+math.cos(a)*.65,.4+math.sin(a)*.65,.75),(math.cos(a)*1.15,math.sin(a)*1.15,.26),(math.cos(a)*1.83,math.sin(a)*1.83,.04)],[.19,.22,.12,.01])
tube('Snapped lateral branch',[(.48,.5,1.25),(-.15,.55,1.55),(-.62,.7,1.82)],[.22,.18,.14])
tube('Settled fallen limb',[(-1.5,-.45,.24),(-.7,-.3,.34),(.2,-.6,.24),(1.3,-.8,.15)],[.18,.25,.22,.13])
export('forest-root-bank-v2')

# Recessed walkable bedrock: three overlapping fractured plates, not an obstacle.
stone('Exposed central limestone',-.3,.2,-.1,1.65,1.25,.19,41)
stone('Fractured lower lip',.65,-.65,-.1,1.0,.75,.16,92)
stone('Broken shoulder',-1.2,-.45,-.1,.63,.57,.15,17)
export('forest-bedrock-v2')
