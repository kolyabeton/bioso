import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,step} from '../src/game.js';
import {createPart,stats,weaponStats,equip,unequip,installed} from '../src/assembly.js';
import {SETS,setCounts,setBonuses,hitSetMultiplier,reloadDuration} from '../src/systems/sets-loot.js';
import {syncSetState,setBarrierView} from '../src/systems/sets/bonuses.js';
import {prepareSetAttack,finishSetAttack,tickSetCollector} from '../src/systems/sets/combat.js';
import {receiveHit,tickHealth,healthView,shieldRechargeDelay} from '../src/systems/health.js';
import {tickEffects} from '../src/systems/effects.js';
import {summonTuning,destroySymbiont} from '../src/systems/symbionts.js';
import {modifiers} from '../src/systems/abilities.js';
import {CATALOG} from '../src/catalog.js';
import {activeSetCard,setStatus,setProgress} from '../src/ui/catalog-sets.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {cloneForComparison} from '../src/ui/adapters.js';
import {translateText} from '../src/i18n/index.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(id,n=3){
 const s=createRun(undefined,'survival',8172);s.world={walkable:()=>true,heightAt:()=>0,lineClear:()=>true};
 s.body=createPart(s,'bastion');s.arms=['pistol','claws','seed'].map(k=>createPart(s,k));
 s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.organs=[createPart(s,'digestion'),null,null,null];
 const other=Object.keys(SETS).filter(k=>k!==id),groups=[[s.body],s.arms,s.legs,s.organs.filter(Boolean)];
 groups.forEach((parts,i)=>parts.forEach(p=>{p.setId=i<n?id:other[i];p.affixes=[];delete p.affix;}));
 delete s.setsV2;syncSetState(s);s.hp=stats(s).hp;s.health.missing=0;s.rng=()=>.99;return s;
}
function shot(s,p=s.arms[0]){return prepareSetAttack(s,p,weaponStats(s,p));}
const dummy=()=>({id:900,x:0,y:0,z:3,hp:100000,maxHp:100000,radius:.6,armor:0,kind:'normal'});

test('every set unlocks by distinct categories at 2 and 3, with no extra threshold at 4',()=>{
 for(const id of Object.keys(SETS))for(const n of [1,2,3,4]){
  const s=fixture(id,n);assert.equal(setCounts(s)[id],n,id);assert.equal(!!s.setsV2.active[id],n>=3,id);
  const two=fixture(id,2),three=fixture(id,3),four=fixture(id,4);
  assert.equal(setCounts(two)[id],2);assert.equal(setCounts(three)[id],3);assert.equal(setCounts(four)[id],4);
  assert.equal(installed(s).filter(p=>p.setId===id).length>=n,true);
 }
});

test('new passive bonuses reach movement, damage, health, armor and reload without equipment weight discounts',()=>{
 const scout=fixture('wanderer',2),base=fixture('wanderer',0);near(stats(scout).speed/stats(base).speed,1.1);near(stats(scout).pickup/stats(base).pickup,1.5);
 const hunter=fixture('hunter',2),gun=hunter.arms[0],h0=fixture('hunter',0);near(weaponStats(hunter,gun).damage/weaponStats(h0,h0.arms[0]).damage,1.2);near(weaponStats(hunter,gun).range/weaponStats(h0,h0.arms[0]).range,1.2);
 const chimera=fixture('chimera',2),c0=fixture('chimera',0);near(weaponStats(chimera,chimera.arms[1]).damage/weaponStats(c0,c0.arms[1]).damage,1.2);assert(weaponStats(chimera,chimera.arms[1]).range>weaponStats(c0,c0.arms[1]).range);
 const root=fixture('rootwalker',2);near(stats(root).hp,stats(fixture('rootwalker',0)).hp+1);
 const bastion=fixture('bastion',2);near(stats(bastion).armor,Math.min(stats(bastion).hp,stats(fixture('bastion',0)).armor+1));
 const hecaton=fixture('hecaton',2);near(reloadDuration(hecaton,hecaton.arms[0],5),4);
 const reactor=fixture('reactor',2);near(stats(reactor).rate,.15);
 for(const s of [bastion,root]){assert.equal(setBonuses(s).legWeight,1);assert.equal(setBonuses(s).organWeight,1);}
});

