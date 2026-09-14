"""Ten small reference-driven 3D props. Own headless scene; reuse surface atlas.
Style: docs/references/biomecha-style-master.png and environments-v3 targets.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forest_sculpt_common import *

metal=bpy.data.materials.new('environment-aged-metal');metal.use_nodes=True
bs=metal.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.12,.14,.13,1);bs.inputs['Metallic'].default_value=.25;bs.inputs['Roughness'].default_value=.8
attr=metal.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='COLOR_0';metal.node_tree.links.new(attr.outputs['Color'],bs.inputs['Base Color'])
def steel(o):
 o.data.materials.clear();o.data.materials.append(metal);return o
def glow(o):
 o.data.materials.clear();o.data.materials.append(mint);return o
def ring(name,radius,width,height,cell=0,segments=24,arc=math.tau):
 verts=[];faces=[]
 for j in range(segments+1):
  a=j/segments*arc
  for r,z in [(radius,0),(radius,height),(radius-width,height),(radius-width,0)]:verts.append((math.cos(a)*r,math.sin(a)*r,z))
  if j:
   for k in range(4):faces.append(((j-1)*4+k,j*4+k,j*4+(k+1)%4,(j-1)*4+(k+1)%4))
 faces.extend([(0,3,2,1),tuple(segments*4+k for k in range(4))])
 return mesh(name,verts,faces,cell,.018)
def emit(name):
 same=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==metal]
 if same:
  bpy.ops.object.select_all(action='DESELECT')
  for o in same:o.select_set(True)
  bpy.context.view_layer.objects.active=same[0];bpy.ops.object.join()
 export(name)

# Gardens: open ceramic water tower with an attached maintenance panel.
ring('Open weathered irrigation cylinder',.65,.15,2.75)
for h in [.12,1.9,2.65]:
 o=steel(ring('Retaining band',.69,.055,.08,1));o.location.z=h
steel(tube('Bent delivery pipe',[(.5,.15,.9),(1.05,.15,.9),(1.05,-.25,.25)],[.09,.09,.08]))
block('Maintenance ceramic cover',(.0,-.67,1.35),(.48,.15,.7),0,.05)
glow(block('Small live status strip',(0,-.759,1.45),(.045,.012,.27),0,.004))
for i in range(3):stone('Foundation fragments',math.sin(i*2.4)*.75,math.cos(i*2.4)*.65,0,.4,.3,.2,70+i)
emit('environment-garden-irrigator-v1')

# Gardens: broken circular basin with visibly missing rim and drainage grate.
ring('Broken limestone basin',1.25,.24,.65,2,24,math.pi*1.65)
block('Sediment floor',(0,0,.08),(1.5,1.5,.14),3,.06)
for i in range(5):steel(block('Exposed drainage bars',((i-2)*.15,-.72,.2),(.055,.5,.05),1,.01))
for i in range(4):stone('Fallen rim section',.8+i*.14,-.6+i*.23,0,.28,.2,.22,90+i)
emit('environment-garden-basin-v1')

# Scrap: upright broken turbine hoop and visibly different radial fan.
o=ring('Open turbine casing',1.35,.22,.52,0,28,math.pi*1.82);o.rotation_euler.x=math.pi/2;o.location=(0,.22,1.35)
o=steel(ring('Exposed inner turbine ring',.96,.08,.18,1));o.rotation_euler.x=math.pi/2;o.location=(0,-.15,1.35)
for j in range(9):
 a=j*math.tau/9
 steel(mesh('Twisted impeller blade',[(math.cos(a)*.28,-.23,1.35+math.sin(a)*.28),(math.cos(a)*.86,-.25,1.35+math.sin(a)*.86),(math.cos(a+.3)*.89,-.05,1.35+math.sin(a+.3)*.89),(math.cos(a+.2)*.32,-.02,1.35+math.sin(a+.2)*.32)],[(0,1,2,3)],1))
steel(tube('Axle',[(0,-.5,1.35),(0,.6,1.35)],[.18,.18]))
block('Collapsed stand',(0,0,.15),(1.6,1.0,.3),2,.04)
emit('environment-scrap-turbine-v1')

# Scrap: abandoned pipe bundle, open pipe mouths, bent frame.
for i in range(5):
 o=steel(ring('Hollow salvage pipe',.23,.055,2.3-(i%2)*.6,1,12));o.rotation_euler.x=math.pi/2;o.rotation_euler.z=(i-2)*.06;o.location=((i%3-1)*.5,1.1,.28+(i//3)*.43)
for y in [-.55,.65]:steel(tube('Broken binding strap',[(-.85,y,.03),(-.82,y,.62),(.7,y,.82),(.83,y,.03)],[.06]*4))
block('Detached ceramic access panel',(1.05,.35,.12),(.7,1.1,.13),0,.04,.3)
emit('environment-scrap-pipes-v1')

# Forest: fallen hollow trunk, branching roots and shelf fungi.
o=ring('Hollow fallen trunk',.58,.2,3.0,1,18);o.rotation_euler.x=math.pi/2;o.location=(0,1.5,.56)
for i in range(5):tube('Twisted root branch',[(0,1,.45),(math.cos(i)*.7,1.5,.3),(math.cos(i)*1.05,1.9,.07)],[.18,.09,.015])
for i in range(4):stone('Shelf fungus',.48,.65-i*.48,.65,.32,.28,.07,110+i)
emit('environment-forest-log-v1')

# Forest: sealed, half-buried utility relic with asymmetrical root drape.
block('Buried ceramic relic',(0,0,.6),(1.65,1.15,1.05),0,.12,-.1)
steel(block('Recessed front vent',(0,-.59,.65),(1.15,.09,.36),1,.025))
for i in range(6):block('Vent fins',((i-2.5)*.16,-.66,.65),(.045,.05,.32),0,.01)
glow(block('Tiny mint panel',(-.5,-.68,.91),(.27,.025,.055),0,.004))
for i in range(3):tube('Root crossing lid',[(-1,.4,.02),(-.7+i*.18,.35,1.12),(.1+i*.3,.1,1.18),(.9,-.7,.05)],[.1,.08,.055,.008])
emit('environment-forest-cache-v1')

# City: cracked service cabinet, open recess, conduit leaving the plinth.
block('Concrete plinth',(0,0,.16),(1.8,1.1,.32),2,.05)
steel(block('Utility housing',(0,0,1.22),(1.3,.75,1.9),1,.06))
block('Left ceramic door',(-.32,-.43,1.23),(.57,.09,1.65),0,.025,-.05)
o=block('Hanging broken door',(.51,-.52,1.06),(.5,.08,1.3),0,.03,-.4);o.rotation_euler.x=.14
for i in range(3):steel(tube('Cable loom',[(.15,-.42,1.7),(.15+i*.12,-.52,.6),(.65+i*.18,-.8,.05)],[.027]*3))
glow(block('Cabinet indicator',(-.4,-.49,1.73),(.1,.015,.05),0,.003))
emit('environment-city-cabinet-v1')

# City: broken utility duct with raised concrete shoulders, no impassable pit.
for x in [-.6,.6]:
 for i in range(3):block('Fractured duct curb',(x,(i-1)*.78,.22),(.24,.7,.44),2,.04,(i-1)*.07)
for i in range(4):steel(tube('Exposed utility run',[(i*.15-.23,-1.2,.13),(i*.15-.23,0,.2),(i*.16-.27,1.25,.1)],[.045]*3))
o=block('Dislodged cover plate',(.63,.2,.35),(.8,1.3,.12),0,.035,.42);o.rotation_euler.y=.26
emit('environment-city-duct-v1')

# Nursery: seed clutch, each seed enclosed in four woody ribs.
for j in range(5):
 a=j*2.4;x=math.cos(a)*.65;y=math.sin(a)*.6;h=.55+(j%3)*.24
 for k in range(4):
  b=k*math.pi/2
  tube('Seed husk ribs',[(x,y,.05),(x+math.cos(b)*.24,y+math.sin(b)*.24,h*.6),(x,y,h)],[.09,.065,.01])
 o=stone('Seed membrane',x,y,.15,.18,.18,h*.5,j+180)
 tube('Root feeding seed',[(x,y,.16),(x*1.5,y*1.5,.03)],[.065,.004])
emit('environment-brood-clutch-v1')

# Nursery: layered fan-shaped growth instead of another upright cage.
for j in range(8):
 a=j*2.4;r=.4+(j%3)*.23;x=math.cos(a)*r;y=math.sin(a)*r;h=.22+(j%4)*.26
 tube('Curved fan stem',[(0,0,0),(x*.5,y*.5,h*.65),(x,y,h)],[.09,.055,.025])
 verts=[(x,y,h-.03)]+[(x+math.cos(a-.9+k*.18)*.65,y+math.sin(a-.9+k*.18)*.65,h+.14*math.sin(k*.31)) for k in range(11)]
 count=len(verts);verts+= [(x,y,z-.045) for x,y,z in verts]
 faces=[(0,k,k+1) for k in range(1,11)]+[(count,count+k+1,count+k) for k in range(1,11)]
 faces += [(k,(k+1)%count,(k+1)%count+count,k+count) for k in range(count)]
 mesh('Woody shelf fan',verts,faces,1)
emit('environment-brood-fans-v1')
