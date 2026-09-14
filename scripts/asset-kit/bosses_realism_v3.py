"""Five separate BIOSO review sculptures. Original v1/v2 and runtime remain intact.
blender -b -t 6 --python scripts/asset-kit/bosses_realism_v3.py -- mercury
All visible model materials use packed glTF-compatible UV PBR textures.
"""
import bpy, math, random, sys, json
import numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/blender-bosses-realism-v3'
REF=ROOT/'output/imagegen/boss-concepts-v1'
SPECS={
 'mercury':('boss-mercury-hunter','Ртутный Ловчий','v1'),
 'leviathan':('boss-scrap-leviathan','Свалочный Левиафан','v1'),
 'cathedral':('boss-root-cathedral','Корневой Собор','v1'),
 'mirror':('boss-mirror-collector','Зеркальный Сборщик','v2'),
 'shepherd':('boss-swarm-shepherd','Пастырь Роя','v1')}
R=random.Random(883)
CACHE={}; M={}; ROOTOBJ=None

def mesh(name, verts, faces, uv=None):
 d=bpy.data.meshes.new(name); d.from_pydata(verts,[],faces);d.update()
 for p in d.polygons:p.use_smooth=True
 layer=d.uv_layers.new()
 for p in d.polygons:
  for li in p.loop_indices:
   v=d.vertices[d.loops[li].vertex_index].co
   layer.data[li].uv=uv[d.loops[li].vertex_index] if uv else (v.x,v.y+v.z)
 return d

def obj(name,data,mat,loc=(0,0,0),scale=(1,1,1),parent=None):
 o=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(o)
 o.location=loc;o.scale=scale;o.parent=parent or ROOTOBJ
 if mat and data and not data.materials:data.materials.append(M[mat])
 return o

def group(name):return obj(name,None,None)

def lathe(name,profile,mat,n=32):
 key=(str(profile),n,mat)
 if key in CACHE:return CACHE[key]
 vs=[];uv=[]
 for j,(z,r) in enumerate(profile):
  for i in range(n+1):
   a=i/n*math.tau;vs.append((r*math.cos(a),r*math.sin(a),z));uv.append((i/n,j/(len(profile)-1)))
 fs=[]
 for j in range(len(profile)-1):
  for i in range(n):
   a=j*(n+1)+i
   if profile[j][1]==0:fs.append((a,a+n+2,a+n+1))
   elif profile[j+1][1]==0:fs.append((a,a+1,a+n+1))
   else:fs.append((a,a+1,a+n+2,a+n+1))
 d=mesh(name,vs,fs,uv);d.materials.append(M[mat]);CACHE[key]=d;return d

def rod(name,a,b,r,mat='steel',r2=None,parent=None):
 a,b=Vector(a),Vector(b);delta=b-a
 p=[(-.5,0),(-.5,.91),(-.47,1),(.47,(r2/r if r2 is not None else 1)),(.5,(r2/r if r2 is not None else 1)*.91),(.5,0)]
 o=obj(name,lathe('Machined cylinder',p,mat,20),mat,(a+b)/2,(r,r,delta.length),parent)
 o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o

def sphere(name,loc,sc,mat='steel',parent=None):
 p=[(-math.cos(math.pi*j/20),max(.00001,math.sin(math.pi*j/20))) for j in range(21)]
 return obj(name,lathe('Ellipsoid',p,mat,36),mat,loc,sc,parent)

def ring(name,loc,r,thick,axis=(0,1,0),mat='steel',parent=None):
 p=[(math.sin(j/10*math.tau)*thick/r,1+math.cos(j/10*math.tau)*thick/r) for j in range(11)]
 o=obj(name,lathe('Ring',p,mat,40),mat,loc,(r,r,r),parent);o.rotation_euler=Vector(axis).to_track_quat('Z','Y').to_euler();return o

def wire(name,pts,r=.03,mat='rubber',parent=None):
 # Catmull-Rom swept mesh, directly exportable.
 pts=[Vector(p) for p in pts];path=[]
 ext=[pts[0],*pts,pts[-1]]
 for j in range(len(pts)-1):
  a,b,c,d=ext[j:j+4]
  for k in range(8):
   t=k/8;path.append((2*b+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)*.5)
 path.append(pts[-1]);vs=[];uv=[];fs=[]
 for j,p in enumerate(path):
  tangent=path[min(j+1,len(path)-1)]-path[max(0,j-1)]
  q=tangent.to_track_quat('Z','Y');rr=r*(1-.28*j/(len(path)-1))
  for k in range(8):
   a=k/8*math.tau;vs.append(p+q@Vector((rr*math.cos(a),rr*math.sin(a),0)));uv.append((k/8,j/10))
 for j in range(len(path)-1):
  for k in range(8):a=j*8+k;b=j*8+(k+1)%8;fs.append((a,b,b+8,a+8))
 return obj(name,mesh(name,vs,fs,uv),mat,parent=parent)

def bolt(loc,axis=(0,1,0),size=.045,parent=None):
 a=Vector(loc);v=Vector(axis).normalized();rod('Recessed fastener seat',a-v*size*.18,a+v*size*.16,size*1.5,'steel',parent=parent)
 rod('Hex fastener',a,a+v*size*.50,size,'bronze',parent=parent)

