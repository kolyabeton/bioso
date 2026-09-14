import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {addForestDetails} from '../src/forest-detail-view.js';
import {createForestUniforms} from '../src/forest-light.js';

test('detail shells share a batch with aligned atlas rects and rigid architecture',()=>{
 const group=new T.Group(),map=new T.Texture(),uniforms=createForestUniforms();
 const tile={x:0,z:0,decorations:[{feature:'thicket',x:-7,z:-12},{feature:'thicket',x:-7,z:-8},{feature:'thicket',x:-7,z:8},{feature:'thicket',x:7,z:-12}]};
 const mesh=addForestDetails(group,tile,map,uniforms),cells=mesh.geometry.getAttribute('forestDetailCell'),rects=mesh.geometry.getAttribute('forestDetailRect');
 assert.equal(mesh.count,4);assert.equal(rects.count,4);assert.equal(cells.array[2],2);assert.equal(cells.array[3],1);
 assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));assert.equal(mesh.userData.forestFixedBatch,true);
 for(let i=0;i<rects.count;i++){assert.ok(rects.getX(i)>=0&&rects.getY(i)>=0);assert.ok(rects.getX(i)+rects.getZ(i)<=1);assert.ok(rects.getY(i)+rects.getW(i)<=1);}
 const shader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader,fragmentShader:T.ShaderLib.basic.fragmentShader};mesh.material.onBeforeCompile(shader);
 assert.equal(shader.uniforms.forestMotion,uniforms.forestMotion);assert.match(shader.vertexShader,/forestDetailCell==0\.0\|\|forestDetailCell==3\.0/);
 assert.match(shader.fragmentShader,/detailAlpha/);mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();map.dispose();
});
