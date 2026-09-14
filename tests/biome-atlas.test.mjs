import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBiomeAtlasViews} from '../src/biome-atlas.js';
test('repeated tiles share immutable atlas windows without invalidating uploads',()=>{
 const atlas=new T.Texture(),views=createBiomeAtlasViews(atlas),version=atlas.source.version;
 for(let tile=0;tile<1200;tile++){
  const index=tile%4,view=views[index];assert.equal(view.source,atlas.source);
  assert.deepEqual(view.repeat.toArray(),[.5,.5]);assert.deepEqual(view.offset.toArray(),[index%2*.5,index<2?.5:0]);
  view.updateMatrix();const uv=new T.Vector2(.2,.8).applyMatrix3(view.matrix);assert.deepEqual(uv.toArray(),[.1+index%2*.5,.4+(index<2?.5:0)]);
 }
 assert.equal(atlas.source.version,version);assert.equal(new Set(views).size,4);
});
