import * as T from 'three';
import {ENEMY_ACID_PUDDLE_DURATION,ENEMY_WEAPONS} from './systems/enemy-combat.js';
import {combatTime} from './systems/mutations.js';
import {ATTACK_WARNING_OPACITY} from './attack-warning-style.js';
import {createSlimeSurfaceGeometry,createSlimeSurfaceMaterial} from './slime-surface.js';

const WARNING_CAPACITY=128,IMPACT_CAPACITY=32,IMPACT_LIFE=ENEMY_ACID_PUDDLE_DURATION,GROUND_LIFT=.018;
function sector(angle){const vertices=[];for(let i=0;i<40;i++){const a=-angle/2+angle*i/40,b=-angle/2+angle*(i+1)/40;vertices.push(0,0,0,Math.sin(a),0,Math.cos(a),Math.sin(b),0,Math.cos(b));}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));return g;}
export function createEnemyWarningView(scene){
 const root=new T.Group();root.name='enemy-attack-warnings';scene.add(root);const pools=new Map(),dummy=new T.Object3D();let impacts=[],lastTime=0,serial=0;
 for(const [key,w]of Object.entries(ENEMY_WEAPONS)){
  for(const mode of new Set([w.mode,'shot','sector','area'])){
   const acid=mode==='acid',geometry=acid?createSlimeSurfaceGeometry(WARNING_CAPACITY):mode==='shot'?new T.PlaneGeometry(.09,1).rotateX(-Math.PI/2):sector(mode==='area'?Math.PI*2:w.angle??Math.PI*2);
   const material=acid?createSlimeSurfaceMaterial():new T.MeshBasicMaterial({color:'#ffc174',transparent:true,opacity:ATTACK_WARNING_OPACITY,side:T.DoubleSide,forceSinglePass:true,depthWrite:false,toneMapped:false});
   const mesh=new T.InstancedMesh(geometry,material,WARNING_CAPACITY);mesh.name=mode===w.mode?`enemy-warning:${key}`:`enemy-warning:${key}:${mode}`;mesh.count=0;mesh.frustumCulled=false;if(acid)mesh.renderOrder=3;root.add(mesh);pools.set(`${key}:${mode}`,mesh);
  }
 }
 function warningPool(w,mode){
  const base=pools.get(`${w.key}:${mode}`);
  if(!base||mode!=='sector'||!Number.isFinite(w.angle)||w.angle===(ENEMY_WEAPONS[w.key].angle??Math.PI*2))return base;
  // Authored boss sectors can differ from the weapon's default area/arc.
  const key=`${w.key}:${mode}:${w.angle}`;let mesh=pools.get(key);
  if(!mesh){mesh=new T.InstancedMesh(sector(w.angle),base.material.clone(),WARNING_CAPACITY);mesh.name=`enemy-warning:${key}`;mesh.count=0;mesh.frustumCulled=false;root.add(mesh);pools.set(key,mesh);}
  return mesh;
 }
 const impactGeometry=createSlimeSurfaceGeometry(IMPACT_CAPACITY),impactData=impactGeometry.getAttribute('effectData'),impactMaterial=createSlimeSurfaceMaterial(true),impactMesh=new T.InstancedMesh(impactGeometry,impactMaterial,IMPACT_CAPACITY);impactMesh.name='enemy-acid-impact';impactMesh.count=0;impactMesh.frustumCulled=false;impactMesh.renderOrder=1;root.add(impactMesh);
 function update(s){for(const m of pools.values())m.count=0;const now=combatTime(s);lastTime=now;
  for(const e of s.enemies){const warning=e.enemyAttack?.warning,pose=e.attackPose&&now-e.attackPose.at<.22?e.attackPose:null,w=warning||pose;if(e.hp<=0||!w||e.frozenUntil>now||w.mode==='acid'&&!warning)continue;const mode=w.telegraphMode??w.mode,m=warningPool(w,mode);if(!m||m.count>=WARNING_CAPACITY)continue;
   dummy.position.set(w.x,(w.y??0)+.12,w.z);dummy.rotation.set(0,Math.atan2(w.dx,w.dz),0);
   if(mode==='shot'){dummy.position.x+=w.dx*w.range*.5;dummy.position.z+=w.dz*w.range*.5;dummy.scale.set(w.width?w.width/.09:1,1,w.range);}else dummy.scale.set(w.radius,1,w.radius);
   dummy.updateMatrix();const index=m.count++;m.setMatrixAt(index,dummy.matrix);const data=m.geometry.getAttribute('effectData');if(data){const progress=Number.isFinite(w.started)&&Number.isFinite(w.at)?Math.max(0,Math.min(1,(now-w.started)/(w.at-w.started||1))):0;data.setXY(index,progress,(Number(e.id)||index+1)*.731);}
  }
  impacts=impacts.filter(p=>now-p.at<p.duration);impactMesh.count=impacts.length;
  impacts.forEach((p,i)=>{const age=Math.max(0,now-p.at),grow=Math.min(1,age/.24),spread=.18+.88*(1-(1-grow)**3),settle=age>.24?1.06-Math.min(1,(age-.24)/.18)*.06:spread;dummy.position.set(p.x,(p.y??0)+GROUND_LIFT,p.z);dummy.rotation.set(0,p.rotation,0);dummy.scale.set(p.radius*settle,1,p.radius*settle);dummy.updateMatrix();impactMesh.setMatrixAt(i,dummy.matrix);impactData.setXY(i,age/p.duration,p.seed);});
  impactMesh.instanceMatrix.needsUpdate=true;impactData.needsUpdate=impactMesh.count>0;impactMaterial.uniforms.clock.value=now;
  for(const m of pools.values()){m.instanceMatrix.needsUpdate=true;if(m.material.uniforms?.clock){m.material.uniforms.clock.value=now;m.geometry.getAttribute('effectData').needsUpdate=m.count>0;}}
 }
 function event(e,at=lastTime){if(e.type!=='enemy-strike'||e.mode!=='acid'||!Number.isFinite(e.x)||!Number.isFinite(e.z))return;const entry={x:e.x,y:e.y??0,z:e.z,radius:e.radius??2.2,at,duration:e.duration??IMPACT_LIFE,seed:(++serial*1.618)%17+3,rotation:serial*2.399};if(impacts.length>=IMPACT_CAPACITY)impacts.shift();impacts.push(entry);}
 return {update,event,reset(){impacts=[];lastTime=0;for(const m of pools.values())m.count=0;impactMesh.count=0;},dispose(){scene.remove(root);for(const m of [...pools.values(),impactMesh]){m.geometry.dispose();m.material.dispose();m.dispose();}}};
}
