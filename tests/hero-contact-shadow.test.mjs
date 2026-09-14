import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createHeroContactShadow} from '../src/hero-contact-shadow.js';

test('contact patch follows the player and conforms to sloped ground',()=>{
 const scene=new T.Scene(),shadow=createHeroContactShadow(scene),world={heightAt:(x,z)=>x*.3-z*.15};
 const state={player:{x:5,z:7,y:.45},world};shadow.update(state,true,1);
 const mesh=scene.getObjectByName('environment-hero-contact'),positions=mesh.geometry.attributes.position;
 assert.equal(mesh.visible,true);
 for(let i=0;i<positions.count;i++){
  const x=mesh.position.x+positions.getX(i)*mesh.scale.x,z=mesh.position.z+positions.getZ(i)*mesh.scale.z;
  assert.ok(Math.abs(mesh.position.y+positions.getY(i)-world.heightAt(x,z)-.045)<1e-6);
 }
 state.player.x+=3;shadow.update(state,true,1);assert.equal(mesh.position.x,8.18);
 shadow.dispose();assert.equal(scene.children.length,0);
});
test('scales with body, softens in air and hides outside the world',()=>{
 const scene=new T.Scene(),shadow=createHeroContactShadow(scene),state={player:{x:0,z:0,y:0},world:{heightAt:()=>0}};
 shadow.update(state,true,1);const mesh=scene.children[0],width=mesh.scale.x;
 shadow.update(state,true,2);assert.equal(mesh.scale.x,width*2);
 state.player.y=3;shadow.update(state,true,2);assert.ok(mesh.material.uniforms.contactOpacity.value<1);
 assert.ok(mesh.scale.x>width*2);
 shadow.update(state,false,2);assert.equal(mesh.visible,false);
 shadow.update({player:state.player,world:{}},false);assert.equal(mesh.visible,false);
 state.world={heightAt:()=>null};shadow.update(state,true);assert.equal(mesh.visible,false);
 shadow.reset();shadow.dispose();
});
