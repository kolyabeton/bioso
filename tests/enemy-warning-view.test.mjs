import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createEnemyWarningView} from '../src/enemy-warning-view.js';
import {SURVIVAL_BOSS_ATTACKS,warningHits} from '../src/systems/enemy-combat.js';

test('Warden ram warning and impact use the same forward arc as damage',()=>{
 const scene=new T.Scene(),view=createEnemyWarningView(scene);
 const move=SURVIVAL_BOSS_ATTACKS.warden[0],w={...move,x:5,y:0,z:7,dx:1,dz:0,started:1,at:3};
 assert.equal(w.radius,10);
 const enemy={id:1,hp:1,enemyAttack:{warning:w}},state={time:2,enemies:[enemy]};
 view.update(state);
 const root=scene.getObjectByName('enemy-attack-warnings'),mesh=root.children.find(m=>m.count===1);
 assert.ok(mesh);assert.equal(scene.getObjectByName('enemy-warning:hammer').count,0);
 const matrix=new T.Matrix4();mesh.getMatrixAt(0,matrix);const vertices=mesh.geometry.getAttribute('position');
 for(let i=0;i<vertices.count;i++){
  const local=new T.Vector3().fromBufferAttribute(vertices,i);
  assert.ok(local.z>=0,'no warning behind the boss');assert.ok(Math.abs(Math.atan2(local.x,local.z))<=w.angle/2+1e-7);
  // Sample just inside the Float32 mesh edge, away from angular rounding.
  local.x*=.999;const world=local.multiplyScalar(.99).applyMatrix4(matrix);assert.ok(warningHits(w,world),'rendered warning is damageable');
 }
 const count=root.children.length;enemy.attackPose={...w};enemy.enemyAttack.warning=null;state.time=3.1;view.update(state);
 assert.equal(mesh.count,1);assert.equal(root.children.length,count,'impact reuses the sector pool');
 state.time=3.3;view.update(state);assert.equal(mesh.count,0);view.dispose();
});

test('enemy acid warning stays subtle until an organic impact surface grows from the strike',()=>{
 const scene=new T.Scene(),view=createEnemyWarningView(scene);
 const acid=scene.getObjectByName('enemy-warning:acid'),impact=scene.getObjectByName('enemy-acid-impact'),hammer=scene.getObjectByName('enemy-warning:hammer');
 assert.ok(acid.material.isShaderMaterial);
 assert.ok(acid.geometry.getAttribute('uv'));
 assert.ok(acid.geometry.getAttribute('effectData'));
 assert.equal(acid.material.depthTest,false);
 assert.equal(acid.renderOrder,3);
 assert.equal(impact.material.depthTest,true);
 assert.equal(impact.renderOrder,1);
 assert.doesNotMatch(impact.material.fragmentShader,/rim\*\.(?:18|2)/);
 assert.match(acid.material.fragmentShader,/rim\*\(\.46/);
 assert.ok(hammer.material.isMeshBasicMaterial);
 const enemy={id:7,hp:1,frozenUntil:0,enemyAttack:{warning:{key:'acid',mode:'acid',x:3,y:0,z:4,dx:0,dz:1,radius:2.2,started:1,at:3}}};
 const state={time:2,isaac:{extraTime:0},enemies:[enemy]};
 view.update(state);
 assert.equal(acid.count,1);
 assert.equal(acid.geometry.getAttribute('effectData').getX(0),.5);
 assert.equal(acid.material.uniforms.clock.value,2);
 assert.equal(hammer.count,0);
 view.event({type:'enemy-strike',key:'acid',mode:'acid',x:3,y:0,z:4,radius:2.2},2);
 enemy.attackPose={...enemy.enemyAttack.warning,at:2};enemy.enemyAttack.warning=null;state.time=2.12;view.update(state);
 assert.equal(acid.count,0);
 assert.equal(impact.count,1);
 const matrix=new T.Matrix4(),position=new T.Vector3();impact.getMatrixAt(0,matrix);position.setFromMatrixPosition(matrix);assert.ok(Math.abs(position.y-.018)<1e-8);
 assert.ok(impact.geometry.getAttribute('effectData').getX(0)>0);
 state.time=4;view.update(state);assert.equal(impact.count,0);
 view.dispose();
});

test('a projectile ring uses a circular telegraph instead of a misleading aim line',()=>{
 const scene=new T.Scene(),view=createEnemyWarningView(scene),line=scene.getObjectByName('enemy-warning:needle'),ring=scene.getObjectByName('enemy-warning:needle:area');
 const state={time:2,isaac:{extraTime:0},enemies:[{id:8,hp:1,frozenUntil:0,enemyAttack:{warning:{key:'needle',mode:'shot',telegraphMode:'area',x:0,y:0,z:0,dx:0,dz:1,radius:4,range:13,started:1,at:3}}}]};view.update(state);
 assert.equal(line.count,0);assert.equal(ring.count,1);const matrix=new T.Matrix4(),scale=new T.Vector3();ring.getMatrixAt(0,matrix);scale.setFromMatrixScale(matrix);assert.ok(Math.abs(scale.x-4)<1e-8&&Math.abs(scale.z-4)<1e-8);view.dispose();
});