def joint(name,p,r,axis=(1,0,0),parent=None):
 p=Vector(p);v=Vector(axis).normalized()
 rod(name+' axle',p-v*r*.65,p+v*r*.65,r,'steel',parent=parent)
 for t in (-.50,-.34,-.18,.18,.34,.50):
  ring(name+' machined cooling groove',p+v*r*t,r*1.015,r*.022,axis,'bronze',parent)
 for s in (-1,1):
  c=p+v*s*r*.7
  ring(name+' machined flange',c,r*.84,r*.085,axis,'bronze',parent)
  rod(name+' bearing cap',c,c+v*s*r*.09,r*.59,'steel',parent=parent)
  ring(name+' seal',c+v*s*r*.1,r*.44,r*.04,axis,'rubber',parent)
  q=v.to_track_quat('Z','Y')
  for i in range(6):
   a=i/6*math.tau;bolt(c+q@Vector((math.cos(a)*r*.68,math.sin(a)*r*.68,0)),v*s,r*.065,parent)

def plate(name,a,b,width,bulge=.12,normal=(0,-1,0),mat='ceramic',parent=None):
 # Curved tapered shell with real thickness, irregular rim and inset fasteners.
 a,b=Vector(a),Vector(b);long=(b-a).normalized();norm=Vector(normal);norm=(norm-long*norm.dot(long)).normalized();side=long.cross(norm).normalized()
 nu,nv=12,18;vs=[];uv=[]
 def point(u,t):
  taper=(.23+.77*math.sin(math.pi*(.10+.88*t))**.72)*(1-.78*t**7)
  ripple=1+.018*math.sin(t*47+u*15)+.012*math.sin(t*79-u*18)
  w=width*taper*ripple
  return a+(b-a)*t+side*(u*w/2)+norm*(bulge*(1-u*u)*math.sin(math.pi*t)**.55)
 for j in range(nv+1):
  for i in range(nu+1):u=i/nu*2-1;t=j/nv;vs.append(point(u,t));uv.append((i/nu*.9+.05,j/nv*.9+.05))
 fs=[]
 for j in range(nv):
  for i in range(nu):k=j*(nu+1)+i;fs.append((k,k+1,k+nu+2,k+nu+1))
 o=obj(name,mesh(name,vs,fs,uv),mat,parent=parent)
 so=o.modifiers.new('Ceramic wall thickness','SOLIDIFY');so.thickness=.025*width;so.offset=-1
 be=o.modifiers.new('Worn rounded rim','BEVEL');be.width=.008*width;be.segments=2
 for t in (.16,.68):
  for u in (-.74,.74):bolt(point(u,t)+norm*.012,norm,width*.025,parent)
 # The undercut dark edge visually separates each armour tile.
 wire(name+' underside rim',[point(-1,t)-norm*.018 for t in (0,.2,.4,.6,.8,1)],width*.017,'steel',parent)
 return o

def shell(name,c,rx,ry,rz,theta0=-1.4,theta1=1.4,mat='ceramic',parent=None):
 # Barrel vault panel with tapered ends; +Z crown and X flanks.
 c=Vector(c);nu,nv=18,14;vs=[];uv=[]
 for j in range(nv+1):
  t=j/nv;y=(t-.5)*2*ry;tap=.84+.16*math.sin(math.pi*t)
  for i in range(nu+1):
   angle=theta0+(theta1-theta0)*i/nu
   dent=1+.009*math.sin(i*1.6+j*2.8)
   vs.append(c+Vector((rx*math.sin(angle)*tap,y,rz*math.cos(angle)*tap*dent)));uv.append((i/nu,j/nv))
 fs=[]
 for j in range(nv):
  for i in range(nu):k=j*(nu+1)+i;fs.append((k,k+1,k+nu+2,k+nu+1))
 o=obj(name,mesh(name,vs,fs,uv),mat,parent=parent)
 so=o.modifiers.new('Layered shell thickness','SOLIDIFY');so.thickness=.055*rx
 be=o.modifiers.new('Edge radius','BEVEL');be.width=.012*rx;be.segments=2
 for t in (.14,.86):
  for u in (.10,.90):
   an=theta0+(theta1-theta0)*u;nn=Vector((math.sin(an),0,math.cos(an)))
   p=c+Vector((rx*math.sin(an)*(.84+.16*math.sin(math.pi*t)),(t-.5)*2*ry,rz*math.cos(an)*(.84+.16*math.sin(math.pi*t))))
   bolt(p+nn*.025,nn,.034*rx,parent)
 return o

