"""Publish optimized derivatives of the user-approved BIOSO v3 bosses.
Preserves original review GLBs/BLENDs. Groups rigid parts for runtime motion.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];SOURCE=ROOT/'output/blender-bosses-realism-v3';OUT=ROOT/'public/assets/kit';REPORT=ROOT/'output/boss-runtime-v3'
IDS=['boss-mercury-hunter','boss-scrap-leviathan','boss-root-cathedral','boss-mirror-collector','boss-swarm-shepherd']
def triangles(obs):
 n=0
 for o in obs:o.data.calc_loop_triangles();n+=len(o.data.loop_triangles)
 return n
reports=[]
for asset in IDS:
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(SOURCE/asset/(asset+'.glb')))
 root=next(o for o in bpy.context.scene.objects if o.parent is None)
 allmeshes=[o for o in root.children_recursive if o.type=='MESH'];before=triangles(allmeshes)
 bins={'body':[]};pivots={'body':Vector((0,0,0))};legindex=0;armindex=0;droneindex=0
 for top in list(root.children):
  descendants=[o for o in [top,*top.children_recursive] if o.type=='MESH']
  if not descendants:continue
  hip=next((o for o in descendants if 'Hip axle' in o.name or 'Hip_axle' in o.name),None)
  nm=top.name.lower()
  role='body';pivot=Vector((0,0,0))
  if hip:
   role=f'leg-{legindex}';legindex+=1;pivot=hip.matrix_world.translation.copy()
  elif 'dash scythe' in nm or 'universal weapon socket' in nm or 'crushing salvage' in nm:
   role=f'weapon-{armindex}';armindex+=1
   joint=next((o for o in descendants if 'hinge axle' in o.name or 'shoulder axle' in o.name or 'pivot axle' in o.name),None)
   pivot=joint.matrix_world.translation.copy() if joint else Vector((0,0,0))
  elif nm.startswith('drone'):
   role=f'drone-{droneindex}';droneindex+=1;pivot=descendants[0].matrix_world.translation.copy()
  bins.setdefault(role,[]).extend(descendants);pivots[role]=pivot
 runtime=bpy.data.objects.new(asset+'-runtime',None);bpy.context.scene.collection.objects.link(runtime)
 runtime['source']='user-approved Blender v3';runtime['assetId']=asset
 joined=[]
 for role,meshes in bins.items():
  if not meshes:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in meshes:
   o.data=o.data.copy();o.select_set(True)
  bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();o=bpy.context.object
  world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
  bpy.context.scene.cursor.location=pivots[role];bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
  bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
  dec=o.modifiers.new('Mobile detail reduction','DECIMATE');dec.ratio=min(1,70000/before);dec.use_collapse_triangulate=True;bpy.ops.object.modifier_apply(modifier=dec.name)
  o.name='motion-'+role;o['motionRole']=role;o.parent=runtime
  o.data.calc_loop_triangles();joined.append(o)
 # Retain only model data selected for export. Loaded studio references were never imported.
 for im in bpy.data.images:
  if im.size[0]>512 or im.size[1]>512:im.scale(512,512);im.pack()
 bpy.ops.object.select_all(action='DESELECT');runtime.select_set(True)
 for o in joined:o.select_set(True)
 bpy.context.view_layer.objects.active=runtime
 path=OUT/(asset+'.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_image_format='JPEG',export_jpeg_quality=85)
 after=triangles(joined)
 reports.append({'id':asset,'sourceTriangles':before,'runtimeTriangles':after,'objects':len(joined),'legs':legindex,'weapons':armindex,'drones':droneindex,'bytes':path.stat().st_size})
 print('RUNTIME_BOSS',reports[-1],flush=True)
(REPORT/'manifest.json').write_text(json.dumps(reports,indent=2));print('RUNTIME_EXPORT_COMPLETE',flush=True)
