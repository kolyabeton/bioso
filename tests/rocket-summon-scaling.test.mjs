import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,step,spawnEnemy} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {modifiers} from '../src/systems/abilities.js';
import {summonTuning} from '../src/systems/symbionts.js';
import {weaponSustainedDps} from '../src/ui/adapters.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function run(){
 const s=createRun(undefined,'survival',27);s.rng=()=>.99;s.arms=[];s.organs=[];s.legs=[];
 s.world.heightAt=()=>0;s.world.lineClear=()=>true;s.world.walkable=()=>true;
 s.waves.credit=-Infinity;s.nextElite=s.nextBoss=Infinity;return s;
}
function part(s,key){const p=createPart(s,key);p.affixes=[];p.affix=null;return p;}

test('four disposable drones share the entire arm DPS budget of fifteen',()=>{
 const s=run(),rocket=part(s,'rocket');s.arms=[rocket];
 const e=spawnEnemy(s,'normal',{x:5,z:0},'mass',0,{promote:false});
 e.hp=e.maxHp=100000;e.armor=0;e.speed=e.damage=0;e.enemyAttack.readyAt=Infinity;
 near(weaponSustainedDps(s,rocket),15);
 attack(s,.01);assert.equal(s.shots.length,4);near(s.shots.reduce((sum,q)=>sum+q.w.damage,0),48);
 s.arms=[];
 for(let t=0;t<3;t+=.02)step(s,.02);
 near(100000-e.hp,48);assert.equal(s.shots.length,0);assert.equal(s.abilities.companions.length,0);
 for(let t=0;t<3;t+=.02)step(s,.02);
 near(100000-e.hp,48);
});

test('rocket damage multiplies ordinary weapon bonuses by swarm skill and equipment bonuses',()=>{
 const s=run(),rocket=part(s,'rocket'),pistol=part(s,'pistol');s.arms=[rocket];
 near(weaponStats(s,rocket).damage,12);
 s.abilities.minor={'minor.damage':2};
 const ordinary=weaponStats(s,rocket),pistolBefore=weaponStats(s,pistol);assert.ok(ordinary.damage>12);
 s.abilities.learned=['summons.1','summons.2','summons.3'];s.organs=[part(s,'broodNode')];s.legs=[part(s,'swarmLeg')];
 const tuning=summonTuning(s,modifiers(s)),hybrid=weaponStats(s,rocket);
 near(hybrid.damage,ordinary.damage*tuning.damage);near(hybrid.summonBossDamage,tuning.bossDamage);
 near(hybrid.interval,ordinary.interval);near(weaponStats(s,pistol).damage,pistolBefore.damage);
});

test('one rocket splash applies swarm boss damage once, only to elite and boss targets',()=>{
 for(const kind of ['elite','boss','final']){
  const s=run(),rocket=part(s,'rocket');s.arms=[rocket];s.abilities.learned=['summons.1','summons.3'];s.organs=[part(s,'broodNode')];
  const normal=spawnEnemy(s,'normal',{x:5,z:0},'mass',0,{promote:false});
  const special=spawnEnemy(s,'normal',{x:5,z:0},'mass',0,{promote:false});special.kind=kind;
  for(const e of [normal,special]){e.hp=e.maxHp=100000;e.armor=0;e.speed=e.damage=0;e.enemyAttack.readyAt=Infinity;e.frozenUntil=Infinity;}
  const w=weaponStats(s,rocket);attack(s,.01);assert.equal(s.shots.length,4);
  s.shots=s.shots.slice(0,1);s.arms=[];
  // In-flight rockets keep their launch-time bonuses, even after equipment changes.
  s.abilities.learned=[];s.organs=[];
  for(let t=0;t<3&&normal.hp===100000;t+=.02)step(s,.02);
  near(100000-normal.hp,w.damage);near(100000-special.hp,w.damage*w.summonBossDamage);
 }
});
