"""Inspection render of shipped GLBs, not a game screenshot or concept art."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
families=['garden','scrap','forest','city','brood']
parts=[['irrigator','basin'],['turbine','pipes'],['log','cache'],['cabinet','duct'],['clutch','fans']]
landmarks='landmarks' in sys.argv
if landmarks:
 families=['scrap','brood','brood'];parts=[['megaturbine'],['cocoon-nest'],['hanging-cocoons']]
atlas=bpy.data.images.load(str(root/'public/assets/biomes/forest-living/materials-v2.webp'))
for column,(family,names) in enumerate(zip(families,parts)):
 for row,name in enumerate(names):
  before=set(bpy.context.scene.objects)
  bpy.ops.import_scene.gltf(filepath=str(root/f'public/assets/kit/environment-{family}-{name}-v1.glb'))
  objects=[o for o in bpy.context.scene.objects if o not in before]
  mesh=[o for o in objects if o.type=='MESH']
  points=[o.matrix_world@Vector(c) for o in mesh for c in o.bound_box]
  lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
  factor=(4.0 if landmarks else 2.25)/max(hi-lo);offset=Vector(((column-(len(families)-1)/2)*(4.8 if landmarks else 3.25),(0 if landmarks else -1 if row==0 else 2.8),0))
  # GLTF imports may contain parent empties; bake world matrices before layout.
  for o in mesh:
   matrix=o.matrix_world.copy();o.parent=None;o.matrix_world=matrix
   for v in o.data.vertices:v.co=(matrix@v.co-Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z)))*factor+offset
   o.matrix_world.identity()
   for mat in o.data.materials:
    if not mat or not mat.use_nodes:continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    if 'atlas' in mat.name:
     tex=nodes.new('ShaderNodeTexImage');tex.image=atlas
     uv=nodes.new('ShaderNodeTexCoord');links.new(uv.outputs['UV'],tex.inputs['Vector'])
     color=nodes.new('ShaderNodeVertexColor');color.layer_name=o.data.color_attributes[0].name if o.data.color_attributes else 'COLOR_0'
     mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
     links.new(tex.outputs['Color'],mix.inputs[1]);links.new(color.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.9
    elif 'aged-metal' in mat.name:
     noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=7
     ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.055,.068,.062,1);ramp.color_ramp.elements[1].color=(.17,.09,.045,1)
     links.new(noise.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs['Color'],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.87
    elif 'cocoon-membrane' in mat.name:
     color=nodes.new('ShaderNodeVertexColor');color.layer_name=o.data.color_attributes[0].name
     mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.34,.4,.24,1)
     links.new(color.outputs['Color'],mix.inputs[1]);links.new(mix.outputs[0],bs.inputs['Base Color'])
  for o in objects:
   if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=200)
floor=bpy.context.object;floor.location.z=-.03
mat=bpy.data.materials.new('neutral inspection floor');mat.diffuse_color=(.085,.1,.09,1);floor.data.materials.append(mat)
world=bpy.context.scene.world= bpy.data.worlds.new('cool fill');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.46,.55,.67,1);world.node_tree.nodes['Background'].inputs[1].default_value=.6
bpy.ops.object.light_add(type='AREA',location=(-6,-6,12));key=bpy.context.object;key.data.energy=2300;key.data.shape='DISK';key.data.size=6;key.data.color=(1,.85,.67);key.rotation_euler=(Vector((0,0,0))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(0,-13,17));camera=bpy.context.object;camera.rotation_euler=(Vector((0,1,.4))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=17.2;bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1600;scene.render.resolution_y=850;scene.render.resolution_percentage=100
scene.render.filepath=str(root/('docs/proof/forest-living-20260909/survival-landmarks-inspection.png' if landmarks else 'docs/proof/forest-living-20260909/story-props-inspection.png'));bpy.ops.render.render(write_still=True)
