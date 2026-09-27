import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step,hurtEnemy,spawnEnemy} from '../src/game.js';
import {createWorldRun} from '../src/world-run.js';
import {newProfile,createPart} from '../src/assembly.js';
import {MISSION_BOSSES,bossDamageMultiplier,tickMissionBoss,missionBossStatus} from '../src/systems/mission-bosses.js';
import {MISSION_BOSS_HP_SCALE,missionRoomStrength,MISSION_BOSS_REINFORCEMENT_CAP,MISSION_BOSS_WAVE_INTERVAL,MISSION_BOSS_WAVE_SIZE,MISSION_EIGHTH_FLOOR_ELITES} from '../src/mission-run.js';
function fixture(id='garden'){
 const s=createWorldRun(newProfile(),id,917),m=s.mission,i=m.floors-1;m.currentFloor=i;
 for(let j=0;j<i;j++){m.floorsState[j].state='cleared';s.exploration.groups[j].state='cleared';}
 m.floorsState[i].state=s.exploration.groups[i].state='ready';s.player={x:0,y:0,z:-i*64+2};s.arms=[];s.health.invulnerableUntil=Infinity;step(s,0);
 const b=s.enemies.find(e=>e.bossCombat);s.enemies=s.enemies.filter(e=>e===b||e.bossOwner);s.ground=[];s.xpDrops=[];return{s,b};
}
function advance(s,seconds){for(let i=0;i<Math.round(seconds*60);i++){step(s,1/60);s.events=[];}}
/** Drone shots are short lived and are consumed on contact, so sampling a single
 * frame is a race. Report whether the predicate ever held during the window. */