def limb(name,hip,knee,ankle,toe,r=.18,parent=None):
 hip,knee,ankle,toe=map(Vector,(hip,knee,ankle,toe));parent=parent or group(name)
 for label,p,rad in [('Hip',hip,r*1.45),('Knee',knee,r*1.1),('Ankle',ankle,r*.75)]:joint(name+label,p,rad,parent=parent)
 for label,a,b,rad in [('Femur',hip,knee,r),('Tibia',knee,ankle,r*.68)]:
  delta=b-a;rod(name+label+' load spar',a,b,rad,'steel',parent=parent)
  offs=Vector((r*.72,-r*.9,r*.22))
  rod(name+label+' hydraulic barrel',a+offs,a+delta*.58+offs,rad*.43,'steel',parent=parent)
  rod(name+label+' piston',a+delta*.45+offs,b+offs,rad*.24,'chrome',parent=parent)
  for t in (.08,.45,.54):ring('Cylinder seal collar',a+delta*t+offs,rad*.47,rad*.06,delta,'bronze',parent)
  plate(name+label+' contoured shield',a+delta*.08+Vector((0,-rad*.92,0)),b-delta*.08+Vector((0,-rad*.92,0)),rad*2.45,rad*.38,parent=parent)
  wire('Protected hydraulic hose',[a-offs*.7,a+delta*.45-offs*1.5,b-offs*.55],rad*.17,'rubber',parent)
 rod(name+' foot bridge',ankle,toe,r*.48,'steel',parent=parent)
 for i in (-1,0,1):
  start=toe+Vector((i*r*.63,0,.01));tip=start+Vector((i*r*.37,-r*(1.8 if i==0 else 1.4),-start.z+.055))
  wire(name+' articulated talon',[start,start+(tip-start)*.5+Vector((0,0,r*.4)),tip],r*.28,'steel',parent)
  plate('Toe armour',start+Vector((0,0,r*.13)),tip+Vector((0,0,.08)),r*.65,r*.15,normal=(0,0,1),parent=parent)
 return parent

def optic(name,p,r,axis=(0,-1,0),parent=None,mirror=False):
 p=Vector(p);v=Vector(axis).normalized()
 profile=[(-.16,.79),(-.16,1.09),(-.10,1.12),(.04,1.12),(.085,1.075),(.085,.79),(-.16,.79)]
 o=obj(name+' machined stepped housing',lathe('Optical housing',profile,'steel',64),'steel',p,(r,r,r),parent)
 o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
 ring(name+' brass retaining ring',p+v*r*.12,r*.82,r*.045,axis,'bronze',parent)
 o=sphere(name+' lens',p+v*r*.09,(r*.76,r*.76,r*.20),'chrome' if mirror else 'mint',parent);o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
 if not mirror:
  for rr in (.49,.66):ring(name+' lens concentric reticle',p+v*r*.235,r*rr,r*.017,axis,'bronze',parent)
  for j in range(6):
   angle=j/6*math.tau;qq=v.to_track_quat('Z','Y');d=qq@Vector((math.cos(angle),math.sin(angle),0))
   rod(name+' sensor radial vane',p+v*r*.22+d*r*.66,p+v*r*.23+d*r*.78,r*.023,'steel',parent=parent)
 q=v.to_track_quat('Z','Y')
 if r>.4:
  for j in range(8):
   vs=[];uv=[];fs=[]
   for row,rr in enumerate((.91,1.07)):
    for k in range(9):
     a=(j/8+k/9*.103)*math.tau
     vs.append(p+q@Vector((math.cos(a)*r*rr,math.sin(a)*r*rr,r*.11)));uv.append((k/9,row))
   for k in range(8):fs.append((k,k+1,k+10,k+9))
   ob=obj(name+' replaceable bezel sector',mesh('Bezel sector',vs,fs,uv),'ceramic',parent=parent)
   so=ob.modifiers.new('Bezel plate thickness','SOLIDIFY');so.thickness=r*.03
 for i in range(8):
  a=(i/8+.018)*math.tau;bolt(p+v*r*.15+q@Vector((math.cos(a)*r*.99,math.sin(a)*r*.99,0)),v,r*.038,parent)

