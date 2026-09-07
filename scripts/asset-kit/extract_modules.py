import bpy,bmesh,json,pathlib,math
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[2];O=P/'output/blender-repair-v1';reports=json.loads((pathlib.Path(__file__).resolve().parents[2]/'output/blender-repair-v1/module-repairs.json').read_text());reports=[r for r in reports if r['id'] not in ['head-mandible','leg-root']]
def pick(id,predicate):
 cs=json.loads((O/(id+'-components.json')).read_text());return [i for i,c in enumerate(cs) if predicate(i,c['min'],c['max'])]
configs={
'head-optic':(pick('head-optic',lambda i,l,h:l[2]>.35 and i not in [7,8]),(0,0,.4),'Head extracted with optic and neck'),
'head-mandible':(pick('head-mandible',lambda i,l,h:i in [0,17] or l[2]>.55),(0,0,.4),'Head and neck extracted'),
'sensor-antenna':(pick('sensor-antenna',lambda i,l,h:i in [1,27,30] or l[2]>.70),(.55,0,-.2),'Antenna mast extracted'),
'sensor-dish':(pick('sensor-dish',lambda i,l,h:i in [3,5,12,20] or h[1]<-.46),(.45,-.2,.2),'Sensor dish and mounting bracket extracted'),
'leg-walker':(pick('leg-walker',lambda i,l,h:i==0 or h[2]<.12),(0,.1,-.15),'Walking leg separated; fused upper body cut at mount'),
'leg-jumper':(pick('leg-jumper',lambda i,l,h:h[2]<.25),(0,.15,.2),'Articulated leg extracted from optical capsule'),
'leg-climber':(pick('leg-climber',lambda i,l,h:h[2]<-.29),(0,0,-.3),'Climbing foot assembly extracted'),
'leg-root':(pick('leg-root',lambda i,l,h:h[2]<.17 and h[0]<-.10 and (h[2]<-.55 or l[0]>-.5)),(-.25,0,.1),'Single leg with branching root foot extracted'),
'shell-elytra':(pick('shell-elytra',lambda i,l,h:i==0 or l[1]>0),(0,.5,0),'Outer armour shell extracted; front optic removed'),
'shell-spine':(pick('shell-spine',lambda i,l,h:i==7 or l[1]>.17),(0,.15,.3),'Dorsal armour plate extracted'),
 'tail-counterweight':(pick('tail-counterweight',lambda i,l,h:i not in [2,3,4]),(0,0,-.58),'Counterweight bulb retained with mounting stem; feet removed'),
 'tail-stinger':(pick('tail-stinger',lambda i,l,h:i in [2,5,25] or (l[1]>.3 and l[0]>-.23 and h[0]<.23)),(0,.25,.05),'Rear appendage extracted as prototype tail')}
for id,(selected,pivot,note) in configs.items():
 if id not in ['head-mandible','leg-root']:continue
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
 if id=='leg-walker':
  bm=bmesh.new();bm.from_mesh(mesh)
  result=bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),dist=.00001,plane_co=(0,0,-.15),plane_no=(0,0,1),clear_outer=True,clear_inner=False)
  edges=[e for e in result['geom_cut'] if isinstance(e,bmesh.types.BMEdge) and e.is_boundary]
  if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
  bm.to_mesh(mesh);bm.free()
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
 (O/'module-repairs.json').write_text(json.dumps(reports,indent=2))
 print('REPAIRED',id,flush=True)
