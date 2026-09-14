"""BIOSO double-charge shotgun arm, using the shipped equipment materials.

Run: blender --background --threads 3 --python scripts/asset-kit/shotgun_arm_v2.py
Writes only the versioned shotgun assets and temp/proof/shotgun-v2.
Blender Z-up, shoulder at origin; glTF Y-up, runtime top anchor / X=-pi/2.
"""
import bpy
import hashlib
import json
import math
import struct
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]
KIT = P / 'public/assets/kit'
OUT = P / 'temp/proof/shotgun-v2'
ITEM = P / 'public/assets/ui/items/shotgun-arm-v2.png'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

# Reuse full existing graphs and actual embedded images, exactly as pistol v2.
for asset in ('arm-needle', 'arm-fangs'):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(KIT / (asset + '.glb')))
    for obj in set(bpy.data.objects) - before:
        bpy.data.objects.remove(obj, do_unlink=True)
ceramic = bpy.data.materials['Worn warm ivory ceramic']
steel = bpy.data.materials['Oxidised dark steel']
collar = bpy.data.materials['Patinated collar']
mint = bpy.data.materials['Restrained mint optic']
tendon = bpy.data.materials['Olive tendon sheath']
objects = []

def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = parent
    obj.location = location
    return obj

root = empty('arm-shotgun-v2')
forearm = empty('shotgun-forearm', (0, 0, -.72), root)
muzzle = empty('shotgun-muzzle', (0, 0, -1.26), forearm)
breech = empty('shotgun-breech', (0, 0, -.35), forearm)

def finish(obj, name, mat, parent):
    obj.name = name
    obj.parent = parent
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    objects.append(obj)
    return obj

def bevel(obj, width=.009):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Machined edges', 'BEVEL')
    mod.width = width
    mod.segments = 2
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    mod.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj

def rod(name, a, b, r1, r2, mat=steel, parent=root, vertices=24):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2,
                                  depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, mat, parent)

def box(name, location, dimensions, mat=ceramic, parent=root, edge=.012):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return bevel(finish(obj, name, mat, parent), edge)

def ring(name, location, radius, thickness, mat=collar, parent=root, axis=(0,0,1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=thickness,
                                   major_segments=32, minor_segments=6, location=location)
    obj = bpy.context.object
    obj.rotation_euler = Vector(axis).to_track_quat('Z', 'Y').to_euler()
    return finish(obj, name, mat, parent)

def shell(name, rows, start, end, mat=ceramic, parent=root, thickness=.027):
    # Bent, tapered ceramic shell with a closed inner wall and open mechanism seam.
    n = 10
    verts = [(cx+(rx-(thickness if inside else 0))*math.cos(start+(end-start)*i/n),
              (ry-(thickness if inside else 0))*math.sin(start+(end-start)*i/n), z)
             for inside in (False, True) for z,cx,rx,ry in rows for i in range(n+1)]
    stride = n+1
    layer = len(rows)*stride
    faces = []
    for j in range(len(rows)-1):
        for i in range(n):
            a=j*stride+i; b=a+1; c=a+stride+1; d=a+stride
            faces.extend(((a,b,c,d),(a+layer,d+layer,c+layer,b+layer)))
    for j in (0,len(rows)-1):
        for i in range(n):
            a=j*stride+i
            faces.append((a,a+layer,a+1+layer,a+1))
    for i in (0,n):
        for j in range(len(rows)-1):
            a=j*stride+i
            faces.append((a,a+stride,a+stride+layer,a+layer))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    return bevel(finish(obj,name,mat,parent),.007)

def cable(name, points, radius=.02, mat=tendon, parent=root):
    curve=bpy.data.curves.new(name,'CURVE')
    curve.dimensions='3D'; curve.resolution_u=6
    curve.bevel_depth=radius; curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER'); spline.bezier_points.add(len(points)-1)
    for bp,co in zip(spline.bezier_points,points):
        bp.co=co; bp.handle_left_type=bp.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve)
    bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,mat,parent)