def texture(name,kind,seed):
 rng=np.random.default_rng(seed);n=768;yy,xx=np.mgrid[0:n,0:n];x=xx/n;y=yy/n
 noise=np.zeros((n,n),np.float32)
 for scale,amp in [(5,.40),(13,.23),(37,.13),(113,.07)]:
  raw=rng.random((scale,scale)).astype(np.float32);u=x*scale;v=y*scale;ix=u.astype(int);iy=v.astype(int);fx=u-ix;fy=v-iy
  sm=(raw[iy%scale,ix%scale]*(1-fx)+raw[iy%scale,(ix+1)%scale]*fx)*(1-fy)+(raw[(iy+1)%scale,ix%scale]*(1-fx)+raw[(iy+1)%scale,(ix+1)%scale]*fx)*fy
  noise+=sm*amp
 fine=rng.random((n,n)).astype(np.float32)
 # Narrow branching fractures and scratches, plus isolated mineral chips.
 crack=np.zeros((n,n),np.float32)
 for i in range(32 if kind=='ceramic' else 60):
  px,py=rng.uniform(0,n,2);angle=rng.uniform(0,math.tau)
  for k in range(int(rng.integers(12,100))):
   angle+=rng.normal(0,.25);px+=math.cos(angle)*2;py+=math.sin(angle)*2
   for off in (0,1):crack[int(py)%n,(int(px)+off)%n]=1
 chips=(noise<.33)&(fine>.13)
 if kind=='ceramic':
  base=np.array([.54,.52,.45]);rgb=base[None,None,:]*(.48+noise[...,None]*.80);rust=np.array([.095,.058,.027]);mask=np.maximum(crack*.95,chips*.92)
  stain=np.clip((.42-noise)*6,0,.65)
  rgb=rgb*(1-stain[...,None]*.60)
  rgb=rgb*(1-mask[...,None])+rust*mask[...,None];rough=.69+noise*.22+crack*.07
 elif kind=='steel':
  base=np.array([.11,.12,.105]);rgb=base[None,None,:]*(.48+noise[...,None]*1.6);rgb+=crack[...,None]*.042;rough=.62+noise*.23
 elif kind=='bronze':
  base=np.array([.24,.19,.12]);rgb=base[None,None,:]*(.54+noise[...,None]);rough=.45+noise*.22
 elif kind=='root':
  base=np.array([.13,.115,.076]);grain=(np.sin(x*370+noise*18)*.5+.5);rgb=base[None,None,:]*(.48+noise[...,None]*.9+grain[...,None]*.22);rough=.85+noise*.09
 else:
  base=np.array([.037,.047,.042]);rgb=base[None,None,:]*(.65+noise[...,None]);rough=.68+noise*.2
 def img(s,arr,color=True):
  im=bpy.data.images.new(name+s,width=n,height=n);im.colorspace_settings.name='sRGB' if color else 'Non-Color'
  rgba=np.ones((n,n,4),np.float32)
  rgba[:,:,:3]=arr if arr.ndim==3 else arr[...,None]
  im.pixels.foreach_set(rgba.ravel());im.pack();return im
 height=noise*.22+fine*.02-crack*.06
 nx=(np.roll(height,1,1)-np.roll(height,-1,1))*.6;ny=(np.roll(height,1,0)-np.roll(height,-1,0))*.6
 normal=np.stack((nx+.5,ny+.5,np.ones_like(nx)),axis=2)
 return img(' albedo',np.clip(rgb,0,1)),img(' roughness',rough,False),img(' normal',normal,False)

def materials():
 for i,kind in enumerate(('ceramic','steel','bronze','root','rubber')):
  m=bpy.data.materials.new('BIOSO • '+kind);m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF');p.inputs['Metallic'].default_value=.82 if kind in ('steel','bronze') else .04
  for image,input_name in zip(texture(kind,kind,91+i),('Base Color','Roughness','Normal')):
   t=nodes.new('ShaderNodeTexImage');t.image=image
   if input_name=='Normal':
    norm=nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.42;links.new(t.outputs['Color'],norm.inputs['Color']);links.new(norm.outputs['Normal'],p.inputs['Normal'])
   else:links.new(t.outputs['Color'],p.inputs[input_name])
  M[kind]=m
 for kind,color,metal,rough,emit in [('mint',(.08,.28,.23),.25,.22,2.2),('chrome',(.34,.39,.37),.98,.16,0),('leaf',(.085,.10,.035),0,.86,0),('membrane',(.29,.27,.19),.05,.39,0)]:
  m=bpy.data.materials.new('BIOSO • '+kind);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
  if emit:p.inputs['Emission Color'].default_value=(.15,.8,.64,1);p.inputs['Emission Strength'].default_value=emit
  if kind=='membrane':p.inputs['Transmission Weight'].default_value=.22
  M[kind]=m

def mercury():
 body=group('01 Thorax and exposed capacitor spine')
 sphere('Flexible thorax',(0,0,1.32),(.40,1.08,.26),'rubber',body)
 rod('Main spine',(0,-1.27,1.56),(0,1.1,1.65),.17,parent=body)
 for i in range(7):
  y=-.96+i*.30;z=1.56+(y+1)*.055
  rod('Spinal capacitor',(0,y-.1,z),(0,y+.1,z),.175,'mint',parent=body)
  ring('Capacitor collar',(0,y-.13,z),.205,.04,(0,1,0),'bronze',body)
  for s in (-1,1):
   plate('Swept dorsal blade',(s*.18,y-.12,z+.16),(s*.58,y+.35,z-.14),.49,.10,normal=(s*.3,0,1),parent=body)
   rod('Lateral drive rail',(s*.40,y-.15,z-.16),(s*.40,y+.15,z-.16),.10,parent=body)
 for s in (-1,1):
  wire('Thorax cable bundle',[(s*.4,-1.0,1.35),(s*.52,0,1.1),(s*.38,1,1.4)],.052,parent=body)
  for i,y in enumerate((-.72,.05,.82)):
   hip=(s*.48,y,1.39);knee=(s*(1.0 if i<2 else 1.12),y+(.22 if i==2 else -.35),1.05 if i<2 else 1.35)
   ankle=(s*(1.16 if i<2 else 1.35),y+(-.18 if i<2 else .50),.28)
   limb(f'{"L" if s<0 else "R"} leg {i+1}',hip,knee,ankle,(ankle[0],ankle[1]-.1,.13),.145)
 head=group('02 Predator wedge head')
 rod('Cranial central spar',(0,-1.02,1.25),(0,-1.84,1.08),.13,parent=head)
 for i in range(4):
  y=-1.13-i*.17
  for s in (-1,1):
   rod('Cranial transverse actuator',(s*.06,y,1.27),(s*.27,y-.09,1.26),.074,parent=head)
 for s in (-1,1):
  plate('Split tapered cranial armour',(s*.27,-1.00,1.57),(s*.06,-2.05,.94),.60,.11,normal=(s*.35,-.3,1),parent=head)
  optic('Recessed tracking eye',(s*.245,-1.56,1.29),.085,(s*.6,-1,.15),head)
  rod('Lower mandible',(s*.23,-1.50,1.15),(s*.08,-1.94,.85),.065,parent=head,r2=.025)
  blade=group('03 '+('Left' if s<0 else 'Right')+' dash scythe')
  joint('Scythe hinge',(s*.49,-1.00,1.1),.17,parent=blade)
  rod('Blade actuator',(s*.48,-1.08,1.12),(s*.83,-1.59,.88),.10,parent=blade)
  plate('Armoured blade root',(s*.54,-1.15,1.22),(s*.85,-1.67,.74),.31,.07,normal=(s*.2,-.2,1),parent=blade)
  plate('Recurved cutting steel',(s*.84,-1.52,.81),(s*1.02,-2.52,.08),.39,.045,normal=(0,0,1),mat='steel',parent=blade)
  wire('Polished cutting edge',[(s*.65,-1.62,.74),(s*.86,-2.10,.36),(s*1.02,-2.52,.08)],.022,'chrome',blade)


