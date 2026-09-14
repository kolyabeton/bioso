import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionBossCamera,GAMEPLAY_CAMERA} from '../src/mission-boss-camera.js';

const fight=()=>({mission:{bossId:'boss-root-cathedral'},enemies:[{hp:10,bossDesignId:'boss-root-cathedral'}]});
function settle(camera,s){let pose;for(let i=0;i<90;i++)pose=camera.update(s,1/60);return pose;}
test('additional boss framing is limited to the living boss of the current mission',()=>{
 for(const s of [{enemies:[{hp:10,bossDesignId:'boss-root-cathedral'}]},{mission:{},enemies:[{hp:1}]},{...fight(),enemies:[]},{...fight(),mission:{bossId:'other'}},{...fight(),dead:true},{...fight(),mission:{bossId:'boss-root-cathedral',complete:true}}]){
  assert.deepEqual(settle(createMissionBossCamera(),s),{active:false,blend:0,height:30,depth:40,lookAhead:1.4,lookHeight:0});
 }
 const pose=settle(createMissionBossCamera(),fight());assert.equal(pose.blend,1);
 assert.ok(Math.atan2(pose.height-pose.lookHeight,pose.depth+pose.lookAhead)<Math.atan2(GAMEPLAY_CAMERA.height,GAMEPLAY_CAMERA.depth+GAMEPLAY_CAMERA.lookAhead));
});
test('normal gameplay has a lower three-quarter angle and modest magnification',()=>{
 const angle=Math.atan2(GAMEPLAY_CAMERA.height,GAMEPLAY_CAMERA.depth+GAMEPLAY_CAMERA.lookAhead)*180/Math.PI;
 assert.ok(angle>34&&angle<38);
 assert.ok(38/GAMEPLAY_CAMERA.viewHeight>1.1&&38/GAMEPLAY_CAMERA.viewHeight<1.2);
});
test('camera eases in, holds on pause, and eases back after boss death',()=>{
 const camera=createMissionBossCamera(),s=fight(),initial=camera.update(s,0);assert.equal(initial.blend,0);
 let previous=0;for(let i=0;i<36;i++){const pose=camera.update(s,1/60);assert.ok(pose.blend>=previous&&pose.blend-previous<.025);previous=pose.blend;}
 const before=camera.update(s,0);assert.ok(before.blend>.4&&before.blend<.6);assert.deepEqual(camera.update(s,0),before);
 settle(camera,s);s.enemies[0].hp=0;const returning=camera.update(s,1/60);assert.ok(returning.blend>.99&&returning.blend<1);
 assert.equal(settle(camera,s).blend,0);
});
test('reset clears the boss angle; reduced motion applies a static angle without a transition',()=>{
 const camera=createMissionBossCamera(),s=fight();assert.equal(camera.update(s,1/60,true).blend,1);camera.reset();assert.equal(camera.update(s,0).blend,0);
 assert.equal(camera.update({enemies:[]},1/60,true).blend,0);
});
