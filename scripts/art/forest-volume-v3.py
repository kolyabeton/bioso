"""Lightweight true-volume forest kit. No camera-facing environment cards.
Run in our separate Blender background process, never in a user's open scene.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forest_sculpt_common import *

leaf=bpy.data.materials.new('forest-geometric-leaves');leaf.use_nodes=True
bs=leaf.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.24,.31,.13,1);bs.inputs['Roughness'].default_value=.95
leaf.diffuse_color=(.24,.31,.13,1);leaf.use_backface_culling=False
color=leaf.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='COLOR_0'
leaf.node_tree.links.new(color.outputs['Color'],bs.inputs['Base Color'])

def leaves(name,clusters,seed):
 rng=random.Random(seed);verts=[];faces=[];colors=[]
 for center,radius,count in clusters:
  for i in range(count):
   a=rng.random()*math.tau;r=radius*math.sqrt(rng.random());p=Vector(center)+Vector((math.cos(a)*r,math.sin(a)*r,rng.uniform(-.36,.48)*radius))
   yaw=rng.random()*math.tau;length=rng.uniform(.13,.27);width=length*rng.uniform(.4,.65)
   u=Vector((math.cos(yaw),math.sin(yaw),rng.uniform(-.5,.5))).normalized();v=Vector((-u.y,u.x,.1)).normalized();n=len(verts)
   # Folded six-vertex lanceolate leaves: real silhouettes and light-catching ridge.
   verts.extend([p-u*length,p-u*length*.35-v*width,p+Vector((0,0,.065)),p+u*length*.42-v*width*.75,p+u*length,p+u*length*.15+v*width])
   faces.extend([(n,n+1,n+2),(n+1,n+3,n+2),(n+3,n+4,n+2),(n+4,n+5,n+2),(n+5,n,n+2)])
   tone=rng.uniform(.75,1.2);shade=max(.62,min(1,p.z/6))
   colors.extend([(.105*tone*shade,.14*tone*shade,.071*tone*shade,1)]*6)
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.materials.append(leaf);data.update()
 attr=data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
 for c,rgba in zip(attr.data,colors):c.color=rgba
 o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
 return o

def tree(variant):
 rng=random.Random(300+variant);lean=-.48 if variant==0 else .65;height=8.5 if variant==0 else 6.6
 tube('Ridged old trunk',[(0,0,0),(.1,.1,1.1),(-.16,.2,2.5),(lean,.15,4.1),(lean*.8,.5,5.8),(lean*1.2,.45,height)],[.72,.54,.44,.34,.21,.045])
 for i in range(8):
  a=i*math.tau/8+.2
  tube('Spreading buttress',[(0,0,1.65),(math.cos(a)*.7,math.sin(a)*.7,.42),(math.cos(a)*1.65,math.sin(a)*1.65,.13),(math.cos(a)*2.65,math.sin(a)*2.65,.02)],[.29,.24,.12,.008])
 clusters=[]
 for j in range(13):
  a=j*2.4+variant*.7;h=3.1+(j/13)*(height-3.5);extent=(1-(h/height)*.65)*3.6
  start=Vector((lean*h/height,.2,h));elbow=start+Vector((math.cos(a)*extent*.54,math.sin(a)*extent*.54,.65));tip=start+Vector((math.cos(a)*extent,math.sin(a)*extent,1.05))
  tube('Asymmetric scaffold branch',[start,elbow,tip],[.16*(1-h/height)+.075,.072,.012])
  for k in range(3):
   q=tip+Vector((math.cos(a+k*1.7)*.65,math.sin(a+k*1.7)*.65,.3*(k-1)))
   tube('Fine twig',[elbow,tip,q],[.035,.018,.003]);clusters.append((q,.85 if variant==0 else 1.05,46))
 leaves('Folded canopy leaves',clusters,18+variant)
 export('forest-tree-'+str(variant)+'-v3')

tree(0)

# A second silhouette: low, forked broadleaf tree. Same material and leaf mesh
# method, fewer leaves than the tall tree, no raster cutouts or texture additions.
tube('Forked broadleaf base',[(0,0,0),(.1,.1,.9),(-.1,.15,1.8)],[.64,.55,.45])
for side in [-1,1]:
 tube('Split living trunk',[(-.1,.15,1.4),(side*.7,.2,2.5),(side*1.2,.15,3.8),(side*1.6,.3,5.4)],[.38,.30,.20,.05])
for i in range(7):
 a=i*2.4;tube('Broadleaf root',[(0,0,.9),(math.cos(a)*.65,math.sin(a)*.65,.3),(math.cos(a)*1.9,math.sin(a)*1.9,.025)],[.24,.20,.009])
clusters=[]
for j in range(11):
 a=j*2.39996;h=2.8+(j%4)*.58;side=-1 if j%2 else 1
 start=Vector((side*.7,.2,h));reach=2.1+(j%3)*.32
 elbow=start+Vector((math.cos(a)*reach*.55,math.sin(a)*reach*.55,.45))
 tip=start+Vector((math.cos(a)*reach,math.sin(a)*reach,.65))
 tube('Sweeping broadleaf branch',[start,elbow,tip],[.15,.08,.012])
 for k in range(3):
  q=tip+Vector((math.cos(a+k*1.8)*.65,math.sin(a+k*1.8)*.65,.28*(k-1)))
  tube('Broadleaf twig',[elbow,tip,q],[.025,.015,.003]);clusters.append((q,.92,36))
leaves('Broad low crown',clusters,731)
export('forest-tree-broad-v4')

# Low broadleaf undergrowth, individual leaves rather than an image of a bush.
clusters=[]
for i in range(11):
 a=i*2.4;p=(math.cos(a)*.72,math.sin(a)*.72,1.0+(i%3)*.24)
 tube('Shrub stems',[(0,0,0),(p[0]*.4,p[1]*.4,.6),p],[.04,.025,.003]);clusters.append((p,.67,30))
leaves('Shrub leaf volume',clusters,94);export('forest-shrub-v3')

# Feathered 3D fern fronds, with folded individual pinnae (no alpha planes).
verts=[];faces=[];colors=[]
for frond in range(9):
 a=frond*2.39996;direction=Vector((math.cos(a),math.sin(a),0));cross=Vector((-math.sin(a),math.cos(a),0));length=1.05+(frond%3)*.16
 for row in range(1,10):
  t=row/10;center=direction*(t*length)+Vector((0,0,math.sin(t*math.pi)*.65+.12));spread=math.sin(t*math.pi)*.22
  for side in [-1,1]:
   base=center-direction*.025;tip=center+cross*spread*side+direction*.13;n=len(verts)
   verts.extend([base,base+direction*.055+cross*spread*.5*side,tip,base-direction*.025+cross*spread*.5*side+Vector((0,0,.024))])
   faces.extend([(n,n+1,n+2),(n,n+2,n+3)]);colors.extend([(.105,.15,.065,1)]*4)
data=bpy.data.meshes.new('Sculpted fern leaflets');data.from_pydata(verts,[],faces);data.materials.append(leaf);data.update()
attr=data.color_attributes.new(name='COLOR_0',type='FLOAT_COLOR',domain='POINT')
for c,rgba in zip(attr.data,colors):c.color=rgba
o=bpy.data.objects.new('Feathered fern volume',data);bpy.context.collection.objects.link(o);export('forest-fern-v3')

# Weathered continuous boulder: no straight extruded sides or cylindrical roof.
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1);o=bpy.context.object;o.name='Eroded fractured boulder'
for v in o.data.vertices:
 p=v.co.copy();noise=math.sin(p.x*6+p.y*3)*math.sin(p.z*5-p.x*2)*.1+math.sin(p.y*11+p.z*7)*.035
 v.co.x=p.x*(.91+noise)+p.z*.13;v.co.y=p.y*(.82+noise);v.co.z=max(-.055,(p.z+.8)*.57+noise*.32)
 # Two broad fracture planes interrupt a smooth ellipsoid without making a box.
 v.co.z=min(v.co.z,1.02-v.co.x*.20-v.co.y*.10)
o.data.update();finish(o,2)
for poly in o.data.polygons:poly.use_smooth=True
stone('Detached low fragment',-.78,-.54,-.07,.3,.3,.19,891)
export('forest-boulder-v3')

# Fallen ceramic equipment: recessed chassis, broken curved panel shell and roots.
block('Dark recessed chassis',(0,0,.73),(3.4,1.7,1.35),1,.15,rotation=.17)
for side in [-1,1]:
 for i in range(5):
  a=(i/5)*math.pi*.8+.13;h=.8+math.sin(a)*.8
  o=block('Weathered curved ceramic panel',((i-2)*.63,side*.64,h),(.60,.9,.28),0,.09)
  o.rotation_euler.x=side*.48;o.rotation_euler.y=(2-i)*.14
for j in range(3):
 o=block('Mint recessed service indicator',(.5+j*.16,-.94,.91),(.07,.025,.25),0,.018);o.data.materials.clear();o.data.materials.append(mint)
for j in range(5):
 a=(j-2)*.33
 tube('Roots over abandoned casing',[(-1.7,a+.2,.04),(-1.3,a,.72),(-.4,a+.25,1.74),(.8,a+.1,1.6),(1.6,a+.5,.18),(2.0,a+.7,.02)],[.12,.10,.075,.065,.04,.005])
stone('Buried chassis shoulder',-1.4,.75,-.1,.6,.8,.55,107)
export('forest-relic-v3')
