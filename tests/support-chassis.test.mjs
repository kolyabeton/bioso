import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,hurtEnemy,step} from '../src/game.js';
import {createPart,newProfile,readProfile,stats,weaponStats,digest,digestionMultiplier,upgrade} from '../src/assembly.js';
import {BODIES,partAvailable} from '../src/catalog.js';
import {bodyTraitState} from '../src/systems/body-traits.js';
import {organCapacity} from '../src/systems/body-slots.js';
import {chassisTuning,tickSupportChassis,tickRegulatorHold,sentinelCircles,interceptSupportShot,hitTower,damageTowersFromEvents,tickTowerAcid,recordAssemblerAttack} from '../src/systems/support-chassis.js';
import {chassisProgress,recordChassisFreeze,recordChassisKill,recordChassisRecycle,normalizeChassisProgress} from '../src/systems/chassis-progress.js';
import {tickHostileShots} from '../src/systems/waves.js';
import {receiveHit} from '../src/systems/health.js';
import {learn} from '../src/systems/abilities.js';
import {trackAchievements,achievementById,achievementProgress} from '../src/systems/achievements.js';
import {loadoutScreen} from '../src/ui/meta-screens.js';
import {starterAllowed,validLoadout} from '../src/systems/meta-progression.js';

function run(body,mode='survival',profile=newProfile()){
 const s=createRun(profile,mode,420);s.world={walkable:()=>true,lineClear:()=>true,heightAt:()=>0};
 delete s.mission;s.body=createPart(s,body);const d=BODIES[body],keys={demolition:['drill','needle'],regulator:['whip','harpoon'],sentinel:['shieldArm','pistol'],assembler:['arc','arc']}[body];
 s.arms=Array.from({length:d.arms},(_,i)=>keys[i]?createPart(s,keys[i]):null);s.legs=Array.from({length:d.legs},()=>createPart(s,'universal'));s.organs=Array(d.organs).fill(null);s.inventory=[];s.hp=stats(s).hp;s.events=[];return s;
}
const enemy=(extra={})=>({id:100,kind:'normal',hp:10000,maxHp:10000,armor:100,x:2,y:0,z:0,radius:.5,born:0,speed:0,damage:0,contact:999,...extra});
const shot=(extra={})=>({id:101,owner:100,x:2,y:1,z:0,dx:1,dz:0,dy:0,speed:4,life:5,travel:0,key:'needle',...extra});
function freezeRank(s){for(let i=0;i<3;i++)learn(s,'cold.3');}

