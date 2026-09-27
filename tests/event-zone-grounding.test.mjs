import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createGameplayModulesView} from '../src/gameplay-modules/view.js';

test('event boundary follows uneven ground on both edges and preserves radius',()=>{
 const view=createGameplayModulesView(new T.Scene(),{load:async()=>null});
 const node={type:'sealed',x:12,y:3,z:-8,radius:14,state:'active'};
 const world={heightAt:(x,z)=>3+Math.sin(x*.3)*.8+Math.cos(z*.2)*.5};
 const run={time:300,level:10,world,encounters:{nodes:[node]}};
 const before=JSON.stringify(node);
 view.update(run);
 const ring=view.root.children[0].children.find(o=>o.geometry?.type==='RingGeometry');
 for(const state of ['active','ready','reward']){
  node.state=state;view.update(run);view.root.updateMatrixWorld(true);
  const positions=ring.geometry.attributes.position,p=new T.Vector3();
  for(let i=0;i<positions.count;i++){
   p.fromBufferAttribute(positions,i).applyMatrix4(ring.matrixWorld);
   assert.ok(Math.abs(p.y-world.heightAt(p.x,p.z)-.04)<1e-5);
   const r=Math.hypot(p.x-node.x,p.z-node.z);
   assert.ok(Math.abs(r-14)<1e-5||Math.abs(r-13.92)<1e-5);
  }
 }
 node.state='active';assert.equal(JSON.stringify(node),before);
 view.dispose();
});
