import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,addXP,chooseUpgrade,receiveDamage,spawnEnemy,step,attack} from '../src/game.js';
import {stats,weaponStats,createPart,equip,unequip,swapBody,upgrade} from '../src/assembly.js';
import {ABILITIES,FALLBACKS,abilityLevel,learn,modifiers,attackTriggers} from '../src/systems/abilities.js';
import {eligible,rollChoices,abilityCards,xpRequired} from '../src/systems/progression.js';
import {tickHealth,vampireHit,healthView} from '../src/systems/health.js';
import {onHit,onDeath,enemyPace,tickEffects} from '../src/systems/effects.js';
import {enemyBalance,WAVE_RULES} from '../src/systems/balance.js';
import {tickWaves} from '../src/systems/waves.js';
const run=()=>createRun(undefined,'survival',88);
const install=(s,key,slot=0)=>{const p=createPart(s,key);s.inventory.push(p);assert.ok(equip(s,p.id,slot));return p;};
test('two whole lives; simultaneous contacts and protected hits do not charge armor',()=>{const s=run();assert.equal(s.hp,2);assert.equal(receiveDamage(s,10),'armor');assert.equal(s.hp,2);assert.equal(receiveDamage(s,1),'hurt');assert.equal(s.hp,1);for(let i=0;i<20;i++)receiveDamage(s,1);assert.equal(s.hp,1);assert.equal(s.health.hits,1);s.time=.99;assert.equal(receiveDamage(s,1),'ignored');assert.equal(s.hp,1);s.time=1;assert.equal(receiveDamage(s,1),'hurt');assert.equal(s.hp,0);assert.equal(healthView(s,2).segments.filter(Boolean).length,0);});
test('armor plates are spent before health and never recharge from hits',()=>{const s=run();learn(s,'vitality.1');assert.equal(receiveDamage(s,1),'armor');assert.equal(s.hp,2);assert.equal(healthView(s,2,stats(s).armor).armor,1);s.time=1;assert.equal(receiveDamage(s,1),'armor');s.time=2;assert.equal(receiveDamage(s,1),'armor');s.time=3;assert.equal(receiveDamage(s,1),'hurt');assert.equal(s.hp,1);s.time=100;tickHealth(s,stats(s));assert.equal(healthView(s,2,stats(s).armor).armor,0);});
test('shield transfer retains recharge and cannot be refilled by swapping',()=>{const s=run(),p=install(s,'shield');tickHealth(s,stats(s));s.time=14.99;tickHealth(s,stats(s));assert.equal(p.shieldCharge,0);s.time=15;tickHealth(s,stats(s));assert.equal(receiveDamage(s,1),'shield');unequip(s,'organs',0);equip(s,p.id,0);tickHealth(s,stats(s));assert.equal(p.shieldCharge,0);assert.equal(s.hp,2);});
test('capacity upgrades and body changes preserve wounds including clipped overflow',()=>{const s=run();receiveDamage(s,1);receiveDamage(s,1);upgrade(s,s.body.id,'capacity');assert.equal(s.hp,1);assert.equal(upgrade(s,s.body.id,'hp'),false);const b=createPart(s,'bastion');s.inventory.push(b);swapBody(s,b.id);assert.equal(stats(s).hp-s.hp,1);});
test('regen heals one segment each 15 seconds; fatal hit is never healed in the same tick',()=>{const s=run();learn(s,'vitality.2');receiveDamage(s,1);receiveDamage(s,1);s.time=14.99;tickHealth(s,stats(s));assert.equal(s.hp,1);s.time=15;tickHealth(s,stats(s));assert.equal(s.hp,2);s.hp=0;s.time=30;tickHealth(s,stats(s));assert.equal(s.hp,0);});
test('fangs heal after their rank-based hit count without a separate cooldown',()=>{const s=run();s.arms=[createPart(s,'fangs')];s.hp=1;for(let i=0;i<9;i++)vampireHit(s,stats(s));assert.equal(s.hp,1);vampireHit(s,stats(s));assert.equal(s.hp,2);s.hp=1;s.arms[0].tier=5;for(let i=0;i<5;i++)vampireHit(s,stats(s));assert.equal(s.hp,1);vampireHit(s,stats(s));assert.equal(s.hp,2);});
test('revival is once per run, not once per equipment instance',()=>{const s=run();learn(s,'vitality.3');s.hp=1;receiveDamage(s,1);receiveDamage(s,1);assert.equal(s.hp,1);assert.ok(s.health.revived);s.time=3;receiveDamage(s,1);assert.equal(s.hp,0);});
test('five vitality ranks grant five plates plus natural armor and five-segment regeneration while revival stays one-use',()=>{const s=run();for(const id of ['vitality.0','vitality.1','vitality.2','vitality.3'])for(let rank=0;rank<5;rank++)learn(s,id);let st=stats(s);assert.equal(st.hp,7);assert.equal(st.armor,5.5);assert.equal(st.regenAmount,5);assert.equal(st.revive,1);s.hp=1;s.health.missing=6;s.time=15;tickHealth(s,st);assert.equal(s.hp,6);s.health.regenAt=Infinity;s.health.armorSpent=st.armor;s.hp=1;s.health.missing=6;s.time=20;assert.equal(receiveDamage(s,1,st),'revived');assert.equal(s.hp,1);s.time=23;assert.equal(receiveDamage(s,1,st),'hurt');assert.equal(s.hp,0);});
test('60 unique nodes, finals unlock through either path, siblings stay available',()=>{assert.equal(Object.keys(ABILITIES).length,60);const s=run();assert.ok(!eligible(s,ABILITIES['fire.3']));learn(s,'fire.0');learn(s,'fire.2');assert.ok(eligible(s,ABILITIES['fire.1']));assert.ok(eligible(s,ABILITIES['fire.3']));learn(s,'fire.3');assert.ok(!eligible(s,ABILITIES.plasma));learn(s,'electric.3');assert.ok(eligible(s,ABILITIES.plasma));});
test('five unique offers across seeds and depleted catalogue include valid fallback skills',()=>{for(let seed=0;seed<100;seed++){const s=createRun(undefined,'survival',seed);rollChoices(s);assert.equal(new Set(s.choices.map(c=>c.id)).size,5);for(const c of s.choices)assert.ok(eligible(s,ABILITIES[c.id]));s.abilities.learned=Object.keys(ABILITIES);s.abilities.levels=Object.fromEntries(Object.keys(ABILITIES).map(id=>[id,5]));rollChoices(s);assert.equal(new Set(s.choices.map(c=>c.id)).size,5);assert.ok(s.choices.every(c=>FALLBACKS[c.id]));}assert.equal(FALLBACKS['minor.hp'].bonus.hp,1);});
test('every unique ability stores five ranks and fires five extra bullets while legacy arrays remain compatible',()=>{const s=run();s.arms=[createPart(s,'seed')];for(let i=1;i<=5;i++){assert.ok(learn(s,'projectiles.0'));assert.equal(abilityLevel(s,'projectiles.0'),i);assert.equal(modifiers(s).extra,i);}assert.equal(s.abilities.learned.filter(id=>id==='projectiles.0').length,1);assert.ok(Math.abs(modifiers(s).projectileDamage+.45)<1e-9);assert.equal(eligible(s,ABILITIES['projectiles.0']),false);assert.equal(learn(s,'projectiles.0'),false);const enemy=spawnEnemy(s,'normal',{x:5,z:0});enemy.hp=1000;attack(s,0);assert.equal(s.shots.length,6);const legacy=run();legacy.abilities.learned=['might.0'];assert.equal(abilityLevel(legacy,'might.0'),1);assert.ok(learn(legacy,'might.0'));assert.equal(abilityLevel(legacy,'might.0'),2);});
test('projectile ranks add projectiles while combined penalties keep every shot above the twenty-percent floor',()=>{
 for(const id of ['projectiles.0','projectiles.3']){const s=run(),extras=[];for(let rank=1;rank<=5;rank++){learn(s,id);const b=modifiers(s);extras.push(b.extra);assert.ok(Math.max(.2,1+b.projectileDamage)>=.2);}assert.deepEqual(extras,id==='projectiles.0'?[1,2,3,4,5]:[2,3,4,5,6]);}
 const paired=run();for(let rank=1;rank<=5;rank++){learn(paired,'projectiles.0');learn(paired,'projectiles.3');const b=modifiers(paired);assert.equal(b.extra,[3,5,7,9,11][rank-1]);assert.ok(Math.max(.2,1+b.projectileDamage)>=.2);}
});
test('hypertrophy follows the half-step rank curve for damage and attack speed',()=>{
 const s=run();learn(s,'might.0');
 for(const expected of [[.3,-.1],[.4,-.15],[.5,-.2],[.6,-.25],[.7,-.3]]){learn(s,'might.3');const b=modifiers(s);assert.ok(Math.abs(b.damage-expected[0])<1e-9);assert.ok(Math.abs(b.rate-expected[1])<1e-9);}
 learn(s,'minor.rate');assert.ok(Math.abs(modifiers(s).rate+.27)<1e-9);
});
test('projectile requirements depend on installed weapons, learned powers persist',()=>{const s=run();s.arms=[null,null];assert.ok(!eligible(s,ABILITIES['projectiles.0']));install(s,'rocket');assert.ok(eligible(s,ABILITIES['projectiles.0']));learn(s,'projectiles.0');assert.ok(!eligible(s,ABILITIES['projectiles.1']));install(s,'seed',1);assert.ok(eligible(s,ABILITIES['projectiles.1']));s.arms=[];assert.equal(modifiers(s).extra,1);});
test('elemental skills support both melee and ranged weapons',()=>{
 for(const key of ['claws','arc']){
  const s=run(),p=createPart(s,key);s.arms=[p];
  for(const id of ['fire.0','cold.0','electric.0'])assert.ok(eligible(s,ABILITIES[id]),`${id} with ${key}`);
  learn(s,'fire.0');learn(s,'cold.0');learn(s,'electric.0');s.rng=()=>0;
  const e=spawnEnemy(s,'normal',{x:1,z:0});e.hp=e.maxHp=1000;attack(s,0);
  assert.ok(e.burn,`fire with ${key}`);assert.ok(e.chillUntil>0,`cold with ${key}`);
  s.abilities.attacks[p.id]=0;p.cooldown=0;
  const triggers=Array.from({length:5},()=>attackTriggers(s,p,weaponStats(s,p)).electric);
  assert.deepEqual(triggers,[false,false,false,false,true],`electric with ${key}`);
 }
});
test('claw lightning reaches an enemy surface and emits visible electric damage',()=>{
 const s=run(),p=createPart(s,'claws');s.arms=[p];s.rng=()=>.99;learn(s,'electric.0');
 const range=weaponStats(s,p).range,e=spawnEnemy(s,'normal',{x:0,z:range+.4});e.hp=e.maxHp=1000;
 for(let hit=0;hit<5;hit++){p.cooldown=0;p.reloadRemaining=0;p.ammo=1;attack(s,0);}
 assert.ok(s.events.some(event=>event.type==='enemy-damage'&&event.source==='electric'&&event.amount>0));
 assert.ok(s.events.some(event=>event.type==='arc'&&event.soul));
});
test('XP queue pauses simulation and card API remains valid across consecutive selections',()=>{const s=run();addXP(s,xpRequired(1)+xpRequired(2));assert.equal(s.pending,2);assert.equal(abilityCards(s).length,5);step(s,1);assert.equal(s.time,0);assert.equal(chooseUpgrade(s,-1),false);chooseUpgrade(s,0);chooseUpgrade(s,0);assert.equal(s.pending,0);assert.equal(s.abilities.learned.length,2);assert.equal(chooseUpgrade(s,0),false);});
test('ignite chance grows from fifteen to forty-five percent and burn stacks expire independently',()=>{
 const curve=run();for(const expected of [.15,.225,.3,.375,.45]){learn(curve,'fire.0');assert.ok(Math.abs(modifiers(curve).burnChance-expected)<1e-9);}
 const s=run();s.rng=()=>0;learn(s,'fire.0');const e=spawnEnemy(s,'normal',{x:2,z:0});for(let hit=0;hit<3;hit++)onHit(s,e,10,()=>{});
 assert.equal(e.burn.count,3);assert.equal(e.burn.dps,6);let damage=0;s.time=.1;tickEffects(s,.1,(_,amount)=>damage+=amount);assert.ok(Math.abs(damage-.6)<1e-9);
 s.time=2;onHit(s,e,5,()=>{});assert.equal(e.burn.count,4);assert.equal(e.burn.dps,7);damage=0;s.time=3.1;tickEffects(s,1.1,(_,amount)=>damage+=amount);assert.ok(Math.abs(damage-7.1)<1e-9);assert.equal(e.burn.count,1);assert.equal(e.burn.dps,1);
});
test('wildfire copies every active burn stack and adds it to existing fire',()=>{const s=run();s.rng=()=>0;learn(s,'fire.0');learn(s,'fire.3');const source=spawnEnemy(s,'normal',{x:2,z:0}),target=spawnEnemy(s,'normal',{x:3,z:0});onHit(s,source,10,()=>{});onHit(s,source,10,()=>{});onHit(s,target,5,()=>{});source.hp=0;onDeath(s,source);assert.equal(target.burn.count,3);assert.equal(target.burn.dps,5);});
test('cold caps bosses and secondary damage cannot recurse',()=>{const s=run();s.rng=()=>0;for(const id of ['cold.0','cold.3'])learn(s,id);const e=spawnEnemy(s,'boss',{x:2,z:0});for(let i=0;i<3;i++)onHit(s,e,10,()=>{});assert.equal(enemyPace(s,e),.85);assert.deepEqual(s.abilities.attacks,{});});
test('crystallization reaches two seconds at its third and final rank',()=>{const s=run();s.rng=()=>0;learn(s,'cold.0');for(let rank=0;rank<3;rank++)learn(s,'cold.3');const e=spawnEnemy(s,'normal',{x:2,z:0});for(let hit=0;hit<3;hit++)onHit(s,e,10,()=>{});assert.equal(e.frozenUntil,2);assert.equal(abilityLevel(s,'cold.3'),3);assert.equal(eligible(s,ABILITIES['cold.3']),false);});
test('extra projectiles use current weapon and repeats do not consume ammo or count attacks',()=>{const s=run();s.arms=[createPart(s,'seed')];learn(s,'projectiles.0');const e=spawnEnemy(s,'normal',{x:5,z:0});e.hp=1000;attack(s,0);assert.equal(s.shots.length,2);assert.equal(s.abilities.attacks[s.arms[0].id],1);const ammo=s.arms[0].ammo;attack(s,0,stats(s),s.arms[0]);assert.equal(s.arms[0].ammo,ammo);assert.equal(s.abilities.attacks[s.arms[0].id],1);});
test('attacking symbiont gains damage without inventing a guardian and obeys pause',()=>{const s=run();learn(s,'summons.0');learn(s,'summons.1');const e=spawnEnemy(s,'normal',{x:3,z:0});e.hp=1000;for(let i=0;i<20;i++){s.time+=.1;tickEffects(s,.1,(q,d)=>q.hp-=d);}assert.equal(s.abilities.companions.length,1);assert.equal(modifiers(s).guardian,undefined);assert.ok(e.hp<1000);const before=JSON.stringify(s.abilities);s.pending=1;step(s,1);assert.equal(JSON.stringify(s.abilities),before);});
test('symbiont bite damage stays fixed while colony rank changes companion count',()=>{
 const sample=rank=>{const s=run();for(let i=0;i<rank;i++)learn(s,'summons.0');for(const id of ['might.0','fire.0','cold.0'])learn(s,id);const e=spawnEnemy(s,'normal',{x:1,z:0});e.hp=1000;const hits=[];for(let i=0;i<40&&!hits.length;i++){s.time+=.1;tickEffects(s,.1,(_,damage,source)=>hits.push([damage,source]));}return hits[0];};
 assert.deepEqual(sample(1),[6,'summon']);assert.deepEqual(sample(5),[6,'summon']);
});
test('waves use time only and capped spawn credit never accumulates a debt',()=>{assert.equal(enemyBalance(2400).damage,.5);assert.equal(enemyBalance(2400,'normal','fast').role,'fast');const s=run();s.enemies=Array.from({length:WAVE_RULES.cap},()=>({hp:1}));s.time=100;let count=0;tickWaves(s,10,()=>count++);assert.equal(count,0);assert.equal(s.spawnCredit,0);s.enemies=[];tickWaves(s,.01,()=>count++);assert.equal(count,0);});
test('same seeds yield identical choices and waves independent of learned power',()=>{const a=run(),b=run();learn(a,'might.0');for(const s of [a,b]){s.time=960;s.nextElite=2000;s.nextBoss=2000;}const aa=[],bb=[];tickWaves(a,1,(...x)=>aa.push(x));tickWaves(b,1,(...x)=>bb.push(x));assert.deepEqual(aa,bb);});
test('restart clears learned powers, shield and armor counters without changing permanent profile',()=>{const s=run();learn(s,'vitality.3');s.health.armorSpent=1;s.profile.achievements.push('example');const next=createRun(s.profile);assert.deepEqual(next.abilities.learned,[]);assert.equal(next.health.armorSpent,0);assert.equal(next.hp,2);assert.deepEqual(next.profile.achievements,['example']);});
test('new rank bonuses cannot be farmed by repeatedly installing a low-health body',()=>{const s=run(),b=createPart(s,'bastion');s.inventory.push(b);swapBody(s,b.id);const large=s.body,small=s.inventory.find(p=>p.key==='wanderer');s.hp=1;s.health.missing=2;swapBody(s,small.id);assert.equal(s.hp,0);swapBody(s,large.id);assert.equal(s.hp,1);assert.equal(s.health.missing,2);});
test('fallback selection still spends exactly one pending level',()=>{const s=run();s.abilities.learned=Object.keys(ABILITIES);s.abilities.levels=Object.fromEntries(Object.keys(ABILITIES).map(id=>[id,5]));s.pending=1;rollChoices(s);const id=s.choices[0].id;assert.ok(chooseUpgrade(s,0));assert.equal(s.abilities.minor[id],1);assert.equal(s.pending,0);assert.equal(stats(s).hp,7);});
test('short melee hands can hit the surface of large bosses without entering their body',()=>{const s=run();s.arms=[createPart(s,'drill')];const e=spawnEnemy(s,'boss',{x:3.5,z:0});const hp=e.hp;attack(s,0);assert.ok(e.hp<hp);assert.ok(Math.hypot(e.x,e.z)>e.radius);});
test('stale incompatible offer rejects atomically without consuming an earned choice',()=>{const s=run();addXP(s,18);s.choices=[{id:'projectiles.0'}];s.arms=[null,null];const before=s.pending;assert.equal(chooseUpgrade(s,0),false);assert.equal(s.pending,before);assert.deepEqual(s.abilities.learned,[]);});
test('final boss is scheduled at forty minutes even when an earlier boss survives',()=>{const s=run();spawnEnemy(s,'boss',{x:10,z:0});s.time=2400;s.nextBoss=2400;s.nextElite=2400;const spawned=[];tickWaves(s,.01,(kind)=>spawned.push(kind));assert.deepEqual(spawned,['final']);assert.equal(s.nextBoss,2880);});
test('late XP pacing keeps thresholds increasing and preserves overflow across the curve joins',()=>{
 let previous=0;
 for(let level=1;level<=100;level++){
  const cost=xpRequired(level);assert.ok(Number.isInteger(cost)&&cost>previous);previous=cost;
 }
 for(const level of [21,28]){
  const s=run();s.level=level;
  addXP(s,xpRequired(level)+xpRequired(level+1)+7);
  assert.equal(s.level,level+2);assert.equal(s.xp,7);assert.equal(s.pending,2);
  assert.equal(abilityCards(s).length,5);
 }
 assert.equal(xpRequired(1),9);assert.equal(xpRequired(2),22);
});