def leviathan():
 body=group('01 Three fortress hull sections')
 for x in (-1.20,-.48,.48,1.20):
  rod('Longitudinal load spar',(x,-4.6,3.25),(x,4.6,3.25),.24,parent=body)
 for y in np.linspace(-4.5,4.5,16):
  wire('Chassis transverse truss',[(-1.58,y,3.54),(-1.28,y,2.62),(1.28,y,2.62),(1.58,y,3.54)],.12,'steel',body)
 for j,y in enumerate((-3.15,0,3.10)):
  # Each of three large hulls is assembled from offset curved armour tiles.
  for band in range(3):
   yy=y+(band-1)*.92
   for k in range(4):
    a0=-1.48+k*.74+.035;a1=a0+.675
    shell('Hull %d ceramic tile %d %d'%(j+1,band,k),(0,yy,3.54),1.94,.44,1.36,a0,a1,parent=body)
  for off in (-1.35,1.35):
   # Half hoop under the crown.
   pts=[(1.77*math.sin(a),y+off,3.47+1.18*math.cos(a)) for a in np.linspace(-1.7,1.7,12)]
   wire('Structural hull rib',pts,.105,'bronze',body)
  for s in (-1,1):
   limb(f'Hull {j+1} '+('left' if s<0 else 'right'),(s*1.5,y,3.25),(s*2.35,y-.65,2.2),(s*2.65,y-.20,.47),(s*2.67,y-.47,.20),.38)
   for k in range(4):
    wire('Underslung service conduit',[(s*1.32,y-.95,2.95-k*.12),(s*1.65,y,2.45-k*.1),(s*1.32,y+.94,2.95-k*.12)],.043,'rubber',body)
  tower=group('Hull %d thermal exchange tower'%(j+1))
  for s in (-1,1):
   plate('Heat exchange tower wall',(s*.32,y,4.65),(s*.24,y,5.55),.68,.1,normal=(s,0,.1),parent=tower)
  for k in range(7):rod('Radiator fin',(-.24,y-.2,4.83+k*.09),(.24,y-.2,4.83+k*.09),.029,parent=tower)
  rod('Coolant sightglass',(0,y-.235,4.93),(0,y-.235,5.48),.042,'mint',parent=tower)
 heart=group('02 Exposed lateral reactor and protective ribs')
 for s in (-1,1):
  optic('Salvage heart',(s*1.96,-.80,3.04),.65,(s,0,.12),heart)
  for d in (-.70,.70):wire('Heart armour rib',[(s*1.56,d,3.91),(s*2.02,d*.95,3.18),(s*1.57,d*.8,2.33)],.13,'ceramic',heart)
 head=group('03 Crushing salvage mandibles')
 for x in (-.84,-.42,0,.42,.84):
  rod('Cranial hydraulic ram',(x,-4.35,3.55),(x,-5.65,3.04),.18,parent=head)
  for t in range(5):ring('Ram jacket groove',(x,-4.65-t*.14,3.44-t*.052),.20,.023,(0,-1,-.36),'bronze',head)
 for s in (-1,1):
  plate('Ram upper armour',(s*.6,-4.22,4.05),(s*.35,-5.81,3.31),1.34,.21,normal=(s*.2,-.2,1),parent=head)
  joint('Crusher pivot',(s*.84,-5.29,3.13),.37,parent=head)
  wire('Crusher curved load frame',[(s*.94,-5.15,3.24),(s*1.36,-5.97,2.90),(s*1.0,-6.48,2.03),(s*.55,-6.29,1.90)],.25,'steel',head)
  plate('Crusher ceramic shell',(s*1.0,-5.47,3.39),(s*1.17,-6.42,2.13),.8,.15,normal=(s*.6,-1,.1),parent=head)
  for k in range(4):rod('Crusher tooth',(s*(1.20-k*.07),-6.03-k*.05,2.9-k*.22),(s*(.82-k*.07),-6.13-k*.05,2.81-k*.22),.115,'steel',r2=.03,parent=head)
  rod('Jaw hydraulic cylinder',(s*.98,-4.6,3.32),(s*1.2,-5.90,2.98),.18,parent=head)
 optic('Command optic',(0,-5.80,3.12),.21,parent=head)
 # Sparse rear salvage gantry gives scale without drowning the hull in detail.
 for s in (-1,1):
  rod('Rear gantry post',(s*1.20,3.75,4.38),(s*1.20,4.26,5.46),.075,parent=body)
  wire('Rear gantry rail',[(s*1.20,2.60,4.98),(s*1.20,3.5,5.45),(s*1.20,4.26,5.46)],.065,'steel',body)
 rod('Rear gantry crossmember',(-1.2,4.26,5.46),(1.2,4.26,5.46),.075,parent=body)


