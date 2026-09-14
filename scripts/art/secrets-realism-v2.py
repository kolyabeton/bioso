"""Reference-led, textured secret structures. Writes candidates only, never game assets.
Blender --background --factory-startup --threads 2 --python scripts/art/secrets-realism-v2.py
References/prompts: docs/art/secrets-v2. Geometry authored in Blender, not image-to-3D.
"""
import bpy, math, random, json, sys
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[2]
OUT=R/'output/secrets-v2'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=4
scene.render.threads_mode='FIXED'; scene.render.threads=2
random.seed(9212)
M={}

# Reuse canonical project textures; no replacement texture generation.
ATLAS='public/assets/biomes/forest-living/materials-v2.webp'
def shared_surface(name,path,rough,metal=0):
    m=bpy.data.materials.new('bioso-shared-'+name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/path),check_existing=True)
    m.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);M[name]=m
shared_surface('ceramic','public/assets/textures/chassis-ceramic-v3.png',.76,.12)
shared_surface('ceramic-worn',ATLAS,.86,.04)
shared_surface('steel','public/assets/ui/materials/metal-olive-v1.jpg',.68,.72)
shared_surface('stone',ATLAS,.95)
shared_surface('membrane','public/assets/ui/materials/ceramic-green-v1.jpg',.73)
shared_surface('root',ATLAS,.91)
shared_surface('leaf','public/assets/ui/materials/ceramic-green-v1.jpg',.88)
for name,color,rough,metal,emit in [('rubber',(.018,.022,.019),.89,0,0),('mint',(.2,.48,.37),.42,.15,.7),('window',(.055,.095,.07),.31,.3,0)]:
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    if emit:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emit
    M[name]=m

def finish(o,name,mat):
    o.name=name;o.data.materials.append(M[mat])
    if mat in ['stone','root','ceramic-worn'] and o.data.uv_layers:
        ox,oy={'stone':(0,0),'root':(.5,.5),'ceramic-worn':(0,.5)}[mat]
        for uv in o.data.uv_layers.active.data:uv.uv=(ox+.025+max(0,min(1,uv.uv.x))*.45,oy+.025+max(0,min(1,uv.uv.y))*.45)
    return o
def smooth(o):
    for p in o.data.polygons:p.use_smooth=True
    return o
def block(name,loc,dim,mat='steel',bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('fabricated rounded edges','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('weighted face normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,mat)
def ball(name,loc,scale,mat='ceramic',seg=40,rings=24):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,radius=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return finish(smooth(o),name,mat)
def pipe(name,points,r=.03,mat='steel'):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=8;curve.bevel_depth=r;curve.bevel_resolution=3
    sp=curve.splines.new('BEZIER');sp.bezier_points.add(len(points)-1)
    for p,co in zip(sp.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    # Curves converted to meshes have no usable UVs; assign length-based repeat coordinates.
    if not o.data.uv_layers:o.data.uv_layers.new()
    for loop in o.data.loops:
        v=o.data.vertices[loop.vertex_index].co;o.data.uv_layers.active.data[loop.index].uv=(v.z*1.7+v.x*.4,v.y*1.7+v.x*.7)
    return finish(smooth(o),name,mat)
def cylinder(name,a,b,r,mat='steel',vertices=32):
    a,b=Vector(a),Vector(b);d=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=d.length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=d.to_track_quat('Z','Y').to_euler();return finish(smooth(o),name,mat)
def ring(name,c,rx,rz,t=.045,mat='steel',start=0,end=math.tau):
    x,y,z=c;return pipe(name,[(x+rx*math.sin(start+(end-start)*i/64),y,z+rz*math.cos(start+(end-start)*i/64)) for i in range(65)],t,mat)
def bolt(x,y,z,r=.028):
    cylinder('hex fastener',(x,y+.01,z),(x,y-.025,z),r,'steel',6)
    block('fastener slot',(x,y-.028,z),(r*.9,.006,.009),'rubber',.002)
def vent(x,y,z,w=.4,h=.3):
    block('vent recess',(x,y,z),(w,.06,h),'rubber',.018)
    for j in range(7):block('vent louver',(x,y-.034,z+(j-3)*h/8),(w*.88,.045,.017),'steel',.006)
    for dx in [-w*.44,w*.44]:
        for dz in [-h*.42,h*.42]:bolt(x+dx,y-.04,z+dz,.015)
def cabinet(x,y,z,w=.6,h=.65):
    block('service casing',(x,y,z),(w,.42,h),'steel',.055);block('chipped ceramic access lid',(x,y-.22,z),(w*.94,.085,h*.94),'ceramic',.035)
    vent(x,y-.273,z,w*.67,h*.55)
    for dx in [-w*.38,w*.38]:
        for dz in [-h*.39,h*.39]:bolt(x+dx,y-.275,z+dz,.02)
def panel_shell(name,c,scale,cols=8,rows=3):
    # Individually fitted curved shell panels, with actual recessed joints.
    cx,cy,cz=c;sx,sy,sz=scale
    ball(name+' dark pressure hull',c,(sx*.984,sy*.984,sz*.984),'steel',48,28)
    for row in range(rows):
        p0=.1+row*(math.pi-.2)/rows+.016;p1=.1+(row+1)*(math.pi-.2)/rows-.016
        for col in range(cols):
            a0=col*math.tau/cols+.014;a1=(col+1)*math.tau/cols-.014;v=[];f=[];uv=[]
            for j in range(9):
                p=p0+(p1-p0)*j/8
                for i in range(9):
                    a=a0+(a1-a0)*i/8;v.append((cx+sx*math.sin(p)*math.cos(a),cy+sy*math.sin(p)*math.sin(a),cz+sz*math.cos(p)));uv.append((i/8,j/8))
            for j in range(8):
                for i in range(8):k=j*9+i;f.append((k,k+1,k+10,k+9))
            mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],f);mesh.uv_layers.new()
            for l in mesh.loops:mesh.uv_layers.active.data[l.index].uv=uv[l.vertex_index]
            o=bpy.data.objects.new(name+' ceramic segment',mesh);scene.collection.objects.link(o);finish(smooth(o),o.name,'ceramic-worn')
