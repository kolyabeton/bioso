import bpy, math, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
for key in (['bastion','reactor','rootwalker','broodmother'] if '--canonical-only' in sys.argv else ['demolition'] if '--demolition-only' in sys.argv else ['regulator'] if '--regulator-only' in sys.argv else ['demolition','regulator','sentinel','assembler']):
 for assembled in ([False] if '--canonical-only' in sys.argv or '--cores-only' in sys.argv else [False,True]):
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=str(OUT.parents[3]/('public/assets/kit/body-'+key+'-v3.glb') if '--canonical-only' in sys.argv else OUT/(key+'-assembled.glb' if assembled else 'body-'+key+'-astra-polish-v3.glb')))
  points=[o.matrix_world@Vector(p) for o in bpy.context.scene.objects if o.type=='MESH' for p in o.bound_box]
  lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)]);center=(lo+hi)/2;span=max(hi-lo)
  scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
  scene.render.resolution_x=scene.render.resolution_y=900;scene.render.resolution_percentage=100
  scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
  scene.world=bpy.data.worlds.new('Cool ambient');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.23,.3,.32,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
  for delta,power,color in [((-3,4,6),900,(1,.84,.65)),((4,-1,4),550,(.65,.82,1))]:
   bpy.ops.object.light_add(type='AREA',location=center+Vector(delta)*span);light=bpy.context.object;light.data.energy=power*span*span;light.data.size=span*3;light.data.color=color;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
  bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=span*1.40;scene.camera=camera
  views={'assembly':(3,-6,7.7)} if assembled else {'game-camera':(3,6,7.7),'front':(0,8,1.4),'back':(0,-8,1.4),'underside':(3,5,-7)}
  for name,delta in views.items():
   if ('--canonical-only' in sys.argv or '--cores-only' in sys.argv or '--review-only' in sys.argv) and not assembled and name!='game-camera':continue
   camera.location=center+Vector(delta)*span;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/f'{key}-{name}.png');bpy.ops.render.render(write_still=True)