def foliage(path,count=12,parent=None):
 wire('Reclaimed climbing vine',path,.025,'root',parent)
 for i in range(count):
  t=R.random()*(len(path)-1);j=min(int(t),len(path)-2);p=Vector(path[j]).lerp(Vector(path[j+1]),t-j)
  d=Vector((R.uniform(-.18,.18),R.uniform(-.18,.18),R.uniform(.06,.18)))
  # Two triangles form a gently folded leaf.
  side=Vector((-d.y,d.x,.015));vs=[p,p+d*.50+side*.40,p+d,p+d*.50-side*.40]
  obj('Muted olive leaf',mesh('Leaf',vs,[(0,1,2),(0,2,3)],[(0,.5),(.5,1),(1,.5),(.5,0)]),'leaf',parent=parent)

def bud(name,p,r,parent=None):
 p=Vector(p);sphere(name+' internal organ',p,(r*.64,r*.64,r),'steel',parent)
 optic(name+' mint seed',p+Vector((0,-r*.57,-r*.2)),r*.28,parent=parent)
 for i in range(5):
  a=i/5*math.tau;direction=Vector((math.cos(a),math.sin(a),0))
  plate(name+' petal',p+direction*r*.40+Vector((0,0,r*.9)),p+direction*r*.5+Vector((0,0,-r*.93)),r*.87,r*.36,normal=direction,parent=parent)

def cathedral():
 trunk=group('01 Split machine trunk')
 for x in (-.49,0,.49):
  rod('Core segmented pressure vessel',(x,.08,2.18),(x,.08,5.58),.27,parent=trunk)
  for k in range(18):ring('Pressure vessel joint',(x,.08,2.22+k*.18),.29,.035,(0,0,1),'bronze',trunk)
 for i in range(14):
  a=i/14*math.tau;s=math.sin(a);c=math.cos(a)
  path=[(s*3.10,c*3.10,.06),(s*2.1,c*1.9,.20),(s*1.22,c*1.18,1.5),(s*.74,c*.74,3.6),(s*.52,c*.52,5.65)]
  wire('Root trunk load cable',path,.07+(i%3)*.028,'root',trunk)
  for branch in range(3):
   wire('Branching fine root',[(s*2.4,c*2.4,.17),(s*(2.8+branch*.13)+.18,c*(2.8+branch*.13)-.18,.10),(s*(3.3+branch*.13)+.22,c*(3.3+branch*.13)-.20,.03)],.035,'root',trunk)
 for s in (-1,1):
  plate('Split heart shell',(s*.37,-.54,5.73),(s*.28,-.68,3.01),1.13,.43,normal=(s*.3,-1,0),parent=trunk)
 optic('Ancient recessed heart',(0,-.99,4.72),.61,parent=trunk)
 # Three rising articulated branches, each carrying a seed bell.
 for i,(x,y,z) in enumerate(((-2.05,.18,6.74),(2.0,.35,6.98),(.15,.50,8.20))):
  top=Vector((x,y,z));base=Vector((x*.23,.22,3.65));mid=Vector((x*.90,.4,z-.6))
  wire('Seed bell load branch',[base,mid,top],.22,'steel',trunk)
  for k in range(5):
   a=base.lerp(mid,k/5);b=base.lerp(mid,(k+1)/5)
   joint('Branch joint',a,.22,parent=trunk)
   plate('Ascending ceramic rib',a+Vector((0,-.22,0)),b+Vector((0,-.22,.2)),.68,.19,parent=trunk)
  bud('Seed bell %d'%(i+1),top,.70 if i<2 else .82,trunk)
  foliage([base+Vector((-.2,-.22,0)),mid+Vector((.2,-.2,0)),top+Vector((.3,0,.65))],35,trunk)
 # Radial limbs and exactly three separately named feeding nodes.
 for i in range(7):
  a=i/7*math.tau;d=Vector((math.sin(a),math.cos(a),0));start=d*.62+Vector((0,0,2.1));mid=d*2.0+Vector((0,0,.65));tip=d*3.56+Vector((0,0,.10))
  limb('Articulated root %02d'%i,start,mid,d*2.9+Vector((0,0,.24)),tip,.24)
  for k in range(4):
   jitter=Vector((R.uniform(-.2,.2),R.uniform(-.2,.2),0))
   wire('Fine anchoring root',[start+jitter,mid+jitter-Vector((0,0,.15)),tip+jitter+Vector((k*.10,0,-.01))],.055,'root',trunk)
 for i in range(3):
  a=i/3*math.tau+.45;d=Vector((math.sin(a),math.cos(a),0));p=d*3.15+Vector((0,0,.53));node=group('Weakpoint feeding root node %d'%(i+1));bud('Root node',p,.61,node)
  foliage([p+Vector((-.5,.1,-.4)),p+Vector((0,-.4,.4)),p+Vector((.4,.1,.5))],23,node)


