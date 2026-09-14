"""Articulated derivatives of the approved v3 models. Rest shape and textures preserved."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/boss-animation-v5/assets';OUT.mkdir(parents=True,exist_ok=True)
IDS=['boss-mercury-hunter','boss-scrap-leviathan','boss-root-cathedral','boss-mirror-collector','boss-swarm-shepherd']
def tris(obs):
 for o in obs:o.data.calc_loop_triangles()
 return sum(len(o.data.loop_triangles) for o in obs)
def centre(o):return sum((o.matrix_world@Vector(p) for p in o.bound_box),Vector())/8
def segment_distance(p,a,b):
 d=b-a;t=max(0,min(1,(p-a).dot(d)/max(d.length_squared,1e-8)));return (p-a-d*t).length
reports=[]
for asset in IDS:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/'output/blender-bosses-realism-v3'/asset/(asset+'.glb')))
 source=next(o for o in bpy.context.scene.objects if o.parent is None)
 meshes=[o for o in source.children_recursive if o.type=='MESH'];before=tris(meshes)
 bins={'body':[]};pivots={'body':Vector()};parents={};leg=arm=drone=0
 def add(role,items,pivot=Vector(),parent=None):
  bins.setdefault(role,[]).extend(items);pivots[role]=Vector(pivot)
  if parent:parents[role]=parent
 for top in list(source.children):
  desc=[o for o in [top,*top.children_recursive] if o.type=='MESH']
  if not desc:continue
  hip=next((o for o in desc if 'Hip axle' in o.name),None)
  if hip:
   knee=next(o for o in desc if 'Knee axle' in o.name);ankle=next(o for o in desc if 'Ankle axle' in o.name)
   a,b,c=(o.matrix_world.translation.copy() for o in (hip,knee,ankle))
   for o in desc:
    n=o.name.lower()
    if any(s in n for s in ('ankle','foot bridge','talon','toe armour')):role=f'foot-{leg}'
    elif any(s in n for s in ('knee','tibia')):role=f'knee-{leg}'
    elif any(s in n for s in ('hip','femur')):role=f'leg-{leg}'
    else:role=f'leg-{leg}' if segment_distance(centre(o),a,b)<segment_distance(centre(o),b,c) else f'knee-{leg}'
    add(role,[o],a if role.startswith('leg') else b if role.startswith('knee') else c)
   parents[f'knee-{leg}']=f'leg-{leg}';parents[f'foot-{leg}']=f'knee-{leg}';leg+=1
  elif 'dash scythe' in top.name.lower() or 'universal weapon socket' in top.name.lower() or 'crushing salvage' in top.name.lower():
   joint=next((o for o in desc if any(s in o.name.lower() for s in ('hinge axle','shoulder axle','pivot axle'))),None)
   add(f'weapon-{arm}',desc,joint.matrix_world.translation if joint else centre(desc[0]));arm+=1
  elif top.name.lower().startswith('drone'):
   add(f'drone-{drone}',desc,centre(desc[0]));drone+=1
  elif 'Predator wedge head' in top.name:add('head',desc,(0,-1.02,1.25))
  elif 'Suspended queen core' in top.name:add('core',desc,(0,-.08,2.59))
  elif 'thermal exchange tower' in top.name:
   i=int(top.name.split()[1])-1;add(f'vent-{i}',desc,(0,[-3.15,0,3.1][i],4.65))
  else:
   for o in desc:
    n=o.name
    if asset.endswith('root-cathedral') and any(n.startswith('Seed bell '+str(i)) for i in (1,2,3)):
     i=int(n.split()[2])-1;p=[(-2.05,.18,6.1),(2,.35,6.34),(.15,.50,7.45)][i];add(f'cast-{i}',[o],p)
    elif asset.endswith('swarm-shepherd') and n.startswith('Hive canopy'):
     i=int(n.split()[2]);add(f'canopy-{i}',[o],([-1.4,0,1.4][i],0,3.72+(.23 if i==1 else 0)))
    elif asset.endswith('mirror-collector') and n.startswith('Convex optical collector'):add('optic',[o],(0,-.63,3.22))
    else:add('body',[o])
 runtime=bpy.data.objects.new(asset+'-articulated',None);bpy.context.scene.collection.objects.link(runtime);runtime['assetId']=asset;runtime['rigVersion']=5
 joined={}
 for role,items in bins.items():
  if not items:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in items:o.data=o.data.copy();o.select_set(True)
  bpy.context.view_layer.objects.active=items[0];bpy.ops.object.join();o=bpy.context.object
  mat=o.matrix_world.copy();o.parent=None;o.matrix_world=mat
  bpy.context.scene.cursor.location=pivots[role];bpy.ops.object.origin_set(type='ORIGIN_CURSOR');bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
  dec=o.modifiers.new('Bounded mobile detail','DECIMATE');dec.ratio=min(1,70000/before);dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  o.name='motion-'+role;o['motionRole']=role;joined[role]=o
 for role,o in joined.items():
  world=o.matrix_world.copy();o.parent=joined.get(parents.get(role),runtime);o.matrix_world=world
 for im in bpy.data.images:
  if im.size[0]>512 or im.size[1]>512:im.scale(512,512);im.pack()
 bpy.ops.object.select_all(action='DESELECT');runtime.select_set(True)
 for o in joined.values():o.select_set(True)
 bpy.context.view_layer.objects.active=runtime
 path=OUT/(asset+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_image_format='JPEG',export_jpeg_quality=85)
 report={'id':asset,'triangles':tris(joined.values()),'meshes':len(joined),'legs':leg,'roles':list(joined),'bytes':path.stat().st_size};reports.append(report);print('ARTICULATED',report,flush=True)
(OUT.parent/'manifest.json').write_text(json.dumps(reports,indent=2))