def vine(points,count=16):
    pipe('creeping root',points,.011,'root')
    for j in range(count):
        t=j/(count-1)*(len(points)-1);idx=min(int(t),len(points)-2);p=Vector(points[idx]).lerp(Vector(points[idx+1]),t-idx);side=(-1)**j
        end=p+Vector((side*random.uniform(.06,.16),-.025,random.uniform(.015,.05)))
        pipe('petiole',[p,end],.003,'root')
        # Curved lanceolate leaves with sculpted midrib, not flat foliage cards.
        size=random.uniform(.11,.18);verts=[tuple(end),tuple(end+Vector((side*size*.38,-.012,size*.22))),tuple(end+Vector((side*size,-.025,size*.08))),tuple(end+Vector((side*size*.38,.022,-size*.18))),tuple(end+Vector((side*size*.46,-.026,size*.02)))]
        mesh=bpy.data.meshes.new('leaf');mesh.from_pydata(verts,[],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)]);mesh.uv_layers.new()
        for l in mesh.loops:mesh.uv_layers.active.data[l.index].uv=[(0,.5),(.4,1),(1,.5),(.4,0),(.5,.5)][l.vertex_index]
        o=bpy.data.objects.new('olive leaf',mesh);scene.collection.objects.link(o);finish(smooth(o),o.name,'leaf')
def clamp(x,y,z,angle=0):
    o=block('pressure latch',(x,y,z),(.16,.12,.3),'steel',.025);o.rotation_euler.y=angle
    bolt(x,y-.07,z-.08);bolt(x,y-.07,z+.08)

REUSE=[]
def reuse_asset(name,center,height):
    before=set(scene.objects);bpy.ops.import_scene.gltf(filepath=str(R/f'public/assets/kit/{name}.glb'))
    imported=[o for o in scene.objects if o not in before];meshes=[o for o in imported if o.type=='MESH']
    points=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    origin=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z));scale=height/(hi.z-lo.z)
    for o in meshes:
        matrix=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
        for v in o.data.vertices:v.co=(matrix@v.co-origin)*scale+Vector(center)
        o.name='reused-'+name
        # Authored environment GLBs use a runtime atlas: bind that same atlas for portable export.
        for mat in o.data.materials:
            if mat and mat.name.startswith('forest-atlas-surface'):
                p=mat.node_tree.nodes.get('Principled BSDF');tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(R/ATLAS),check_existing=True);mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
    for o in imported:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    REUSE.append(name)

