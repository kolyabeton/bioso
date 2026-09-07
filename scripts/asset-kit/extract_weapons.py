import bpy,bmesh,json,pathlib,math
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[2];O=P/'output/blender-repair-v1';reports=[]
configs={
'arm-claw':([3,5,6,18,19,25,33,34,37,52,61,66,75],(.41,0,.45),'Extracted complete right claw arm'),
'arm-seed':([3,4,8,10,15,16,22,24,32,34,37,38,40],(-.3,.05,.4),'Arm and shoulder pipe extracted; seed cannon still requires reconstruction'),
'arm-drill':([3,6,7,9,11,17,26,28,31,40,45,47,49,52,55,57,63,64,65,69,70],(-.2,.1,.4),'Left arm with conical tool extracted; hand removed'),
'arm-arc':([2,7,10,14,15,17,20,22,41,45],(.4,.05,.45),'Right fork arm extracted; electric emitter requires review'),
'arm-shield':([2,16,26,28,29,30,31,32,33,34,35,36,37,39,40],(.3,.05,.18),'Shield and rear handle extracted'),
'arm-siphon':([1,5,14,15,24,27,30,34,36],(-.42,.1,.5),'Left tubular arm extracted; fist and torso removed')}
for id,(selected,pivot,note) in configs.items():
 bpy.ops.wm.open_mainfile(filepath=str(O/(id+'-source.blend')))
 obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');mesh=obj.data;adj=[[] for v in mesh.vertices]
 for e in mesh.edges:
  a,b=e.vertices;adj[a].append(b);adj[b].append(a)
 seen=set();groups=[]
 for v in mesh.vertices:
  if v.index in seen:continue
  stack=[v.index];seen.add(v.index);g=[]
  while stack:
   i=stack.pop();g.append(i)
   for j in adj[i]:
    if j not in seen:seen.add(j);stack.append(j)
  groups.append(g)
 groups.sort(key=lambda g:-len(g));keep=set(i for n in selected for i in groups[n])
 bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table();bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.index not in keep],context='VERTS');bm.to_mesh(mesh);bm.free()
 for v in mesh.vertices:v.co-=Vector(pivot)
 obj.name=id;obj['source_asset']=id;obj['repair_note']=note
 bpy.ops.object.empty_add(type='ARROWS',location=(0,0,0));root=bpy.context.object;root.name='Socket.Root';root.empty_display_size=.1;obj.parent=root
 folder=O/'models'/id;folder.mkdir(parents=True,exist_ok=True)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);root.select_set(True);bpy.context.view_layer.objects.active=obj
 bpy.ops.export_scene.gltf(filepath=str(folder/(id+'.glb')),export_format='GLB',use_selection=True)
 bpy.ops.wm.save_as_mainfile(filepath=str(folder/(id+'.blend')))
 lo=Vector([min(v.co[a] for v in mesh.vertices) for a in range(3)]);hi=Vector([max(v.co[a] for v in mesh.vertices) for a in range(3)]);center=(lo+hi)*.5;size=max(hi-lo)
 s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=20;s.cycles.use_denoising=True;s.render.resolution_x=720;s.render.resolution_y=720;s.render.resolution_percentage=100;s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.23,.24,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
 for loc,power in [((-3,-4,5),500),((3,3,3),400)]:
  bpy.ops.object.light_add(type='AREA',location=loc);bpy.context.object.data.energy=power;bpy.context.object.data.size=4
 bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=size*1.35
 for label,direction in [('front',(0,-5,1)),('back',(2,5,1))]:
  cam.location=center+Vector(direction);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(folder/(label+'.png'));bpy.ops.render.render(write_still=True)
 mesh.calc_loop_triangles();reports.append(dict(id=id,note=note,components=selected,vertices=len(mesh.vertices),triangles=len(mesh.loop_triangles),path=str(folder/(id+'.glb'))))
 (O/'repairs.json').write_text(json.dumps(reports,indent=2))
 print('REPAIRED',id,flush=True)
