import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,spawnEnemy,attack,step} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';
import {ABILITIES,learn} from '../src/systems/abilities.js';
import {ricochetProfile} from '../src/systems/ability-combat.js';
import {eligible,abilityCards} from '../src/systems/progression.js';
import {compatibleHandKeys,abilityCompatibilitySummary,itemAffectedHandNames,itemCompatibleHandKeys} from '../src/systems/hand-compatibility.js';
import {abilityTree} from '../src/ui/ability-tree.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';

const run=()=>createRun(undefined,'survival',904);

test('hand categories match the combat, ranged and projectile contracts',()=>{
 assert.deepEqual(compatibleHandKeys('melee'),['claws','hammer','shieldArm','drill','whip','fangs']);
 assert.deepEqual(compatibleHandKeys('ranged'),['harpoon','pistol','seed','shotgun','needle','rocket','arc','acid']);
 assert.deepEqual(compatibleHandKeys('flyingProjectile'),['harpoon','pistol','seed','shotgun','needle','rocket','acid']);
 assert.deepEqual(compatibleHandKeys('directProjectile'),['harpoon','pistol','seed','shotgun','needle']);
 assert.deepEqual(compatibleHandKeys('ricochetProjectile'),['harpoon','pistol','seed','shotgun','needle','acid']);
 assert.ok(!compatibleHandKeys('combat').includes('drone'));
});

test('ability offers use the same real hand groups as combat',()=>{
 const s=run();s.arms=[createPart(s,'drone')];
 for(const id of ['ranged.0','projectiles.0','projectiles.1','projectiles.2','ricochet.0'])assert.equal(eligible(s,ABILITIES[id]),false,id);
 learn(s,'projectiles.0');
 for(const key of compatibleHandKeys('directProjectile')){s.arms=[createPart(s,key)];assert.equal(eligible(s,ABILITIES['projectiles.1']),true,key);assert.equal(eligible(s,ABILITIES['projectiles.2']),true,key);}
 const rocket=run();rocket.arms=[createPart(rocket,'rocket')];assert.equal(eligible(rocket,ABILITIES['projectiles.0']),true);assert.equal(eligible(rocket,ABILITIES['ricochet.0']),false);learn(rocket,'projectiles.0');assert.equal(eligible(rocket,ABILITIES['projectiles.1']),false);assert.equal(eligible(rocket,ABILITIES['projectiles.2']),false);
 const welder=run();welder.arms=[createPart(welder,'arc')];assert.equal(eligible(welder,ABILITIES['ranged.0']),true);assert.equal(eligible(welder,ABILITIES['ricochet.0']),false);
});

test('drones and couriers never inherit piercing or ricochet',()=>{
 const s=run(),drone=createPart(s,'drone'),courier=createPart(s,'rocket');s.arms=[drone,courier];
 learn(s,'projectiles.1');learn(s,'ricochet.0');
 const droneWeapon=weaponStats(s,drone),courierWeapon=weaponStats(s,courier);
 assert.equal(droneWeapon.mode,'summon');assert.equal(droneWeapon.pierce,undefined);assert.equal(ricochetProfile(s,droneWeapon),null);
 assert.equal(courierWeapon.pierce,1);assert.equal(ricochetProfile(s,courierWeapon),null);
 s.arms=[courier];const target=spawnEnemy(s,'normal',{x:0,z:5});target.hp=1000;target.speed=0;
 attack(s,0);const courierShots=s.shots.filter(shot=>shot.source===courier.id);
 assert.equal(courierShots.length,4);assert.ok(courierShots.every(shot=>shot.remaining===1&&shot.ricochetLeft===undefined));
});