def membrane():
    block('foundation',(0,.05,.16),(2.95,1.9,.32),'steel',.1)
    panel_shell('vault',(0,.2,1.4),(1.17,.91,1.38),10,4)
    # Membrane stands forward of the hull and is framed by two reinforced gaskets.
    ball('taut biological seal',(0,-.80,1.40),(.84,.19,1.09),'membrane',64,40)
    for r,t,mat,y in [(1,.075,'steel',-.83),(.91,.032,'root',-.965),(1.10,.085,'ceramic',-.72)]:ring('oval hatch rim',(0,y,1.40),.88*r,1.16*r,t,mat)
    for j in range(10):
        a=j*math.tau/10;x=.96*math.sin(a);z=1.4+1.24*math.cos(a);clamp(x,-.87,z,-a)
    for j in range(12):
        a=j*2.399;ex=.77*math.sin(a);ez=1.4+1.02*math.cos(a);sx=ex*.14;sz=1.4+(ez-1.4)*.2
        points=[(sx,-1.0,sz),((sx+ex)*.48+.045,-1.0,(sz+ez)*.48),(ex,-.92,ez)]
        pipe('branched membrane vein',points,.009+random.random()*.009,'root')
        for t in [.38,.65]:
            mid=Vector(points[0]).lerp(Vector(points[2]),t);end=mid+Vector((.16*(-1)**j,.015,.1));pipe('fine membrane vein',[mid,mid.lerp(end,.5)+Vector((.02,-.01,.02)),end],.004,'root')
    for x in [-1.18,1.18]:
        cabinet(x,-.16,.85,.49,.85)
        block('ceramic sill foot',(x,-.72,.27),(.4,.78,.39),'ceramic',.075)
        pipe('side pressure line',[(x,.42,.46),(x*1.08,.38,1.35),(x*.9,.23,1.8)],.058)
        for z in [.6,1.1,1.4]:cylinder('pipe coupling',(x*1.08,.38,z-.045),(x*1.08,.38,z+.045),.079)
    cylinder('roof service neck',(0,.26,2.6),(0,.26,2.8),.24)
    for j in range(5):block('roof grille',(0,.26+(j-2)*.065,2.813),(.36,.025,.027),'steel',.004)
    reuse_asset('arch-cistern',(1.28,.44,.22),1.05)
    ball('single status lamp',(-1.17,-.415,.47),(.045,.018,.045),'mint',24,16)
    for j in range(8):
        x=(-1)**j*(.5+j*.065);vine([(x*.45,.04,2.68-abs(x)*.19),(x*.8,-.52,2.32),(x*1.05,-.7,1.7),(x*1.24,-.58,.85),(x*1.26,-.78,.23)],32)

def polygon_slab(name,poly,z,height):
    n=len(poly);verts=[(x,y,z) for x,y in poly]+[(x,y,z+height+random.uniform(-.027,.027)) for x,y in poly];faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n));mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.uv_layers.new()
    mesh.update()
    for poly in mesh.polygons:
        axis=max(range(3),key=lambda a:abs(poly.normal[a]));axes=[a for a in range(3) if a!=axis]
        for li in poly.loop_indices:
            v=mesh.vertices[mesh.loops[li].vertex_index].co
            coords=((v.x+1.6)/3.2,(v.y+1.2)/2.4,v.z)
            mesh.uv_layers.active.data[li].uv=(coords[axes[0]],coords[axes[1]])
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);finish(o,name,'stone');bpy.context.view_layer.objects.active=o;o.select_set(True)
    mod=o.modifiers.new('eroded fracture edges','BEVEL');mod.width=.025;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)