def mirror():
 body=group('01 Vertical memory spine and optical housing')
 sphere('Optical chassis',(0,0,3.03),(.87,.50,1.1),'steel',body)
 for i in range(13):
  z=1.52+i*.21;rod('Memory cell',(0,-.17,z-.07),(0,-.17,z+.07),.17,'mint',parent=body)
  ring('Memory cell clamp',(0,-.17,z-.09),.22,.041,(0,0,1),'bronze',body)
 optic('Convex optical collector',(0,-.63,3.22),.89,parent=body,mirror=True)
 for s in (-1,1):
  plate('Upper split crown',(s*.38,.06,4.52),(s*1.02,-.13,3.65),1.20,.20,normal=(s*.20,-1,.45),parent=body)
  plate('Lower optical shroud',(s*.63,-.08,2.65),(s*.26,-.19,1.60),.75,.2,normal=(s*.35,-1,0),parent=body)
  # Empty universal sockets on articulated arms.
  arm=group(('Left' if s<0 else 'Right')+' universal weapon socket')
  a=(s*.91,0,3.25);b=(s*1.27,-.08,2.48);c=Vector((s*1.55,-.38,2.11))
  joint('Socket shoulder',a,.27,parent=arm);joint('Socket elbow',b,.21,parent=arm)
  rod('Socket upper arm',a,b,.115,parent=arm);rod('Socket forearm',b,c,.10,parent=arm)
  plate('Shoulder shield',Vector(a)+Vector((0,-.17,.08)),Vector(b)+Vector((0,-.15,.06)),.52,.15,parent=arm)
  ring('Empty universal hardpoint',c,.31,.09,(0,1,0),'steel',arm)
  for k in range(3):
   an=k/3*math.tau;d=Vector((math.sin(an),0,math.cos(an)))
   plate('Socket retaining claw',c+d*.24,c+d*.49+Vector((0,-.12,0)),.24,.045,normal=(0,-1,0),parent=arm)
  wire('Socket signal umbilical',[a,Vector(b)+Vector((s*.12,.14,-.08)),c+Vector((0,.15,0))],.048,parent=arm)
 # Four stable squat radial support legs, not humanoid pelvis.
 for s in (-1,1):
  for y in (-.49,.50):
   limb(('L' if s<0 else 'R')+(' front' if y<0 else ' rear')+' support',(s*.55,y,1.50),(s*1.21,y*1.8,1.09),(s*1.56,y*2.25,.30),(s*1.60,y*2.30-.1,.13),.20)
 sphere('Low quadruped chassis',(0,0,1.31),(.79,.73,.32),'steel')


def shepherd():
 body=group('01 Three canopy hive lobes')
 for y in (-.40,0,.42):
  rod('Hive transverse frame',(-2.05,y,3.52),(2.05,y,3.52),.13,parent=body)
  for i in range(14):
   x=-1.95+i*.30
   ring('Hive carrier ring',(x,y,3.52),.19,.042,(1,0,0),'bronze',body)
 for j,x in enumerate((-1.40,0,1.40)):
  z=3.72+(.23 if j==1 else 0)
  for k in range(3):
   shell('Hive canopy %d shell %d'%(j,k),(x,(k-1)*.48,z),.96,.235,.60,-1.27,1.27,parent=body)
  optic('Hive sensory organ',(x,-.62,z-.01),.235,parent=body)
  for y in (-.25,.35):
   sphere('Amber brood membrane',(x,y,z-.61),(.62,.42,.59),'membrane',body)
   for k in range(5):
    angle=-1.28+k*.64
    wire('Brood membrane structural vein',[(x+math.sin(angle)*.6,y-.3,z-.30),(x+math.sin(angle)*.64,y-.32,z-.72),(x+math.sin(angle)*.4,y-.17,z-1.1)],.018,'bronze',body)
 heart=group('02 Suspended queen core')
 bud('Queen core',(0,-.08,2.59),.69,heart)
 optic('Exposed queen heart',(0,-.62,2.65),.24,parent=heart)
 for s in (-1,1):
  for y in (-.37,.5):
   limb(('L' if s<0 else 'R')+(' front' if y<0 else ' rear')+' stilt',(s*1.65,y,3.56),(s*1.95,y*2.0,1.46),(s*2.19,y*2.25,.40),(s*2.24,y*2.5-.12,.19),.135)
   wire('Stilt flexor bundle',[(s*1.8,y+.07,3.54),(s*1.95,y*2+.1,2.30),(s*2.12,y*2.3+.05,1.5)],.047,'rubber')
 # Independent reusable drones, identifiable scene hierarchy.
 for i in range(6):
  s=-1 if i<3 else 1;p=Vector((s*(2.65+(i%3)*.17),-.10+(i%3)*.57,2.85+(i%3)*.39))
  drone=group('Drone %02d standalone module'%(i+1));sphere('Drone motor core',p,(.15,.14,.20),'steel',drone);optic('Drone optic',p+Vector((0,-.12,0)),.066,parent=drone)
  for side in (-1,1):plate('Drone wing shell',p+Vector((side*.10,0,.12)),p+Vector((side*.35,.08,.02)),.29,.09,normal=(0,0,1),parent=drone)

