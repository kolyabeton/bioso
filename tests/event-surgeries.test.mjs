import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,weaponStats} from '../src/assembly.js';
import {takeDeal,dealAllowed} from '../src/systems/events/altar.js';
import {EVENTS} from '../src/systems/events/definitions.js';
import {startChallenge,tickChallenge} from '../src/systems/events/challenges.js';
function scenario(type){const s=createRun(undefined,'survival',17);s.level=EVENTS[type].recommended;s.body=createPart(s,'bastion',3);s.body.tier=3;s.time=Math.max(300,EVENTS[type].available);s.hp=stats(s).hp;s.health.missing=0;s.enemies=[];const n={id:type,type,state:'ready',...s.player,radius:EVENTS[type].radius||1.4,deals:[EVENTS[type].deal],recommended:EVENTS[type].recommended};s.encounters={nodes:[n],active:null};return {s,n};}
for(const type of Object.keys(EVENTS).filter(t=>EVENTS[t].kind==='altar'))test(type+' charges one max HP once and applies only its bonus',()=>{
 const {s,n}=scenario(type),key=EVENTS[type].deal,p=s.arms[0],before=stats(s),damage=weaponStats(s,p).damage;
 assert.equal(dealAllowed(s,n,'wrong',p.id),false);assert(takeDeal(s,n.id,key,p.id));const after=stats(s);
 assert.equal(after.hp,before.hp-1);assert.equal(s.hp,before.hp-1);
 if(key==='fuse'){assert.equal(weaponStats(s,p).damage,damage*2);assert(p.bound);}
 if(key==='speed')assert.ok(Math.abs(after.speed-before.speed*1.15)<1e-8);
 if(key==='capacity')assert.equal(after.capacity,before.capacity+20);
 if(key==='armor')assert.equal(after.armor,before.armor+.5);
 const applied=JSON.stringify(s);assert.equal(takeDeal(s,n.id,key,p.id),false);assert.equal(JSON.stringify(s),applied);
});
test('fusion preserves the last current HP and rejects cross-operation offers atomically',()=>{const {s,n}=scenario('altar');s.hp=1;assert.equal(takeDeal(s,n.id,'fuse',s.arms[0].id),true);assert.equal(s.hp,1);assert.equal(s.arms[0].fused,true);const {s:other,n:otherNode}=scenario('altar');otherNode.deals.push('speed');const before=JSON.stringify(other);assert.equal(takeDeal(other,otherNode.id,'speed'),false);assert.equal(JSON.stringify(other),before);});
test('infection counts time in the expanded area, pauses outside, and rewards survival with pursuers alive',()=>{const {s,n}=scenario('infection');let id=0;assert(startChallenge(s,n.id,()=>{const e={id:++id,hp:100,maxHp:100,speed:8};s.enemies.push(e);return e;}));assert.equal(n.members.length,3);assert(s.enemies.every(e=>e.hp===800));s.player.x=n.x+10;tickChallenge(s,10);assert.equal(n.progress,10);s.player.x=n.x+n.radius+.1;tickChallenge(s,10);assert.equal(n.progress,10);s.player.x=n.x;tickChallenge(s,20);assert.equal(n.state,'reward');assert.equal(s.enemies.length,0);});
