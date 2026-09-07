"""Author modular weapons in Blender; export GLBs and offline review renders.
Style master is packed in the blend. Units: Blender Z-up, mount at highest Z.
Re-run: blender --background --python scripts/asset-kit/equipment_v2.py
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2]
OUT=P/'output/blender-equipment-v2'; KIT=P/'public/assets/kit'; ICON=OUT/'renders'
for p in [OUT,ICON]:p.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rng=random.Random(709)
# Actual embedded image textures survive glTF export (unlike procedural shader nodes).
def material(name,color,metal=0,rough=.7):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;bs=n.get('Principled BSDF');bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 im=bpy.data.images.new(name+' wear',width=128,height=128);pixels=[]
 for y in range(128):
  for x in range(128):
   grain=rng.uniform(-.07,.07);stain=(math.sin(x*.087+math.sin(y*.06)*2)*math.sin(y*.091))*.1
   dark=.48 if rng.random()<.018 else 1
   pixels.extend([max(0,min(1,(c+grain+stain)*dark)) for c in color]+[1])
 im.pixels=pixels;im.pack();tex=n.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);return m
ceramic=material('Worn warm ivory ceramic',(.68,.66,.57),.08,.79)
metal=material('Oxidised dark steel',(.10,.125,.12),.72,.6)
rim=material('Patinated collar',(.24,.235,.17),.65,.72)
bio=material('Olive tendon sheath',(.18,.215,.12),.05,.9)
light=material('Restrained mint optic',(.22,.55,.46),.25,.38)
objects=[]
def finish(o,name,mat):
 o.name=name;o.data.materials.append(mat);objects.append(o)
 if o.type=='MESH':
  for p in o.data.polygons:p.use_smooth=True
 return o
def sphere(name,loc,scale,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(o,name,mat)
def rod(name,a,b,r1,r2,mat,verts=16):
 a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cone_add(vertices=verts,radius1=r1,radius2=r2,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(o,name,mat)
def box(name,loc,scale,mat,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);mod=o.modifiers.new('Machined rounded edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name);return finish(o,name,mat)
def collar(z,r=.18):
 rod('Steel mounting ferrule',(0,0,z-.075),(0,0,z+.075),r,r,metal)
 rod('Patinated retaining band',(0,0,z-.022),(0,0,z+.022),r*1.08,r*1.08,rim)
 for i in range(6):
  a=i*math.tau/6;sphere('Recessed fastener',(math.cos(a)*r,math.sin(a)*r,z),(.018,.018,.027),metal)
def export(id):
 global objects
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 # These are rigid attachments. Merge by shared material for a small draw-call budget.
 bpy.ops.object.join();objects=[bpy.context.object];objects[0].name=id
 bpy.ops.export_scene.gltf(filepath=str(KIT/(id+'.glb')),export_format='GLB',use_selection=True,export_apply=True)
 col=bpy.data.collections.new(id);bpy.context.scene.collection.children.link(col)
 for o in objects:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 return col
# Whip: short armoured actuator, segmented living cable and hooked tapering end.
collar(0);sphere('Actuator shell',(0,0,-.22),(.2,.16,.23),ceramic)
for x in [-.13,.13]:rod('Hydraulic tensioner',(x,0,-.18),(x,0,-.48),.033,.027,metal)
collar(-.42,.13)
points=[]
for i in range(27):
 t=i/26;points.append(Vector((.28*math.sin(t*math.tau*.9)*t,.065*math.sin(t*math.pi*2),-.45-1.95*t)))
for i,(a,b) in enumerate(zip(points,points[1:])):
 r=.078*(1-i/30);rod('Flexible tendon',a,b,r,r*.97,bio,12)
 if i<23:
  center=a.lerp(b,.35);d=(b-a).normalized();rod('Articulated dark vertebra',center-d*.024,center+d*.024,r*1.35,r*1.15,metal,12)
  if i%3==0:sphere('Protective ceramic scute',(center.x,center.y-.045,center.z),(.067*(1-i/30),.028,.047),ceramic)
rod('Piercing terminal',points[-1],points[-1]+Vector((.12,0,-.17)),.033,0,rim)
whip=export('arm-whip');objects=[]
# Needle launcher: asymmetric ceramic receiver, long rail barrel, visible single dart.
collar(0,.17);sphere('Receiver inner casing',(0,0,-.37),(.16,.145,.35),metal)
box('Ceramic receiver left',(-.12,0,-.33),(.12,.29,.46),ceramic)
box('Ceramic receiver right',(.12,0,-.3),(.10,.27,.37),ceramic)
box('Dark linear breech',(0,-.12,-.57),(.19,.07,.3),metal,.018)
for z in [-.19,-.29,-.39]:box('Receiver cooling slot',(-.183,-.02,z),(.012,.16,.018),metal,.005)
rod('Long dart guide',(0,0,-.53),(0,0,-1.39),.065,.052,metal,20)
for z in [-.65,-.98,-1.29]:
 rod('Barrel guide ring',(0,0,z-.032),(0,0,z+.032),.083,.083,rim,20)
for x in [-.084,.084]:rod('Rail',(x,0,-.58),(x,0,-1.35),.018,.014,metal,12)
rod('Exposed needle',(0,0,-1.37),(0,0,-1.75),.027,0,rim,12)
box('Dart magazine',(.24,.02,-.39),(.12,.17,.38),metal,.016)
for z in [-.27,-.35,-.43]:box('Magazine ceramic strip',(.304,.02,z),(.02,.14,.04),ceramic,.005)
box('Targeting sensor',(0,-.18,-.24),(.07,.055,.1),metal,.015)
sphere('Small aiming optic',(0,-.211,-.25),(.022,.012,.024),light)
needle=export('arm-needle');objects=[]
# Pack the approved reference in the editable source, excluded from exported meshes.
ref=bpy.data.images.load(str(P/'docs/references/biomecha-style-master.png'));ref.pack()
bpy.context.scene['style_reference']='docs/references/biomecha-style-master.png — muted olive, worn ivory ceramic, matte aged steel, restrained mint.'
# Shared preview lighting.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Cool ambient world');scene.world.color=(.13,.16,.18)
def area(name,loc,power,size,color):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,-.7))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm upper left',(-3,-4,5),450,4,(1,.87,.7));area('Cool soft fill',(4,1,2),220,5,(.65,.8,1))
d=bpy.data.cameras.new('Equipment camera');cam=bpy.data.objects.new('Equipment camera',d);scene.collection.objects.link(cam);scene.camera=cam;d.type='ORTHO'
collections=[whip,needle]
# Render exact existing root leg and shield as well, for offline comparison only; never changes game icons.
for id in ['leg-root','arm-shield','leg-jumper','leg-worker','leg-guard']:
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(KIT/(id+'.glb')));imported=set(bpy.data.objects)-before
 col=bpy.data.collections.new(id);scene.collection.children.link(col)
 for o in imported:
  for c in list(o.users_collection):c.objects.unlink(o)
  col.objects.link(o)
 collections.append(col)
for col in collections:
 for other in collections:other.hide_render=other!=col
 coords=[o.matrix_world@Vector(c) for o in col.objects if o.type=='MESH' for c in o.bound_box]
 lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)));hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)));center=(lo+hi)/2;size=max(hi-lo)
 cam.location=center+Vector((3,-5,2.4))*size;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=size*1.25
 scene.render.filepath=str(ICON/(col.name+'.png'));bpy.ops.render.render(write_still=True)
for col in collections:col.hide_render=False
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'equipment-v2.blend'))
manifest=json.loads((KIT/'manifest.json').read_text());byid={a['id']:a for a in manifest}
for id in ['arm-whip','arm-needle']:byid[id]={'id':id,'file':id+'.glb','bytes':(KIT/(id+'.glb')).stat().st_size}
(KIT/'manifest.json').write_text(json.dumps(list(byid.values()),indent=2)+'\n')
print('EQUIPMENT_V2_COMPLETE',flush=True)
