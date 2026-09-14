import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage} from '../src/game.js';
import {learn,modifiers,recordBiomassSpend} from '../src/systems/abilities.js';
import {prepareAbilityAttack,abilityDamageMultiplier,applyCriticalTempo,markRupture,tryNeuralWeb,ricochetProfile,nextRicochetTarget,tickGuardian,tickCryoTrail,symbiontAbilityHit,tickSporeBrood} from '../src/systems/ability-combat.js';

const run=()=>{const s=createRun(undefined,'survival',2718);s.world={lineClear:()=>true};s.events=[];return s;};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('neural acceleration stacks per arm and target, caps, and resets after two seconds',()=>{
 const s=run(),arm=s.arms[0],target={id:7,x:4,y:0,z:0},weapon={mode:'sector',interval:1,damage:10,range:5};learn(s,'tempo.1');
 for(let i=1;i<=7;i++)near(prepareAbilityAttack(s,arm,weapon,target).interval,1/(1+Math.min(5,i)*.05));
 assert.equal(s.abilities.focus[arm.id].stacks,5);s.time=2;
 near(prepareAbilityAttack(s,arm,weapon,target).interval,1/1.05);
 near(prepareAbilityAttack(s,arm,weapon,{...target,id:8}).interval,1/1.05);
 const before=s.abilities.focus[arm.id];prepareAbilityAttack(s,arm,{...weapon,secondary:'echo'},target,true);assert.equal(s.abilities.focus[arm.id],before);
});

test('ballistic growth snapshots a bounded distance multiplier for the whole volley',()=>{
 const s=run(),arm=s.arms[0],weapon={mode:'projectile',interval:1,damage:20,range:10};learn(s,'ranged.2');
 let shot=prepareAbilityAttack(s,arm,weapon,{id:1,x:4,y:0,z:0});near(shot.ballisticBonus,0);near(shot.damage,20);
 shot=prepareAbilityAttack(s,arm,weapon,{id:2,x:5,y:0,z:0});near(shot.ballisticBonus,0);near(shot.damage,20);
 shot=prepareAbilityAttack(s,arm,weapon,{id:3,x:7.5,y:0,z:0});near(shot.ballisticBonus,.15);near(shot.damage,23);
 shot=prepareAbilityAttack(s,arm,weapon,{id:4,x:30,y:0,z:0});near(shot.ballisticBonus,.3);near(shot.damage,26);
 assert.equal(weapon.ballisticBonus,undefined);assert.equal(weapon.damage,20);
});

test('rupture starts on a primary critical and buffs only subsequent primary hits',()=>{
 const s=run(),enemy={id:1,x:1,z:0,hp:100},weapon={mode:'projectile',damage:10};learn(s,'might.2');
 near(abilityDamageMultiplier(s,enemy,weapon),1);assert.equal(markRupture(s,enemy,weapon,true),true);near(abilityDamageMultiplier(s,enemy,weapon),1.2);
 near(abilityDamageMultiplier(s,enemy,{...weapon,secondary:'splinter'}),1);s.time=3;near(abilityDamageMultiplier(s,enemy,weapon),1);
});

test('impulse refunds one cooldown portion per original critical attack',()=>{
 const s=run(),arm=s.arms[0];learn(s,'tempo.2');arm.cooldown=10;const weapon={partId:arm.id,mode:'sector',damage:10};
 assert.equal(applyCriticalTempo(s,weapon,true),true);near(arm.cooldown,8.5);assert.equal(applyCriticalTempo(s,weapon,true),false);near(arm.cooldown,8.5);
 const secondary={partId:arm.id,mode:'projectile',secondary:'ricochet'};assert.equal(applyCriticalTempo(s,secondary,true),false);
 const maxed=run(),maxArm=maxed.arms[0];for(let i=0;i<5;i++)learn(maxed,'tempo.2');maxArm.cooldown=10;assert.equal(applyCriticalTempo(maxed,{partId:maxArm.id,mode:'sector'},true),true);near(maxArm.cooldown,5.5);
});

test('neural web arcs once from an original volley and never recurses from secondary damage',()=>{
 const s=run(),origin={id:1,x:2,y:0,z:0,hp:100},other={id:2,x:5,y:0,z:0,hp:100};s.enemies=[origin,other];learn(s,'neuralweb');
 const weapon={mode:'projectile',damage:10,abilityVolley:{neuralWebUsed:false}},hits=[];
 assert.equal(tryNeuralWeb(s,origin,weapon,25,(...args)=>hits.push(args)),true);assert.deepEqual(hits,[[other,10,'neuralweb']]);
 assert.equal(tryNeuralWeb(s,origin,weapon,25,()=>assert.fail()),false);assert.equal(tryNeuralWeb(s,origin,{...weapon,secondary:'splinter',abilityVolley:{neuralWebUsed:false}},25,()=>assert.fail()),false);
});

test('ricochet branches scale damage, targets, and wounded-target critical chance',()=>{
 const s=run(),weapon={mode:'projectile',damage:10,crit:.1};learn(s,'ricochet.0');for(const id of ['ricochet.1','ricochet.2','ricochet.3'])for(let i=0;i<5;i++)assert.ok(learn(s,id));
 assert.deepEqual(ricochetProfile(s,weapon),{hops:6,damage:1,crit:.25,hunter:true,range:4});
 const origin={id:1,x:0,z:0,hp:100,maxHp:100},nearby={id:2,x:1,z:0,hp:90,maxHp:100},wounded={id:3,x:3,z:0,hp:10,maxHp:100};s.enemies=[origin,nearby,wounded];
 assert.equal(nextRicochetTarget(s,origin,new Set([origin.id]),true),wounded);assert.equal(nextRicochetTarget(s,origin,new Set([origin.id]),false),nearby);
});

