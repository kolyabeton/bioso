import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {ENEMY_PROJECTILE_STYLES,enemyProjectileStyle,createEnemyProjectileView} from '../src/enemy-projectile-view.js';

test('hostile projectile styles have three non-red weapon silhouettes and a legacy fallback',()=>{
 const styles=Object.values(ENEMY_PROJECTILE_STYLES);
 assert.equal(styles.length,3);assert.equal(new Set(styles.map(s=>[s.shape,s.width,s.length,s.trail,s.color].join(':'))).size,3);
 assert.ok(styles.every(s=>s.color!==0xff6046&&s.glow!==0xff6046));
 assert.equal(enemyProjectileStyle({key:'seed'}),ENEMY_PROJECTILE_STYLES.seed);
 assert.ok(Math.abs(ENEMY_PROJECTILE_STYLES.seed.width-.14)<1e-12);assert.ok(Math.abs(ENEMY_PROJECTILE_STYLES.seed.trail-.35)<1e-12);
 assert.equal(enemyProjectileStyle({key:'needle'}),ENEMY_PROJECTILE_STYLES.needle);
 assert.equal(ENEMY_PROJECTILE_STYLES.legacy.width,.31);assert.ok(ENEMY_PROJECTILE_STYLES.legacy.trail>ENEMY_PROJECTILE_STYLES.needle.trail);
 assert.equal(enemyProjectileStyle({key:'unknown'}),ENEMY_PROJECTILE_STYLES.legacy);
});

test('hostile projectile view aligns full 3D trajectories and reuses bounded pools',()=>{
 const scene=new T.Scene(),view=createEnemyProjectileView(scene,4),shots=[
  {key:'seed',x:1,y:2,z:3,dx:1,dy:0,dz:0,travel:.5},
  {key:'needle',x:2,y:3,z:4,dx:1,dy:1,dz:1,travel:8},
  {key:'legacy',kind:'boss',x:3,y:4,z:5,dx:0,dy:-.4,dz:-1,travel:8},
 ];
 const root=scene.getObjectByName('enemy-projectiles'),meshes=[...root.children];assert.equal(root.getObjectByName('enemy-projectile-seed-body').geometry.type,'SphereGeometry');assert.equal(root.getObjectByName('enemy-projectile-needle-body').geometry.type,'SphereGeometry');assert.equal(root.getObjectByName('enemy-projectile-legacy-body').geometry.type,'SphereGeometry');assert.ok(root.children.filter(mesh=>mesh.name.endsWith('-trail')).every(mesh=>mesh.geometry.type==='ConeGeometry'));view.update(shots,1,false);assert.deepEqual(view.info(),{seed:1,needle:1,legacy:1});
 const needle=root.getObjectByName('enemy-projectile-needle-body'),matrix=new T.Matrix4(),position=new T.Vector3(),rotation=new T.Quaternion(),scale=new T.Vector3(),direction=new T.Vector3(0,0,1);needle.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);direction.applyQuaternion(rotation).normalize();assert.ok(direction.dot(new T.Vector3(1,1,1).normalize())>.999);
 const trail=root.getObjectByName('enemy-projectile-needle-trail');trail.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);const fullTrail=scale.z;assert.equal(root.getObjectByName('enemy-projectile-legacy-wake').count,0);assert.ok(root.getObjectByName('enemy-projectile-legacy-motes').count>root.getObjectByName('enemy-projectile-needle-motes').count);view.update(shots,2,true);trail.getMatrixAt(0,matrix);matrix.decompose(position,rotation,scale);assert.ok(scale.z<fullTrail*.5);
 view.update(Array.from({length:10},(_,i)=>({key:'seed',x:i,y:1,z:0,dx:1,dy:0,dz:0,travel:1})),3,false);assert.equal(view.info().seed,4);assert.deepEqual(root.children,meshes);
 view.reset();assert.deepEqual(view.info(),{seed:0,needle:0,legacy:0});view.dispose();assert.equal(scene.children.length,0);
});
test('sculpted seed and boss shells have outward normals and smaller needles retain all proportions',()=>{
 const scene=new T.Scene(),view=createEnemyProjectileView(scene,1);
 for(const key of ['seed','legacy']){
  const mesh=scene.getObjectByName(`enemy-projectile-${key}-body`),p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  assert.ok(p.count>1000);for(let i=0;i<p.count;i++){if(n.getX(i)**2+n.getY(i)**2+n.getZ(i)**2<.5)continue;assert.ok(p.getX(i)*n.getX(i)+p.getY(i)*n.getY(i)+p.getZ(i)*n.getZ(i)>0,'surface must face out, concealing the core');}
 }
 const needle=ENEMY_PROJECTILE_STYLES.needle;for(const [field,old] of Object.entries({width:.24,height:.24,length:1.05,trail:1.4,trailWidth:.085}))assert.ok(Math.abs(needle[field]/old-.75)<1e-8);
 view.dispose();
});
