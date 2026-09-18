import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step,hurtEnemy,spawnEnemy} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {newProfile,createPart} from '../src/assembly.js';
import {MISSION_BOSSES,bossDamageMultiplier,tickMissionBoss,missionBossStatus} from '../src/systems/mission-bosses.js';
import {MISSION_BOSS_REINFORCEMENT_CAP,MISSION_BOSS_WAVE_INTERVAL,MISSION_BOSS_WAVE_SIZE} from '../src/mission-run.js';
function fixture(id='garden'){
 const s=createWorldRun(newProfile(),id,917),m=s.mission,i=m.floors-1;m.currentFloor=i;
 for(let j=0;j<i;j++){m.floorsState[j].state='cleared';s.exploration.groups[j].state='cleared';}
 m.floorsState[i].state=s.exploration.groups[i].state='ready';s.player={x:0,y:0,z:-i*64+2};s.arms=[];s.health.invulnerableUntil=Infinity;step(s,0);
 const b=s.enemies.find(e=>e.bossCombat);s.enemies=s.enemies.filter(e=>e===b||e.bossOwner);s.ground=[];s.xpDrops=[];return{s,b};
}
function advance(s,seconds){for(let i=0;i<Math.round(seconds*60);i++){step(s,1/60);s.events=[];}}
test('real final-room spawns own distinct metre scales and speeds; survival stays generic',()=>{
 const entries=['garden','quarantine','core','nursery','mother'].map(id=>fixture(id));
 assert.equal(new Set(entries.map(({b})=>b.radius)).size,5);assert.ok(entries[1].b.radius>entries[0].b.radius*3);assert.equal(entries[2].b.speed,0);assert.ok(entries[0].b.speed>entries[1].b.speed*5);
 for(const {s,b}of entries){assert.equal(s.enemies.filter(e=>e.bossOwner).length,MISSION_BOSSES[b.bossDesignId].nodes||0);assert.equal(b.assembly,null);}
 const s=createRun();const b=spawnEnemy(s,'boss',{x:0,z:10});assert.equal(b.bossCombat,undefined);
});
test('hunter locks a telegraphed direction, dashes with swept collision and opens a punish window',()=>{
 const {s,b}=fixture();s.time=2;tickMissionBoss(s,b,0,()=>{});const w={...b.enemyAttack.warning};assert.equal(w.bossAction,'dash');assert.ok(w.at-w.started>=.9);
 s.time=w.at;tickMissionBoss(s,b,0,()=>{});assert.ok(b.bossCombat.dash);const x=b.x,z=b.z;s.player.x=6;let hits=0;
 for(let i=0;i<120&&b.bossCombat.dash;i++){s.time+=1/60;tickMissionBoss(s,b,1/60,()=>hits++);}
 assert.ok(Math.abs(b.x-x)<.01);assert.ok(b.z-z>8);assert.equal(hits,0);assert.ok(b.bossCombat.exposedUntil>s.time);assert.equal(bossDamageMultiplier(s,b,'direct'),1.65);
 const f=fixture();f.s.time=2;tickMissionBoss(f.s,f.b,0,()=>{});f.s.time=f.b.enemyAttack.warning.at;tickMissionBoss(f.s,f.b,0,()=>{});tickMissionBoss(f.s,f.b,1,()=>hits++);assert.equal(hits,1);
});
test('leviathan support destruction slows locomotion and exposes its core without farming loot',()=>{
 const {s,b}=fixture('quarantine'),speed=b.speed,initial=bossDamageMultiplier(s,b,'direct');const q=s.enemies.find(e=>e.kind==='boss-part');hurtEnemy(s,q,q.hp+1);tickMissionBoss(s,b,0,()=>{});
 assert.ok(b.speed<speed);assert.deepEqual(b.bossCombat.disabledSupports,[0]);assert.ok(bossDamageMultiplier(s,b,'direct')>initial);assert.equal(s.xpDrops.length,0);assert.equal(s.ground.length,0);assert.equal(s.kills,0);
});
test('cathedral stays anchored, drops defence with three roots, aims avoidable ground attacks and fires seeds',()=>{
 const {s,b}=fixture('core'),start={x:b.x,z:b.z};assert.equal(bossDamageMultiplier(s,b,'direct'),.22);advance(s,12);assert.equal(b.x,start.x);assert.equal(b.z,start.z);assert.ok(b.bossCombat.counts.roots>=2);
 for(const q of s.enemies.filter(e=>e.kind==='boss-part'))hurtEnemy(s,q,1e9);step(s,1/60);assert.equal(b.bossCombat.phase,2);assert.equal(b.armor,0);assert.ok(bossDamageMultiplier(s,b,'direct')>1);
});
test('collector copies ranged and melee loadouts; reflection emits dodgeable capped projectiles',()=>{
 const {s,b}=fixture('nursery');s.arms=[createPart(s,'seed')];s.time=2;tickMissionBoss(s,b,0,()=>{});assert.equal(b.bossCombat.copiedWeapon,'seed');assert.equal(b.enemyAttack.warning.mode,'shot');
 b.enemyAttack.warning=null;b.bossCombat.readyAt=0;s.arms=[createPart(s,'claws')];tickMissionBoss(s,b,0,()=>{});assert.equal(b.bossCombat.copiedWeapon,'claws');assert.equal(b.enemyAttack.warning.mode,'area');
 b.bossCombat.mirrorUntil=s.time+2;s.hostileShots=[];for(let i=0;i<20;i++)hurtEnemy(s,b,1);assert.equal(s.hostileShots.length,1);assert.equal(s.hostileShots[0].speed,4.5);assert.equal(s.health.hits,0);
});
test('shepherd releases real targetable bees, caps the swarm, loses flight and switches to ground claws',()=>{
 const {s,b}=fixture('mother');advance(s,3.15);let bees=s.enemies.filter(e=>e.kind==='boss-drone');assert.ok(bees.length>0&&bees.length<=8);assert.ok(b.bossHover>0);
 const q=bees[0];hurtEnemy(s,q,1e9);assert.equal(q.hp,0);assert.equal(s.kills,0);
 for(const node of s.enemies.filter(e=>e.kind==='boss-part'))hurtEnemy(s,node,1e9);step(s,1/60);assert.equal(b.bossCombat.phase,2);assert.equal(b.bossHover,0);advance(s,7);assert.ok(b.bossCombat.counts['ground-claws']>0);
});
test('warnings deal damage only at resolution and can be dodged; freeze cancels release',()=>{
 const {s,b}=fixture('core');s.time=2;let hits=0;tickMissionBoss(s,b,0,()=>hits++);assert.equal(hits,0);const w=b.enemyAttack.warning;s.player.x=w.x+w.radius+2;s.time=w.at;tickMissionBoss(s,b,0,()=>hits++);assert.equal(hits,0);
 b.bossCombat.readyAt=0;tickMissionBoss(s,b,0,()=>hits++);b.frozenUntil=s.time+2;tickMissionBoss(s,b,.1,()=>hits++);assert.equal(b.enemyAttack.warning,null);assert.equal(hits,0);
});
test('boss death removes children, pending attacks and projectiles; no posthumous damage',()=>{
 const {s,b}=fixture('mother');advance(s,3.2);s.hostileShots.push({owner:b.id,life:3});hurtEnemy(s,b,1e12);assert.ok(s.enemies.filter(e=>e.bossOwner===b.id).every(e=>e.hp===0));assert.equal(s.hostileShots.length,0);assert.equal(b.enemyAttack.warning,null);
});
test('boss combat keeps spawning bounded monster waves until the boss dies',()=>{
 const {s,b}=fixture('garden'),floor=s.mission.floorsState.at(-1);s.health.invulnerableUntil=Infinity;
 for(let wave=1;wave<=5;wave++){
  s.time=floor.bossWave.nextAt;step(s,0);
  const reinforcements=s.enemies.filter(e=>e.hp>0&&e.bossReinforcement);
  assert.equal(reinforcements.length,Math.min(wave*MISSION_BOSS_WAVE_SIZE,MISSION_BOSS_REINFORCEMENT_CAP));
  assert.ok(reinforcements.every(e=>floor.members.includes(e.id)&&e.kind==='normal'));
  assert.equal(floor.bossWave.nextAt,s.time+MISSION_BOSS_WAVE_INTERVAL);
 }
 const before=s.enemies.filter(e=>e.hp>0&&e.bossReinforcement).length;
 hurtEnemy(s,b,1e12);s.time=floor.bossWave.nextAt;step(s,0);
 assert.equal(s.enemies.filter(e=>e.hp>0&&e.bossReinforcement).length,before);
});
test('all five bosses execute three distinct attacks in bounded loops and keep fighting in phase two',()=>{
 const attacks={garden:['dash','hunter-volley','hunter-pounce'],quarantine:['crush','scrap-volley','shock-ring'],core:['roots','seed-volley','root-ring'],nursery:['copy','mirror-volley','mirror-collapse'],mother:['swarm','hive-volley','brood-ring']};
 for(const id of Object.keys(attacks)){const {s,b}=fixture(id);advance(s,24);for(const action of attacks[id])assert.ok(b.bossCombat.counts[action]>0,`${id}/${action}`);assert.ok(b.bossCombat.cycle>=3,id);assert.ok(s.enemies.length<=13+MISSION_BOSS_REINFORCEMENT_CAP,id);assert.ok(s.hostileShots.length<=30,id);assert.ok(Number.isFinite(b.x)&&s.world.heightAt(b.x,b.z)!==null,id);b.hp=b.maxHp*.45;advance(s,8);assert.equal(b.bossCombat.phase,2);assert.ok(missionBossStatus(s,b).length);}
});
test('melee and projectile broad phase hit the surface of a giant boss, not only its centre',()=>{
 const {s,b}=fixture('quarantine');s.enemies=[b];b.bossCombat.readyAt=1e6;s.player={x:0,y:0,z:b.z+b.radius+1,facing:Math.PI};s.arms=[createPart(s,'claws')];const before=b.hp;step(s,1/60);assert.ok(b.hp<before,'claws reach the hull surface');
 s.arms=[];s.shots=[{id:999,x:0,y:1,z:b.z+b.radius+.5,dx:0,dz:-1,dy:0,speed:6,life:2,travel:0,mode:'projectile',remaining:1,hit:new Set(),w:{key:'seed',mode:'projectile',damage:10,crit:0,critPower:1,range:20,knockback:0}}];const hp=b.hp;step(s,.1);assert.ok(b.hp<hp,'projectile hits at radius seven');
});
test('production hit path applies final-room attack scaling to root strikes and attacking bees',()=>{
 const {s,b}=fixture('core');s.health.invulnerableUntil=0;s.health.armorSpent=1e6;advance(s,3.3);assert.equal(s.health.hits,1);assert.equal(s.hp,2);assert.equal(s.dead,false);
 const m=fixture('mother');advance(m.s,3.15);const bee=m.s.enemies.find(e=>e.kind==='boss-drone');m.s.health.invulnerableUntil=0;m.s.health.armorSpent=1e6;bee.x=m.s.player.x;bee.z=m.s.player.z-.1;step(m.s,1/60);assert.equal(m.s.health.hits,1);assert.equal(m.s.hp,2);assert.equal(bee.hp,0);
});

test('destroying the last command node cancels an already prepared swarm before phase two',()=>{
 const {s,b}=fixture('mother');s.time=2;tickMissionBoss(s,b,0,()=>{});assert.equal(b.enemyAttack.warning.bossAction,'swarm');for(const q of s.enemies.filter(e=>e.kind==='boss-part'))hurtEnemy(s,q,1e9);tickMissionBoss(s,b,0,()=>{});assert.equal(b.enemyAttack.warning,null);assert.equal(b.bossCombat.phase,2);advance(s,4);assert.equal(s.enemies.filter(e=>e.kind==='boss-drone').length,0);assert.ok(b.bossCombat.counts['ground-claws']>0);
});
