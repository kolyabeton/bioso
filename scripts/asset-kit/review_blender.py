"""Render imported GLBs in a neutral review scene, without modifying source files."""
import bpy,json,pathlib,math,sys
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'output/meshy/kit-v1'
manifest=json.loads((OUT/'manifest.json').read_text())['assets']
ONLY=sys.argv[sys.argv.index('--only')+1] if '--only' in sys.argv else None
if ONLY:manifest=[a for a in manifest if a['category']==ONLY]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=2400;scene.render.resolution_y=1600;scene.render.resolution_percentage=100
scene.world.color=(.2,.2,.2)
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(.32,.35,.32,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=.5
scene.view_settings.view_transform='AgX'
def mat(name,c):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85;return m
floor=mat('review-floor',(.43,.46,.43));labelmat=mat('review-label',(.025,.035,.03))
assets=[];report=[];quality=json.loads((OUT/'review-status.json').read_text())
for a in manifest:
 path=OUT/'models'/a['id']/(a['id']+'.glb')
 if not path.exists():continue
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(path));obs=list(set(bpy.data.objects)-before)
 meshes=[o for o in obs if o.type=='MESH']
 corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
 if not corners:continue
 lo=Vector(tuple(min(c[i] for c in corners) for i in range(3)));hi=Vector(tuple(max(c[i] for c in corners) for i in range(3)))
 dims=hi-lo;scale=2.8/max(dims);center=(lo+hi)/2
 root=bpy.data.objects.new(a['id'],None);scene.collection.objects.link(root);root['asset_id']=a['id'];root['category']=a['category'];root['review_status']=quality.get(a['id'],{}).get('status','candidate');root['review_note']=quality.get(a['id'],{}).get('note','Not approved for game integration')
 for o in obs:
  if o.parent not in obs:
   matrix=o.matrix_world.copy();o.parent=root;o.matrix_world=matrix
 root.scale=(scale,)*3;root.location=(-center.x*scale,-center.y*scale,-lo.z*scale)
 asset_collection=bpy.data.collections.new(a['id']);scene.collection.children.link(asset_collection)
 for o in [root]+obs:
  for col in list(o.users_collection):col.objects.unlink(o)
  asset_collection.objects.link(o)
 assets.append((a,root,asset_collection))
 triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes)
 report.append(dict(id=a['id'],meshes=len(meshes),triangles=triangles,dimensions=list(dims),materials=len({m.name for o in meshes for m in o.data.materials if m}),images=len({n.image.name for o in meshes for m in o.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image})))
(OUT/('geometry-review-'+ONLY+'.json' if ONLY else 'geometry-review.json')).write_text(json.dumps(report,indent=2))
# Every asset is rendered from the downloaded GLB, not a source concept.
def area(name,loc,power,size):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();return o
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.025));bpy.context.object.name='Review ground';bpy.context.object.data.materials.append(floor)
bpy.ops.object.light_add(type='SUN', rotation=(.45,-.35,-.4));bpy.context.object.data.energy=1.8;bpy.context.object.data.angle=.18
lights=[area('key',(-5,-6,12),2300,8),area('fill',(7,3,10),1600,7)]
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO'
def camera(target,ortho):
 cam.location=Vector(target)+Vector((6,-10,10));cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=ortho
proof=OUT/'review';proof.mkdir(exist_ok=True)
for category in ['player','anatomy','module','architecture','vegetation','boss']:
 selected=[v for v in assets if v[0]['category']==category]
 if not selected:continue
 for a,r,c in assets:c.hide_render=a['category']!=category
 cols=1 if len(selected)==1 else (4 if len(selected)>12 else 3);rows=math.ceil(len(selected)/cols)
 # Lay out in screen-space: orthonormal vectors matching camera right and projected up.
 right=Vector((.8575,.5145,0));up=Vector((-.5145,.8575,0))
 for i,(a,r,c) in enumerate(selected):
  offset=right*((i%cols-(cols-1)/2)*4.6)+up*((rows-1)/2-i//cols)*5.6
  r.location+=offset
  bpy.ops.object.text_add();t=bpy.context.object;t.name='label-'+a['id'];t.data.body=a['id'];t.data.align_x='CENTER';t.data.size=.22;t.data.materials.append(labelmat)
  t.location=offset+Vector((0,0,.03))-up*2.1;t.rotation_euler=(0,0,math.atan2(right.y,right.x))
 camera((0,0,.7),max(cols*4.6,rows*5.6*.9)*1.25)
 scene.render.resolution_x=2200;scene.render.resolution_y=1600 if category!='module' else 2300
 scene.render.filepath=str(proof/(category+'.png'));bpy.ops.render.render(write_still=True)
 for o in list(bpy.data.objects):
  if o.type=='FONT':bpy.data.objects.remove(o,do_unlink=True)
 for i,(a,r,c) in enumerate(selected):
  offset=right*((i%cols-(cols-1)/2)*4.6)+up*((rows-1)/2-i//cols)*5.6;r.location-=offset
# Store library with separate named collections and review positions.
for i,(a,r,c) in enumerate(assets):c.hide_render=False;r.location.x+=(i%8)*4.5;r.location.y+=(i//8)*4.5
camera((15,12,0),48)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('biomecha-'+ONLY+'-review.blend' if ONLY else 'biomecha-kit-v1.blend')))
print('REVIEW_COMPLETE',len(assets),flush=True)
