import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createDodgeAfterimageView,DODGE_AFTERIMAGE_SECONDS} from '../src/dodge-afterimage-view.js';

test('successful dodge leaves a bounded turquoise hero afterimage for 0.15 seconds',()=>{
 const scene=new T.Scene(),hero=new T.Group(),body=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial());hero.add(body);scene.add(hero);hero.position.set(2,1,-3);
 const view=createDodgeAfterimageView(scene),root=scene.getObjectByName('dodge-afterimages');
 assert.equal(view.event({type:'player-hit',dx:1,dz:0},hero),false);assert.equal(view.info().active,0);
 assert.equal(view.event({type:'dodge',dx:1,dz:0},hero),true);assert.deepEqual(view.info(),{active:1,duration:.15,reducedMotion:false});
 const ghost=root.children.find(child=>child.visible);assert.ok(ghost);assert.equal(ghost.children.length,1);assert.equal(ghost.children[0].material.color.getHex(),0x55d7cf);assert.equal(ghost.position.x,-.28);
 view.update(DODGE_AFTERIMAGE_SECONDS-.01);assert.equal(view.info().active,1);assert.ok(ghost.children[0].material.opacity>0);
 view.update(.01);assert.equal(view.info().active,0);assert.equal(ghost.visible,false);
 view.update(0,true);assert.equal(view.event({type:'dodge',dx:1,dz:0},hero),false);assert.equal(view.info().active,0);
 view.reset();view.dispose();body.geometry.dispose();body.material.dispose();assert.equal(scene.getObjectByName('dodge-afterimages'),undefined);
});
