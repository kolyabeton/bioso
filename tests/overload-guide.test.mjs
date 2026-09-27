import test from 'node:test';
import assert from 'node:assert/strict';
import {createOverloadOnboarding,overloadDetails,overloadGuideProgress,overloadGuideStep} from '../src/ui/overload-guide.js';
import {createWorldRun} from '../src/world-run.js';
import {createPart,stats,canDrop,drop,digest,unequip,upgrade,upgradePrice} from '../src/assembly.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {firstUpgradeGuide} from '../src/ui/first-upgrade-guide.js';
test('first overload waits, defers to dialogs, opens once per run and cancels when resolved',()=>{
 const c=createOverloadOnboarding(),tick=(now,overloaded=true,blocked=false)=>c.update({now,overloaded,blocked,active:true});
 assert(!tick(0).open);assert(!tick(1499).open);assert(!tick(1500,true,true).open);assert(tick(1600).open);
 tick(1700,false);assert(!tick(4000).open);
 const d=createOverloadOnboarding();d.update({now:0,overloaded:true,active:true});d.update({now:100,overloaded:false,active:true});assert(!d.update({now:1600,overloaded:false,active:true}).open);
 const fresh=createOverloadOnboarding();fresh.update({now:0,overloaded:true,active:true});assert(fresh.update({now:1500,overloaded:true,active:true}).open);
});
test('weight split and safe heaviest target track drop, recycle and unequip',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.organs[0]=createPart(s,'digestion');
 while(!stats(s).overloaded)s.inventory.push(createPart(s,'claws'));
 s.inventory.push(createPart(s,'rocket'));let d=overloadDetails(s);assert(canDrop(s,d.target));assert.equal(d.target.key,'rocket');assert.equal(d.installedWeight+d.inventoryWeight,d.weight);
 const before=d.weight;assert(unequip(s,'arms',0));assert.equal(overloadDetails(s).weight,before);
 assert(drop(s,d.target.id));assert(overloadDetails(s).weight<before);assert(overloadDetails(s).overloaded);
 d=overloadDetails(s);assert.notEqual(digest(s,d.target.id),false);assert(!overloadDetails(s).overloaded);
 s.inventory=[];d=overloadDetails(s);assert(canDrop(s,d.target));assert.notEqual(d.target,s.body);
});
test('never recommends the current body, bound equipment or last leg',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.inventory=[];s.arms.forEach(p=>{if(p)p.bound=true;});s.organs.forEach(p=>{if(p)p.bound=true;});s.legs=s.legs.filter(Boolean).slice(0,1);
 assert.equal(overloadDetails(s).target,undefined);
 const bound=createPart(s,'rocket');bound.bound=true;s.inventory.push(bound);assert.equal(overloadDetails(s).target,undefined);
});
test('manual guided opening consumes automatic opening for this run',()=>{
 const c=createOverloadOnboarding();c.update({now:0,active:true,overloaded:true});c.update({now:100,active:true,overloaded:true,blocked:true,guided:true});assert(!c.update({now:2000,active:true,overloaded:true}).open);
});
test('unloading guidance precedes capacity and advances only after weight is resolved',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.organs[0]=createPart(s,'digestion');
 while(!stats(s).overloaded)s.inventory.push(createPart(s,'claws'));
 s.inventory.push(createPart(s,'rocket'));s.overloadGuide=true;
 assert.equal(overloadGuideStep(s),'item');
 assert(unequip(s,'arms',0));assert.equal(overloadGuideStep(s),'item');
 assert(drop(s,overloadDetails(s).target.id));assert.equal(overloadGuideStep(s),'item');
 assert.notEqual(digest(s,overloadDetails(s).target.id),false);assert.equal(overloadGuideStep(s),'body');
 while(!stats(s).overloaded)s.inventory.push(createPart(s,'claws'));
 assert.equal(overloadGuideStep(s),'body');
 s.overloadGuide=false;assert.equal(overloadGuideStep(s),null);
});
test('repeat overload has one remaining guidance step after onboarding is complete',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.overloadGuide=true;
 while(!stats(s).overloaded)s.inventory.push(createPart(s,'claws'));
 assert.equal(overloadGuideStep(s),'item');assert.equal(overloadGuideProgress(s,'item'),'1/2');
 s.overloadBodyUpgradeClaimed=true;
 assert.equal(overloadGuideStep(s),'item');assert.equal(overloadGuideProgress(s,'item'),'1/1');
});
test('capacity guidance cannot deadlock when there is nothing safe to unload',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.inventory=[];
 for(const p of [...s.arms,...s.organs])if(p)p.bound=true;
 s.legs=s.legs.filter(Boolean).slice(0,1);s.overloadGuide=true;
 assert.equal(overloadDetails(s).target,undefined);assert.equal(overloadGuideStep(s),'body');
});
test('one free capacity upgrade completes the guide without spending biomass',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.overloadGuide=true;s.overloadGuideStep='body';s.biomass=0;
 const before=stats(s).capacity,spent=s.body.spent;
 const model=itemInspectorData(s,s.body);
 assert.equal(model.actionLabel,'Улучшить бесплатно');assert.equal(model.disabled,false);
 assert.equal(model.notice,'');assert.equal(s.overloadBodyUpgradeClaimed,undefined);
 assert.equal(upgradePrice(s,s.body,'capacity'),0);
 assert.equal(upgrade(s,s.body.id,'damage',true),false);assert.equal(overloadGuideStep(s),'body');
 assert.equal(upgrade(s,s.body.id,'capacity',true),true);
 assert(stats(s).capacity>before);assert.equal(s.biomass,0);assert.equal(s.body.spent,spent);
 assert.equal(s.firstPaidUpgrade,undefined);assert.equal(s.overloadBodyUpgradeClaimed,true);
 assert.equal(firstUpgradeGuide(s),'');
 assert.equal(overloadGuideStep(s),null);assert.equal(s.overloadGuideStep,undefined);
 assert(upgradePrice(s,s.body,'capacity')>0);assert.equal(upgrade(s,s.body.id,'capacity',true),false);
 s.overloadGuide=true;s.overloadGuideStep='body';assert(upgradePrice(s,s.body,'capacity')>0);
 assert.equal(overloadGuideStep(s),null);
 s.biomass=100;const cost=upgradePrice(s,s.body,'capacity');assert(upgrade(s,s.body.id,'capacity',true));assert.equal(s.biomass,100-cost);
});
test('the free tutorial upgrade never applies to weapons or the unloading step',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.biomass=0;s.overloadGuide=true;
 assert(upgradePrice(s,s.body,'capacity')>0);assert.equal(upgrade(s,s.body.id,'capacity',true),false);
 s.overloadGuideStep='body';assert(upgradePrice(s,s.arms[0],'damage')>0);
 assert.equal(upgrade(s,s.arms[0].id,'damage',true),false);
 const spare=createPart(s,'wanderer');s.inventory.push(spare);
 assert(upgradePrice(s,spare,'capacity')>0);assert.equal(upgrade(s,spare.id,'capacity',true),false);
});
