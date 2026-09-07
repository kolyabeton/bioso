import bpy,bmesh,json,pathlib,math
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[2];O=P/'output/blender-repair-v1';reports=[]
D=P/'output/blender-repair-v1';O=P/'output/blender-variants-v1'
variants=json.loads((O/'variants.json').read_text())
reports=json.loads((O/'repairs.json').read_text());reports=[r for r in reports if r['id'] not in ['leg-worker','shoulder-jade']]
for variant in variants:
 if variant['id'] not in ['leg-worker','shoulder-jade']:continue
 id=variant['id'];selected=variant['components'];pivot=(0,0,0);note='Prototype variant extracted from '+variant['source']
 bpy.ops.wm.open_mainfile(filepath=str(D/(variant['source']+'-source.blend')))
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
 pivot=Vector(((min(v.co.x for v in mesh.vertices)+max(v.co.x for v in mesh.vertices))*.5,(min(v.co.y for v in mesh.vertices)+max(v.co.y for v in mesh.vertices))*.5,min(v.co.z for v in mesh.vertices)))
 for v in mesh.vertices:v.co-=pivot
 obj.name=id;obj['source_asset']=variant['source'];obj['repair_note']=note
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
 mesh.calc_loop_triangles();reports.append(dict(id=id,title=variant['title'],source=variant['source'],kind=variant['kind'],note=note,components=selected,vertices=len(mesh.vertices),triangles=len(mesh.loop_triangles),path=str(folder/(id+'.glb'))))
 (O/'repairs.json').write_text(json.dumps(reports,indent=2))
 print('REPAIRED',id,flush=True)
