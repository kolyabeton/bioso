import bpy,json,pathlib
P=pathlib.Path(__file__).resolve().parents[2];O=P/'public/assets/kit';O.mkdir(parents=True,exist_ok=True);manifest=json.loads((P/'output/blender-repair-v1/prototype-manifest.json').read_text());out=[]
for a in manifest['assets']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(P/a['glb'].lstrip('/')))
 for image in bpy.data.images:
  if image.size[0]>512 or image.size[1]>512:
   ratio=512/max(image.size);image.scale(max(1,round(image.size[0]*ratio)),max(1,round(image.size[1]*ratio)));image.pack()
 target=O/(a['id']+'.glb');bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB');out.append(dict(id=a['id'],file=target.name,bytes=target.stat().st_size))
 (O/'manifest.json').write_text(json.dumps(out,indent=2));print('EXPORTED',a['id'],flush=True)
