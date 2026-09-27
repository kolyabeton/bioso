import bpy
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path('/Users/serg/Documents/ChatGPT/Biomecha')
OUT = ROOT / 'docs/art/four-chassis-20260918/model-proposals'
PROPOSALS = [('demolition', 'body-guard'), ('regulator', 'body-jade'), ('sentinel', 'body-carapace'), ('assembler', 'body-pod')]
if '--variant-v2' in sys.argv:
    OUT = ROOT / 'docs/art/four-chassis-20260918/model-proposals-v2'
    PROPOSALS = [('demolition', 'body-scout'), ('regulator', 'body-seed'), ('sentinel', 'body-heavy'), ('assembler', 'body-worker')]
OUT.mkdir(parents=True, exist_ok=True)
for key, asset in PROPOSALS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / f'public/assets/kit/{asset}.glb'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    points = [o.matrix_world @ Vector(p) for o in meshes for p in o.bound_box]
    lo = Vector([min(p[i] for p in points) for i in range(3)])
    hi = Vector([max(p[i] for p in points) for i in range(3)])
    center = (lo + hi) / 2
    span = max(hi - lo)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.world = bpy.data.worlds.new('Cool ambient')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.23,.3,.32,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .65
    for delta, power, color in [((-3,-4,6),900,(1,.84,.65)),((4,1,4),550,(.65,.82,1))]:
        bpy.ops.object.light_add(type='AREA', location=center+Vector(delta)*span)
        light = bpy.context.object
        light.data.energy = power*span*span
        light.data.size = span*3
        light.data.color = color
        light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=center+Vector((3,-6,4))*span)
    camera = bpy.context.object
    camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = span*1.55
    camera.data.clip_end = max(100, span*100)
    scene.camera = camera
    scene.render.filepath = str(OUT / f'{key}-{asset}.png')
    bpy.ops.render.render(write_still=True)
