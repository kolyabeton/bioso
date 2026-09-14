"""Independent exported-GLB audit and Blender-native comparison render."""
import bpy,json,struct,math,sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/blender-bosses-realism-v3'
IDS=['boss-mercury-hunter','boss-scrap-leviathan','boss-root-cathedral','boss-mirror-collector','boss-swarm-shepherd']
TITLES=['Ртутный Ловчий','Свалочный Левиафан','Корневой Собор','Зеркальный Сборщик','Пастырь Роя']
def bounds(obs):
 bpy.context.view_layer.update();ps=[o.matrix_world@Vector(p) for o in obs if o.type=='MESH' for p in o.bound_box]
 return Vector([min(p[i] for p in ps) for i in range(3)]),Vector([max(p[i] for p in ps) for i in range(3)])
def audit():
 results=[]
 for asset in IDS:
  p=OUT/asset/(asset+'.glb');raw=p.read_bytes();magic,version,length=struct.unpack_from('<4sII',raw)
  assert magic==b'glTF' and version==2 and length==len(raw)
  n=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+n])
  assert not gltf.get('cameras') and not gltf.get('animations')
  assert all('bufferView' in i for i in gltf['images']), 'external texture dependency'
  assert all('TEXCOORD_0' in prim['attributes'] for me in gltf['meshes'] for prim in me['primitives'])
  triangles=sum(gltf['accessors'][pr['indices']]['count']//3 for me in gltf['meshes'] for pr in me['primitives'])
  draw_triangles=sum(sum(gltf['accessors'][pr['indices']]['count']//3 for pr in gltf['meshes'][node['mesh']]['primitives']) for node in gltf['nodes'] if 'mesh' in node)
  bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(p));obs=list(bpy.context.scene.objects);lo,hi=bounds(obs)
  assert all(math.isfinite(c) for o in obs for row in o.matrix_world for c in row)
  assert not [o for o in obs if o.type in ('LIGHT','CAMERA')]
  assert all(o.data.uv_layers for o in obs if o.type=='MESH')
  assert abs(lo.z)<.04,(asset,lo.z)
  mats=[m for m in bpy.data.materials if m.users]
  tex=[node.image for m in mats if m.use_nodes for node in m.node_tree.nodes if node.type=='TEX_IMAGE' and node.image]
  assert tex and all(im.size[0]>0 and im.size[1]>0 for im in tex)
  results.append({'id':asset,'glb_bytes':len(raw),'unique_mesh_triangles':triangles,'total_instanced_triangles':draw_triangles,'instanced_mesh_objects':sum(o.type=='MESH' for o in obs),'packed_images':len(gltf['images']),'materials':len(mats),'bounds_m':[round(v,3) for v in hi-lo],'roundtrip_import':'PASS','uv_and_textures':'PASS','ground_origin':'PASS','runtime_tested':False,'rigged':False})
 (OUT/'validation.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print('AUDIT_PASS',len(results),flush=True)
def board():
 bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
 # Actual exported meshes, shown in a uniform review scale; no image synthesis.
 for idx,asset in enumerate(IDS):
  before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/asset/(asset+'.glb')));new=list(set(scene.objects)-before)
  parent=bpy.data.objects.new('Review display group '+asset,None);scene.collection.objects.link(parent)
  for o in new:
   if o.parent is None:o.parent=parent
  parent.rotation_euler.z=math.radians(-24 if idx not in (2,3) else -12)
  lo,hi=bounds(new);size=3.8/max((hi-lo).x,(hi-lo).y,(hi-lo).z)
  parent.scale=(size,)*3;bpy.context.view_layer.update();lo,hi=bounds(new)
  parent.location=Vector((idx*4.8,0,0))-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
 floor=bpy.data.materials.new('Neutral charcoal floor');floor.use_nodes=True;fb= floor.node_tree.nodes.get('Principled BSDF');fb.inputs['Base Color'].default_value=(.038,.047,.046,1);fb.inputs['Roughness'].default_value=.88
 bpy.ops.mesh.primitive_plane_add(size=250,location=(10,0,-.025));bpy.context.object.data.materials.append(floor)
 world=bpy.data.worlds.new('Overcast ambient');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.29,.34,.38,1);world.node_tree.nodes['Background'].inputs[1].default_value=.36;scene.world=world
 for name,loc,color,energy,size in [('Key',(-2,-6,12),(1,.84,.65),9500,9),('Fill',(19,-4,9),(.6,.76,1),8500,12),('Rim',(10,5,9),(1,.90,.74),11500,9)]:
  d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.size=size;d.color=color;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((10,0,1.6))-o.location).to_track_quat('-Z','Y').to_euler()
 d=bpy.data.cameras.new('Comparison camera');c=bpy.data.objects.new('Comparison camera',d);scene.collection.objects.link(c);c.location=(9.6,-29,13);target=Vector((9.6,0,1.35));c.rotation_euler=(target-c.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=24.2;scene.camera=c
 scene.render.resolution_x=2400;scene.render.resolution_y=780;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.look='AgX - Medium High Contrast'
 # Labels are scene text, attached to camera plane for exact clean positioning.
 fontpath=Path('/System/Library/Fonts/Supplemental/Arial.ttf');font=bpy.data.fonts.load(str(fontpath)) if fontpath.exists() else None
 labelmat=bpy.data.materials.new('Warm white typography');labelmat.use_nodes=True;p=labelmat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.8,.85,.82,1);p.inputs['Emission Color'].default_value=(.8,.85,.82,1);p.inputs['Emission Strength'].default_value=.8
 for i,title in enumerate(TITLES):
  d=bpy.data.curves.new(title,'FONT');d.body=title;d.size=.31;d.align_x='CENTER';d.align_y='CENTER';d.extrude=0
  if font:d.font=font
  o=bpy.data.objects.new('Label '+title,d);scene.collection.objects.link(o);o.parent=c;o.location=((i-2)*4.8,-2.70,-20);d.materials.append(labelmat)
 scene.render.filepath=str(OUT/'five-bosses-review.png');bpy.ops.render.render(write_still=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'five-bosses-review.blend'))
 print('BOARD_COMPLETE',flush=True)
if __name__=='__main__':
 if '--board-only' not in sys.argv:audit()
 board()