function advanceWatching(s,seconds,predicate){let seen=false;for(let i=0;i<Math.round(seconds*60);i++){step(s,1/60);seen||=predicate(s);s.events=[];}return seen;}
test('all mission bosses use the first mission health reduction and unified hard attack damage',()=>{
 assert.equal(MISSION_BOSS_HP_SCALE,.125);
 for(const id of ['garden','quarantine','core','nursery','mother']){
  const {s,b}=fixture(id),m=s.mission,index=m.floors-1;
  const raw=spawnEnemy(s,'boss',{x:0,z:0},'mass',m.difficulty*60+index*50+m.difficulty*360);
  assert.equal(b.maxHp,Math.max(1,Math.round(raw.maxHp*missionRoomStrength(index)*.125)),id);
  assert.equal(b.hp,b.maxHp,id);assert.equal(b.damage,2,id);
 }
});
test('real final-room spawns own distinct metre scales and speeds; survival stays generic',()=>{
 const entries=['garden','quarantine','core','nursery','mother'].map(id=>fixture(id));
 assert.equal(new Set(entries.map(({b})=>b.radius)).size,5);assert.ok(entries[1].b.radius>entries[0].b.radius*3);assert.equal(entries[2].b.speed,0);assert.ok(entries[0].b.speed>entries[1].b.speed*5);
 for(const {s,b}of entries){assert.equal(s.enemies.filter(e=>e.bossOwner).length,0);assert.equal(b.assembly,null);}
 const s=createRun();const b=spawnEnemy(s,'boss',{x:0,z:10});assert.equal(b.bossCombat,undefined);
});
test('authored boss dash uses half of the Shield slow',()=>{
 const travel=slow=>{const {s,b}=fixture('quarantine');s.time=2;s.world.heightAt=()=>0;s.streaming=null;b.bossCombat.dash={dx:1,dz:0,left:100,hit:true};if(slow){b.shieldAuraUntil=10;b.shieldAuraSlow=.4;}const x=b.x;tickMissionBoss(s,b,.1,()=>{});return b.x-x;};
 const normal=travel(false),slowed=travel(true);assert.ok(normal>0);assert.ok(Math.abs(slowed/normal-.8)<1e-8,`${slowed} / ${normal}`);
});
test('hunter locks a telegraphed direction, dashes with swept collision and opens a punish window',()=>{
 const {s,b}=fixture();s.time=2;tickMissionBoss(s,b,0,()=>{});const w={...b.enemyAttack.warning};assert.equal(w.bossAction,'dash');assert.ok(w.at-w.started>=.45);
 s.time=w.at;tickMissionBoss(s,b,0,()=>{});assert.ok(b.bossCombat.dash);const x=b.x,z=b.z;s.player.x=6;let hits=0;
 for(let i=0;i<120&&b.bossCombat.dash;i++){s.time+=1/60;tickMissionBoss(s,b,1/60,()=>hits++);}
 assert.ok(Math.abs(b.x-x)<.01);assert.ok(b.z-z>8);assert.equal(hits,0);assert.ok(b.bossCombat.exposedUntil>s.time);assert.equal(bossDamageMultiplier(s,b,'direct'),1.65);
 const f=fixture();f.s.time=2;tickMissionBoss(f.s,f.b,0,()=>{});f.s.time=f.b.enemyAttack.warning.at;tickMissionBoss(f.s,f.b,0,()=>{});tickMissionBoss(f.s,f.b,1,()=>hits++);assert.equal(hits,1);
});
test('mission bosses have no targetable support parts or support-dependent mitigation',()=>{
 const {s,b}=fixture('quarantine');assert.equal(s.enemies.some(e=>e.kind==='boss-part'),false);assert.equal(bossDamageMultiplier(s,b,'direct'),1);assert.equal(b.speed,MISSION_BOSSES[b.bossDesignId].speed*2);
});
test('leviathan is smaller and holds a three-second low-armor melee punish window after crush',()=>{
 const {s,b}=fixture('quarantine');assert.equal(b.radius,11);
 s.time=2;tickMissionBoss(s,b,0,()=>{});assert.equal(b.enemyAttack.warning.bossAction,'crush');
 s.time=b.enemyAttack.warning.at;tickMissionBoss(s,b,0,()=>{});
 assert.equal(b.bossCombat.exposedUntil,s.time+3);assert.equal(b.armor,26);assert.equal(bossDamageMultiplier(s,b,'direct'),1.65);
 const old={x:b.x,z:b.z};s.player.x=20;s.time+=1;tickMissionBoss(s,b,.5,()=>{});
 assert.equal(b.x,old.x);assert.equal(b.z,old.z);
 s.time=b.bossCombat.exposedUntil;tickMissionBoss(s,b,0,()=>{});assert.equal(b.armor,84.5);
});
test('cathedral stays anchored, aims avoidable ground attacks and fires seeds without roots',()=>{
 const {s,b}=fixture('core'),start={x:b.x,z:b.z};assert.equal(bossDamageMultiplier(s,b,'direct'),1);advance(s,12);assert.equal(b.x,start.x);assert.equal(b.z,start.z);assert.ok(b.bossCombat.counts.roots>=2);
 b.hp=b.maxHp*.45;step(s,1/60);assert.equal(b.bossCombat.phase,2);assert.equal(b.armor,MISSION_BOSSES[b.bossDesignId].armor*1.3);
});
test('collector copies ranged and melee loadouts; reflection emits dodgeable capped projectiles',()=>{
 const {s,b}=fixture('nursery');s.arms=[createPart(s,'seed')];s.time=2;tickMissionBoss(s,b,0,()=>{});assert.equal(b.bossCombat.copiedWeapon,'seed');assert.equal(b.enemyAttack.warning.mode,'shot');
 b.enemyAttack.warning=null;b.bossCombat.readyAt=0;s.arms=[createPart(s,'claws')];tickMissionBoss(s,b,0,()=>{});assert.equal(b.bossCombat.copiedWeapon,'claws');assert.equal(b.enemyAttack.warning.mode,'area');
 b.bossCombat.mirrorUntil=s.time+2;s.hostileShots=[];for(let i=0;i<20;i++)hurtEnemy(s,b,1);assert.equal(s.hostileShots.length,1);assert.equal(s.hostileShots[0].speed,4.5);assert.equal(s.health.hits,0);
});
test('shepherd telegraphs a laser from its eye and its targetable flies fire projectiles',()=>{
 const {s,b}=fixture('mother');s.time=2;tickMissionBoss(s,b,0,()=>{});assert.equal(b.enemyAttack.warning.bossAction,'eye-laser');assert.equal(b.enemyAttack.warning.mode,'laser');
 s.time=b.enemyAttack.warning.at;tickMissionBoss(s,b,0,()=>{});b.bossCombat.readyAt=s.time;tickMissionBoss(s,b,0,()=>{});s.time=b.enemyAttack.warning.at;tickMissionBoss(s,b,0,()=>{});const bees=s.enemies.filter(e=>e.kind==='boss-drone');assert.ok(bees.length>0&&bees.length<=8);assert.ok(advanceWatching(s,2,run=>run.hostileShots.some(q=>q.kind==='boss-drone')),'each fly fires its own projectile');
 const q=bees[0];hurtEnemy(s,q,1e9);assert.equal(q.hp,0);assert.equal(s.kills,0);b.hp=b.maxHp*.45;step(s,1/60);assert.equal(b.bossCombat.phase,2);
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
 const attacks={garden:['dash','hunter-volley','hunter-pounce'],quarantine:['crush','scrap-volley','shock-ring'],core:['roots','seed-volley','root-ring'],nursery:['copy','mirror-volley','mirror-collapse'],mother:['eye-laser','swarm','brood-ring']};
 for(const id of Object.keys(attacks)){const {s,b}=fixture(id);advance(s,24);for(const action of attacks[id])assert.ok(b.bossCombat.counts[action]>0,`${id}/${action}`);assert.ok(b.bossCombat.cycle>=3,id);assert.ok(s.enemies.length<=13+MISSION_BOSS_REINFORCEMENT_CAP,id);assert.ok(s.hostileShots.length<=30,id);assert.ok(Number.isFinite(b.x)&&s.world.heightAt(b.x,b.z)!==null,id);b.hp=b.maxHp*.45;advance(s,8);assert.equal(b.bossCombat.phase,2);assert.ok(missionBossStatus(s,b).length);}
});
test('melee and projectile broad phase hit the surface of a giant boss, not only its centre',()=>{
 const {s,b}=fixture('quarantine');s.enemies=[b];b.bossCombat.readyAt=1e6;s.player={x:0,y:0,z:b.z+b.radius+1,facing:Math.PI};s.arms=[createPart(s,'claws')];const before=b.hp;step(s,1/60);assert.ok(b.hp<before,'claws reach the hull surface');
 s.arms=[];s.shots=[{id:999,x:0,y:1,z:b.z+b.radius+.5,dx:0,dz:-1,dy:0,speed:6,life:2,travel:0,mode:'projectile',remaining:1,hit:new Set(),w:{key:'seed',mode:'projectile',damage:10,crit:0,critPower:1,range:20,knockback:0}}];const hp=b.hp;step(s,.1);assert.ok(b.hp<hp,'projectile hits at radius seven');
});
test('production hit path applies unified hard boss damage to root strikes and attacking bees',()=>{
 const {s,b}=fixture('core');s.health.invulnerableUntil=0;s.health.armorSpent=1e6;advance(s,3.3);assert.equal(s.health.hits,1);assert.equal(s.hp,2);assert.equal(s.dead,false);
 const m=fixture('mother');
 // The eye laser now takes slot 0, so the swarm lands later than a fixed 3.15 s.
 let bee=null;for(let i=0;i<60*20&&!bee;i++){step(m.s,1/60);m.s.events=[];bee=m.s.enemies.find(e=>e.kind==='boss-drone');}
 assert.ok(bee,'the shepherd releases flies');m.s.health.invulnerableUntil=0;m.s.health.armorSpent=1e6;bee.x=m.s.player.x;bee.z=m.s.player.z-.1;step(m.s,1/60);assert.equal(m.s.health.hits,1);assert.equal(m.s.hp,2);assert.equal(bee.hp,0);
});

test('every eighth ordinary mission floor spawns five real elite defenders',()=>{
 const s=createWorldRun(newProfile(),'garden',917),floor=s.mission.floorsState[7];for(let i=0;i<7;i++){s.mission.floorsState[i].state='cleared';s.exploration.groups[i].state='cleared';}s.mission.currentFloor=7;floor.state=s.exploration.groups[7].state='ready';s.player={x:0,y:0,z:floor.z};step(s,0);const elites=s.enemies.filter(e=>floor.members.includes(e.id)&&e.kind==='elite');assert.equal(elites.length,MISSION_EIGHTH_FLOOR_ELITES);
});
