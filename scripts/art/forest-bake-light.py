"""Bake actual geometry's directional ground shadows. No runtime shadow pass.
Layout is read from the same JS placement function used by the live renderer.
"""
import bpy,sys,json,math,subprocess
from pathlib import Path
from mathutils import Matrix,Euler
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/art/forest-living-assets'
bpy.ops.wm.read_factory_settings(use_empty=True)
query="""import {assembleBiomeWorld} from './src/biome-world.js';
import {forestPlacements} from './src/forest-placements.js';
const w=assembleBiomeWorld(12),tiles=w.tiles.filter(t=>t.biome==='forest');
const all=tiles.flatMap(t=>[...forestPlacements(t,w)].flatMap(([id,as])=>as.map(a=>({id,x:a.d.x+a.offset[0],y:a.offset[1],z:a.d.z+a.offset[2],scale:a.scale,rotation:a.rotation}))));
console.log(JSON.stringify(tiles.map(t=>({index:t.index,objects:all.filter(a=>Math.abs(a.x-t.x)<78&&Math.abs(a.z-t.z)<78).map(a=>({...a,x:a.x-t.x,z:a.z-t.z}))}))));"""
layouts=json.loads(subprocess.check_output(['node','--input-type=module','-e',query],cwd=ROOT,text=True))
if '--' in sys.argv:
 chosen=sys.argv[sys.argv.index('--')+1:];layouts=[t for t in layouts if str(t['index']) in chosen]
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=12
scene.render.threads_mode='FIXED';scene.render.threads=2;scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=False;scene.render.bake.margin=1
scene.world=bpy.data.worlds.new('No ambient in directional visibility bake');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=0
white=bpy.data.materials.new('Opaque shadow caster');white.use_nodes=True
white.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(1,1,1,1)
sun_data=bpy.data.lights.new('Static upper-left sun','SUN');sun_data.energy=1;sun_data.angle=.06
sun=bpy.data.objects.new('Static upper-left sun',sun_data);scene.collection.objects.link(sun)
from mathutils import Vector
sun.rotation_euler=Vector((45,-45,-75)).to_track_quat('-Z','Y').to_euler()
templates={}
for id in sorted({o['id'] for t in layouts for o in t['objects']}):
 before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/assets/kit'/(id+'.glb')))
 new=[o for o in scene.objects if o not in before];parts=[]
 for o in new:
  if o.type=='MESH':parts.append((o.data,o.matrix_world.copy()))
 templates[id]=parts
 for o in new:bpy.data.objects.remove(o,do_unlink=True)
for tile in layouts:
 instances=[]
 for item in tile['objects']:
  # Sub-10 cm loose chips need no separate light-bake rays.
  if isinstance(item['scale'],list) and item['scale'][1]<.1:continue
  scale=item['scale'];scale=[scale]*3 if isinstance(scale,(int,float)) else [scale[0],scale[2],scale[1]]
  pose=Matrix.Translation((item['x'],-item['z'],item['y']))@Euler((0,0,item['rotation'])).to_matrix().to_4x4()@Matrix.Diagonal((*scale,1))
  for data,matrix in templates[item['id']]:
   o=bpy.data.objects.new(item['id'],data);scene.collection.objects.link(o);o.matrix_world=pose@matrix
   # Material assignment is shared deliberately: a visibility bake has white occluders.
   if not data.materials:data.materials.append(white)
   for i in range(len(data.materials)):data.materials[i]=white
   instances.append(o)
 # Include the actual forest beyond the boundary; never stretch the edge texel.
 bpy.ops.mesh.primitive_plane_add(size=128);ground=bpy.context.object;ground.name='Bake receiver'
 material=bpy.data.materials.new('Receiver '+str(tile['index']));material.use_nodes=True;ground.data.materials.append(material)
 image=bpy.data.images.new('Forest visibility '+str(tile['index']),width=768,height=768,alpha=False,float_buffer=False);image.colorspace_settings.name='Non-Color'
 node=material.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;material.node_tree.nodes.active=node
 bpy.ops.object.select_all(action='DESELECT');ground.select_set(True);bpy.context.view_layer.objects.active=ground
 print('BAKE_START',tile['index'],len(instances),flush=True)
 bpy.ops.object.bake(type='DIFFUSE')
 pixels=np.empty(768*768*4,dtype=np.float32);image.pixels.foreach_get(pixels);rgb=pixels.reshape((-1,4));peak=max(.001,float(np.percentile(rgb[:,0],99)))
 rgb[:,:3]=np.clip(rgb[:,:3]/peak,0,1);rgb[:,3]=1;image.pixels.foreach_set(pixels)
 image.filepath_raw=str(OUT/('light-tile-'+str(tile['index'])+'-v4.png'));image.file_format='PNG';image.save()
 # Publish the lossless runtime derivative in the same reproducible command.
 subprocess.run(['node','--input-type=module','-e',
  "import sharp from 'sharp';await sharp(process.argv[1]).webp({lossless:true}).toFile(process.argv[2]);",
  image.filepath_raw,str(ROOT/'public/assets/biomes/forest-living'/('light-tile-'+str(tile['index'])+'-v4.webp'))],cwd=ROOT,check=True)
 print('BAKE_DONE',tile['index'],'peak',peak,'mean',float(rgb[:,0].mean()),flush=True)
 for o in instances+[ground]:bpy.data.objects.remove(o,do_unlink=True)
 bpy.data.images.remove(image)