BUILDERS={'mercury':mercury,'leviathan':leviathan,'cathedral':cathedral,'mirror':mirror,'shepherd':shepherd}

def bounds(objects):
 bpy.context.view_layer.update();ps=[o.matrix_world@Vector(p) for o in objects if o.type=='MESH' for p in o.bound_box]
 lo=Vector([min(p[i] for p in ps) for i in range(3)]);hi=Vector([max(p[i] for p in ps) for i in range(3)]);return lo,hi

def stage(scene,objects):
 lo,hi=bounds(objects);center=(lo+hi)*.5;span=max(hi-lo)
 # Reference image is packed and used as an environment only for reflection,
 # desaturated and dim; camera background is the physically lit floor.
 world=bpy.data.worlds.new('Cool overcast ambient');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.29,.32,1);world.node_tree.nodes['Background'].inputs[1].default_value=.32;scene.world=world
 bpy.ops.mesh.primitive_plane_add(size=span*200,location=(0,0,lo.z-.025));floor=bpy.context.object;floor.name='REVIEW ONLY ground';floor.data.materials.append(M['root'])
 for label,loc,color,power,size in [('warm key',(-span,-span*.8,span*1.4),(1,.84,.65),span*span*65,span*.32),('cool fill',(span*.8,-span*.4,span*.65),(.55,.72,1),span*span*35,span*.85),('edge light',(0,span*.8,span*1.05),(1,.91,.76),span*span*95,span*.45)]:
  data=bpy.data.lights.new(label,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color;o=bpy.data.objects.new(label,data);scene.collection.objects.link(o);o.location=Vector(loc)+Vector((0,0,lo.z));o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 data=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',data);scene.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.lens=55
 return cam,center,span

def aim(cam,c,span,angle=32,elevation=22,aspect=1):
 a=math.radians(angle);e=math.radians(elevation);cam.location=c+Vector((math.sin(a)*math.cos(e),-math.cos(a)*math.cos(e),math.sin(e)))*span*2.7
 cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=span*(1.24 if aspect>=1 else 1.24/aspect)

def run(key):
 global ROOTOBJ,CACHE,M
 CACHE={};M={};bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=6
 scene.render.resolution_x=1100;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.view_settings.look='AgX - Medium High Contrast'
 ROOTOBJ=None;ROOTOBJ=group(SPECS[key][0]);ROOTOBJ['asset_status']='review sculpture; no runtime integration; no animation rig';ROOTOBJ['forward']='Blender -Y; glTF +Z';ROOTOBJ['units']='metres'
 materials();BUILDERS[key]();objects=list(ROOTOBJ.children_recursive)
 lo,hi=bounds(objects)
 ROOTOBJ.location.z=-lo.z;bpy.context.view_layer.update();lo,hi=bounds(objects)
 folder=OUT/SPECS[key][0];folder.mkdir(parents=True,exist_ok=True)
 for p in (ROOT/'docs/references/biomecha-style-master.png',REF/(SPECS[key][0]+'-concept-'+SPECS[key][2]+'.png')):
  im=bpy.data.images.load(str(p));im.pack()
 scene['source_reference']=str(REF/(SPECS[key][0]+'-concept-'+SPECS[key][2]+'.png'));scene['style_reference']='docs/references/biomecha-style-master.png'
 bpy.ops.object.select_all(action='DESELECT');ROOTOBJ.select_set(True)
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=ROOTOBJ
 print('EXPORT',key,len(objects),flush=True)
 bpy.ops.export_scene.gltf(filepath=str(folder/(SPECS[key][0]+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
 cam,c,span=stage(scene,objects);aim(cam,c,span,32,22)
 bpy.ops.wm.save_as_mainfile(filepath=str(folder/(SPECS[key][0]+'.blend')))
 scene.render.filepath=str(folder/'hero.png');bpy.ops.render.render(write_still=True)
 scene.render.resolution_x=700;scene.render.resolution_y=700;scene.cycles.samples=16
 for angle in (0,90,180):
  aim(cam,c,span,angle,18);scene.render.filepath=str(folder/('view-%03d.png'%angle));bpy.ops.render.render(write_still=True)
 scene.render.resolution_x=540;scene.render.resolution_y=960;aim(cam,c,span,0,52,540/960);scene.render.filepath=str(folder/'game-angle.png');bpy.ops.render.render(write_still=True)
 report={'id':SPECS[key][0],'title':SPECS[key][1],'objects':len(objects),'bounds_m':[round(v,3) for v in hi-lo],'status':'review-not-published','rigged':False,'pbr':'packed UV albedo roughness normal; glTF material compatible','reference':scene['source_reference']}
 (folder/'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('COMPLETE',json.dumps(report,ensure_ascii=False),flush=True)

if __name__=='__main__':
 args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['mercury']
 for k in (list(SPECS) if 'all' in args else args):run(k)
