import bpy,json,math
from pathlib import Path
from mathutils import Matrix,Vector
P=Path(__file__).resolve().parents[2];O=P/'proof/equipment-mounts';report=json.loads((O/'catalog-and-assemblies.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
Q=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def matrix(a):return Matrix.Rotation(math.radians(32),4,'Z')@Q@Matrix([a[i::4] for i in range(4)])@Q.inverted()
# The game supplies all asset transforms, including the actual six-slot layout.
for i,a in enumerate(report['assemblies']):
 offset=Vector(((i%4)*5,(i//4)*-5,0))
 for asset in a['assets']:
  before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(P/'public/assets/kit'/f"{asset['id']}.glb"));added=set(bpy.data.objects)-before
  root=bpy.data.objects.new(a['body']+' '+asset['id'],None);bpy.context.collection.objects.link(root);root.matrix_world=matrix(asset['matrix']);root.location+=offset
  for obj in added:
   if obj.parent not in added:obj.parent=root
 for c in a['connectors']:
  pos=c['positions'];verts=[Q.to_3x3()@Vector(pos[j:j+3]) for j in range(0,len(pos),3)];idx=c['indices'] or list(range(len(verts)));mesh=bpy.data.meshes.new(c['name']);mesh.from_pydata(verts,[],[idx[j:j+3] for j in range(0,len(idx),3)]);obj=bpy.data.objects.new(c['name'],mesh);bpy.context.collection.objects.link(obj);obj.matrix_world=matrix(c['matrix']);obj.location+=offset
  mat=bpy.data.materials.new(c['name']);mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c['color'],1);obj.data.materials.append(mat)
 # Label as a physical floor placard, separate from the game UI.
 bpy.ops.object.text_add(location=offset+Vector((-1.4,-1.9,.02)));txt=bpy.context.object;txt.data.body=a['body']+f"  {a['arms']} arms / {a['legs']} legs";txt.data.size=.22;labelmat=bpy.data.materials.new('Label');labelmat.use_nodes=True;labelmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.7,.8,.75,1);txt.data.materials.append(labelmat)
bpy.ops.mesh.primitive_plane_add(size=200,location=(6,-2,-.04));floor=bpy.context.object;mat=bpy.data.materials.new('Neutral slate');mat.use_nodes=True;mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.055,.075,.07,1);floor.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1800;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Cool fill');scene.world.color=(.16,.19,.21)
for loc,power,color in [((-3,-4,13),2300,(1,.88,.74)),((12,3,10),1800,(.68,.8,1))]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=10;l.data.color=color
bpy.ops.object.camera_add(location=(8,-17,16));cam=bpy.context.object;target=Vector((7.5,-2,.65));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=21;scene.camera=cam
ref=bpy.data.images.load(str(P/'docs/references/biomecha-style-master.png'));ref.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(P/'output/blender-equipment-completion/assembled-review.blend'))
scene.render.filepath=str(O/'all-bodies.png');bpy.ops.render.render(write_still=True)