def slab():
    block('buried steel vault',(0,0,.23),(3.15,2.35,.46),'steel',.07)
    block('dark recessed cavity',(0,0,.44),(2.8,2.03,.06),'rubber',.025)
    for x in [-1.48,1.48]:block('long edge frame',(x,0,.52),(.19,2.4,.19),'steel',.035)
    for y in [-1.1,1.1]:block('short edge frame',(0,y,.52),(2.97,.17,.19),'steel',.035)
    parts=[ [(-1.35,-.96),(-.35,-.96),(-.20,-.65),(-.3,-.25),(-.85,-.08),(-1.36,-.21)], [(-1.35,-.13),(-.83,-.01),(-.26,-.18),(-.12,.08),(-.24,.45),(-.65,.41),(-.87,.69),(-1.35,.5)], [(-1.35,.57),(-.87,.76),(-.65,.48),(-.25,.52),(-.1,.95),(-1.35,.95)], [(-.21,-.97),(1.34,-.95),(1.35,-.4),(.56,-.29),(.21,-.11),(-.1,-.28),(-.06,-.64)], [(.18,-.05),(.6,-.23),(1.35,-.34),(1.34,.4),(.83,.51),(.31,.3)],[(.31,.38),(.85,.58),(1.35,.47),(1.35,.96),(.01,.95),(-.04,.55)] ]
    for i,poly in enumerate(parts):polygon_slab('fractured concrete segment '+str(i),poly,.49,.20+(i%2)*.025)
    for j in range(7):
        y=-.82+j*.27;pipe('exposed ribbed reinforcement',[(-.35,y,.48),(-.07,y+.05,.45),(.23,y+.02,.5)],.019)
        for k in range(6):cylinder('rebar rib',(-.25+k*.055,y-.022,.477),(-.25+k*.055,y+.022,.477),.022,'steel',12)
    for x in [-1.42,1.42]:
        for y in [-1.02,1.02]:
            block('corner reinforcement',(x,y,.35),(.29,.31,.64),'steel',.05)
            for z in [.17,.5]:bolt(x,y-.17,z,.035)
    for x,y in [(-.92,-.66),(.91,-.69),(-.83,.67),(.9,.67)]:
        block('lifting eye base',(x,y,.78),(.25,.19,.055),'steel',.015)
        pipe('forged lifting loop',[(x-.07,y,.79),(x-.075,y,.94),(x+.075,y,.94),(x+.07,y,.79)],.034)
    reuse_asset('environment-city-cabinet-v1',(-.85,-1.12,.05),.46)
    pipe('corrugated front cable',[(-.6,-1.22,.26),(-.4,-1.27,.3),(-.35,-1.27,.1),(.0,-1.25,.1),(.03,-1.2,.37)],.025,'rubber')
    for x in [-1.1,-.4,.4,1.1]:
        block('front reinforcing strap',(x,-1.19,.30),(.085,.055,.46),'steel',.013)
        for z in [.12,.48]:bolt(x,-1.225,z,.019)
    for x in [-.66,.65]:
        block('girder recessed panel',(x,-1.18,.31),(.51,.018,.20),'rubber',.015)
        block('girder inner face',(x,-1.194,.31),(.45,.012,.14),'steel',.008)
    ball('buried power indicator',(-.055,-.04,.515),(.026,.026,.021),'mint',24,12)
    for j in range(20):
        x=random.choice([-1.3,1.3])+random.uniform(-.1,.1);y=random.uniform(-.95,.95);ball('edge aggregate',(x,y,.68),(.025+random.random()*.025,.03,.025),'stone',12,8)
    for j in range(5):
        x=-1.3+j*.63;vine([(x,.97,.69),(x+.12,1.06,.68),(x+.22,1.13,.31)],9)

def nursery():
    block('incubation station foundation',(0,0,.19),(3.2,1.83,.38),'steel',.08)
    for x in [-1.03,0,1.03]:
        block('ceramic base cladding',(x,-.61,.31),(.99,.56,.5),'ceramic',.065);vent(x,-.91,.31,.48,.25)
    block('rear utility spine',(0,.6,1.05),(2.96,.31,1.67),'steel',.06)
    for j in range(8):block('spine stiffening rib',(-1.34+j*.38,.80,1.05),(.048,.075,1.5),'steel',.008)
    for x in [-1.0,0,1.0]:
        h=1.15 if x==0 else .96;zc=h+.48
        panel_shell('incubator',(x,-.03,zc),(.48,.46,h),8,4)
        # Smoked porthole plus a sculpted seed relief conveys the contained organic core.
        ball('dark recessed observation port',(x,-.45,zc),(.31,.12,h*.76),'window',48,32)
        ring('window gasket',(x,-.53,zc),.32,h*.78,.034,'rubber');ring('port metal rim',(x,-.55,zc),.34,h*.80,.025,'steel')
        ball('dormant seed visible in port',(x,-.559,zc-.16),(.117,.035,.22),'membrane',32,20)
        for j in range(7):
            dx=(j-3)*.029;pipe('seed longitudinal vein',[(x,-.584,zc+.08),(x+dx,-.593,zc-.13),(x+dx*.3,-.575,zc-.38)],.004,'root')
        for j in range(5):
            dx=(j-2)*.045;pipe('dormant root filament',[(x+dx*.4,-.556,zc-.35),(x+dx,-.55,zc-.51),(x+dx+random.uniform(-.08,.08),-.52,zc-h*.71)],.004,'root')
        for s in [-1,1]:
            for dz in [-h*.63,h*.63]:
                cylinder('hinge boss',(x+s*.41,-.08,zc+dz),(x+s*.52,-.08,zc+dz),.125)
                cylinder('hinge ceramic cap',(x+s*.52,-.08,zc+dz),(x+s*.535,-.08,zc+dz),.083,'ceramic')
            cylinder('locking piston',(x+s*.43,-.16,zc-h*.54),(x+s*.43,-.16,zc+h*.52),.029)
        block('status light surround',(x,-.43,zc+h*.84),(.21,.07,.078),'steel',.013);block('dormant status strip',(x,-.472,zc+h*.84),(.148,.012,.025),'mint',.004)
        clamp(x,-.26,zc+h*.96)
        pipe('curved supply feed',[(x,.25,zc+h*.62),(x,.50,zc+h*.75),(x,.68,zc+h*.56),(x,.69,1.19)],.058)
        for z in [1.1,1.6]:cylinder('supply collar',(x,.69,z-.04),(x,.69,z+.04),.078)
    for z in [.85,1.65,2.18]:pipe('shared rear manifold',[(-1.32,.7,z),(0,.74,z),(1.30,.7,z)],.065)
    cabinet(1.55,.03,1.06,.47,.68)
    for j in range(4):
        x=1.42+j*.09;pipe('insulated power lead',[(x,-.22,.85),(x+.07,-.36,.64),(x+.05,-.38,.32),(1.19,-.26,.21)],.019,'rubber')
        cylinder('electrical terminal',(x,-.25,.78),(x,-.25,.92),.033)
    reuse_asset('organ-reactor',(.98,.64,1.76),.77)
    reuse_asset('environment-scrap-pipes-v1',(-1.14,.62,.55),.66)
    for x in [-1.0,0,1.0]:
        h=1.15 if x==0 else .96;zc=h+.48
        for side in [-1,1]:
            vine([(x+.08*side,.04,zc+h),(x+.28*side,-.24,zc+h*.83),(x+.42*side,-.35,zc+.2),(x+.44*side,-.29,zc-h*.65),(x+.44*side,-.64,.39)],27)

