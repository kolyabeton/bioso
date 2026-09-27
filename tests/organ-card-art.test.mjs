import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {partArt} from '../src/ui/molecules.js';

test('Controller and Incubator keep separate canonical card art',async()=>{
 const controller=partArt('broodNode'),incubator=partArt('parasite');
 assert.match(controller,/organs\/parasite-womb-v2\.png/);
 assert.match(incubator,/organs\/parasite-womb-v3\.png/);
 assert.notEqual(controller,incubator);
 for(const file of ['parasite-womb-v2.png','parasite-womb-v3.png']){
  const bytes=await readFile(new URL(`../public/assets/ui/organs/${file}`,import.meta.url));
  assert(bytes.length>1000,`${file} is missing`);
 }
});