def tube(name, x, z0, z1, outer, inner, parent=forearm):
    # Real open bores; muzzle rims do not cover the hollow dark interiors.
    n=32
    verts=[(x+r*math.cos(i*math.tau/n),r*math.sin(i*math.tau/n),z)
           for z,r in ((z0,outer),(z1,outer),(z1,inner),(z0,inner)) for i in range(n)]
    faces=[(j*n+i,j*n+(i+1)%n,((j+1)%4)*n+(i+1)%n,((j+1)%4)*n+i)
           for j in range(4) for i in range(n)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(verts,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.scene.collection.objects.link(obj)
    return bevel(finish(obj,name,steel,parent),.004)

# Compact locking shoulder socket, dark concentric gaps, six ceramic petals.
rod('Shoulder internal coupling',(0,0,.025),(0,0,-.19),.226,.212)
for z,r,t,mat in ((.04,.248,.020,steel),(-.012,.275,.022,collar),
                  (-.105,.261,.018,steel),(-.19,.218,.018,collar)):
    ring('Shoulder retaining ring',(0,0,z),r,t,mat)
for i in range(6):
    a=i*math.tau/6
    shell('Shoulder ceramic petal',[(.03,0,.292,.292),(-.07,0,.313,.313),(-.19,0,.247,.247)],
          a+.035,a+math.tau/6-.035)
    lug=box('Shoulder locking tooth',(.286*math.cos(a),.286*math.sin(a),-.015),
            (.071,.055,.078),collar,edge=.006)
    lug.rotation_euler.z=a

# Clearly separated upper arm, shaped around a tendon rather than a solid tube.
rod('Upper arm actuator',(0,0,-.19),(0,0,-.66),.125,.108)
for start in (.16,math.pi+.16):
    shell('Upper arm ceramic plate',[(-.215,0,.191,.176),(-.31,.018,.208,.178),
          (-.49,.022,.163,.149),(-.615,0,.134,.132)],start,start+math.pi-.35)
for side in (-1,1):
    cable('Exposed bicep tendon',[(side*.11,-.105,-.20),(side*.123,-.148,-.39),
                                (side*.095,-.109,-.65)],.022)
    rod('Bicep piston sleeve',(side*.1,-.121,-.29),(side*.085,-.121,-.49),.028,.025,collar)
    rod('Bicep piston rod',(side*.085,-.121,-.49),(side*.075,-.103,-.65),.015,.015)

# Transverse elbow bearing and radial fasteners; provides a legible arm joint.
rod('Elbow hinge axle',(0,-.194,-.72),(0,.194,-.72),.147,.147)
for side in (-1,1):
    for r,y,t,mat in ((.158,.17,.024,steel),(.125,.204,.02,collar),(.084,.221,.013,steel)):
        ring('Elbow bearing ring',(0,side*y,-.72),r,t,mat,axis=(0,1,0))
    rod('Elbow bearing cap',(0,side*.213,-.72),(0,side*.235,-.72),.059,.059,collar,vertices=12)
    for i in range(5):
        a=i*math.tau/5
        rod('Elbow recessed bolt',(.109*math.cos(a),side*.219,-.72+.109*math.sin(a)),
            (.109*math.cos(a),side*.23,-.72+.109*math.sin(a)),.01,.01,steel,vertices=8)

# Short, broad double-charge receiver. Two independent pressure chambers run
# into two closely spaced shotgun bores; no five-barrel pellet interpretation.
forearm.rotation_euler.y=math.radians(20)
root.rotation_euler.y=-forearm.rotation_euler.y
box('Shotgun receiver core',(0,0,-.46),(.355,.25,.66),steel,forearm,.025)
rows=[(-.11,0,.148,.126),(-.24,0,.232,.168),(-.49,0,.249,.178),
      (-.70,0,.222,.155),(-.79,0,.197,.132)]
shell('Receiver dorsal ceramic carapace',rows,-.07,math.pi+.07,parent=forearm)
shell('Receiver left ceramic cheek',rows,math.pi+.19,math.pi+1.03,parent=forearm)
shell('Receiver right ceramic cheek',rows,math.tau-1.03,math.tau-.19,parent=forearm)
shell('Overlapping elbow guard',[(-.11,0,.151,.14),(-.24,0,.243,.184),(-.35,0,.257,.191)],
      .14,2.60,parent=forearm)
for side in (-1,1):
    x=side*.105
    rod('Independent charge chamber',(x,-.118,-.28),(x,-.118,-.61),.064,.058,steel,forearm)
    for z in (-.30,-.56):
        ring('Charge chamber retaining collar',(x,-.118,z),.06,.010,collar,forearm)
    cable('Charge feed tendon',[(side*.074,-.1,-.1),(side*.13,-.19,-.21),
                              (side*.168,-.174,-.41),(side*.105,-.126,-.59)],.022,tendon,forearm)
    rod('Recoil damper sleeve',(side*.21,-.062,-.37),(side*.205,-.06,-.64),.028,.026,collar,forearm)
    rod('Recoil damper piston',(side*.205,-.06,-.64),(side*.18,-.04,-.87),.015,.015,steel,forearm)
    for z in (-.36,-.49,-.62):
        box('Receiver heat vent',(side*.246,.009,z),(.013,.07,.035),steel,forearm,.003)
    for z in (-.27,-.67):
        rod('Ceramic armour fastener',(side*.151,-.124,z),(side*.151,-.14,z),.013,.013,collar,forearm,8)

# Distinct broad, stubby fore-end and paired steel barrels with open chokes.
for x in (-.106,.106):
    tube('Shotgun hollow barrel',x,-.65,-1.27,.095,.067)
    rod('Deep recessed bore wall',(x,0,-.78),(x,0,-.80),.067,.067,steel,forearm)
    for z in (-.83,-1.205):
        ring('Barrel reinforcement band',(x,0,z),.095,.012,collar,forearm)
    ring('Hollow muzzle lip',(x,0,-1.265),.081,.014,steel,forearm)
box('Muzzle joining bridge',(0,.062,-1.175),(.36,.06,.064),steel,forearm,.007)
box('Shotgun fore-end understructure',(0,-.09,-.91),(.35,.095,.33),steel,forearm,.017)
for z in (-.79,-.88,-.97):
    shell('Segmented ceramic fore-end grip',[(z+.034,0,.215,.147),(z-.026,0,.215,.147)],
          math.pi+.15,math.tau-.15,parent=forearm,thickness=.023)
box('Barrel dorsal sight rib',(0,.108,-.99),(.04,.028,.48),steel,forearm,.004)
box('Front sight blade',(0,.137,-1.17),(.026,.033,.055),collar,forearm,.004)
box('Rear sight pedestal',(0,.165,-.62),(.10,.034,.09),steel,forearm,.005)
box('Breech release latch',(.217,-.055,-.05),(.052,.12,.13),collar,breech,.008)
ring('Recessed targeting optic',(0,-.197,-.53),.039,.011,steel,forearm,axis=(0,1,0))
rod('Restrained mint targeting lens',(0,-.196,-.53),(0,-.209,-.53),.025,.025,mint,forearm,24)
for x in (-.044,.044):
    box('Two charge indicator socket',(x,-.165,-.68),(.032,.022,.052),steel,forearm,.004)
    box('Two small mint charge indicators',(x,-.18,-.68),(.015,.008,.026),mint,forearm,.003)

# Smart UVs bind every visible piece to the imported original texture images.
for obj in objects:
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True)
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.025)
    bpy.ops.object.mode_set(mode='OBJECT')
