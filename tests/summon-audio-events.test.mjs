import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {learn} from '../src/systems/abilities.js';
import {tickEffects} from '../src/systems/effects.js';

test('skill, broodmother body, broodmother set and Pollinator all emit one bite event per attack',()=>{
 const s=createRun(undefined,'survival',20260914);
 s.world={flat:true,walkable:()=>true,lineClear:()=>true};s.enemies=[];s.events=[];
 s.body=createPart(s,'broodmother',1);s.body.setId='broodmother';
 const pollinator=createPart(s,'drone',1);pollinator.setId='broodmother';s.arms=[pollinator];
 const swarmLeg=createPart(s,'swarmLeg',1);swarmLeg.setId='broodmother';s.legs=[swarmLeg];s.organs=[];
 learn(s,'summons.0');
 s.enemies.push({id:'target-a',kind:'normal',hp:100000,maxHp:100000,x:.25,y:0,z:0,radius:.5,armor:0});
 s.enemies.push({id:'target-b',kind:'normal',hp:100000,maxHp:100000,x:.35,y:0,z:0,radius:.5,armor:0});
 tickEffects(s,.05,(enemy,damage)=>{enemy.hp-=damage;});
 const bites=s.events.filter(event=>event.type==='summon-attack');
 assert.deepEqual(new Set(bites.map(event=>event.source)),new Set(['symbiont-0','symbiont-1','set-broodmother',`drone-${pollinator.id}`]));
 assert.equal(bites.length,4);
 assert.equal(bites.filter(event=>event.sourcePartId===pollinator.id).length,1);
 assert.equal(s.events.filter(event=>event.type==='hit'&&event.key==='drone').length,2);
});
