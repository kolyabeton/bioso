import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {forestFoliageGeometry,forestFoliageMaterial} from '../src/forest-foliage.js';
import {createForestUniforms,forestGroundShader} from '../src/forest-light.js';

test('forest leaf sprays have bounded geometry and atlas-safe UVs',()=>{
 for(const fern of [false,true]){
  const g=forestFoliageGeometry(fern);
  assert.ok(g.index.count/3<=144);
  assert.ok([...g.attributes.position.array].every(Number.isFinite));
  assert.ok([...g.attributes.uv.array].every(v=>v>0&&v<1));
  g.dispose();
 }
});
test('foliage shares wind state and rejects the explicit black source before depth writes',()=>{
 const map=new T.Texture(),u=createForestUniforms(),m=forestFoliageMaterial(map,u);
 const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};
 m.onBeforeCompile(shader);
 assert.equal(shader.uniforms.forestWind,u.forestWind);
 assert.match(shader.fragmentShader,/smoothstep\(\.008,\.035,foliageMax\)/);
 assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);assert.equal(m.emissiveMap,map);
 m.dispose();map.dispose();
});
test('forest ground replacement stays in the existing ground shader',()=>{
 const shader={uniforms:{},vertexShader:T.ShaderLib.basic.vertexShader,fragmentShader:T.ShaderLib.basic.fragmentShader};
 const map=new T.Texture(),u=createForestUniforms();forestGroundShader(shader,u,map);
 assert.equal(shader.uniforms.forestGround.value,map);
 assert.equal(shader.uniforms.forestHero,u.forestHero);
 assert.match(shader.fragmentShader,/forestStone\(stoneUV\)/);
 map.dispose();
});
