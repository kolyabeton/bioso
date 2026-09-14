import * as T from 'three';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},TAU=Math.PI*2;
export const BOSS_MOTION={
 'boss-mercury-hunter':{stride:.78,lift:.16,bob:.025},
 'boss-scrap-leviathan':{stride:.32,lift:.075,bob:.014},
 'boss-root-cathedral':{stride:.3,lift:.10,bob:0},
 'boss-mirror-collector':{stride:.52,lift:.14,bob:.025},
 'boss-swarm-shepherd':{stride:.48,lift:.13,bob:.02},
};
export function bossAnimationState(e,time){
 const w=e.enemyAttack?.warning,a=e.attackPose,c=e.bossCombat??{};
 if(c.dash)return{kind:'dash',action:'dash',prepare:0,release:1};
 if(w)return{kind:'prepare',action:w.bossAction??w.mode,prepare:smooth((time-w.started)/(w.at-w.started||1)),release:0};
 const duration=a?.bossAction==='swarm'?1.1:a?.bossAction==='roots'?.9:.7;
 if(a&&time>=a.at&&time<a.at+duration)return{kind:'release',action:a.bossAction??a.mode,prepare:0,release:1-smooth((time-a.at)/duration)};
 if(c.mirrorUntil>time)return{kind:'mirror',action:'copy',prepare:0,release:0};
 if(c.exposedUntil>time)return{kind:'exposed',action:'recover',prepare:0,release:0};
 return{kind:'idle',action:'idle',prepare:0,release:0};
}
/** Clamp the ankle to the two-bone reach and retain the authored knee bend plane. */
export function solveBossLeg(hip,target,pole,upperLength,lowerLength){
 const to=target.clone().sub(hip),raw=to.length(),direction=raw>1e-7?to.clone().divideScalar(raw):new T.Vector3(0,-1,0);
 const d=Math.max(Math.abs(upperLength-lowerLength)+1e-5,Math.min(upperLength+lowerLength-1e-5,raw));
 const bend=pole.clone().sub(hip).addScaledVector(direction,-pole.clone().sub(hip).dot(direction));
 if(bend.lengthSq()<1e-8)bend.crossVectors(direction,Math.abs(direction.x)<.8?new T.Vector3(1,0,0):new T.Vector3(0,0,1));bend.normalize();
 const along=(upperLength**2-lowerLength**2+d*d)/(2*d),height=Math.sqrt(Math.max(0,upperLength**2-along*along));
 return{knee:hip.clone().addScaledVector(direction,along).addScaledVector(bend,height),ankle:hip.clone().addScaledVector(direction,direction.dot(to)<0?-d:d)};
}
export function createBossAnimationRig(model,parts){
 model.updateMatrixWorld(true);const point=o=>model.worldToLocal(o.getWorldPosition(new T.Vector3()));
 const byRole=new Map(parts.map(p=>[p.role,p])),legs=[];
 for(const p of parts.filter(p=>p.role.startsWith('leg-'))){
  const index=Number(p.role.slice(4)),k=byRole.get('knee-'+index),f=byRole.get('foot-'+index);if(!k||!f)continue;
  const hip=point(p.object),knee=point(k.object),ankle=point(f.object);
  legs.push({index,upper:p.object,lower:k.object,foot:f.object,hip,knee,ankle,upperRest:k.object.position.clone(),lowerRest:f.object.position.clone(),side:Math.sign(hip.x)||1,phase:(Math.sign(hip.x)>0?.5:0)+(Math.abs(hip.z)>.2?index%2*.5:0)});
 }
 for(const side of [-1,1])legs.filter(l=>l.side===side).sort((a,b)=>b.hip.z-a.hip.z).forEach((leg,i)=>{leg.phase=(side>0?.5:0)+i*.5;});
 return{legs,byRole,parts};
}
function setModelPoint(model,object,p){const world=model.localToWorld(p.clone());object.position.copy(object.parent.worldToLocal(world));}
function articulate(model,leg,target){
 model.updateMatrixWorld(true);const parent=leg.upper.parent;
 const hip=leg.upper.position.clone(),goal=parent.worldToLocal(model.localToWorld(target.clone())),pole=parent.worldToLocal(model.localToWorld(leg.knee.clone()));
 const restUpper=leg.upperRest,restLower=leg.lowerRest,solution=solveBossLeg(hip,goal,pole,restUpper.length(),restLower.length());
 const upperRotation=new T.Quaternion().setFromUnitVectors(restUpper.clone().normalize(),solution.knee.clone().sub(hip).normalize());
 const lowerWorld=new T.Quaternion().setFromUnitVectors(restLower.clone().normalize(),solution.ankle.clone().sub(solution.knee).normalize());
 leg.upper.quaternion.copy(upperRotation);leg.lower.quaternion.copy(upperRotation.clone().invert().multiply(lowerWorld));
 // A planted foot stays level even while the chassis pitches and the knee bends.
 parent.updateWorldMatrix(true,false);const parentQ=parent.getWorldQuaternion(new T.Quaternion()),modelQ=model.getWorldQuaternion(new T.Quaternion());
 leg.foot.quaternion.copy(parentQ.multiply(lowerWorld).invert().multiply(modelQ));
}
/** Presentation only. Distances drive gait; combat timestamps drive wind-up, release and recovery. */
export function animateBoss(model,rig,e,time,frame,reducedMotion=false){
 const motion=BOSS_MOTION[e.bossDesignId]??BOSS_MOTION['boss-mercury-hunter'],state=bossAnimationState(e,time),p=state.prepare,r=state.release,m=reducedMotion?.3:1;
 const walking=frame.walkWeight,phase=frame.travel/(Math.max(.1,e.radius)*motion.stride)*TAU,clock=frame.clock;
 const hunter=e.bossDesignId==='boss-mercury-hunter',heavy=e.bossDesignId==='boss-scrap-leviathan',tree=e.bossDesignId==='boss-root-cathedral',mirror=e.bossDesignId==='boss-mirror-collector',hive=e.bossDesignId==='boss-swarm-shepherd',hiveCast=['swarm','hive-volley','brood-ring'].includes(state.action),flying=hive&&frame.hover>.05;
 for(const part of rig.parts){part.object.position.copy(part.position);part.object.quaternion.copy(part.quaternion);part.object.scale.copy(part.scale);part.object.visible=!(part.role.startsWith('leg-')&&e.bossCombat?.disabledSupports?.includes(Number(part.role.slice(4))));}
 const body=model.userData.motionRoot;body.position.set(0,0,0);body.rotation.set(0,0,0);
 let bodyY=Math.sin(phase*2)*motion.bob*walking,pitch=0,roll=Math.sin(phase)*motion.bob*.6*walking;
 if(hunter){bodyY-=p*.075;if(state.kind==='dash')bodyY+=.06;pitch+=p*.16+(state.kind==='dash'?.10:0);}
 if(heavy){bodyY+=p*.065-r*.025;pitch-=p*.095;pitch+=r*.13;}
 if(mirror){roll+=Math.sin(clock*1.6)*.015;pitch-=p*.08;}
 if(hive){bodyY+=Math.sin(clock*2)*.035+(hiveCast?p*.1+r*.04:0);roll+=Math.sin(clock*1.3)*.025;pitch-=state.action==='ground-claws'?p*.11-r*.17:0;}
 body.position.y=bodyY*m;body.rotation.x=pitch*m;body.rotation.z=roll*m;body.updateMatrixWorld(true);
 for(const leg of rig.legs){
  const target=leg.ankle.clone();
  const t=((phase/TAU+leg.phase)%1+1)%1,duty=.62,swing=t>duty?(t-duty)/(1-duty):0;
  const fore=t<=duty?.5-t/duty:-.5+smooth(swing);
  target.z+=fore*motion.stride*duty*walking*m;
  target.y+=Math.sin(swing*Math.PI)*motion.lift*walking*m;
  if(hunter&&state.kind==='dash'){target.lerp(leg.hip,.28*m);target.z-=.12*m;}
  if(hunter&&p){target.x+=leg.side*p*.065*m;target.z-=p*.045*m;}
  if(tree){const wave=.6+.4*Math.sin(leg.index*1.6);target.y+=(p*.22+r*.1)*wave*m;target.z+=r*.16*wave*m;}
  if(flying){const fold=clamp(frame.hover/1.1);target.lerp(leg.hip.clone().lerp(leg.ankle,.6),fold*.75*m);target.z+=Math.sin(clock*2+leg.index)*.08*fold*m;}
  if(hive&&state.action==='ground-claws'&&leg.ankle.z>0){target.y+=p*.26*m;target.z+=(r*.3-p*.08)*m;}
  articulate(model,leg,target);
 }
 for(const part of rig.parts){
  const o=part.object,side=Math.sign(part.position.x)||1;
  if(part.role.startsWith('weapon-')){
   const mirrorHold=mirror&&state.kind==='mirror'?.45:0;
   o.rotation.x-=mirrorHold*m;o.rotation.y+=side*mirrorHold*.8*m;
   o.rotation.x+=(hunter?(-p*.65-r*.25):heavy?(-p*.40+r*.32):(-p*.75+r*.18))*m;
   o.rotation.y+=side*(hunter?(p*.35-r*.5):mirror?(p*.55-r*.2):0)*m;
  }
  if(part.role==='head'){o.rotation.x+=(p*.12-r*.12)*m;}
  if(part.role.startsWith('vent-')){o.rotation.x+=(-p*.18+r*.12)*m;}
  if(part.role.startsWith('cast-')){const i=Number(part.role.slice(5));o.rotation.x+=(-p*.4+r*.32)*m;o.rotation.z+=(i===0?-1:i===1?1:0)*p*.19*m;}
  if(part.role==='optic'){if(state.kind==='mirror')o.rotation.y+=Math.sin(clock*4)*.28*m;o.rotation.z+=(state.kind==='mirror'?Math.sin(clock*5)*.35:p*.65-r*.25)*m;}
  if(part.role.startsWith('canopy-')){const i=Number(part.role.slice(7)),open=hiveCast?p*.7+r*.5:state.kind==='exposed'?.15:0;o.rotation.z+=(i-1)*open*m;if(i===1)o.position.y+=open*.22*m;}
  if(part.role==='core'){o.rotation.y+=Math.sin(clock*1.8)*.12*m;o.scale.multiplyScalar(1+(p*.09+r*.04)*m);}
  if(part.role.startsWith('drone-')){const i=Number(part.role.slice(6)),deploy=hiveCast?p*.28+r*.48:0;const offset=new T.Vector3(side*deploy,Math.sin(clock*3+i)*.06+deploy*.25,Math.cos(clock*2+i)*.05).multiplyScalar(m);const origin=part.modelPosition.clone().add(offset);setModelPoint(model,o,origin);o.rotation.z+=Math.sin(clock*3+i)*.13*m;}
  // Older fallback assets remain readable while an articulated replacement is loading.
  if(!rig.legs.length&&part.role.startsWith('leg-'))o.rotation.x+=Math.sin(phase+Number(part.role.slice(4))*Math.PI)*.3*walking*(reducedMotion?0:1);
 }
 model.updateMatrixWorld(true);
 return{state:state.kind,action:state.action,walkWeight:walking,legs:rig.legs.length,phase};
}