for parent,name in ((root,'Shotgun upper arm assembly'),(forearm,'Shotgun forearm assembly'),
                    (breech,'Shotgun release latch')):
    meshes=[o for o in objects if o.parent==parent]
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes: obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    if len(meshes)>1:
        bpy.ops.object.join()
    obj=bpy.context.object; obj.name=name
    objects=[o for o in objects if o not in meshes]+[obj]
bpy.ops.object.select_all(action='DESELECT')
for obj in (root,forearm,muzzle,breech,*objects): obj.select_set(True)
bpy.context.view_layer.objects.active=root
model=KIT/'arm-shotgun-v2.glb'
bpy.ops.export_scene.gltf(filepath=str(model),export_format='GLB',use_selection=True,export_apply=True)

# Inventory art is rendered from exactly the exported geometry, with true alpha.
scene=bpy.context.scene
scene['style_reference']='docs/references/biomecha-style-master.png'
scene['material_sources']='arm-needle.glb; arm-fangs.glb; original imported image textures'
bpy.data.images.load(str(P/'docs/references/biomecha-style-master.png')).pack()
scene.render.engine='CYCLES'; scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED'; scene.render.threads=3
scene.render.resolution_x=640; scene.render.resolution_y=640
scene.render.resolution_percentage=100; scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
scene.world=bpy.data.worlds.new('Soft cool ambient'); scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.17,.20,.23,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.28
scene.view_settings.view_transform='AgX'
def area(name,location,power,size,color):
    data=bpy.data.lights.new(name,'AREA'); data.energy=power; data.shape='DISK'
    data.size=size; data.color=color
    obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj)
    obj.location=location
    obj.rotation_euler=(Vector((.1,0,-1))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Warm upper left',(-3,-4,-4),430,3,(1,.90,.78))
area('Cool soft fill',(3,-1,1),165,4,(.71,.83,1))
area('Ceramic edge light',(0,3,-2),300,2,(1,.92,.82))
data=bpy.data.cameras.new('Shotgun inventory camera')
camera=bpy.data.objects.new(data.name,data); scene.collection.objects.link(camera)
scene.camera=camera; data.type='ORTHO'
bpy.context.view_layer.update()
coords=[obj.matrix_world@Vector(c) for obj in objects for c in obj.bound_box]
lo=Vector(tuple(min(v[i] for v in coords) for i in range(3)))
hi=Vector(tuple(max(v[i] for v in coords) for i in range(3)))
center=(lo+hi)/2
camera.location=center+root.matrix_world.to_3x3()@Vector((2.7,-6,-3.4))
camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
camera.rotation_euler.rotate_axis('Z',math.pi-.80)
# Fit actual projected vertices rather than generous world-space bounding boxes:
# 90% of the square is occupied, so the twin barrels read in 48px inventory slots.
bpy.context.view_layer.update()
camera_inverse=camera.matrix_world.inverted()
projected=[camera_inverse@(obj.matrix_world@v.co) for obj in objects for v in obj.data.vertices]
px0=min(v.x for v in projected); px1=max(v.x for v in projected)
py0=min(v.y for v in projected); py1=max(v.y for v in projected)
data.ortho_scale=max(px1-px0,py1-py0)/.90
camera.location+=camera.matrix_world.to_3x3()@Vector(((px0+px1)/2,(py0+py1)/2,0))
scene.render.filepath=str(ITEM)
bpy.ops.render.render(write_still=True)
scene.render.resolution_x=768; scene.render.resolution_y=768
scene.render.filepath=str(OUT/'shotgun-arm-v2-preview.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'shotgun-arm-v2.blend'))

raw=model.read_bytes()
gltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
def embedded_images(path):
    data=path.read_bytes()
    json_size=struct.unpack_from('<I',data,12)[0]
    doc=json.loads(data[20:20+json_size])
    binary=data[28+json_size:]
    result=[]
    for im in doc.get('images',[]):
        view=doc['bufferViews'][im['bufferView']]
        png=binary[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
        result.append({'name':im.get('name'),'sha256':hashlib.sha256(png).hexdigest(),
                       'dimensions':list(struct.unpack_from('>II',png,16)) if png[:8]==b'\x89PNG\r\n\x1a\n' else None})
    return result
source_images=[im for asset in ('arm-needle.glb','arm-fangs.glb') for im in embedded_images(KIT/asset)]
exported_images=embedded_images(model)
assert all(im['sha256'] in {source['sha256'] for source in source_images} for im in exported_images), 'Texture pixels or encoding changed'
triangles=sum(gltf['accessors'][p['indices']]['count']//3 for m in gltf['meshes'] for p in m['primitives'])
assert all('bufferView' in im for im in gltf['images'])
assert all('TEXCOORD_0' in p['attributes'] for m in gltf['meshes'] for p in m['primitives'])
report={'model':str(model.relative_to(P)),'bytes':len(raw),'triangles':triangles,
        'material_names':[m['name'] for m in gltf['materials']],
        'embedded_images':len(gltf['images']),'texture_byte_identity':'PASS',
        'texture_images':exported_images,'blender_bounds':[list(lo),list(hi)],
        'runtime_mount':{'anchor':'top','rotation':[-math.pi/2,0,0],'size':1.1,'envelope':[.8,.52,1.1]},
        'firing_axis':'Blender -Z; glTF -Y; fitted runtime +Z',
        'textures_reused_from':['arm-needle.glb','arm-fangs.glb'],
        'source_sha256':{name:hashlib.sha256((KIT/name).read_bytes()).hexdigest()
                         for name in ('arm-needle.glb','arm-fangs.glb')},
        'icon':str(ITEM.relative_to(P)),'icon_dimensions':[640,640],
        'runtime_tested':False}
(OUT/'asset-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('SHOTGUN_ARM_V2_COMPLETE',json.dumps(report),flush=True)
