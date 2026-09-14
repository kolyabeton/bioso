"""Large survival landmarks from quarantine/mother-target-v1 and style master.
Own headless Blender scene. Reuse runtime atlas; no new texture files.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forest_sculpt_common import *

metal=bpy.data.materials.new('environment-aged-metal');metal.use_nodes=True
metal.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.14,.17,.15,1)
membrane=bpy.data.materials.new('environment-cocoon-membrane');membrane.use_nodes=True
bs=membrane.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.27,.36,.23,1);bs.inputs['Roughness'].default_value=.72
bs.inputs['Emission Color'].default_value=(.08,.16,.11,1);bs.inputs['Emission Strength'].default_value=.18
for mat in [metal,membrane]:
 color=mat.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='COLOR_0'
 mat.node_tree.links.new(color.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
def material(o,mat):o.data.materials.clear();o.data.materials.append(mat);return o
def root_tube(name,points,radii,cell=1):
 # Smooth organic bends rather than straight polygonal branch segments.
 raw=[Vector(p) for p in points];smooth=[];widths=[]
 for i in range(len(raw)-1):
  a,b,c,d=raw[max(0,i-1)],raw[i],raw[i+1],raw[min(len(raw)-1,i+2)]
  for step in range(5):
   t=step/5;smooth.append((b*2+(c-a)*t+(a*2-b*5+c*4-d)*t*t+(-a+b*3-c*3+d)*t*t*t)*.5)
   widths.append(radii[i]*(1-t)+radii[i+1]*t)
 smooth.append(raw[-1]);widths.append(radii[-1]);return tube(name,smooth,widths,cell)
def emit(name):
 for mat in [metal,membrane]:
  obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
  if obs:
   bpy.ops.object.select_all(action='DESELECT')
   for o in obs:o.select_set(True)
   bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join()
 export(name)

# Axis runs into the scene (+Y): genuine deep intake, segmented ceramic casing.
def casing(name,r0,r1,y0,y1,a0,a1,cell=0,steps=8):
 verts=[];faces=[]
 for j in range(steps+1):
  a=a0+(a1-a0)*j/steps
  for r,y in [(r0,y0),(r1,y0),(r1,y1),(r0,y1)]:verts.append((math.cos(a)*r,y,2.7+math.sin(a)*r))
  if j:
   for k in range(4):faces.append(((j-1)*4+k,j*4+k,j*4+(k+1)%4,(j-1)*4+(k+1)%4))
 faces.extend([(3,2,1,0),tuple(steps*4+k for k in range(4))]);return mesh(name,verts,faces,cell,.018)
for y in [-1.05,.0,1.0]:material(casing('Exposed structural ring',2.15,2.24,y,y+.13,0,math.tau,1,48),metal)
for j in range(18):
 if j in [11,12,13]:continue
 a=j*math.tau/18
 casing('Cracked outer ceramic segment',2.24,2.5,-.87,1.25+(j%3)*.09,a+.018,a+math.tau/18-.025,0,3)
 for y in [-.69,.8]:
  material(tube('Panel fastener',[(math.cos(a+.12)*2.51,y,2.7+math.sin(a+.12)*2.51),(math.cos(a+.12)*2.58,y,2.7+math.sin(a+.12)*2.58)],[.06,.06]),metal)
material(casing('Inner intake liner',2.08,2.16,-1.08,.84,0,math.tau,1,48),metal)
for j in range(17):
 a=j*math.tau/17;verts=[]
 for r,angle,y in [(.42,a,-.43),(1.1,a+.18,-.14),(2.04,a+.32,.38)]:
  for d,depth in [(-.08,0),(.12,0),(.12,.065),(-.08,.065)]:verts.append((math.cos(angle+d)*r,y+depth,2.7+math.sin(angle+d)*r))
 faces=[(0,3,2,1),(8,9,10,11)]+[(i*4+k,(i+1)*4+k,(i+1)*4+(k+1)%4,i*4+(k+1)%4) for i in range(2) for k in range(4)]
 material(mesh('Twisted solid turbine blade',verts,faces,1,.012),metal)
material(tube('Axle nose',[(0,-.8,2.7),(0,-.48,2.7),(0,.6,2.7)],[.22,.47,.4]),metal)
for j in range(8):
 a=j*math.tau/8
 material(tube('Broken external conduit',[(math.cos(a)*2.6,1.15,2.7+math.sin(a)*2.6),(math.cos(a)*2.69,-.4,2.7+math.sin(a)*2.69),(math.cos(a+.14)*2.74,-1.2,2.7+math.sin(a+.14)*2.74)],[.045,.045,.022]),metal)
for j in range(12):
 a=j*2.4;stone('Collapsed rubble plinth',math.cos(a)*2.1,math.sin(a)*1.35,.04,.45+(j%3)*.13,.42,.32+(j%2)*.25,200+j)
block('Broken foundation left',(-1.55,0,.22),(.8,2.6,.4),2,.1)
block('Broken foundation right',(1.55,.3,.22),(.8,2.3,.4),2,.1)
emit('environment-scrap-megaturbine-v1')

def cocoon(cx,cy,cz,r,h,phase):
 verts=[];faces=[];rings=12;sides=18
 for i in range(rings+1):
  t=i/rings;radius=max(.035,math.sin(math.pi*t)**.72)*r*(1-.28*t)
  for j in range(sides):
   a=j*math.tau/sides;rr=radius*(1+.045*math.sin(a*7+t*9))
   verts.append((cx+math.cos(a)*rr,cy+math.sin(a)*rr,cz+t*h))
  if i:
   for j in range(sides):faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
 faces.extend([tuple(reversed(range(sides))),tuple(rings*sides+j for j in range(sides))])
 shell=material(mesh('Muted jade cocoon membrane',verts,faces),membrane)
 for p in shell.data.polygons:p.use_smooth=True
 # Diagonal open fibres, real tubes, no alpha cards and no black outline shader.
 for j in range(9):
  points=[]
  for i in range(13):
   t=i/12;a=j*math.tau/9+phase+math.sin(t*math.pi)*.55;rr=max(.045,math.sin(math.pi*t)**.72)*r*(1-.28*t)+.016
   points.append((cx+math.cos(a)*rr,cy+math.sin(a)*rr,cz+t*h))
  tube('Fibrous cocoon rib',points,[.018+.009*math.sin(i*math.pi/12) for i in range(13)],1)
 for j in range(4):
  points=[]
  for i in range(33):
   t=.045+i/32*.91;a=j*math.tau/4+phase+t*math.tau*(1.35 if j%2 else -1.35)
   rr=math.sin(math.pi*t)**.72*r*(1-.28*t)+.026
   points.append((cx+math.cos(a)*rr,cy+math.sin(a)*rr,cz+t*h))
  tube('Crosswoven fine silk',points,[.011]*len(points),1)

# Split seed-shell shrine: an off-route rooted structure, not an enterable doorway.
for side in [-1,1]:
 for j in range(4):
  y=(j-1.5)*.34
  points=[(side*1.9,y,.1),(side*2.04,y,1.4),(side*1.7,y,3.35),(side*.82,y,4.75),(side*.15,y,5.1)]
  root_tube('Split ceramic seed shell',points,[.23,.28,.26,.18,.09],0)
  root_tube('Outer root rib',[(x+side*.18,y+.13,z) for x,y,z in points],[.13,.13,.11,.08,.03],1)
 for j in range(3):
  root_tube('Root crossing ceramic panels',[(side*2.4,-.75,.12),(side*1.8,-.84,1.2+j*.22),(side*1.86,.12,2.0+j*.53),(side*.64,.5,4.4+j*.16)],[.15,.13,.09,.028])
cocoon(-.67,-.18,.48,.69,2.35,.2);cocoon(.62,.12,1.02,.61,2.2,1.2);cocoon(.04,.62,2.54,.42,1.48,.6)
for j in range(10):
 a=j*math.tau/10
 root_tube('Spreading structural root',[(math.cos(a)*1.15,math.sin(a)*.8,.85),(math.cos(a)*2.05,math.sin(a)*1.24,.24),(math.cos(a)*2.85,math.sin(a)*1.65,.04)],[.23,.15,.025])
for j in range(5):stone('Broken shrine stone',-1.8+j*.83,.8,.01,.4,.3,.3,300+j)
emit('environment-brood-cocoon-nest-v1')

# Separate silhouette: three suspended cocoons on a crooked dead bough.
root_tube('Crooked host trunk',[(-1.4,.4,0),(-1.25,.4,1.4),(-.65,.35,3.55),(.15,.25,4.75),(1.85,.22,4.55)],[.44,.34,.26,.2,.055])
root_tube('Forked host bough',[(-.65,.35,3.55),(-1.7,.3,4.4),(-2.0,.2,4.75)],[.18,.1,.025])
for x,y,z,r,h in [(-1.7,.1,1.77,.5,1.62),(.0,.04,2.14,.55,1.8),(1.45,.13,1.12,.63,2.12)]:
 cocoon(x,y,z,r,h,x)
 tube('Suspension fibre',[(x,y,z+h),(x+.12,y+.04,4.4)],[.04,.03])
for j in range(6):
 a=j*math.tau/6
 root_tube('Exposed host root',[(-1.4,.4,.5),(-1.4+math.cos(a)*.9,.4+math.sin(a)*.7,.16),(-1.4+math.cos(a)*1.7,.4+math.sin(a)*1.2,.03)],[.17,.12,.018])
emit('environment-brood-hanging-cocoons-v1')
