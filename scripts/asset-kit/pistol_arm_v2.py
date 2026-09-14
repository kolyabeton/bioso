"""Reference-shaped pistol arm. Reuses the shipped needle/fangs materials verbatim.

blender --background --threads 4 --python scripts/asset-kit/pistol_arm_v2.py
The stable runtime asset ID stays arm-pistol-v1; v1's editable source is retained.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]
KIT = P / 'public/assets/kit'
OUT = P / 'output/blender-pistol-arm-v2'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import actual embedded textures and complete material graphs; no new wear maps.
for asset in ['arm-needle', 'arm-fangs']:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(KIT / (asset + '.glb')))
    for obj in set(bpy.data.objects) - before:
        bpy.data.objects.remove(obj, do_unlink=True)
def existing(name):
    return bpy.data.materials[name]
ceramic = existing('Worn warm ivory ceramic')
steel = existing('Oxidised dark steel')
rim = existing('Patinated collar')
mint = existing('Restrained mint optic')
tendon = existing('Olive tendon sheath')
objects = []

def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj
root = empty('arm-pistol-v1')
forearm = empty('pistol-forearm', (0, 0, -.84), root)
slide = empty('pistol-slide', (0, 0, -1.02), forearm)
breech = empty('pistol-breech', (0, 0, -1.02), forearm)
muzzle = empty('pistol-muzzle', (0, 0, -1.38), forearm)

def finish(obj, name, material, parent):
    obj.name = name
    obj.parent = parent
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    objects.append(obj)
    return obj

def bevel(obj, width=.012, segments=2):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Panel edge bevel', 'BEVEL')
    mod.width = width
    mod.segments = segments
    bpy.ops.object.modifier_apply(modifier=mod.name)
    # Weighted flat surfaces preserve the machined shape instead of balloon shading.
    mod = obj.modifiers.new('Face weighted normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def rod(name, a, b, r1, r2, material=steel, parent=root, vertices=24):
    a, b = Vector(a), Vector(b)
    d = b-a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2,
                                  depth=d.length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, material, parent)

def box(name, location, dimensions, material=ceramic, parent=root, edge=.014):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    finish(obj, name, material, parent)
    return bevel(obj, edge)

def ring(name, position, radius, thickness, material=rim, parent=root, axis=(0,0,1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=thickness,
                                    major_segments=40, minor_segments=8, location=position)
    obj = bpy.context.object
    obj.rotation_euler = Vector(axis).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, material, parent)

def tube(name, z0, z1, outer, inner, material, parent):
    # A real recessed bore, open at the muzzle, with four concentric vertex loops.
    n=40
    verts=[(r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z)
           for z,r in [(z0,outer),(z1,outer),(z1,inner),(z0,inner)] for i in range(n)]
    faces=[]
    for j in range(4):
        for i in range(n):
            a=j*n+i;b=j*n+(i+1)%n;c=((j+1)%4)*n+(i+1)%n;d=((j+1)%4)*n+i
            faces.append((a,b,c,d))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj)
    return bevel(finish(obj,name,material,parent), .005)

def shell(name, rows, start, end, material=ceramic, parent=root, thickness=.035):
    """Curved, tapered plate following a bent limb, with visible wall thickness.

    rows = (z, center_x, radius_x, radius_y). Angles leave mechanical channels open.
    """
    n=12;verts=[]
    for inner in [False,True]:
        for z,cx,rx,ry in rows:
            for i in range(n+1):
                a=start+(end-start)*i/n
                verts.append((cx+(rx-(thickness if inner else 0))*math.cos(a),
                              (ry-(thickness if inner else 0))*math.sin(a),z))
    stride=n+1;layer=len(rows)*stride;faces=[]
    for j in range(len(rows)-1):
        for i in range(n):
            a=j*stride+i;b=a+1;c=a+stride+1;d=a+stride
            faces.extend([(a,b,c,d),(a+layer,d+layer,c+layer,b+layer)])
    for j in [0,len(rows)-1]:
        for i in range(n):
            a=j*stride+i;faces.append((a,a+layer,a+1+layer,a+1))
    for i in [0,n]:
        for j in range(len(rows)-1):
            a=j*stride+i;faces.append((a,a+stride,a+stride+layer,a+layer))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj)
    return bevel(finish(obj,name,material,parent),.009)

def cable(name, points, radius=.023, material=steel, parent=root):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.resolution_u=10;curve.bevel_depth=radius;curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for bp,co in zip(spline.bezier_points,points):
        bp.co=co;bp.handle_left_type=bp.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,material,parent)

# Oversized shoulder coupler with stepped ring, segmented ceramic armour and lugs.
rod('Shoulder coupling core',(0,0,.02),(0,0,-.22),.265,.255)
for z,r,t,m in [(.035,.30,.025,steel),(-.005,.327,.025,rim),(-.07,.32,.022,steel),
                (-.20,.275,.025,rim),(-.25,.222,.025,steel)]:
    ring('Shoulder concentric retaining ring',(0,0,z),r,t,m)
for i in range(8):
    a=i*math.tau/8
    shell('Segmented shoulder ceramic armour',[(.045,0,.353,.353),(-.04,0,.374,.374),(-.18,0,.31,.31)],a+.035,a+math.tau/8-.035)
    lug=box('Shoulder locking lug',(.361*math.cos(a),.361*math.sin(a),-.01),(.08,.08,.07),rim,edge=.008)
    rod('Shoulder fastener',(.342*math.cos(a),.342*math.sin(a),-.142),(.342*math.cos(a),.342*math.sin(a),-.172),.014,.014,steel,vertices=8)

# Tapered upper arm with staggered, curved ceramic plates, not rectangular blocks.
rod('Upper arm backbone',(0,0,-.24),(0,0,-.75),.158,.135)
for offset in [0,math.pi]:
    shell('Upper arm ceramic half', [(-.245,0,.226,.205),(-.34,.015,.241,.212),
           (-.56,.025,.202,.178),(-.72,0,.158,.145)],offset+.18,offset+math.pi-.18)
    shell('Upper arm shoulder overlay',[(-.26,0,.235,.217),(-.355,.014,.25,.223),(-.425,.02,.235,.205)],offset+.27,offset+1.55)
for side in [-1,1]:
    cable('Upper arm exposed tendon',[(side*.12,-.13,-.23),(side*.15,-.17,-.45),(side*.11,-.13,-.79)],.025,tendon)
    for z in [-.40,-.58]:
        rod('Upper armour recessed rivet',(side*.12,-.177,z),(side*.12,-.189,z),.014,.014,rim,vertices=10)

# Large cross-axis elbow bearing, concentric side disks and mechanical fasteners.
rod('Elbow axle',(0,-.225,-.84),(0,.225,-.84),.172,.172)
for side in [-1,1]:
    for r,y,t,m in [(.187,.184,.027,steel),(.149,.223,.022,rim),(.102,.244,.017,steel),(.067,.254,.012,rim)]:
        ring('Elbow concentric bearing',(0,side*y,-.84),r,t,m,axis=(0,1,0))
    rod('Elbow central spindle',(0,side*.234,-.84),(0,side*.267,-.84),.052,.052,steel,vertices=12)
    for i in range(6):
        a=i*math.tau/6
        rod('Elbow bolt',(.142*math.cos(a),side*.23,-.84+.142*math.sin(a)),
            (.142*math.cos(a),side*.246,-.84+.142*math.sin(a)),.013,.013,steel,vertices=8)

# Long bowed forearm, broad near the elbow and narrowing towards the short barrel.
forearm.rotation_euler.y=math.radians(25)
rod('Forearm receiver skeleton',(0,0,-.12),(0,0,-1.06),.105,.126,parent=forearm)
rows=[(-.13,0,.147,.128),(-.28,-.015,.22,.17),(-.52,-.055,.245,.188),
      (-.77,-.055,.203,.167),(-.94,-.025,.159,.145)]
shell('Swept dorsal forearm armour',rows,-.2,math.pi+.20,parent=forearm)
shell('Front curved armour strip',rows,math.pi+.20,math.pi+1.09,parent=forearm)
shell('Opposite curved armour strip',rows,math.tau-1.09,math.tau-.2,parent=forearm)
# A second raised lamella at the elbow makes the overlapping silhouette readable.
shell('Forearm elbow overlap',[(-.15,0,.153,.14),(-.29,-.015,.231,.184),(-.46,-.045,.245,.199)],.25,2.3,parent=forearm)
for side in [-1,1]:
    cable('Visible forearm hydraulic hose',[(side*.065,-.112,-.13),(side*.097,-.153,-.40),
          (side*.10,-.163,-.65),(side*.08,-.13,-.98)],.025,steel,forearm)
    rod('Forearm hydraulic sleeve',(side*.098,-.168,-.35),(side*.09,-.16,-.70),.033,.027,rim,forearm)
    rod('Forearm exposed piston',(side*.09,-.16,-.70),(side*.067,-.14,-.94),.018,.018,steel,forearm)
    for z in [-.32,-.69,-.89]:
        rod('Forearm edge screw',(side*.125,-.145,z),(side*.125,-.159,z),.013,.013,rim,forearm,10)
    cable('Arm seam pipe',[(side*.135,0,-.18),(side*.20,-.025,-.47),(side*.16,-.02,-.83)],.013,rim,forearm)

# Compact pistol receiver: short slide, five flutes, side optic and recessed bore.
rod('Five chamber rotating breech',(0,0,.04),(0,0,-.15),.143,.143,steel,breech,30)
for i in range(5):
    a=i*math.tau/5
    rod('Five chamber flute',(.125*math.cos(a),.125*math.sin(a),.035),
        (.125*math.cos(a),.125*math.sin(a),-.13),.023,.023,rim,breech,10)
shell('Pistol slide curved jacket',[(.055,0,.183,.162),(-.04,0,.19,.166),(-.14,0,.17,.149)],-.1,math.pi+1.08,parent=slide)
box('Pistol slide dorsal rail',(0,.157,-.035),(.09,.045,.24),steel,slide,.009)
for side in [-1,1]:
    box('Receiver side plate',(side*.154,-.03,-.055),(.05,.20,.19),ceramic,slide,.018)
    for z in [-.01,-.065,-.12]:
        box('Receiver cooling slot',(side*.183,-.025,z),(.012,.065,.014),steel,slide,.003)
ring('Optic steel socket',(0,-.172,-.05),.05,.012,steel,slide,axis=(0,1,0))
rod('Mint targeting lens',(0,-.166,-.05),(0,-.182,-.05),.034,.034,mint,slide,32)
tube('Integrated short barrel',-1.16,-1.395,.127,.084,steel,forearm)
ring('Short muzzle collar',(0,0,-1.23),.126,.015,rim,forearm)
ring('Muzzle front ring',(0,0,0),.114,.018,rim,muzzle)
rod('Deep bore darkness',(0,0,-1.19),(0,0,-1.20),.083,.083,steel,forearm)
for i in range(6):
    a=i*math.tau/6
    slot=box('Muzzle vent',(.124*math.cos(a),.124*math.sin(a),-1.315),(.012,.035,.061),steel,forearm,.004)
    slot.rotation_euler.z=a

# UVs for all authored geometry use the exact shared imported wear maps.
for obj in objects:
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.025)
    bpy.ops.object.mode_set(mode='OBJECT')

def join(parent,name):
    global objects
    meshes=[o for o in objects if o.parent==parent]
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.join();obj=bpy.context.object;obj.name=name
    objects=[o for o in objects if o not in meshes]+[obj]
for parent,name in [(root,'Pistol arm upper assembly'),(forearm,'Pistol arm forearm assembly'),
                    (slide,'Pistol slide geometry'),(breech,'Five shot breech geometry')]:
    join(parent,name)

# The elbow bends the upper section while the bore keeps the runtime firing axis.
root.rotation_euler.y=-forearm.rotation_euler.y
bpy.ops.object.select_all(action='DESELECT')
for obj in [root,forearm,slide,breech,muzzle,*objects]:obj.select_set(True)
bpy.context.view_layer.objects.active=root
model=KIT/'arm-pistol-v1.glb'
bpy.ops.export_scene.gltf(filepath=str(model),export_format='GLB',use_selection=True,export_apply=True)

# Pack the exact icon defining the silhouette, plus the project's style reference.
for relative in ['public/assets/ui/items/pistol-arm-v2.png','docs/references/biomecha-style-master.png']:
    bpy.data.images.load(str(P/relative)).pack()
scene=bpy.context.scene
scene['silhouette_reference']='public/assets/ui/items/pistol-arm-v2.png'
scene['material_sources']='arm-needle.glb; arm-fangs.glb — imported materials and textures, no generated maps'
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.world=bpy.data.worlds.new('Cool ambient');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.20,.23,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.35
scene.view_settings.view_transform='AgX'
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((-.2,0,-1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Warm broad key',(-3,-4,-4),480,3,(1,.90,.76))
area('Cool fill',(3,-1,1),210,4,(.70,.83,1))
area('Soft edge',(0,3,-2),350,2,(1,.90,.78))
data=bpy.data.cameras.new('Reference review camera');camera=bpy.data.objects.new(data.name,data)
scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO'
bpy.context.view_layer.update()
coords=[obj.matrix_world@Vector(c) for obj in objects for c in obj.bound_box]
lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
center=(lo+hi)/2
camera.location=center+root.matrix_world.to_3x3()@Vector((2.7,-6,-3.4))
camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
camera.rotation_euler.rotate_axis('Z',math.pi-.52)
data.ortho_scale=2.8
scene.render.filepath=str(OUT/'pistol-arm-v2-preview.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'pistol-arm-v2.blend'))
manifest_path=KIT/'manifest.json';manifest=json.loads(manifest_path.read_text())
for item in manifest:
    if item['id']=='arm-pistol-v1':item['bytes']=model.stat().st_size
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
print('PISTOL_ARM_V2_COMPLETE',model.stat().st_size,flush=True)