test('Hunter counts emitted volleys, keeps one multiplier for all pellets and excludes secondary hits',()=>{
 const s=fixture('hunter');const p=s.arms[0];p.key='shotgun';p.ammo=CATALOG.shotgun.magazine;
 s.arms=[p,null,null];s.enemies=[dummy()];const volleys=[];
 for(let i=0;i<3;i++){p.cooldown=0;p.reloadRemaining=0;p.ammo=99;s.shots=[];attack(s,0);volleys.push([...s.shots]);}
 assert(volleys.every(v=>v.length===CATALOG.shotgun.pellets));
 assert(volleys[0].every(q=>hitSetMultiplier(s,dummy(),q.w)===1));
 assert(volleys[1].every(q=>hitSetMultiplier(s,dummy(),q.w)===1));
 assert(volleys[2].every(q=>hitSetMultiplier(s,dummy(),q.w)===1.6));
 assert.equal(s.setsV2.hunterShots,0);
 assert.equal(hitSetMultiplier(s,dummy(),{...volleys[2][0].w,secondary:'ricochet'}),1);
 assert.equal(prepareSetAttack(s,p,weaponStats(s,p),true).setHunterMultiplier,undefined);
 assert.equal(s.setsV2.hunterShots,0);
});

test('Hunter consumes missed volleys and preserves its count through an equipment toggle',()=>{
 const s=fixture('hunter');shot(s);shot(s);assert.equal(s.setsV2.hunterShots,2);
 const leg=s.legs[0];s.legs=[];syncSetState(s);assert.equal(shot(s).setHunterMultiplier,undefined);
 s.legs=[leg];syncSetState(s);assert.equal(shot(s).setHunterMultiplier,1.6);
});

test('Chimera cross buffs refresh independently, expire on combat time, never stack or prime from secondaries',()=>{
 const s=fixture('chimera'),melee={mode:'sector',partId:s.arms[1].id},ranged={mode:'projectile',partId:s.arms[0].id},e=dummy();
 assert.equal(hitSetMultiplier(s,e,{...melee,secondary:'echo'}),1);assert.equal(s.setsV2.rangedUntil,undefined);
 assert.equal(hitSetMultiplier(s,e,melee),1);near(hitSetMultiplier(s,e,ranged),1.3);near(hitSetMultiplier(s,e,melee),1.3);
 s.isaac={extraTime:2};near(hitSetMultiplier(s,e,ranged),1.3);assert.equal(s.setsV2.meleeUntil,5);
 s.isaac.extraTime=5;assert.equal(hitSetMultiplier(s,e,melee),1);
 s.legs=[];syncSetState(s);assert.equal(s.setsV2.rangedUntil,0);assert.equal(setStatus(s,'chimera'),'');
});

test('Bastion supplies a separate charge without a shield organ and uses it before armor',()=>{
 const s=fixture('bastion'),st=stats(s);assert.equal(st.shieldMax,1);assert.equal(setBarrierView(s).ready,false);
 s.time=12;const before=s.health.armorSpent;assert.equal(receiveHit(s,st),'shield');assert.equal(s.health.armorSpent,before);assert.equal(s.setsV2.barrierAt,24);
 assert.equal(receiveHit(s,st),'armor');assert.equal(setBarrierView(s).ready,false);
 s.time=24;const view=healthView(s,st.hp,st.armor,st);assert.equal(view.shieldCharges,1);assert.equal(view.shieldMax,1);
});

test('Bastion cooldown survives removal, re-equipping, and additional mission time',()=>{
 const s=fixture('bastion'),legs=[...s.legs];s.time=6;s.legs=[];syncSetState(s);assert(!setBarrierView(s).active);
 s.legs=legs;syncSetState(s);assert.equal(s.setsV2.barrierAt,12);assert(!setBarrierView(s).ready);
 s.isaac={extraTime:6,deals:{}};assert(setBarrierView(s).ready);receiveHit(s,stats(s));assert.equal(s.setsV2.barrierAt,24);
 s.legs=[];syncSetState(s);s.legs=legs;syncSetState(s);assert.equal(s.setsV2.barrierAt,24);
 const organ=createPart(s,'shield');s.organs=[organ];assert.equal(shieldRechargeDelay(s,organ),15);
});

