import * as T from 'three';
import {ENEMY_WEAPONS} from './systems/enemy-combat.js';
import {combatTime} from './systems/mutations.js';

function sector(angle){const vertices=[];for(let i=0;i<40;i++){const a=-angle/2+angle*i/40,b=-angle/2+angle*(i+1)/40;vertices.push(0,0,0,Math.sin(a),0,Math.cos(a),Math.sin(b),0,Math.cos(b));}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));return g;}
export function createEnemyWarningView(scene){
 const root=new T.Group();root.name='enemy-attack-warnings';scene.add(root);const pools=new Map(),dummy=new T.Object3D();
 for(const [key,w]of Object.entries(ENEMY_WEAPONS)){
  const geometry=w.mode==='shot'?new T.BoxGeometry(.09,.02,1):sector(w.angle??Math.PI*2);
  const mesh=new T.InstancedMesh(geometry,new T.MeshBasicMaterial({color:w.mode==='acid'?'#b4e363':'#ffc174',transparent:true,opacity:w.mode==='shot'?.9:.3,side:T.DoubleSide,depthWrite:false,toneMapped:false}),128);mesh.count=0;mesh.frustumCulled=false;root.add(mesh);pools.set(key,mesh);
 }
 function update(s){for(const m of pools.values())m.count=0;const now=combatTime(s);
  for(const e of s.enemies){const w=e.enemyAttack?.warning||(e.attackPose&&now-e.attackPose.at<.22?e.attackPose:null);if(e.hp<=0||!w||e.frozenUntil>now)continue;const m=pools.get(w.key);if(!m||m.count>=128)continue;
   dummy.position.set(w.x,(w.y??0)+.12,w.z);dummy.rotation.set(0,Math.atan2(w.dx,w.dz),0);
   if(w.mode==='shot'){dummy.position.x+=w.dx*w.range*.5;dummy.position.z+=w.dz*w.range*.5;dummy.scale.set(1,1,w.range);}else dummy.scale.set(w.radius,1,w.radius);
   dummy.updateMatrix();m.setMatrixAt(m.count++,dummy.matrix);
  }for(const m of pools.values())m.instanceMatrix.needsUpdate=true;
 }
 return {update,reset(){for(const m of pools.values())m.count=0;},dispose(){scene.remove(root);for(const m of pools.values()){m.geometry.dispose();m.material.dispose();m.dispose();}}};
}