test('pierce adds one target to every direct projectile including each pellet',()=>{
 for(const [key,before,after] of [['pistol',1,2],['harpoon',2,3],['needle',3,4],['seed',1,2]]){
  const s=run(),part=createPart(s,key);s.arms=[part];assert.equal(weaponStats(s,part).pierce,before);learn(s,'projectiles.1');assert.equal(weaponStats(s,part).pierce,after,key);
 }
 const s=run(),part=createPart(s,'shotgun');s.arms=[part];learn(s,'projectiles.1');const target=spawnEnemy(s,'normal',{x:4,z:0});target.hp=1000;target.speed=0;attack(s,0);
 const pellets=s.shots.filter(shot=>shot.source===part.id);assert.equal(pellets.length,5);assert.ok(pellets.every(shot=>shot.remaining===2));
});

test('built-in and learned ricochets travel as one chain through unique targets',()=>{
 const s=run();s.rng=()=>.99;s.world.lineClear=()=>true;s.arms=[createPart(s,'seed')];learn(s,'ricochet.0');
 const previous={hops:CATALOG.seed.ricochetHops,damage:CATALOG.seed.ricochetDamage};
 try{
  CATALOG.seed.ricochetHops=1;CATALOG.seed.ricochetDamage=.8;
  const enemies=[[0,2],[2,2],[3.5,2]].map(([x,z])=>{const enemy=spawnEnemy(s,'normal',{x,z});enemy.hp=enemy.maxHp=1000;enemy.speed=0;return enemy;});
  attack(s,.01);s.arms=[];for(let time=0;time<1;time+=.01)step(s,.01);
  assert.deepEqual(enemies.map(enemy=>Number((1000-enemy.hp).toFixed(3))),[6,4.8,4.8]);
  assert.equal(s.events.filter(event=>event.type==='soul-proc'&&event.kind==='ricochet').length,2);
 }finally{
  if(previous.hops==null)delete CATALOG.seed.ricochetHops;else CATALOG.seed.ricochetHops=previous.hops;
  if(previous.damage==null)delete CATALOG.seed.ricochetDamage;else CATALOG.seed.ricochetDamage=previous.damage;
 }
});

test('short and detailed cards keep compatibility metadata out of player-facing copy',()=>{
 const s=run();s.arms=[createPart(s,'pistol'),createPart(s,'arc'),createPart(s,'drone')];s.choices=[{id:'projectiles.1'}];
 const card=abilityCards(s)[0],html=abilityTree(card,undefined,s);
 assert.equal(card.compatibilityCategory,'снаряды');assert.equal(abilityCompatibilitySummary('tempo.2'),'Скорость снарядов: снаряды · Дальность оружия: оружие');
 assert.doesNotMatch(html,/Категория:|Совместимое оружие:|Сейчас влияет на|Опылитель/);
});

test('item compatibility excludes inventory and disabled hands from the current effect',()=>{
 const s=run(),cooler=createPart(s,'slime'),marker=createPart(s,'pistol'),seed=createPart(s,'seed');seed.disabled=true;s.arms=[marker,seed];s.organs=[cooler];s.inventory.push(createPart(s,'needle'));
 assert.deepEqual(itemAffectedHandNames(s,'slime'),['Маркер']);
 const rows=itemInspectorData(s,cooler).rows;assert.equal(rows.some(row=>row.label==='Сейчас влияет на'),false);
 const spare=createPart(s,'stabilizer');assert.equal(itemInspectorData(s,spare).rows.some(row=>row.label==='Сейчас влияет на'),false);
});

test('return nerve supports winch, marker, seeder, spreader and injector without exposing the list in item rows',()=>{
 assert.deepEqual(itemCompatibleHandKeys('returnNerve'),['pistol','seed','shotgun','needle','harpoon']);
 const s=run(),reverser=createPart(s,'returnNerve');s.organs=[reverser];
 for(const key of itemCompatibleHandKeys('returnNerve')){s.arms=[createPart(s,key)];assert.deepEqual(itemAffectedHandNames(s,'returnNerve'),[CATALOG[key].name]);}
 assert.equal(itemInspectorData(s,reverser).rows.some(row=>['Категория','Совместимое оружие'].includes(row.label)),false);
});

test('synchronizer supports spreader, winch, injector and courier',()=>{
 assert.deepEqual(itemCompatibleHandKeys('commonNerve'),['shotgun','harpoon','needle','rocket']);
});