test('Rootwalker heals independently in combat and does not speed up organ regeneration',()=>{
 const s=fixture('rootwalker'),st=stats(s);s.hp=1;s.health.missing=st.hp-1;s.time=11;
 s.health.armorSpent=100;receiveHit(s,st,{damage:.5});assert.equal(s.setsV2.tissueAt,12);
 s.time=12;const before=s.hp;tickHealth(s,st);near(s.hp,before+1);assert.equal(s.setsV2.tissueAt,24);assert.equal(st.regen,false);assert.equal(st.regenDelay,15);
 s.organs=[createPart(s,'regen')];assert.equal(stats(s).regenDelay,15);
});

test('Rootwalker does not bank heals or revive the dead and respects healing suppression',()=>{
 const s=fixture('rootwalker'),st=stats(s);s.time=12;tickHealth(s,st);assert.equal(s.setsV2.tissueAt,24);
 s.hp=st.hp-1;s.health.missing=1;s.time=13;tickHealth(s,st);assert.equal(s.hp,st.hp-1);
 s.encounters={active:{type:'infection',x:s.player.x,z:s.player.z,radius:5}};s.time=24;tickHealth(s,st);assert.equal(s.hp,st.hp-1);assert.equal(s.setsV2.tissueAt,36);
 s.hp=0;s.time=36;tickHealth(s,st);assert.equal(s.hp,0);
});

test('Rootwalker maximum health cannot be farmed by repeatedly equipping its second category',()=>{
 const s=fixture('rootwalker',1),p=s.arms[0];p.setId='rootwalker';s.inventory.push(p);s.arms[0]=null;
 const before=stats(s).hp;s.hp=before-1;s.health.missing=1;
 for(let i=0;i<4;i++){assert(equip(s,p.id,0));const hp=s.hp;assert(unequip(s,'arms',0));assert.equal(s.hp,before-1);assert.equal(hp,before);}
});

test('Hecaton refills all magazines after three different arm attacks without resetting attack cooldowns',()=>{
 const s=fixture('hecaton');for(const p of s.arms){p.ammo=0;p.reloadRemaining=2;p.cooldown=3;}
 const fire=p=>finishSetAttack(s,p,weaponStats(s,p),()=>{});
 fire(s.arms[0]);fire(s.arms[0]);assert.equal(Object.keys(s.setsV2.hands).length,1);fire(s.arms[1]);fire(s.arms[2]);
 for(const p of s.arms){if(CATALOG[p.key].magazine){assert.equal(p.ammo,CATALOG[p.key].magazine);assert.equal(p.reloadRemaining,0);}assert.equal(p.cooldown,3);}
 assert.equal(s.setsV2.hecatonAt,8);s.time=7;for(const p of s.arms)fire(p);assert.equal(Object.keys(s.setsV2.hands).length,0);
 s.time=8;fire(s.arms[0]);s.time=12.01;fire(s.arms[1]);fire(s.arms[2]);assert.equal(Object.keys(s.setsV2.hands).length,2);
});

test('Reactor releases once per attack, respects walls, room boundaries and radius, and uses secondary damage',()=>{
 const s=fixture('reactor'),p=s.arms[0],w=weaponStats(s,p);s.enemies=[dummy(),{...dummy(),id:901,x:5},{...dummy(),id:902,x:1},{...dummy(),id:903,x:-1,dungeonDormant:true}];
 s.world.lineClear=(a,b)=>b.x!==1;const hits=[];finishSetAttack(s,p,w,(e,d,source)=>hits.push({id:e.id,d,source}));assert.equal(hits.length,0);
 s.time=12;finishSetAttack(s,p,w,(e,d,source)=>hits.push({id:e.id,d,source}));assert.deepEqual(hits,[{id:900,d:w.damage*.8,source:'set-reactor'}]);
 finishSetAttack(s,p,w,()=>assert.fail('double pulse'));assert.equal(s.setsV2.reactorAt,24);
 s.time=24;finishSetAttack(s,p,{...w,secondary:'echo'},()=>assert.fail('secondary pulse'));assert.equal(s.setsV2.reactorAt,24);
});

