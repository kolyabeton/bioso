import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWorldRun} from '../src/world-run.js';
import {environmentProfile} from '../src/environment-profiles.js';
import {environmentGroundShader} from '../src/environment-ground.js';
import {addEnvironmentGroundDetail} from '../src/environment-ground-detail.js';
import {obstacleHeight} from '../src/architecture-collision.js';

test('small 3D fragments stay outside central combat clearance and use one batch',()=>{
 for(const mode of ['garden','quarantine','core','nursery','mother']){
  const s=createWorldRun(undefined,mode,12),tile=s.world.tiles[0],group=new T.Group();
  addEnvironmentGroundDetail(group,tile,s.world,environmentProfile(tile),new T.Texture());
  assert.equal(group.children.length,1);const mesh=group.children[0];
  assert.ok(mesh.isInstancedMesh);assert.ok(mesh.count>0&&mesh.count<=14*tile.decorations.length);
  const matrix=new T.Matrix4(),p=new T.Vector3();
  for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);p.setFromMatrixPosition(matrix);assert.ok(Math.abs(p.x-tile.x)>=5.2);assert.ok(Math.abs(p.z-tile.z)<=28);}
  assert.ok(mesh.userData.ownedGeometry&&mesh.userData.borderMaterial);
  mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();
 }
});
test('shadow projections use actual obstacle height, not a generic size multiplier',()=>{
 const s=createWorldRun(undefined,'garden',12),tile=s.world.tiles[0];
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 environmentGroundShader(shader,environmentProfile(tile),null,null,tile,s.world);
 const d=tile.decorations.find(d=>d.environmentSignature);
 const caster=shader.uniforms.envCasters.value.find(c=>c.x===d.x&&c.y===d.z);
 assert.ok(caster);assert.equal(caster.w,obstacleHeight(d));
 assert.match(shader.fragmentShader,/envAtlasSample/);assert.match(shader.fragmentShader,/gardenSoil/);
});
test('root forest mission reuses the sculpted ceramic arch with matching collision',()=>{
 const s=createWorldRun(undefined,'core',12),tile=s.world.tiles[0];
 const arch=tile.decorations.find(d=>d.model==='forest-ruin-arch-v2');
 assert.ok(arch);assert.ok(arch.collisionProfile?.hull.length>3);
 assert.equal(arch.x,7.6);assert.equal(arch.z,-15);
 for(let z=-28;z<=28;z++)assert.ok(s.world.walkable(0,z,1.92));
});