test('four class layouts use their exact activation parts independently of rarity/rank',()=>{
 for(const body of ['demolition','regulator','assembler']){const s=run(body);if(body==='regulator')learn(s,'cold.3');assert(bodyTraitState(s).active,body);s.arms[0].disabled=true;assert(!bodyTraitState(s).active);s.arms[0].disabled=false;assert(bodyTraitState(s).active);}
 const s=run('sentinel');assert(bodyTraitState(s).active);s.arms[0].disabled=true;assert(bodyTraitState(s).active);s.arms[0]=createPart(s,'whip');assert(!bodyTraitState(s).active);s.arms[1]=createPart(s,'shieldArm');assert(bodyTraitState(s).active);
 for(const [body,organs]of [['demolition',3],['regulator',4],['sentinel',3],['assembler',5]]){const s=run(body);s.body.tier=5;s.body.rarity='relic';assert.equal(organCapacity(s.body),organs);}
});
test('dismantling aura scales with pickup and recycling yield, then stacks with drill armor penetration',()=>{
 const s=run('demolition'),e=enemy();s.enemies=[e];assert.equal(chassisTuning(s).armorReduction,.5);hurtEnemy(s,e,100,.5);assert.equal(e.hp,9900);
 s.organs[0]=createPart(s,'digestion',5);s.organs[0].upgrades.power=10;s.abilities.minor['pickup']=5;
 for(const id of ['metabolism.0','metabolism.1','metabolism.2','metabolism.3'])learn(s,id);
 assert(digestionMultiplier(s)>3);const t=chassisTuning(s,{...stats(s),pickup:40});assert(t.armorReduction>.8);assert.equal(t.radius,41);
 s.player.x=100;const before=e.hp;hurtEnemy(s,e,100,.5);assert(Math.abs((before-e.hp)-100/1.5)<1e-8);
});
test('dismantling armor reduction respects the minus-twenty-percent floor',()=>{
 const s=run('demolition'),e=enemy({armor:100});s.enemies=[e];
 hurtEnemy(s,e,100,1.25);assert.equal(e.hp,9880);
});
test('regulator freezes bosses and shots without canceling attack preparation or spending projectile life',()=>{
 const s=run('regulator');freezeRank(s);const e=enemy({kind:'boss',enemyAttack:{readyAt:0,warning:{at:1,started:0}}}),q=shot();s.enemies=[e];s.hostileShots=[q];
 tickSupportChassis(s,0,stats(s),()=>{});assert.equal(e.frozenUntil,2);assert.equal(q.frozenUntil,2);const warning=e.enemyAttack.warning;s.time=.5;assert(tickRegulatorHold(s,e,.5));assert.equal(e.enemyAttack.warning,warning);assert.equal(warning.at,1.5);
 tickHostileShots(s,.5,()=>assert.fail('frozen shot cannot hurt'));assert.equal(q.x,2);assert.equal(q.life,5);
 s.time=2.25;tickHostileShots(s,.5,()=>{});assert.equal(q.x,3);assert.equal(q.life,4.75);
 const frozen=e.frozenUntil;s.supportChassis.regulatorAt=0;s.time=1;tickSupportChassis(s,0,stats(s),()=>{});assert.equal(e.frozenUntil,frozen);
});
test('sentinel reflects each contact with strongest-arm and armor damage, including a frozen shot',()=>{
 const s=run('sentinel');s.enemies=[enemy({x:8,z:0})];const circle=sentinelCircles(s)[0],q=shot({...circle,frozenUntil:2});
 assert(interceptSupportShot(s,q,q,q));assert.equal(s.shots.length,1);const reflected=s.shots[0];assert.equal(reflected.frozenUntil,2);assert(reflected.organReflection);assert(reflected.dx>0);
 const strongest=Math.max(...s.arms.filter(Boolean).map(p=>weaponStats(s,p).damage));assert.equal(reflected.w.damage,strongest*chassisTuning(s).reflectionScale);
 assert(!interceptSupportShot(s,{...q,chassisReflected:true},q,q));s.arms[0]=null;assert.equal(sentinelCircles(s).length,0);
});
test('assembler uses independent tenth primary attacks and keeps capacity-scaled tower HP',()=>{
 for(const [capacity,limit,hp]of [[150,2,2],[225,3,4],[300,4,6],[375,5,8]]){const s=run('assembler');s.enemies=[enemy()];const st={...stats(s),capacity};let damage=0;tickSupportChassis(s,0,st,()=>{});assert.equal(s.supportChassis.towers.length,0);
  for(let tower=0;tower<limit;tower++)for(let hit=0;hit<10;hit++)recordAssemblerAttack(s,s.arms[tower%2],st);
  tickSupportChassis(s,.1,st,(e,d)=>{damage+=d;});
  assert.equal(s.supportChassis.towers.length,limit);assert(s.supportChassis.towers.every(t=>t.maxHp===hp));assert(s.supportChassis.towers.every(t=>{const d=Math.hypot(t.x-s.player.x,t.z-s.player.z);return d>=1&&d<=3;}));
  for(let i=0;i<s.supportChassis.towers.length;i++)for(let j=i+1;j<s.supportChassis.towers.length;j++)assert.ok(Math.hypot(s.supportChassis.towers[i].x-s.supportChassis.towers[j].x,s.supportChassis.towers[i].z-s.supportChassis.towers[j].z)>=1.3);
  assert(damage>0);const old=s.supportChassis.towers[0];hitTower(old);assert.equal(old.hp,hp-1);
  s.arms[1].disabled=true;tickSupportChassis(s,0,st,()=>{});assert.equal(s.supportChassis.towers.length,0);
 }
});
test('assembler retries a blocked tenth attack without merging the two Welder counters',()=>{
 const s=run('assembler'),st=stats(s),[left,right]=s.arms;s.world.walkable=()=>false;
 for(let i=0;i<10;i++)assert.equal(recordAssemblerAttack(s,left,st),false);
 for(let i=0;i<9;i++)assert.equal(recordAssemblerAttack(s,right,st),false);
 assert.equal(left.assemblerAttacks,10);assert.equal(right.assemblerAttacks,9);assert.equal(s.supportChassis.towers.length,0);
 s.world.walkable=()=>true;assert.equal(recordAssemblerAttack(s,left,st),true);assert.equal(left.assemblerAttacks,1);assert.equal(right.assemblerAttacks,9);
 assert.equal(recordAssemblerAttack(s,right,st),true);assert.equal(right.assemblerAttacks,0);assert.equal(s.supportChassis.towers.length,2);
});
test('enabled Pollinators add their current damage to every assembler tower hit before swarm multipliers',()=>{
 const s=run('assembler'),pollinator=createPart(s,'drone');pollinator.affixes=[{stat:'damage',value:1/9}];pollinator.affix=null;s.arms[2]=pollinator;
 const st=stats(s),welder=weaponStats(s,s.arms[0],st),target=enemy();s.enemies=[target];
 for(let hit=0;hit<10;hit++)recordAssemblerAttack(s,s.arms[0],st);
 let dealt=0;tickSupportChassis(s,.1,st,(_,damage)=>{dealt+=damage;});
 assert.ok(Math.abs(dealt-(welder.damage*.3+20))<1e-8,`${dealt} != ${welder.damage*.3+20}`);
 pollinator.disabled=true;s.supportChassis.towers[0].cooldown=0;dealt=0;tickSupportChassis(s,.1,st,(_,damage)=>{dealt+=damage;});
 assert.ok(Math.abs(dealt-welder.damage*.3)<1e-8,`${dealt} != ${welder.damage*.3}`);
});
test('the tenth repair kit upgrade amplifies active new chassis abilities and then stops',()=>{
 for(const body of ['demolition','regulator','sentinel','assembler']){const s=run(body),p=createPart(s,'repairGland');s.organs[0]=p;p.upgrades.traitBoost=9;const before=chassisTuning(s);assert(upgrade(s,p.id,'traitBoost'));const after=chassisTuning(s);assert(after.boost>before.boost);assert.equal(upgrade(s,p.id,'traitBoost'),false);}
});
test('chassis achievements accumulate in missions and survival, exclude repeats and secondary effects, survive save/load',()=>{
 const p=newProfile();for(const mode of ['garden','quarantine','core','nursery','mother','survival']){const s=run('regulator',mode,p);freezeRank(s);const e=enemy();assert(recordChassisFreeze(s,e));assert(!recordChassisFreeze(s,e));recordChassisKill(s,e,'electric','arc');recordChassisKill(s,e,'tower','arc');recordChassisKill(s,{...e,noRewards:true},'electric','arc');recordChassisRecycle(s,100,3);recordChassisRecycle(s,100,3.01);}
 assert.equal(chassisProgress(p).frozenEnemies,6);assert.equal(chassisProgress(p).electricKills,6);assert.equal(chassisProgress(p).recycledBiomass,600);
 const copy=readProfile({getItem:()=>JSON.stringify(p)});assert.deepEqual(chassisProgress(copy),chassisProgress(p));
 const s=run('sentinel','garden',copy);const q=shot();assert.equal(receiveHit(s,{...stats(s),dodge:1},{projectile:q,cause:'projectile'}),'dodged');receiveHit(s,{...stats(s),dodge:1},{projectile:q,cause:'projectile'});assert.equal(chassisProgress(copy).preventedShots,1);
 s.reviewMode=true;recordChassisRecycle(s,100,4);assert.equal(chassisProgress(copy).recycledBiomass,600);
});
test('Full Disassembly reaches one hundred thousand across wins, losses and reloads without using the final quest counter',()=>{
 let profile=newProfile();const first=run('demolition','survival',profile);first.won=true;recordChassisRecycle(first,60000,3.01);
 const second=run('demolition','garden',profile);second.dead=true;recordChassisRecycle(second,30000,4);
 profile=readProfile({getItem:()=>JSON.stringify(profile)});const third=run('demolition','survival',profile);third.escapeQuest={startMass:7000,earned:9999};recordChassisRecycle(third,40000,10);
 assert.equal(chassisProgress(profile).recycledBiomass,100000);assert.equal(third.escapeQuest.earned,9999);
 assert.equal(recordChassisRecycle(third,1,10),false);assert.equal(chassisProgress(profile).recycledBiomass,100000);
});
test('locked bodies cannot enter loot/start, unlock once in any mode and recover reward on profile load',()=>{
 const s=run('assembler','garden');for(const key of Object.keys(BODIES).filter(k=>['demolition','regulator','sentinel','assembler'].includes(k))){assert(!partAvailable(s.profile,key));assert(!starterAllowed(s.profile,key));}
 Object.assign(s.profile.meta.chassisProgress,{recycledBiomass:100000,frozenEnemies:5000,preventedShots:10000,electricKills:50000,capacity:300});trackAchievements(s);const rewards=s.ground.length;trackAchievements(s);assert.equal(s.ground.length,rewards);
 for(const key of ['demolition','regulator','sentinel','assembler'])assert(partAvailable(s.profile,key));assert.equal(validLoadout(s.profile,{body:'assembler'}).body,'assembler');
 s.profile.unlocked=s.profile.unlocked.filter(k=>k!=='assembler');const loaded=readProfile({getItem:()=>JSON.stringify(s.profile)});assert(loaded.unlocked.includes('assembler'));assert.deepEqual(achievementProgress(s,loaded,achievementById('chassis:assembler')),[50000,300]);
 assert.equal(normalizeChassisProgress({electricKills:Infinity}).electricKills,0);
});


