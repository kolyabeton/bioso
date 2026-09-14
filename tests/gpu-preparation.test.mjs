import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {prepareTextures,materialTextures} from '../src/gpu-preparation.js';
test('texture preparation shares uploads, tracks versions and remains renderer-specific',async()=>{
 const a=new T.Texture(),b=new T.Texture(),uploads=[],renderer={initTexture:t=>uploads.push(t)},work=async fn=>fn();
 await Promise.all([prepareTextures(renderer,[a,b,a],work),prepareTextures(renderer,[a,b],work)]);assert.deepEqual(uploads,[a,b]);
 a.needsUpdate=true;await prepareTextures(renderer,[a,b],work);assert.deepEqual(uploads,[a,b,a]);
 const other=[];await prepareTextures({initTexture:t=>other.push(t)},[a],work);assert.deepEqual(other,[a]);
 const material=new T.MeshStandardMaterial({map:a,normalMap:b});assert.deepEqual(new Set(materialTextures(material)),new Set([a,b]));material.dispose();a.dispose();b.dispose();
});
test('a cancelled texture job can retry and each upload gets its own work unit',async()=>{
 const a=new T.Texture(),b=new T.Texture(),calls=[],renderer={initTexture:t=>calls.push(t)};
 await assert.rejects(prepareTextures(renderer,[a,b],async()=>{throw Error('cancelled');}),/cancelled/);assert.equal(calls.length,0);
 let jobs=0;await prepareTextures(renderer,[a,b],async fn=>{jobs++;return fn();});assert.equal(jobs,2);assert.deepEqual(calls,[a,b]);a.dispose();b.dispose();
});

test('a live tile retries an upload whose original tile was cancelled',async()=>{
 const texture=new T.Texture(),uploads=[],renderer={initTexture:t=>uploads.push(t)};let cancel;
 const obsolete=prepareTextures(renderer,[texture],()=>new Promise((resolve,reject)=>{cancel=()=>reject(Error('Superseded preparation'));}));
 const rejected=assert.rejects(obsolete,/Superseded/);
 const live=prepareTextures(renderer,[texture],async fn=>fn());cancel();await rejected;await live;assert.deepEqual(uploads,[texture]);texture.dispose();
});
