import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,upgrade} from '../src/assembly.js';
import {healthView,tickHealth,receiveHit} from '../src/systems/health.js';
import {learn} from '../src/systems/abilities.js';
import {soulStatGroups} from '../src/ui/soul-stats.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function fixture(){const s=createRun();s.organs=[createPart(s,'regen')];s.legs=s.legs.map(()=>null);s.hp=25;s.health.missing=stats(s).hp-s.hp;s.health.armorSpent=100;return s;}
test('Repairman heals continuously at one percent of maximum per second, with no timer',()=>{
 const s=fixture(),st=stats(s);near(st.regenPerSecond,.01);for(let i=1;i<=40;i++){s.time=i*.05;tickHealth(s,st);assert.equal(Number.isInteger(s.hp),true);}assert.equal(s.hp,26);near(s.health.healRemainder,.5);
 const v=healthView(s,st.hp,st.armor,st);assert.equal(v.regenActive,true);assert.equal(v.regenProgress,0);assert.equal(v.regenSecondsLeft,0);
 assert.deepEqual(soulStatGroups(s,st).flatMap(g=>g.rows).filter(([l])=>l==='Регенерация'),[['Регенерация','1%/с']]);
});
test('damage does not interrupt regeneration; sources and upgrades add their rates',()=>{
 const s=fixture();s.organs.push(createPart(s,'regen',5));s.legs[0]=createPart(s,'root');learn(s,'vitality.2');let st=stats(s);near(st.regenPerSecond,.052);
 s.hp=st.hp-25;s.health.missing=25;s.time=.5;tickHealth(s,st);receiveHit(s,st,{damage:.5});const hp=s.hp,progress=s.health.healRemainder;s.time=.6;tickHealth(s,st);assert.equal(Number.isInteger(s.hp),true);assert.ok(s.hp>=hp);assert.ok(s.health.healRemainder!==progress);
 const before=s.hp;assert.ok(upgrade(s,s.organs[0].id,'regenRate'));assert.equal(s.hp,before);near(stats(s).regenPerSecond,.055);
});
test('healing suppression, full health and death stop recovery without banking it',()=>{
 const s=fixture(),st=stats(s);s.encounters={active:{type:'infection',x:s.player.x,z:s.player.z,radius:5}};s.time=.5;tickHealth(s,st);assert.equal(s.hp,25);assert.equal(s.health.healRemainder,0);
 s.encounters=null;s.time=.6;tickHealth(s,st);assert.equal(s.hp,25);near(s.health.healRemainder,st.hp*.001);
 s.hp=st.hp;s.time=.7;tickHealth(s,st);assert.equal(s.hp,st.hp);assert.equal(healthView(s,st.hp,st.armor,st).regenActive,false);
 s.hp=0;s.time=.8;tickHealth(s,st);assert.equal(s.hp,0);
});
