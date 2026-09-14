import * as T from 'three';
import {rocketFlightOffset} from './rocket-bee-view.js';

const SMOKE_LIFE=.72,EMBER_LIFE=.34;

/** Compact hot exhaust, heat envelope and a soft pooled smoke wake. */
export function createRocketExhaustView(parent,{shotCapacity=96,smokeCapacity=384,sparkCapacity=256}={}){
 const flameGeometry=new T.ConeGeometry(1,1,12,1);flameGeometry.rotateX(-Math.PI/2);
 const heatGeometry=new T.SphereGeometry(1,10,6),discGeometry=new T.TorusGeometry(1,.2,6,18),smokeGeometry=new T.IcosahedronGeometry(1,1),emberGeometry=new T.TetrahedronGeometry(1,0);
 const outerMaterial=new T.MeshBasicMaterial({color:0xe84c1b,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const middleMaterial=new T.MeshBasicMaterial({color:0xff982f,transparent:true,opacity:.58,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const coreMaterial=new T.MeshBasicMaterial({color:0xfff1c5,transparent:true,opacity:.88,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const heatMaterial=new T.MeshBasicMaterial({color:0xffa24b,transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const discMaterial=new T.MeshBasicMaterial({color:0xffd6a0,transparent:true,opacity:.48,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const smokeMaterial=new T.MeshStandardMaterial({color:0x4f514c,transparent:true,opacity:.1,depthWrite:false,roughness:1,metalness:0});
 const emberMaterial=new T.MeshBasicMaterial({color:0xffa34f,transparent:true,opacity:.82,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const outer=new T.InstancedMesh(flameGeometry,outerMaterial,shotCapacity),middle=new T.InstancedMesh(flameGeometry,middleMaterial,shotCapacity),core=new T.InstancedMesh(flameGeometry,coreMaterial,shotCapacity),heat=new T.InstancedMesh(heatGeometry,heatMaterial,shotCapacity),discs=new T.InstancedMesh(discGeometry,discMaterial,shotCapacity);
 const smokeMesh=new T.InstancedMesh(smokeGeometry,smokeMaterial,smokeCapacity),emberMesh=new T.InstancedMesh(emberGeometry,emberMaterial,sparkCapacity);
 for(const mesh of [outer,middle,core,heat,discs,smokeMesh,emberMesh]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(mesh);}
 outer.name='rocket-exhaust-flame';middle.name='rocket-exhaust-middle';core.name='rocket-exhaust-core';heat.name='rocket-exhaust-heat';discs.name='rocket-exhaust-nozzle-disc';smokeMesh.name='rocket-exhaust-smoke';emberMesh.name='rocket-exhaust-sparks';

 const particles=Array.from({length:smokeCapacity},()=>({life:0})),embers=Array.from({length:sparkCapacity},()=>({life:0}));
 const lastEmit=new Map(),dummy=new T.Object3D(),color=new T.Color();let smokeCursor=0,emberCursor=0,lastTime=null,serial=0;
 function direction(shot){const length=Math.hypot(shot.dx,shot.dy??0,shot.dz)||1;return{x:shot.dx/length,y:(shot.dy??0)/length,z:shot.dz/length};}
 function orient(d){dummy.rotation.set(-Math.atan2(d.y,Math.hypot(d.x,d.z)),Math.atan2(d.x,d.z),0,'YXZ');}
 function placeTail(mesh,shot,index,height,length,width,offset,reducedMotion,phase=0){
  const d=direction(shot),flicker=reducedMotion?1:1+Math.sin((lastTime??0)*38+shot.id*1.7+phase)*.07,nozzle=.43+offset;
  dummy.position.set(shot.x-d.x*(nozzle+length*.5),height(shot)-d.y*(nozzle+length*.5),shot.z-d.z*(nozzle+length*.5));orient(d);dummy.scale.set(width,width,length*flicker);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
 }
 function placeHeat(shot,index,height,reducedMotion){
  const d=direction(shot),pulse=reducedMotion?1:1+Math.sin((lastTime??0)*21+shot.id)*.035;
  dummy.position.set(shot.x-d.x*.72,height(shot)-d.y*.72,shot.z-d.z*.72);orient(d);dummy.scale.set(.16*pulse,.13*pulse,.52);dummy.updateMatrix();heat.setMatrixAt(index,dummy.matrix);
 }
 function placeDisc(shot,index,height,reducedMotion){
  const d=direction(shot),pulse=reducedMotion?1:1+Math.sin((lastTime??0)*31+shot.id)*.05;
  dummy.position.set(shot.x-d.x*.43,height(shot)-d.y*.43,shot.z-d.z*.43);orient(d);dummy.scale.setScalar(.105*pulse);dummy.updateMatrix();discs.setMatrixAt(index,dummy.matrix);
 }
 function emit(shot,height){
  const d=direction(shot),sideX=d.z,sideZ=-d.x,seed=Math.sin((shot.id+1)*91.17+(serial++)*17.31),jitter=seed*.075;
  const p=particles[smokeCursor++%smokeCapacity];Object.assign(p,{x:shot.x-d.x*.86+sideX*jitter,y:height(shot)-d.y*.86+Math.abs(seed)*.025,z:shot.z-d.z*.86+sideZ*jitter,vx:-d.x*.16+sideX*seed*.05,vy:.1+Math.abs(seed)*.06,vz:-d.z*.16+sideZ*seed*.05,life:SMOKE_LIFE,duration:SMOKE_LIFE,size:.065+Math.abs(seed)*.022,seed});
  const emberSeed=Math.sin((shot.id+3)*43.71+(serial++)*23.13),e=embers[emberCursor++%sparkCapacity];Object.assign(e,{x:shot.x-d.x*.61,y:height(shot)-d.y*.61,z:shot.z-d.z*.61,vx:-d.x*(.5+Math.abs(emberSeed)*.35)+sideX*emberSeed*.13,vy:.06+Math.abs(emberSeed)*.15,vz:-d.z*(.5+Math.abs(emberSeed)*.35)+sideZ*emberSeed*.13,life:EMBER_LIFE,duration:EMBER_LIFE,size:.02+Math.abs(emberSeed)*.014,seed:emberSeed});
 }
 return{
  update(shots,height,time=0,reducedMotion=false){
   const dt=lastTime==null||time<lastTime?0:Math.min(.05,time-lastTime);lastTime=time;
   for(const p of particles)if(p.life>0){const age=1-p.life/p.duration;p.life-=dt;p.x+=(p.vx+Math.sin(age*6+p.seed*4)*.035)*dt;p.y+=p.vy*dt;p.z+=(p.vz+Math.cos(age*7+p.seed*5)*.035)*dt;}
   for(const e of embers)if(e.life>0){e.life-=dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.z+=e.vz*dt;}
   const count=Math.min(shotCapacity,shots.length),live=new Set();
   for(let i=0;i<count;i++){
    const shot=shots[i],offset=rocketFlightOffset(shot,time,reducedMotion),visual={...shot,x:shot.x+offset.x,y:height(shot)+offset.y,z:shot.z+offset.z},visualHeight=q=>q.y;live.add(shot.id);placeTail(outer,visual,i,visualHeight,.78,.17,0,reducedMotion,.3);placeTail(middle,visual,i,visualHeight,.56,.1,.008,reducedMotion,1.4);placeTail(core,visual,i,visualHeight,.34,.043,.014,reducedMotion,2.6);placeHeat(visual,i,visualHeight,reducedMotion);placeDisc(visual,i,visualHeight,reducedMotion);
    if(!reducedMotion&&dt>0&&(shot.travel??0)>.12&&time-(lastEmit.get(shot.id)??-Infinity)>=.14){emit(visual,visualHeight);lastEmit.set(shot.id,time);}
   }
   for(const id of lastEmit.keys())if(!live.has(id))lastEmit.delete(id);
   outer.count=middle.count=core.count=heat.count=discs.count=count;for(const mesh of [outer,middle,core,heat,discs])mesh.instanceMatrix.needsUpdate=true;
   let visible=0;
   for(const p of particles)if(p.life>0&&visible<smokeCapacity){const age=1-p.life/p.duration,fade=Math.min(1,p.life/.18),size=p.size*(.9+age*1.8)*fade;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.seed*2+age,age*2.1+p.seed,age*.6);dummy.scale.set(size,size*.72,size*1.12);dummy.updateMatrix();smokeMesh.setMatrixAt(visible,dummy.matrix);smokeMesh.setColorAt(visible,color.setHSL(.105,.035,.21+age*.08));visible++;}
   smokeMesh.count=visible;smokeMesh.instanceMatrix.needsUpdate=true;if(smokeMesh.instanceColor)smokeMesh.instanceColor.needsUpdate=true;
   visible=0;
   for(const e of embers)if(e.life>0&&visible<sparkCapacity){const fade=Math.min(1,e.life/.1),size=e.size*fade;dummy.position.set(e.x,e.y,e.z);dummy.rotation.set(e.seed*4,e.seed*7,0);dummy.scale.set(size,size,size*2.7);dummy.updateMatrix();emberMesh.setMatrixAt(visible++,dummy.matrix);}
   emberMesh.count=visible;emberMesh.instanceMatrix.needsUpdate=true;
  },
  reset(){lastTime=null;smokeCursor=emberCursor=serial=0;lastEmit.clear();for(const p of particles)p.life=0;for(const e of embers)e.life=0;for(const mesh of [outer,middle,core,heat,discs,smokeMesh,emberMesh])mesh.count=0;},
  count(){return{flames:outer.count,smoke:smokeMesh.count};},
  dispose(){for(const mesh of [outer,middle,core,heat,discs,smokeMesh,emberMesh])parent.remove(mesh);for(const geometry of [flameGeometry,heatGeometry,discGeometry,smokeGeometry,emberGeometry])geometry.dispose();for(const material of [outerMaterial,middleMaterial,coreMaterial,heatMaterial,discMaterial,smokeMaterial,emberMaterial])material.dispose();}
 };
}
