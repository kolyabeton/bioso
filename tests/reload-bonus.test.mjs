import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,step} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {applyConsumable} from '../src/systems/consumable-drops.js';
import {startReload,tickWeapons} from '../src/combat-feel.js';
import {reloadSecondsLeft,reloadWorkInStep} from '../src/systems/reload-bonus.js';
import {isaacState} from '../src/systems/mutations.js';
import {handPresentation} from '../src/hud-presentation.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function setup(key='seed'){const s=createRun(undefined,'survival',77);s.enemies=[];s.arms=[createPart(s,key)];const p=s.arms[0];p.ammo=0;startReload(s,p);return{s,p};}
const boost=s=>applyConsumable(s,'recharge',stats(s));
function tick(s,dt){s.time+=dt;tickWeapons(s,dt);}
test('50 percent reload speed makes a 1.2 second reload take .8 seconds',()=>{
 const{s,p}=setup();boost(s);near(p.reloadRemaining,1.2);tick(s,.79);assert.equal(p.ammo,0);tick(s,.01);assert.equal(p.ammo,12);
});
test('ongoing reload accelerates immediately without changing attack cooldown or magazine',()=>{
 const{s,p}=setup();tick(s,.3);p.cooldown=3;boost(s);near(p.reloadRemaining,.9);assert.equal(p.ammo,0);assert.equal(p.cooldown,3);near(handPresentation(s)[0].reloadLeft,.6);tick(s,.6);assert.equal(p.ammo,12);
});
test('expiry integrates a crossing step and later reloads return to normal',()=>{
 const{s,p}=setup();boost(s);s.time=7.9;p.reloadRemaining=2;tick(s,.2);near(p.reloadRemaining,1.75);near(reloadSecondsLeft(s,p.reloadRemaining),1.75);tick(s,.2);near(p.reloadRemaining,1.55);
});
test('repeat pickup refreshes eight seconds without stacking speed',()=>{
 const{s,p}=setup();boost(s);s.time=4;boost(s);assert.equal(s.consumables.rechargeUntil,12);tick(s,.2);near(p.reloadRemaining,.9);
});
test('bonus uses combat time, freezes at dt zero and composes with weapon reload duration',()=>{
 const{s,p}=setup('shotgun');isaacState(s).extraTime=10;boost(s);assert.equal(s.consumables.rechargeUntil,18);const before=p.reloadRemaining;tickWeapons(s,0);near(p.reloadRemaining,before);s.isaac.extraTime+=.5;tickWeapons(s,.5);near(p.reloadRemaining,before-.75);
});
test('reload work is stable at 30, 60 and 120 Hz including expiry',()=>{
 for(const hz of [30,60,120]){const{s}=setup();boost(s);let work=0;for(let i=0;i<9*hz;i++){s.time=(i+1)/hz;work+=reloadWorkInStep(s,1/hz);}near(work,13);}
});
test('real game steps apply the bonus to both ranged and melee magazines',()=>{
 for(const key of ['seed','claws']){const{s,p}=setup(key);p.disabled=true;boost(s);const before=p.reloadRemaining;step(s,.05);near(p.reloadRemaining,before-.075);}
});