test('Wanderer pulse attracts only reachable existing experience after its first full interval',()=>{
 const s=fixture('wanderer');s.xpDrops=[{x:19,y:0,z:0,value:1},{x:21,y:0,z:0,value:2},{x:5,y:3,z:0,value:3},{x:4,y:0,z:0,value:4}];s.world.lineClear=(a,b)=>a.x!==4;
 tickSetCollector(s);assert(s.xpDrops.every(q=>!q.setAttracted));s.time=12;tickSetCollector(s);assert.deepEqual(s.xpDrops.map(q=>!!q.setAttracted),[true,false,false,false]);assert.equal(s.setsV2.collectorAt,24);
 s.legs=[];syncSetState(s);assert(s.xpDrops.every(q=>!q.setAttracted));
});

test('Broodmother creates its own companion without body, Colony or swarm equipment and preserves replacement cooldown',()=>{
 const s=fixture('broodmother',2);tickEffects(s,0,()=>{});assert.equal(summonTuning(s).setCount,1);assert.equal(s.abilities.companions.length,1);
 const c=s.abilities.companions[0];assert.equal(c.sourceKey,'set-broodmother');destroySymbiont(s,c);tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,0);
 const arms=s.arms;s.arms=[];syncSetState(s);s.arms=arms;syncSetState(s);tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,0);
 s.time=1.2;tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,1);
});

test('Broodmother interception boosts the entire swarm and pending summons for four seconds without stacking',()=>{
 const s=fixture('broodmother');s.abilities.learned=['summons.0'];tickEffects(s,0,()=>{});const cs=[...s.abilities.companions];assert.equal(cs.length,2);
 destroySymbiont(s,cs[0]);near(summonTuning(s).rate,1.4);near(s.abilities.companionSummonReadyAt[cs[0].sourceKey],1.2/1.4);
 s.time=.2;destroySymbiont(s,cs[1]);near(summonTuning(s).rate,1.4);near(s.setsV2.broodUntil,4.2);
 s.time=4.2;near(summonTuning(s).rate,1);tickEffects(s,0,()=>{});assert.equal(s.abilities.companions.length,2);
});

test('v1 save state is ignored, UI and item previews do not modify live set timers',()=>{
 const s=fixture('bastion');delete s.setsV2;s.setCombat={chimeraAt:999,hands:{1:20}};
 const before=JSON.stringify(s);stats(s);healthView(s,stats(s).hp);itemInspectorData(s,s.arms[0]);activeSetCard(s,'bastion',3);assert.equal(JSON.stringify(s),before);
 syncSetState(s);assert.equal(s.setsV2.barrierAt,12);const state=JSON.stringify(s.setsV2);itemInspectorData(s,s.arms[0]);const copy=cloneForComparison(s);copy.setsV2.barrierAt=100;assert.equal(JSON.stringify(s.setsV2),state);
});

test('Soul cards retain both thresholds, label missing categories and never display slash-separated progress',()=>{
 for(const id of Object.keys(SETS)){
  const s=fixture(id,2),html=activeSetCard(s,id,2);assert(html.includes(SETS[id].two));assert(html.includes(SETS[id].three));assert(html.includes('Нужно ещё 1 тип'));
  const full=activeSetCard(fixture(id,4),id,4);assert(full.includes('Комплект собран'));assert.doesNotMatch(html+full,/\d\s*\/\s*\d/);
  for(const copy of [SETS[id].two,SETS[id].three,SETS[id].details,setStatus(fixture(id),id)])assert.doesNotMatch(translateText(copy),/[А-Яа-яЁё]/u,copy);
 }
 assert.equal(setProgress(1),'1 из 3');assert.equal(setProgress(4),'Комплект собран · 4 типа');
});
