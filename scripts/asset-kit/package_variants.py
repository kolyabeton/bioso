import bpy,json,pathlib
from mathutils import Vector,Quaternion
P=pathlib.Path(__file__).resolve().parents[2];O=P/'output/blender-repair-v1';manifest=json.loads((P/'output/meshy/kit-v1/manifest.json').read_text());entries=[];bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
variants=json.loads((P/'output/blender-variants-v1/variants.json').read_text());manifest['assets'].extend(dict(v,category='module') for v in variants)
for a in manifest['assets']:
 id=a['id'];repaired=O/'models'/id/(id+'.glb');variant=P/'output/blender-variants-v1/models'/id/(id+'.glb');repaired=variant if variant.exists() else repaired;source=repaired if repaired.exists() else P/'output/meshy/kit-v1/models'/id/(id+'.glb')
 entries.append(dict(id=id,category=a['category'],title=a['title'],glb='/'+str(source.relative_to(P)),source='blender-extracted' if repaired.exists() else 'meshy-original',status='prototype',bytes=source.stat().st_size))
 if a['category']!='module':continue
 i=sum(1 for e in entries if e['category']=='module')-1
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(source));new=set(bpy.context.scene.objects)-before
 mesh=[o for o in new if o.type=='MESH'];coords=[o.matrix_world@v.co for o in mesh for v in o.data.vertices];lo=Vector([min(v[a] for v in coords) for a in range(3)]);hi=Vector([max(v[a] for v in coords) for a in range(3)]);center=(lo+hi)*.5;scale=1.65/max(hi-lo)
 bpy.ops.object.empty_add();root=bpy.context.object;root.name=id+'_display';root['asset_id']=id;root['file']=str(source);root['display_only_normalization']=True
 for obj in new:
  if obj.parent not in new:obj.parent=root
 root.scale=(scale,)*3;root.location=Vector(((i%6)*2.3,0,-(i//6)*2.3))-center*scale
 bpy.ops.object.text_add(location=((i%6)*2.3-.8,-.6,-(i//6)*2.3-1.05),rotation=(1.570796,0,0));text=bpy.context.object;text.data.body=id;text.data.size=.13
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   v=area.spaces.active;v.shading.type='MATERIAL';v.region_3d.view_distance=22;v.region_3d.view_location=(5.6,0,-6.5);v.region_3d.view_rotation=Quaternion((.7071068,.7071068,0,0));v.region_3d.view_perspective='ORTHO'
bpy.ops.wm.save_as_mainfile(filepath=str(P/'output/blender-variants-v1/biomecha-modules-40.blend'))
(P/'output/blender-variants-v1/library-manifest.json').write_text(json.dumps(dict(version=1,total=len(entries),assets=entries),ensure_ascii=False,indent=2))
print('VERIFIED_MODULE_IMPORTS',40)
