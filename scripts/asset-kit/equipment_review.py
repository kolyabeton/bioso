import bpy
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2];out=P/'output/blender-equipment-v2'
bpy.ops.wm.open_mainfile(filepath=str(out/'equipment-v2.blend'))
scene=bpy.context.scene
ids=['arm-whip','arm-needle','leg-root','arm-shield','leg-jumper','leg-worker','leg-guard']
for i,id in enumerate(ids):
 col=bpy.data.collections[id];col.hide_render=i>=4
 bpy.context.view_layer.update()
 coords=[o.matrix_world@Vector(c) for o in col.objects if o.type=='MESH' for c in o.bound_box]
 lo=Vector(tuple(min(v[k] for v in coords) for k in range(3)));hi=Vector(tuple(max(v[k] for v in coords) for k in range(3)));center=(lo+hi)/2;scale=2.5/max(hi-lo)
 group=bpy.data.objects.new(id+' mount',None);col.objects.link(group)
 for o in list(col.objects):
  if o!=group and o.parent is None:o.parent=group
 group.scale=(scale,)*3;group.location=Vector(((i%4-1.5)*2.2,4 if i>=4 else 0,0))-Vector((center.x,center.y,lo.z))*scale
# Four separated editable assemblies, plus a second row of existing leg references.
scene.render.film_transparent=False;scene.render.resolution_x=1440;scene.render.resolution_y=720
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.15,.18,.17,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
mat=bpy.data.materials.new('Dark workshop surface');mat.diffuse_color=(.035,.045,.042,1);mat.use_nodes=True;mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.035,.045,.042,1);mat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.85
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));bpy.context.object.name='Review ground';bpy.context.object.data.materials.append(mat)
cam=scene.camera;cam.location=(2,-12,7);cam.rotation_euler=(Vector((0,0,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=10.4
scene.view_settings.exposure=.7
scene.render.filepath=str(P/'proof/equipment-v2/blender-models.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'equipment-v2.blend'))
