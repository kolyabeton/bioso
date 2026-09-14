import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readBossGeometry} from './helpers/boss-glb.mjs';
import {BOSS_MODEL_IDS,fittedBossModel,createBossModelView} from '../src/boss-model-view.js';
import {animateBoss,solveBossLeg,bossAnimationState} from '../src/boss-animation.js';
const radii=[1.8,7,4.5,2.2,3],actions=['dash','crush','roots','copy','swarm'];
function fixture(i){const e={id:1,bossDesignId:BOSS_MODEL_IDS[i],kind:'boss',hp:100,radius:radii[i],x:0,y:0,z:0,bossCombat:{facing:0,phase:1},bossHover:i===4?1.1:0};const model=fittedBossModel(readBossGeometry(e.bossDesignId),{height:i===2?10/e.radius:undefined});model.scale.setScalar(e.radius);return{e,model,rig:model.userData.rig};}
function frame(time,travel=0,hover=0){return{clock:time,travel,walkWeight:travel?1:0,hover};}
const ankle=leg=>leg.foot.getWorldPosition(new T.Vector3());
test('shipped bosses contain connected hip/knee/foot chains; rest pose preserves every joint',()=>{
 for(let i=0;i<5;i++){const {e,model,rig}=fixture(i);assert.equal(rig.legs.length,[6,6,7,4,4][i]);model.updateMatrixWorld(true);const before=rig.legs.map(ankle);animateBoss(model,rig,e,0,frame(0));rig.legs.forEach((leg,j)=>assert.ok(ankle(leg).distanceTo(before[j])<1e-5,e.bossDesignId));}
});
test('two-bone solution preserves segment lengths for near, far and degenerate targets',()=>{
 const hip=new T.Vector3(0,2,0),pole=new T.Vector3(1,1,0);for(const target of [new T.Vector3(0,0,0),new T.Vector3(0,10,0),hip.clone()]){const r=solveBossLeg(hip,target,pole,1.2,1);assert.ok(Math.abs(r.knee.distanceTo(hip)-1.2)<1e-4);assert.ok(Math.abs(r.knee.distanceTo(r.ankle)-1)<1e-4);}
});
test('walking has alternating lifted feet and visible knee articulation; planted feet stay level',()=>{
 for(const i of [0,1,3,4]){const {e,model,rig}=fixture(i);let greatestLift=0,greatestKnee=0;const original=rig.legs.map(l=>l.ankle.y*e.radius);
  for(let j=0;j<30;j++){animateBoss(model,rig,e,j/30,frame(j/30,j/30*e.radius*.8));rig.legs.forEach((l,k)=>{greatestLift=Math.max(greatestLift,ankle(l).y-original[k]);greatestKnee=Math.max(greatestKnee,l.lower.quaternion.angleTo(new T.Quaternion()));assert.ok(ankle(l).y>=original[k]-1e-5,e.bossDesignId+' ankle below contact');const up=new T.Vector3(0,1,0).applyQuaternion(l.foot.getWorldQuaternion(new T.Quaternion()));assert.ok(up.y>.999);});}
  assert.ok(greatestLift>.06,e.bossDesignId);assert.ok(greatestKnee>.12,e.bossDesignId);
 }
});
test('each boss animates its authored skill organs during preparation and release',()=>{
 for(let i=0;i<5;i++){const {e,model,rig}=fixture(i);const roles=[['weapon-0'],['weapon-0','vent-0'],['cast-0','cast-1','cast-2'],['optic','weapon-0'],['canopy-0','canopy-1','canopy-2']][i];e.enemyAttack={warning:{bossAction:actions[i],mode:'area',started:0,at:1}};animateBoss(model,rig,e,.9,frame(.9,0,i===4?1.1:0));
  for(const role of roles){const p=rig.byRole.get(role);assert.ok(p,role);assert.ok(p.object.quaternion.angleTo(p.quaternion)>.05||p.object.position.distanceTo(p.position)>.03,role+' unchanged');}
  const before=rig.byRole.get(roles[0]).object.quaternion.clone();e.attackPose={...e.enemyAttack.warning,at:1};e.enemyAttack.warning=null;animateBoss(model,rig,e,1.08,frame(1.08,0,i===4?1.1:0));assert.ok(before.angleTo(rig.byRole.get(roles[0]).object.quaternion)>.05);
 }
});
test('animation does not mutate combat, disabled supports stay hidden, reduced motion retains cast signal',()=>{
 const {e,model,rig}=fixture(1);e.bossCombat.disabledSupports=[0];e.enemyAttack={warning:{bossAction:'crush',mode:'area',started:0,at:1}};const before=JSON.stringify(e);animateBoss(model,rig,e,.9,frame(.9),true);assert.equal(JSON.stringify(e),before);assert.equal(rig.byRole.get('leg-0').object.visible,false);assert.ok(rig.byRole.get('weapon-0').object.rotation.x<-.05);
});
test('pause and freeze hold every articulated joint; resume does not jump the walking clock',async()=>{
 const source=readBossGeometry(BOSS_MODEL_IDS[0]),scene=new T.Scene(),view=createBossModelView(scene,{load:async()=>source}),e=fixture(0).e;view.update([e],{x:0,z:4},0);await new Promise(r=>setImmediate(r));view.update([e],{x:0,z:4},0);e.z=.3;view.update([e],{x:0,z:4},.1);const model=scene.getObjectByName('boss-asset:'+e.bossDesignId),pose=()=>model.userData.motionParts.map(p=>[...p.object.position,...p.object.quaternion]);const before=pose();view.update([e],{x:0,z:4},.1);assert.deepEqual(pose(),before);e.frozenUntil=5;view.update([e],{x:0,z:4},1);assert.deepEqual(pose(),before);view.update([e],{x:0,z:4},4.9);assert.deepEqual(pose(),before);e.frozenUntil=0;view.update([e],{x:0,z:4},5);assert.ok(view.info().bossAnimations[0].clock<.3);view.dispose();
});
test('dash overrides stale attack release and mirror gets its own looping pose',()=>{assert.equal(bossAnimationState({bossCombat:{dash:{}}},5).kind,'dash');assert.equal(bossAnimationState({bossCombat:{mirrorUntil:6}},5).kind,'mirror');});
test('real shipped geometry stays above the floor through skill impact and dash',()=>{
 for(let i=0;i<5;i++){const {e,model,rig}=fixture(i);e.attackPose={at:0,bossAction:actions[i]};if(i===0)e.bossCombat.dash={};for(const t of [.01,.15,.3,.5]){animateBoss(model,rig,e,t,frame(t));assert.ok(new T.Box3().setFromObject(model,true).min.y>=-1e-5,e.bossDesignId+' penetrates floor');}}
});