test('tower area damage is once per hit and overlapping acid uses one exposure clock',()=>{
 const s=run('assembler'),tower={id:'tower-1',chassisTower:true,hp:6,x:2,y:0,z:0};s.supportChassis={towers:[tower]};
 hitTower(tower);damageTowersFromEvents(s,[{type:'enemy-strike',mode:'area',hitTarget:tower.id,x:2,y:0,z:0,radius:3}]);assert.equal(tower.hp,5);
 damageTowersFromEvents(s,[{type:'volatile-blast',x:2,y:0,z:0,radius:3}]);assert.equal(tower.hp,4);
 s.enemyAcidPools=[{x:2,z:0,radius:3,life:2},{x:2,z:0,radius:3,life:2}];tickTowerAcid(s,.5);assert.equal(tower.hp,4);tickTowerAcid(s,.5);assert.equal(tower.hp,3);
});
test('unfrozen projectiles move even when the direct projectile clock starts at zero',()=>{
 const s=run('regulator'),q=shot({x:10});s.hostileShots=[q];tickHostileShots(s,.25,()=>{});assert.equal(q.x,11);assert.equal(q.life,4.75);
});
test('real simulation pauses movement and preparation, then resumes, and dialog pause consumes no timers',()=>{
 const s=run('regulator');freezeRank(s);s.encounters={active:null,nodes:[]};s.waves.credit=-Infinity;s.nextElite=s.nextBoss=Infinity;s.progressionLocked=true;
 const e=enemy({kind:'elite',assembly:{arms:[{key:'needle'}]},enemyAttack:{index:0,readyAt:0,warning:{key:'needle',mode:'shot',x:2,y:0,z:0,dx:1,dz:0,range:16,speed:7,warning:1,recovery:2,started:0,at:1}},kickX:3});s.enemies=[e];
 step(s,.1);const warning=e.enemyAttack.warning;assert.equal(e.x,2);assert.equal(warning.at,1.1);
 s.pending=1;const frozen=e.regulatorFrozenUntil;step(s,1);assert.equal(s.time,.1);assert.equal(e.regulatorFrozenUntil,frozen);s.pending=0;
 for(let i=0;i<21;i++)step(s,.1);assert.equal(e.enemyAttack.warning,warning);assert(warning.at>3);assert(s.time>frozen);
});

