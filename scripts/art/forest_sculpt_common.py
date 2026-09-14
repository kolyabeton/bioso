"""Authored forest ruin / root-bank. Own headless Blender process; no user scene access.
UVs address the generated ceramic/bark/stone/soil atlas assigned by the runtime.
No texture baking, high-poly intermediates, external assets or new lights.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/assets/kit'
SOURCE=ROOT/'docs/art/forest-living-assets'
random.seed(7319)
bpy.ops.wm.read_factory_settings(use_empty=True)
surface=bpy.data.materials.new('forest-atlas-surface');surface.diffuse_color=(.8,.8,.8,1);surface.use_nodes=True
surface.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.92
surface_color=surface.node_tree.nodes.new('ShaderNodeVertexColor');surface_color.layer_name='COLOR_0'
surface.node_tree.links.new(surface_color.outputs['Color'],surface.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
mint=bpy.data.materials.new('forest-mint-inlay');mint.use_nodes=True
bs=mint.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.16,.5,.41,1);bs.inputs['Emission Color'].default_value=(.23,.9,.7,1);bs.inputs['Emission Strength'].default_value=2

def finish(o,cell=0,bevel=0):
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 if bevel:
  mod=o.modifiers.new('Rounded worn panel edges','BEVEL');mod.width=bevel;mod.segments=2
  bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.clear();o.data.materials.append(surface)
 if not o.data.uv_layers: o.data.uv_layers.new()
 # Stable triplanar-like face projection into the appropriate atlas quadrant.
 uv=o.data.uv_layers.active.data; ox=(cell%2)*.5;oy=.5 if cell<2 else 0
 for poly in o.data.polygons:
  axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
  for li in poly.loop_indices:
   p=o.data.vertices[o.data.loops[li].vertex_index].co
   # Never fract each vertex: polygons crossing zero would smear an entire atlas cell.
   u=.5+(p[axes[0]]-poly.center[axes[0]])*.14
   v=.5+(p[axes[1]]-poly.center[axes[1]])*.14
   uv[li].uv=(ox+.025+max(.02,min(.98,u))*.45,oy+.025+max(.02,min(.98,v))*.45)
 o.select_set(False);return o

def mesh(name,verts,faces,cell=0,bevel=0):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
 return finish(o,cell,bevel)

def block(name,location,scale,cell=0,bevel=.07,rotation=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler.z=rotation
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,cell,bevel)

def tube(name,points,radii,cell=1):
 # Longitudinal ridges and tapered asymmetry give roots non-cylindrical cross-sections.
 verts=[];faces=[];sides=9
 for i,raw in enumerate(points):
  p=Vector(raw);tangent=Vector(points[min(len(points)-1,i+1)])-Vector(points[max(0,i-1)])
  tangent.normalize();up=Vector((0,0,1)) if abs(tangent.z)<.95 else Vector((0,1,0))
  a=tangent.cross(up).normalized();b=tangent.cross(a).normalized()
  for j in range(sides):
   theta=j*2*math.pi/sides;r=radii[i]*(1+.13*math.sin(j*3+i*.7))
   verts.append(p+(a*math.cos(theta)+b*math.sin(theta))*r)
  if i:
   for j in range(sides):faces.append(((i-1)*sides+j,(i-1)*sides+(j+1)%sides,i*sides+(j+1)%sides,i*sides+j))
 faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
 o=mesh(name,verts,faces,cell)
 for p in o.data.polygons:p.use_smooth=True
 return o

def stone(name,x,y,z,sx,sy,sz,seed):
 rng=random.Random(seed);n=9;verts=[];faces=[]
 outline=[(math.cos(i*math.tau/n)*(1+rng.uniform(-.16,.16)),math.sin(i*math.tau/n)*(1+rng.uniform(-.12,.12))) for i in range(n)]
 for k,(scale,h) in enumerate([(1,0),(.95,.28),(.66,.83),(.3,1)]):
  for i,(a,b) in enumerate(outline):verts.append((x+(a*scale+.12*k)*sx,y+b*scale*sy,z+(h+rng.uniform(-.05,.05))*sz))
  if k:
   for i in range(n):faces.append(((k-1)*n+i,(k-1)*n+(i+1)%n,k*n+(i+1)%n,k*n+i))
 faces.extend([tuple(reversed(range(n))),tuple(3*n+i for i in range(n))])
 return mesh(name,verts,faces,2,.055)

def export(name):
 selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
 if selected and name not in selected:
  bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);return
 obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
 # Group by material for two calls (surface + tiny luminous inlay), not one per panel.
 for mat in [surface,mint]:
  same=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials[0]==mat]
  if not same:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in same:o.select_set(True)
  bpy.context.view_layer.objects.active=same[0];bpy.ops.object.join();bpy.context.object.name=mat.name
 # Actual short-range ambient occlusion, baked into vertex colour once offline.
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];vertices=[];polygons=[]
 for o in objects:
  offset=len(vertices);vertices.extend([o.matrix_world@v.co for v in o.data.vertices]);polygons.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
 bvh=BVHTree.FromPolygons(vertices,polygons)
 for o in objects:
  if o.data.materials[0]==mint:continue
  attr=o.data.color_attributes.get('COLOR_0');existed=attr is not None
  if not attr:attr=o.data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
  normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
  for v,c in zip(o.data.vertices,attr.data):
   p=o.matrix_world@v.co;n=(normal_matrix@v.normal).normalized();up=Vector((0,0,1)) if abs(n.z)<.9 else Vector((0,1,0));a=n.cross(up).normalized();b=n.cross(a).normalized();hits=0
   for j in range(6):
    angle=j*2.39996;direction=(n*.65+a*math.cos(angle)*.76+b*math.sin(angle)*.76).normalized()
    if bvh.ray_cast(p+n*.018,direction,.75)[0] is not None:hits+=1
   ao=1-hits/6*.67;base=tuple(c.color) if existed else (1,1,1,1);c.color=(base[0]*ao,base[1]*ao,base[2]*ao,1)
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/(name+'.blend')))
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
 n=0
 for o in bpy.context.scene.objects:
  if o.type=='MESH':o.data.calc_loop_triangles();n+=len(o.data.loop_triangles)
 print('FOREST_ASSET',name,'triangles',n,'bytes',(OUT/(name+'.glb')).stat().st_size,flush=True)
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
