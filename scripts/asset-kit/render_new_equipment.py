import bpy
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(P/'output/blender-equipment-completion/equipment-completion.blend'))
s=bpy.context.scene;s.world=bpy.data.worlds.new('Soft ambient');s.world.color=(.15,.18,.19)
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1400;s.render.resolution_y=1000;s.render.resolution_percentage=100
for loc,power in [((-2,-4,8),1700),((12,6,8),1300)]:
 bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(6,-13,16));c=bpy.context.object;t=Vector((5,1.8,-.6));c.rotation_euler=(t-c.location).to_track_quat('-Z','Y').to_euler();c.data.type='ORTHO';c.data.ortho_scale=13;s.camera=c
s.render.film_transparent=False;s.render.filepath=str(P/'proof/equipment-mounts/new-models.png');bpy.ops.render.render(write_still=True)
