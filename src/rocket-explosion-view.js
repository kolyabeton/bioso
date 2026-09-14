import * as T from 'three';

const BLAST_CAPACITY=12,FIRE_VOLUMES_PER_BLAST=4,SPARKS_PER_BLAST=8,DEBRIS_PER_BLAST=3,SMOKE_PER_BLAST=2,DUST_PER_BLAST=2,DEFAULT_RADIUS=1.5;
const clamp01=value=>Math.max(0,Math.min(1,value));
const easeOut=value=>1-(1-clamp01(value))**3;
const fract=value=>value-Math.floor(value);
const noise=seed=>fract(Math.sin(seed*12.9898+78.233)*43758.5453);

function pool(parent,geometry,material,capacity,name,renderOrder){const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=renderOrder;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);return mesh;}

/** Pooled, merged 3D fire volumes: flash, pressure, fragments, dust and restrained smoke. */
export function createRocketExplosionView(parent){
 const root=new T.Group();root.name='rocket-explosion-effects';parent.add(root);
 const fireGeometry=new T.SphereGeometry(1,24,16),pressureGeometry=new T.SphereGeometry(1,18,12);
 const firePositions=fireGeometry.getAttribute('position'),fireColors=[];
 const deepFire=new T.Color(0xb42f06),brightFire=new T.Color(0xffd36a),vertexColor=new T.Color();
 for(let i=0;i<firePositions.count;i++){
  const x=firePositions.getX(i),y=firePositions.getY(i),z=firePositions.getZ(i),warp=1+.09*Math.sin(x*5.1+y*3.7)+.065*Math.sin(z*7.3-y*4.4)+.04*Math.sin((x-z)*10.2);
  firePositions.setXYZ(i,x*warp,y*(warp+.035*Math.sin(x*8.1)),z*warp);
  const heat=clamp01(.48-y*.13+.22*Math.sin(x*4.8+z*5.6));vertexColor.copy(deepFire).lerp(brightFire,heat);fireColors.push(vertexColor.r,vertexColor.g,vertexColor.b);
 }
 fireGeometry.setAttribute('color',new T.Float32BufferAttribute(fireColors,3));fireGeometry.computeVertexNormals();
 const sparkGeometry=new T.ConeGeometry(.026,.9,5,1);sparkGeometry.translate(0,.45,0);const debrisGeometry=new T.TetrahedronGeometry(.1,0),smokeGeometry=new T.SphereGeometry(1,12,8),dustGeometry=new T.SphereGeometry(1,10,6);
 const flashMaterial=new T.MeshBasicMaterial({color:0xffc060,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false});
 const fireMaterial=new T.MeshBasicMaterial({name:'rocket-volumetric-fire-material',color:0xffffff,vertexColors:true,transparent:true,opacity:.82,blending:T.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false});
 const pressureMaterial=new T.MeshBasicMaterial({color:0xffe3bd,transparent:true,opacity:.12,blending:T.AdditiveBlending,depthWrite:false,side:T.BackSide,toneMapped:false});
 const sparkMaterial=new T.MeshBasicMaterial({color:0xffdda0,transparent:true,opacity:.94,blending:T.AdditiveBlending,depthWrite:false,depthTest:false,toneMapped:false});
 const debrisMaterial=new T.MeshBasicMaterial({color:0x574235,transparent:true,opacity:.86,depthWrite:false,toneMapped:false});
 const smokeMaterial=new T.MeshStandardMaterial({color:0x5a5a55,transparent:true,opacity:.16,depthWrite:false,roughness:1,metalness:0});
 const dustMaterial=new T.MeshStandardMaterial({color:0x827765,transparent:true,opacity:.34,depthWrite:false,roughness:1,metalness:0});
 const flash=pool(root,fireGeometry,flashMaterial,BLAST_CAPACITY,'rocket-explosion-flash',18),fire=pool(root,fireGeometry,fireMaterial,BLAST_CAPACITY*FIRE_VOLUMES_PER_BLAST,'rocket-explosion-fire-volumes',16),pressure=pool(root,pressureGeometry,pressureMaterial,BLAST_CAPACITY,'rocket-explosion-pressure',12);
 const sparks=pool(root,sparkGeometry,sparkMaterial,BLAST_CAPACITY*SPARKS_PER_BLAST,'rocket-explosion-sparks',17),debris=pool(root,debrisGeometry,debrisMaterial,BLAST_CAPACITY*DEBRIS_PER_BLAST,'rocket-explosion-debris',10),smoke=pool(root,smokeGeometry,smokeMaterial,BLAST_CAPACITY*SMOKE_PER_BLAST,'rocket-explosion-smoke',9),dust=pool(root,dustGeometry,dustMaterial,BLAST_CAPACITY*DUST_PER_BLAST,'rocket-explosion-ground-dust',8);
 const blastLight=new T.PointLight(0xff5418,0,9,2);blastLight.name='rocket-explosion-light';root.add(blastLight);
 const meshes=[flash,fire,pressure,sparks,debris,smoke,dust],blasts=Array.from({length:BLAST_CAPACITY},()=>({life:0,age:0}));
 const sparkParticles=Array.from({length:BLAST_CAPACITY*SPARKS_PER_BLAST},()=>({life:0})),debrisParticles=Array.from({length:BLAST_CAPACITY*DEBRIS_PER_BLAST},()=>({life:0})),smokeParticles=Array.from({length:BLAST_CAPACITY*SMOKE_PER_BLAST},()=>({life:0})),dustParticles=Array.from({length:BLAST_CAPACITY*DUST_PER_BLAST},()=>({life:0}));
 const dummy=new T.Object3D(),direction=new T.Vector3(),up=new T.Vector3(0,1,0),color=new T.Color();let blastCursor=0,sparkCursor=0,debrisCursor=0,smokeCursor=0,dustCursor=0,serial=0,lastReducedMotion=false;

 function launch(target,cursor,count,e,seed,kind){
  for(let i=0;i<count;i++){
   const p=target[(cursor+i)%target.length],a=Math.PI*2*(i/count+noise(seed+i*7.1)*.13),radial=noise(seed+i*11.7),lift=noise(seed+i*19.3);
   const speed=kind==='spark'?4.8+radial*4.2:kind==='debris'?1.8+radial*1.8:kind==='dust'?1.1+radial*1.35:.18+radial*.45,delay=kind==='smoke'?.1+noise(seed+i*23.9)*.2:kind==='dust'?noise(seed+i*17.4)*.08:0;
   const duration=kind==='spark'?.36+lift*.22:kind==='debris'?.66+lift*.38:kind==='dust'?.72+lift*.34:.92+lift*.38;
   Object.assign(p,{kind,x:e.x+Math.cos(a)*.08,y:(e.y??0)+(kind==='dust'?.055:kind==='smoke'?.23:.28),z:e.z+Math.sin(a)*.08,vx:Math.cos(a)*speed,vy:kind==='spark'?.8+lift*1.2:kind==='debris'?1.35+lift*2.1:kind==='dust'?.08+lift*.18:.34+lift*.4,vz:Math.sin(a)*speed,age:-delay,life:duration,duration,size:kind==='spark'?.95+radial*.5:kind==='debris'?.7+radial*.8:kind==='dust'?.2+radial*.16:.14+radial*.09,spin:noise(seed+i*31.1)*Math.PI*2,index:i});
  }
 }
 function event(e){
  if(e?.type!=='blast'||e.key!=='rocket'||!Number.isFinite(e.x)||!Number.isFinite(e.z))return false;
  const merged=blasts.find(b=>b.life>0&&b.age<.08&&Math.hypot(b.x-e.x,b.z-e.z)<.9);if(merged){merged.power=Math.min(1.45,merged.power+.22);return true;}
  const seed=++serial*97.13,blast=blasts[blastCursor++%blasts.length];Object.assign(blast,{x:e.x,y:e.y??0,z:e.z,radius:Number.isFinite(e.radius)?Math.max(.25,e.radius):DEFAULT_RADIUS,age:0,life:1.18,power:1,seed});
  launch(sparkParticles,sparkCursor,SPARKS_PER_BLAST,e,seed,'spark');sparkCursor=(sparkCursor+SPARKS_PER_BLAST)%sparkParticles.length;launch(debrisParticles,debrisCursor,DEBRIS_PER_BLAST,e,seed+41,'debris');debrisCursor=(debrisCursor+DEBRIS_PER_BLAST)%debrisParticles.length;launch(smokeParticles,smokeCursor,SMOKE_PER_BLAST,e,seed+83,'smoke');smokeCursor=(smokeCursor+SMOKE_PER_BLAST)%smokeParticles.length;launch(dustParticles,dustCursor,DUST_PER_BLAST,e,seed+127,'dust');dustCursor=(dustCursor+DUST_PER_BLAST)%dustParticles.length;return true;
 }
 function place(mesh,index,x,y,z,sx,sy,sz,rotationY=0){dummy.position.set(x,y,z);dummy.quaternion.identity();dummy.rotation.set(0,rotationY,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
 function updateBlastMeshes(){
  let flashCount=0,fireCount=0,pressureCount=0,lightBlast=null;
  for(const b of blasts){
   if(b.life<=0)continue;
   if(b.age<=.14){const t=clamp01(b.age/.14),size=b.radius*(.13+easeOut(t)*.25)*(1-t*.2)*b.power;place(flash,flashCount++,b.x,b.y+.5,b.z,size,size*.56,size,b.seed*.13);}
   for(let i=0;i<FIRE_VOLUMES_PER_BLAST;i++){
    const fireT=(b.age-.018-i*.016)/.38;if(fireT<0||fireT>=1)continue;
    const central=i===0,envelope=Math.sin(Math.PI*fireT)**.3,a=Math.PI*2*((i-1)/Math.max(1,FIRE_VOLUMES_PER_BLAST-1)+noise(b.seed+i*13)*.12),spread=central?0:b.radius*(.18+easeOut(fireT)*(.17+noise(b.seed+i*19)*.1)),base=b.radius*((central?.62:.48)+noise(b.seed+i*7)*(central?.1:.12))*envelope*b.power;
    const x=b.x+Math.cos(a)*spread,y=b.y+.48+(central?.12:noise(b.seed+i*29)*.35)+fireT*.22,z=b.z+Math.sin(a)*spread;
    place(fire,fireCount++,x,y,z,base*(central?1.18:1.05),base*(central?.72:.62),base*(central?1.18:1.05),a*.35);
   }
   if(b.age<.2&&(!lightBlast||b.age<lightBlast.age))lightBlast=b;
   if(b.age>.02&&b.age<.3){const t=clamp01((b.age-.02)/.28),radius=b.radius*1.08*easeOut(t);place(pressure,pressureCount++,b.x,b.y+.3,b.z,radius,radius*.5,radius);}
  }
  flash.count=flashCount;fire.count=fireCount;pressure.count=pressureCount;
  if(lightBlast){const fade=1-clamp01(lightBlast.age/.2);blastLight.position.set(lightBlast.x,lightBlast.y+1.15,lightBlast.z);blastLight.intensity=10*fade*lightBlast.power;}else blastLight.intensity=0;
 }
 function updateParticles(particles,mesh,limit,dt,reducedMotion){
  let visible=0;
  for(const p of particles){
   if(p.life<=0)continue;p.age+=dt;if(p.age<0)continue;if(p.age>=p.life){p.life=0;continue;}const motion=reducedMotion?.28:1,step=dt*motion,progress=clamp01(p.age/p.duration),fade=1-progress;p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;
   if(p.kind==='spark'||p.kind==='debris'){p.vy-=5.5*step;p.vx*=1-step*.55;p.vz*=1-step*.55;}else if(p.kind==='dust'){p.vy-=.18*step;p.vx*=1-step*1.5;p.vz*=1-step*1.5;}else{p.vx*=1-step*.42;p.vz*=1-step*.42;}
   if(reducedMotion&&p.index>=limit)continue;
   if(p.kind==='spark'){direction.set(p.vx,p.vy,p.vz);if(direction.lengthSq()<1e-6)direction.copy(up);else direction.normalize();dummy.position.set(p.x,p.y,p.z);dummy.quaternion.setFromUnitVectors(up,direction);dummy.scale.set(p.size,p.size*(.62+fade),p.size);dummy.updateMatrix();mesh.setMatrixAt(visible,dummy.matrix);}
   else if(p.kind==='debris'){const size=.1*p.size*Math.max(.3,fade);place(mesh,visible,p.x,p.y,p.z,size,size*.55,size*1.35,p.spin+p.age*8);mesh.setColorAt(visible,color.setHex(p.index%3===0?0x8a4b28:p.index%3===1?0x4a3b31:0x292724));}
   else if(p.kind==='dust'){const size=p.size*(.9+progress*2.8)*Math.min(1,p.age/.1)*Math.min(1,p.life-p.age<.18?(p.life-p.age)/.18:1);place(mesh,visible,p.x,p.y,p.z,size,size*.2,size*1.3,p.spin);mesh.setColorAt(visible,color.setHSL(.1,.08,.38+progress*.08));}
   else{const size=p.size*(.9+progress*2.1)*Math.min(1,p.age/.16);place(mesh,visible,p.x,p.y,p.z,size,size*(.72+noise(p.spin)*.3),size*(1.05+noise(p.spin+2)*.3),p.spin+p.age*.28);mesh.setColorAt(visible,color.setHSL(.09,.035,.27+progress*.08));}
   visible++;if(visible>=mesh.instanceMatrix.count)break;
  }
  mesh.count=visible;
 }
 function update(dt=0,reducedMotion=false){dt=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;lastReducedMotion=Boolean(reducedMotion);for(const b of blasts)if(b.life>0){b.age+=dt;if(b.age>=b.life)b.life=0;}updateBlastMeshes();updateParticles(sparkParticles,sparks,2,dt,lastReducedMotion);updateParticles(debrisParticles,debris,1,dt,lastReducedMotion);updateParticles(smokeParticles,smoke,1,dt,lastReducedMotion);updateParticles(dustParticles,dust,1,dt,lastReducedMotion);for(const mesh of meshes){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}
 function reset(){blastCursor=sparkCursor=debrisCursor=smokeCursor=dustCursor=serial=0;lastReducedMotion=false;blastLight.intensity=0;for(const item of [...blasts,...sparkParticles,...debrisParticles,...smokeParticles,...dustParticles])item.life=0;for(const mesh of meshes)mesh.count=0;}
 function count(){return blasts.filter(b=>b.life>0).length;}
 function info(){return{active:count(),flash:flash.count,fireballs:fire.count,pressure:pressure.count,rings:0,sparks:sparks.count,debris:debris.count,smoke:smoke.count,dust:dust.count,reducedMotion:lastReducedMotion,radius:DEFAULT_RADIUS};}
 function dispose(){reset();parent.remove(root);for(const geometry of [fireGeometry,pressureGeometry,sparkGeometry,debrisGeometry,smokeGeometry,dustGeometry])geometry.dispose();for(const material of [flashMaterial,fireMaterial,pressureMaterial,sparkMaterial,debrisMaterial,smokeMaterial,dustMaterial])material.dispose();}
 return{event,update,reset,count,info,dispose};
}
