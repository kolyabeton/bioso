import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createNavigationGuideView} from '../src/navigation-guide-view.js';
import {createWrongWayFeedback,movementTargetAlignment} from '../src/systems/waypoint.js';

function fixture(){return{mode:'survival',introBossId:7,dead:false,player:{x:0,y:0,z:0},enemies:[{id:7,kind:'boss',hp:20,x:0,y:0,z:-30}],world:{heightAt:()=>0}};}

test('mission guide is a gold three dimensional elongated diamond with bounded particles',()=>{
 const scene=new T.Scene(),view=createNavigationGuideView(scene),camera=new T.OrthographicCamera(-8,8,17,-17,.1,200),canvas={clientWidth:390,clientHeight:844},s=fixture();camera.position.set(0,30,40);camera.lookAt(0,0,-1.4);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 assert.equal(view.update(s,camera,canvas,1,false),true);const root=scene.getObjectByName('mission-navigation-guide'),arrow=scene.getObjectByName('mission-navigation-arrow'),particles=scene.getObjectByName('mission-navigation-particles');
 assert.equal(root.visible,true);assert.equal(scene.getObjectByName('mission-navigation-halo'),undefined);assert.equal(arrow.geometry.type,'ExtrudeGeometry');assert.equal(arrow.geometry.parameters.shapes.holes.length,1);assert.equal(arrow.material.opacity,.66);assert.equal(arrow.material.depthTest,false);assert.equal(particles.geometry.drawRange.count,28);assert.equal(view.info().missionGuideTarget,7);
 const firstRotation=root.rotation.y;s.enemies[0].x=30;s.enemies[0].z=0;view.update(s,camera,canvas,2,false);assert.notEqual(root.rotation.y,firstRotation);
 view.update(s,camera,canvas,2,true);assert.equal(particles.geometry.drawRange.count,0);s.enemies[0].hp=0;assert.equal(view.update(s,camera,canvas,3,false),false);assert.equal(root.visible,false);
 s.encounters={active:{dungeon:true,aggroZones:[{id:'aggro-1',state:'idle',x:16,y:0,z:0}]}};assert.equal(view.update(s,camera,canvas,4,false),true);assert.equal(view.info().missionGuideTarget,'aggro-1');view.dispose();
});

test('wrong-way feedback waits for sustained reverse movement and uses a light sparse pulse',()=>{
 const s=fixture(),pulses=[],feedback=createWrongWayFeedback(ms=>pulses.push(ms));
 assert.ok(movementTargetAlignment(s,{x:0,z:-1})>.99);assert.ok(movementTargetAlignment(s,{x:0,z:1})<-.99);
 feedback.update(s,{x:0,z:1},.2);feedback.update(s,{x:0,z:1},.2);assert.deepEqual(pulses,[]);feedback.update(s,{x:0,z:1},.1);assert.deepEqual(pulses,[8]);
 for(let i=0;i<5;i++)feedback.update(s,{x:0,z:1},.2);assert.deepEqual(pulses,[8]);for(let i=0;i<3;i++)feedback.update(s,{x:0,z:1},.2);assert.deepEqual(pulses,[8,8]);
 feedback.update(s,{x:0,z:-1},.1);assert.equal(feedback.state().wrongFor,0);feedback.reset();assert.equal(feedback.state().targetKey,'');
});