def setup_render():
    world=scene.world=bpy.data.worlds.new('cool ambient');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.22,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.3
    for loc,power,size,color in [((-3,-4,7),1050,4,(1,.87,.69)),((4,1,5),500,4,(.64,.76,1))]:
        bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.data.color=color;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=(4.8,-7,6.4));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=4.7;camera.rotation_euler=(Vector((0,0,1.2))-camera.location).to_track_quat('-Z','Y').to_euler();scene.camera=camera
    scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.cycles.samples=32;scene.cycles.use_denoising=True
    scene.render.film_transparent=False;scene.view_settings.view_transform='AgX'
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;floor.name='inspection floor - not exported'
    mat=bpy.data.materials.new('inspection charcoal');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.035,.041,.038,1);p.inputs['Roughness'].default_value=.9;floor.data.materials.append(mat)

selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
report=json.loads((OUT/'manifest.json').read_text()) if selected and (OUT/'manifest.json').exists() else []
report=[r for r in report if r['id'].removeprefix('secret-').removesuffix('-v2') not in selected]
for kind,build in [('membrane',membrane),('slab',slab),('nursery',nursery)]:
    if selected and kind not in selected:continue
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);REUSE.clear();build()
    # Consolidate by material for bounded draw calls, preserve silhouette and geometric details.
    for mat in M.values():
        objects=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
        if not objects:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=kind+'-'+mat.name
    model=list(scene.objects);triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in model if o.type=='MESH')
    folder=OUT/'models'/kind;folder.mkdir(parents=True,exist_ok=True)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(folder/f'secret-{kind}-v2.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_materials='EXPORT')
    # Save editable source with a non-rendering reference image visible in Blender.
    bpy.ops.object.empty_add(type='IMAGE',location=(4,1,1.5));reference=bpy.context.object;reference.name=kind+' generated design reference';reference.data=bpy.data.images.load(str(R/f'docs/art/secrets-v2/references/{kind}.png'));reference.empty_display_size=3;reference.rotation_euler.x=math.pi/2;reference.hide_render=True
    setup_render();bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(folder/f'secret-{kind}-v2.blend'))
    scene.render.filepath=str(folder/'inspection.png');bpy.ops.render.render(write_still=True)
    report.append({'id':f'secret-{kind}-v2','triangles':triangles,'drawMaterials':len(model),'glb':str((folder/f'secret-{kind}-v2.glb').relative_to(R)),'bytes':(folder/f'secret-{kind}-v2.glb').stat().st_size,'reference':f'docs/art/secrets-v2/references/{kind}.png','method':'Blender authored geometry with reused BIOSO meshes and original project textures; not Meshy image-to-3D','reusedModels':REUSE.copy(),'reusedTextures':['public/assets/textures/chassis-ceramic-v3.png',ATLAS,'public/assets/ui/materials/metal-olive-v1.jpg','public/assets/ui/materials/ceramic-green-v1.jpg'],'status':'candidate; not integrated'})
    (OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n');print('FINISHED',kind,triangles,flush=True)
