import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {CATALOG} from '../src/catalog.js';
import {createPart,upgradeOptions,upgrade,capacity,weight,stats,weaponStats} from '../src/assembly.js';
test('every catalog part exposes at most one upgrade parameter',()=>{
 const s=createRun();for(const [key,d] of Object.entries(CATALOG)){
  const p=createPart(s,key),expected={body:['capacity'],arm:['damage'],leg:[d.upgradeStat||'speed']}[d.kind]||(['digestion','stabilizer','accelerator'].includes(key)?['power']:[]);
  assert.deepEqual(upgradeOptions(p),expected,key);
 }
});
test('wrong parameters are rejected without spending resources or modifying parts',()=>{
 const s=createRun();s.biomass=1000;
 for(const [p,forbidden] of [[s.body,['hp','armor','damage']],[s.legs[0],['armor','hp','damage']],[s.arms[0],['rate','crit','critPower']]]){
  for(const key of forbidden){const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,key,true),false);assert.equal(JSON.stringify(s),before);}
 }
});
test('capacity grows through ten ranks without adding weight or health',()=>{
 const s=createRun(),p=s.body,oldWeight=weight(p),oldHp=stats(s).hp;for(let i=0;i<10;i++)assert.ok(upgrade(s,p.id,'capacity'));
 assert.equal(capacity(p),200);assert.equal(weight(p),oldWeight);assert.equal(stats(s).hp,oldHp);assert.equal(upgrade(s,p.id,'capacity'),false);
});
test('leg speed and weapon damage improve without increasing armor or attack rate',()=>{
 const s=createRun(),before=stats(s),weapon=weaponStats(s,s.arms[0]);
 assert.ok(upgrade(s,s.legs[0].id,'speed'));assert.ok(stats(s).speed>before.speed);assert.equal(stats(s).armor,before.armor);
 assert.ok(upgrade(s,s.arms[0].id,'damage'));assert.ok(weaponStats(s,s.arms[0]).damage>weapon.damage);assert.equal(weaponStats(s,s.arms[0]).interval,weapon.interval);
});