test('counter shell charges on shield, armor, and health outcomes and is consumed by one melee attack',()=>{
 const s=run(),target={id:2,x:1,y:0,z:0},arm=s.arms[0],weapon={mode:'sector',interval:1,damage:10,range:2};learn(s,'countershell');
 s.consumables={shieldCharges:1,shieldUntil:10};assert.equal(receiveDamage(s,1),'shield');assert.equal(s.abilities.retaliationUntil,5);
 let charged=prepareAbilityAttack(s,arm,weapon,target);assert.equal(charged.damage,20);assert.equal(charged.counterShell,true);assert.equal(s.abilities.retaliationUntil,0);
 charged=prepareAbilityAttack(s,arm,weapon,target);assert.equal(charged.damage,10);
});

test('summon damage does not invent a guardian projectile interceptor',()=>{
 const s=run();learn(s,'summons.1');s.hostileShots=[{id:1,x:5,z:0},{id:2,x:2,z:0},{id:3,x:8,z:0}];
 assert.equal(modifiers(s).guardian,undefined);assert.equal(tickGuardian(s),false);assert.deepEqual(s.hostileShots.map(q=>q.id),[1,2,3]);
});

test('spore brood plants every fifth bite, caps at twelve, then explodes once without attack counters',()=>{
 const s=run(),host={id:1,x:1,y:0,z:0,hp:100,radius:.5},other={id:2,x:2,y:0,z:0,hp:100,radius:.5};s.enemies=[host,other];learn(s,'sporebrood');
 for(let i=0;i<60;i++)symbiontAbilityHit(s,host,12);assert.equal(s.abilities.spores.length,12);assert.deepEqual(s.abilities.attacks,{});
 s.time=2;const hits=[],burns=[];tickSporeBrood(s,(e,d,source)=>hits.push([e.id,d,source]),(e,d)=>burns.push([e.id,d]));
 assert.equal(s.abilities.spores.length,0);assert.equal(hits.length,24);assert.ok(hits.every(([,d,source])=>d===12&&source==='sporebrood'));assert.equal(burns.length,24);assert.deepEqual(s.abilities.attacks,{});
});

test('overgrowth counts earlier biomass spending and stops at twenty-five percent',()=>{
 const s=run();recordBiomassSpend(s,89);learn(s,'overgrowth');near(modifiers(s).damage,.1);recordBiomassSpend(s,61);near(modifiers(s).damage,.25);recordBiomassSpend(s,300);near(modifiers(s).damage,.25);
 assert.equal(s.events.filter(e=>e.type==='soul-proc'&&e.kind==='overgrowth').length,2);
});

test('overgrowth ranks cap the five biomass thresholds at seventy-five percent',()=>{
 const s=run();recordBiomassSpend(s,150);for(let i=0;i<5;i++)learn(s,'overgrowth');near(modifiers(s).damage,.75);recordBiomassSpend(s,300);near(modifiers(s).damage,.75);
});

test('cryo trail starts after two moving seconds, refreshes slow without freeze charges, and expires',()=>{
 const s=run(),enemy={id:1,x:0,y:0,z:0,hp:100,radius:.5};s.enemies=[enemy];learn(s,'cryotrail');s.abilities.moving=2;
 tickCryoTrail(s);assert.equal(s.abilities.cryoTrails.length,1);assert.ok(enemy.chillUntil>0);assert.equal(enemy.chillHits,undefined);
 s.time=.9;tickCryoTrail(s);assert.equal(s.abilities.cryoTrails.length,1);s.time=1;tickCryoTrail(s);assert.equal(s.abilities.cryoTrails.length,2);
 s.abilities.moving=0;s.time=4.1;tickCryoTrail(s);assert.equal(s.abilities.cryoTrails.length,0);
});

test('mechanical abilities gain real strength through all five levels',()=>{
 const max=(s,id)=>{for(let i=0;i<5;i++)assert.ok(learn(s,id),`${id} rank ${i+1}`);};
 const focus=run(),arm=focus.arms[0],target={id:1,x:10,y:0,z:0};max(focus,'tempo.1');near(prepareAbilityAttack(focus,arm,{mode:'sector',interval:1,damage:10,range:2},target).interval,1/1.15);
 const ballistic=run();max(ballistic,'ranged.2');const shot=prepareAbilityAttack(ballistic,ballistic.arms[0],{mode:'projectile',interval:1,damage:20,range:10},target);near(shot.ballisticBonus,.9);near(shot.damage,38);
 const counter=run();max(counter,'countershell');counter.abilities.retaliationUntil=5;near(prepareAbilityAttack(counter,counter.arms[0],{mode:'sector',interval:1,damage:10,range:2},target).damage,40);
 const web=run(),origin={id:1,x:1,y:0,z:0,hp:100},other={id:2,x:2,y:0,z:0,hp:100};web.enemies=[origin,other];max(web,'neuralweb');const hits=[];tryNeuralWeb(web,origin,{mode:'projectile',abilityVolley:{neuralWebUsed:false}},25,(...args)=>hits.push(args));near(hits[0][1],30);
 const summons=run();max(summons,'summons.1');near(modifiers(summons).summonDamage,.75);assert.equal(tickGuardian(summons),false);
 const spores=run();spores.enemies=[origin];max(spores,'sporebrood');assert.ok(symbiontAbilityHit(spores,origin,8));
 const growth=run();recordBiomassSpend(growth,150);max(growth,'overgrowth');near(modifiers(growth).damage,.75);
 const trail=run();trail.enemies=[];max(trail,'cryotrail');trail.abilities.moving=2;tickCryoTrail(trail);near(trail.abilities.cryoTrails[0].radius,2.5);near(trail.abilities.cryoTrails[0].until,5);
});
