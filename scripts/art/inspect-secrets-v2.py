"""Render the exported GLBs themselves. This is an asset inspection, not game proof."""
import bpy, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/secrets-v2'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=2
for index,kind in enumerate(['membrane','slab','nursery']):
    before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(OUT/f'models/{kind}/secret-{kind}-v2.glb'))
    imported=[o for o in scene.objects if o not in before];meshes=[o for o in imported if o.type=='MESH']
    for o in meshes:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=world;o.location.x+=(index-1)*3.9
    for o in imported:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));floor=bpy.context.object
mat=bpy.data.materials.new('inspection floor');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.034,.039,.034,1);p.inputs['Roughness'].default_value=.95;floor.data.materials.append(mat)
world=scene.world=bpy.data.worlds.new('cool fill');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.22,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.35
for loc,power,size,color in [((-4,-5,9),2400,7,(1,.87,.7)),((4,2,7),1600,6,(.67,.79,1))]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(3,-13,10));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=12.5;camera.rotation_euler=(Vector((0,0,1.12))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
scene.view_settings.view_transform='AgX';scene.render.resolution_x=1920;scene.render.resolution_y=880;scene.render.resolution_percentage=100;scene.render.filepath=str(OUT/'exported-models-inspection.png');bpy.ops.render.render(write_still=True)
print('EXPORTED_GLB_INSPECTION_COMPLETE',flush=True)
