"""Small, distinct 3D silhouettes; own Blender process and reused atlas.
Style authority: docs/references/biomecha-style-master.png; no image shells.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forest_sculpt_common import *

# Garden: slender evergreen, asymmetric real branches and folded foliage.
tube('Weathered garden trunk',[(0,0,0),(.05,.08,1.5),(-.12,.1,3.7),(.06,.04,6.2)],[.32,.22,.13,.012])
verts=[];faces=[];colors=[];rng=random.Random(862)
for j in range(18):
 a=j*2.39996;h=1.1+j*.26;r=1.35*(1-h/6.5)
 end=Vector((math.cos(a)*r,math.sin(a)*r,h+.32))
 tube('Evergreen scaffold',[(0,0,h),tuple(end)],[.055,.005])
 for k in range(28):
  p=end+Vector((rng.uniform(-.4,.4),rng.uniform(-.4,.4),rng.uniform(-.22,.5)))
  angle=rng.random()*math.tau;u=Vector((math.cos(angle),math.sin(angle),.45));v=Vector((-u.y,u.x,0));n=len(verts)
  verts.extend([p-u*.16,p+v*.065,p+Vector((0,0,.035)),p+u*.19,p-v*.065])
  faces.extend([(n,n+1,n+2),(n+1,n+3,n+2),(n+3,n+4,n+2),(n+4,n,n+2)])
  c=rng.uniform(.8,1.15);colors.extend([(.1*c,.16*c,.082*c,1)]*5)
leaf=bpy.data.materials.new('forest-geometric-leaves');leaf.use_nodes=True
bs=leaf.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.95
attr=leaf.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0';leaf.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
data=bpy.data.meshes.new('Evergreen folded leaf fans');data.from_pydata(verts,[],faces);data.materials.append(leaf);data.update()
attr=data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
for c,rgba in zip(attr.data,colors):c.color=rgba
o=bpy.data.objects.new('Airy garden crown',data);bpy.context.collection.objects.link(o)
for a in range(5):tube('Exposed garden roots',[(0,0,.4),(math.cos(a)*.65,math.sin(a)*.65,.03)],[.12,.008])
export('environment-garden-tree-v2')

# Scrap: abandoned engine block, open ribs, skewed pipes; no decorative planter.
block('Collapsed engine crankcase',(0,0,.75),(2.8,1.8,1.25),1,.12,.13)
for j in range(6):
 x=(j-2.5)*.43
 tube('Exposed cylinder rib',[(x,math.cos(a)*.9,.8+math.sin(a)*.8) for a in [k*math.pi/10 for k in range(11)]],[.09]*11,1)
for side in [-1,1]:
 tube('Severed manifold',[(-1.6,side*.65,.25),(-.7,side*1.12,.9),(.5,side*1.05,1.35),(1.3,side*.8,1.6)],[.18,.18,.15,.1],1)
for j in range(4):
 o=block('Torn casing panel',((j-1.5)*.65,0,1.65),(.58,1.5,.1),0,.025,(j%2-.5)*.35);o.rotation_euler.x=(j%3-1)*.24
export('environment-scrap-engine-v2')

# City: fractured load-bearing pier and protruding reinforcement.
block('Broken pavement footing',(0,0,.15),(2.5,2.1,.3),2,.045)
for j in range(6):
 block('Uneven concrete pier',((j%2-.5)*.12,0,.4+j*.46),(1.1-(j%3)*.1,1.0,.44),2,.035,j*.017)
for j in range(4):
 x=(j%2-.5)*.67;y=(j//2-.5)*.65
 tube('Bent exposed reinforcement',[(x,y,2.3),(x,y,3.2),(x+.12,y+.07,3.55)],[.035,.03,.018],1)
for j in range(5):stone('Fractured concrete debris',math.sin(j*2.4)*1.1,math.cos(j*2.4)*.9,.02,.42,.35,.4,j+936)
export('environment-city-pier-v2')

# Nursery: tall open cocoon cage with curved roots and small living inner core.
for j in range(9):
 a=j*math.tau/9
 tube('Living cocoon rib',[(math.cos(a)*.55,math.sin(a)*.55,.02),(math.cos(a)*.95,math.sin(a)*.95,1.1),(math.cos(a)*.65,math.sin(a)*.65,2.4),(math.cos(a)*.12,math.sin(a)*.12,3.15)],[.15,.19,.14,.018],1)
 tube('Radial anchoring tendril',[(math.cos(a)*.6,math.sin(a)*.6,.6),(math.cos(a)*1.25,math.sin(a)*1.25,.1),(math.cos(a)*1.7,math.sin(a)*1.7,.02)],[.14,.07,.005],1)
for j in range(3):
 o=block('Small luminous inner seed',(0,0,.65+j*.45),(.22,.18,.3),0,.06);o.data.materials.clear();o.data.materials.append(mint)
export('environment-brood-pod-v2')