test('recycling achievement uses the composter that performed digestion and excludes upgrade refunds',()=>{
 const s=run('demolition'),strong=createPart(s,'digestion',5),weak=createPart(s,'digestion');strong.upgrades.power=10;s.organs=[strong,weak,null];
 assert(digestionMultiplier(s)>3);assert(digest(s,strong.id)!==false);assert.equal(chassisProgress(s.profile).recycledBiomass,0);
 const other=run('demolition'),organ=createPart(other,'digestion',5);organ.upgrades.power=10;other.organs=[organ,null,null];const part=createPart(other,'claws');part.spent=100;other.inventory=[part];
 const pure=Math.floor(4*digestionMultiplier(other)),amount=digest(other,part.id);assert(amount>pure);assert.equal(chassisProgress(other.profile).recycledBiomass,pure);
});

test('starting UI omits locked support classes and exposes them after their achievements',()=>{
 const p=newProfile(),keys=['demolition','regulator','sentinel','assembler'],locked=loadoutScreen(p,{});
 for(const key of keys)assert(!locked.includes(BODIES[key].name),key);
 p.achievements.push(...keys.map(key=>'chassis:'+key));p.unlocked.push(...keys);const opened=loadoutScreen(p,{});
 for(const key of keys)assert(opened.includes(BODIES[key].name),key);
});
