"""Author the two rigid attachments from their icon references, without changing sockets.
Run: blender --background --threads 2 --python scripts/asset-kit/summon-equipment-v1.py
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/summon-equipment-v1'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
# Reuse the project's actual textured ceramic/metal material, not a new art palette.
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/kit/leg-worker.glb'))
original=next(o.active_material for o in bpy.context.scene.objects if o.type=='MESH')
def material(name,color,metal,rough):
 m=original.copy();m.name=name
 bs=m.node_tree.nodes.get('Principled BSDF')
 bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 # Canonical UV windows below select the original material, without recoloring.
 return m
ceramic=original.copy();ceramic.name='Worn ivory ceramic'
steel=material('Dark recessed steel',(.13,.16,.15),.7,.6)
brass=material('Patinated collars',(.46,.39,.26),.65,.65)
light=bpy.data.materials.new('Restrained mint cells');light.use_nodes=True
bs=light.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.2,.58,.43,1)
bs.inputs['Emission Color'].default_value=(.18,.55,.38,1);bs.inputs['Emission Strength'].default_value=.65
for o in list(bpy.context.scene.objects):bpy.data.objects.remove(o,do_unlink=True)
parts=[];collections=[]
def finish(o,name,mat):
 o.name=name;o.data.materials.clear();o.data.materials.append(mat);parts.append(o)
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=True
  windows={ceramic:[(232,320,56,56),(240,344,56,56),(248,376,56,56)],brass:[(316,8,20,20)],steel:[(32,244,20,20)]}
  if mat in windows and o.data.uv_layers.active:
   x,y,w,h=windows[mat][len(parts)%len(windows[mat])]
   for loop in o.data.uv_layers.active.data:
    u,v=loop.uv;loop.uv=((x+max(0,min(1,u))*w)/512,1-(y+(1-max(0,min(1,v)))*h)/512)
 return o
def box(name,p,s,mat=ceramic,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.scale=s
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Rounded machined edges','BEVEL');mod.width=bevel;mod.segments=3
 bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,mat)
def rod(name,a,b,r,mat=steel,vertices=20):
 a,b=Vector(a),Vector(b);d=b-a
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2)
 o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat)
def ring(name,p,r,t,mat=brass,axis=(0,0,1),segments=32):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=segments,minor_segments=8,location=p)
 o=bpy.context.object;o.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler();return finish(o,name,mat)
def bolt(p,axis=(0,-1,0),r=.018):
 v=Vector(axis)*.015;p=Vector(p);rod('Recessed fastener',p-v,p+v,r,brass,6)
def collar():
 ring('Open socket collar',(0,0,0),.17,.045)
 ring('Socket locking rim',(0,0,-.08),.17,.025,steel)
 for i in range(6):
  a=i*math.tau/6;bolt((.175*math.cos(a),.175*math.sin(a),.035),(0,0,1),.014)
def hinge(z,y=0,r=.12):
 rod('Axle',(-.2,y,z),(.2,y,z),r,steel)
 for side in [-1,1]:
  rod('Bearing cover',(side*.2,y,z),(side*.22,y,z),r*.86,brass)
  ring('Bearing groove',(side*.224,y,z),r*.60,.012,steel,(1,0,0))
def cable(name,points,r=.022):
 for a,b in zip(points,points[1:]):rod(name,a,b,r,steel,10)
def cell(z,y=-.2,r=.066):
 rod('Hex cell recess',(0,y+.02,z),(0,y-.035,z),r,steel,6)
 ring('Hex cell rim',(0,y-.038,z),r*.85,.011,brass,(0,-1,0),6)
 rod('Mint cell',(0,y-.041,z),(0,y-.047,z),r*.54,light,12)
def export(id):
 global parts
 col=bpy.data.collections.new(id);bpy.context.scene.collection.children.link(col)
 for o in parts:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 # Merge by material to bound draw calls.
 merged=[]
 groups=[(mat,[o for o in parts if o.active_material==mat]) for mat in [ceramic,steel,brass,light]]
 for mat,group in groups:
  if not group:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in group:o.select_set(True)
  bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
  bpy.context.object.name=id+'-'+mat.name;merged.append(bpy.context.object)
 parts=merged
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 bpy.ops.export_scene.gltf(filepath=str(OUT/(id+'.glb')),export_format='GLB',use_selection=True,export_apply=True)
 collections.append(col);parts=[]

# Icon: circular collar, angled upper leg, three-cell shin, split articulated foot.
collar();box('Upper ceramic hip',(0,.015,-.14),(.34,.29,.19))
hinge(-.25,r=.105)
rod('Upper structural strut',(0,0,-.25),(0,.08,-.52),.092)
plate=box('Upper leg ceramic shield',(0,-.065,-.39),(.24,.12,.29));plate.rotation_euler.x=-.28
hinge(-.57,.08)
box('Shin structural housing',(0,.02,-.84),(.27,.23,.47),steel)
for side in [-1,1]:
 panel=box('Tapered shin ceramic panel',(side*.103,-.075,-.84),(.13,.18,.49));panel.rotation_euler.y=side*.065
 for z in [-.65,-1.02]:bolt((side*.12,-.171,z))
 cable('Posterior tendon',[(side*.15,.13,-.58),(side*.17,.17,-.8),(side*.13,.12,-1.10)])
 for z in [-.74,-.87,-1.0]:ring('Cable retainer',(side*.16,.16,z),.028,.008)
for z in [-.70,-.84,-.98]:cell(z,-.18)
for z in [-.77,-.91]:box('Cell separator',(0,-.185,z),(.135,.052,.025),ceramic,.009)
hinge(-1.13,.035,.095)
box('Foot crosspiece',(0,-.04,-1.24),(.32,.19,.12),steel)
for side in [-1,1]:
 x=side*.12
 box('Split toe base',(x,-.20,-1.32),(.17,.43,.13),steel)
 for j in range(3):
  box('Toe ceramic scale',(x,-.08-j*.115,-1.27),(.157,.10,.075),ceramic,.02)
  bolt((x,-.09-j*.115,-1.224),(0,0,1),.011)
export('leg-swarm-v1')

# Icon: collar, short wrist, open single-drone cradle with raised protective rails.
collar();box('Mount ceramic housing',(0,.0,-.16),(.37,.33,.24))
for z in [-.105,-.16,-.215]:box('Mount cooling groove',(0,-.17,z),(.22,.012,.015),steel,.004)
hinge(-.33,r=.105)
rod('Short wrist strut',(0,0,-.32),(0,0,-.53),.095)
for side in [-1,1]:cable('Wrist control cable',[(side*.13,.075,-.28),(side*.16,.10,-.42),(side*.13,.06,-.59)])
box('Dock recessed bed',(0,0,-.84),(.40,.19,.62),steel)
for side in [-1,1]:
 rail=box('Protective ceramic side rail',(side*.215,-.08,-.85),(.14,.26,.67));rail.rotation_euler.y=side*.09
 for z in [-.59,-1.09]:bolt((side*.215,-.22,z))
 for z in [-.67,-.84,-1.01]:box('Rail seam',(side*.276,-.04,z),(.009,.15,.016),steel,.002)
box('Dock rear bridge',(0,-.055,-.535),(.39,.20,.10),ceramic)
box('Recess upper wall',(0,-.104,-.64),(.28,.07,.12),steel)
for z in [-.90,-.95,-1,-1.05]:box('Dock rib',(0,-.12,z),(.29,.035,.017),brass,.004)
cell(-.76,-.125,.105)
for side in [-1,1]:
 box('Contact prong',(side*.095,-.11,-1.20),(.065,.085,.23),brass,.012)
 box('Prong ceramic guard',(side*.095,-.16,-1.17),(.073,.035,.15),ceramic,.01)
export('arm-drone-v1')

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Cool ambient');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.29,.34,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
def area(name,p,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.size=size;d.color=color
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=p;o.rotation_euler=(Vector((0,0,-.7))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm upper left',(-3,-4,4),350,3,(1,.87,.72));area('Cool fill',(3,1,1),170,4,(.68,.81,1))
d=bpy.data.cameras.new('Icon comparison camera');cam=bpy.data.objects.new('Icon comparison camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO';d.ortho_scale=1.8
cam.location=(2.6,-4,1.7);cam.rotation_euler=(Vector((0,0,-.67))-cam.location).to_track_quat('-Z','Y').to_euler()
for col in collections:
 for other in collections:other.hide_render=other!=col
 scene.render.filepath=str(OUT/(col.name+'-preview.png'));bpy.ops.render.render(write_still=True)
for col in collections:col.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'summon-equipment-v1.blend'))
print('SUMMON_EQUIPMENT_READY',flush=True)
