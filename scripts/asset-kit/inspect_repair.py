import bpy,bmesh,json,pathlib,sys
from mathutils import Vector
P=pathlib.Path(__file__).resolve().parents[2];OUT=P/'output/blender-repair-v1';id=sys.argv[sys.argv.index('--')+1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(P/'output/meshy/kit-v1/models'/id/(id+'.glb')))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
 bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00001);bm.to_mesh(o.data);bm.free()
o=meshes[0];verts=o.data.vertices;lo=Vector([min(v.co[i] for v in verts) for i in range(3)]);hi=Vector([max(v.co[i] for v in verts) for i in range(3)]);center=(lo+hi)*.5;size=max(hi-lo)
for v in verts:v.co=(v.co-center)*(2/size)
# Connected components and exact bounds in normalized model space.
adj=[[] for v in verts]
for e in o.data.edges:
 a,b=e.vertices;adj[a].append(b);adj[b].append(a)
seen=set();comps=[]
for v in verts:
 if v.index in seen:continue
 stack=[v.index];seen.add(v.index);group=[]
 while stack:
  i=stack.pop();group.append(i)
  for j in adj[i]:
   if j not in seen:seen.add(j);stack.append(j)
 comps.append({'n':len(group),'min':[min(verts[i].co[a] for i in group) for a in range(3)],'max':[max(verts[i].co[a] for i in group) for a in range(3)]})
(OUT/(id+'-components.json')).write_text(json.dumps(sorted(comps,key=lambda c:-c['n']),indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(id+'-source.blend')))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True;s.render.resolution_x=1100;s.render.resolution_y=1100;s.render.resolution_percentage=100;s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.35,.35,.35,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
bpy.ops.object.light_add(type='AREA',location=(-3,-4,5));bpy.context.object.data.energy=500;bpy.context.object.data.size=5
bpy.ops.object.light_add(type='AREA',location=(3,3,3));bpy.context.object.data.energy=400;bpy.context.object.data.size=4
bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=2.4
for label,loc in [('front',(0,-5,0)),('back',(0,5,0)),('side',(5,0,0))]:
 cam.location=loc;cam.rotation_euler=(-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(OUT/(id+'-'+label+'.png'));bpy.ops.render.render(write_still=True)
print('INSPECTED',id,len(comps))
