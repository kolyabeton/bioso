import bpy,pathlib
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[2];O=P/'output/blender-repair-v1'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for i,id in enumerate(['arm-claw','arm-seed','arm-drill','arm-arc','arm-shield','arm-siphon']):
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(O/'models'/id/(id+'.glb')));new=set(bpy.context.scene.objects)-before
 col=bpy.data.collections.new(id);bpy.context.scene.collection.children.link(col)
 for obj in new:
  for c in list(obj.users_collection):c.objects.unlink(obj)
  col.objects.link(obj)
  if obj.parent not in new:obj.location+=Vector(((i%3)*2.2,0,-(i//3)*2.1))
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=8;area.spaces.active.region_3d.view_location=(2.2,0,-1.3)
bpy.ops.wm.save_as_mainfile(filepath=str(O/'biomecha-weapons-repaired.blend'))
