import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {healthView} from '../src/systems/health.js';
import {healthSegments} from '../src/ui/atoms.js';

function woundedRun(seconds=15){
 const s=createRun();s.rng=()=>1;s.organs[0]=createPart(s,'regen');
 if(seconds<15){const root=createPart(s,'root');root.upgrades.regen=15-seconds;s.legs[0]=root;}
 const st=stats(s);s.health.armorSpent=st.armor;receiveDamage(s,1,st);return{s,st};
}

test('regeneration HUD follows the real 15 second health timer',()=>{
 const {s,st}=woundedRun();
 let view=healthView(s,st.hp,st.armor,st);assert.equal(view.regenActive,true);assert.equal(view.regenProgress,0);assert.equal(view.regenSecondsLeft,15);
 s.time=7.5;view=healthView(s,st.hp,st.armor,st);assert.equal(view.regenProgress,.5);assert.deepEqual(view.regenCells.map(cell=>cell.fill),[0,0,0,.5]);
 assert.match(healthSegments(view),/ui-health-regen/);
});

/** Item 2: root legs stopped shortening the organ timer and now heal continuously,
 * so the HUD keeps the Repairman's own 15 s while a root build still regenerates. */
test('root legs leave the organ timer alone and expose a continuous rate instead',()=>{
 const {s,st}=woundedRun(10);s.time=5;
 assert.equal(st.regenDelay,15);
 assert.ok(st.regenPerSecond>0,'the installed root leg regenerates continuously');
 const view=healthView(s,st.hp,st.armor,st);
 assert.ok(Math.abs(view.regenProgress-5/15)<1e-9,`${view.regenProgress} != 1/3`);assert.equal(view.regenSecondsLeft,10);
 // Damage does not restart the organ timer while a root leg is installed.
 s.hp=st.hp;s.health.missing=0;s.health.armorSpent=st.armor;s.health.invulnerableUntil=0;s.time=6;receiveDamage(s,1,st);
 assert.equal(healthView(s,st.hp,st.armor,st).regenSecondsLeft,9);
});

test('regenerator organ still restarts its timer after damage',()=>{
 const {s,st}=woundedRun();s.time=7.5;s.hp=st.hp;s.health.missing=0;s.health.armorSpent=st.armor;s.health.invulnerableUntil=0;
 receiveDamage(s,1,st);const view=healthView(s,st.hp,st.armor,st);assert.equal(view.regenProgress,0);assert.equal(view.regenSecondsLeft,15);
});

test('regeneration HUD stays inactive at full or zero health',()=>{
 const {s,st}=woundedRun();s.hp=st.hp;s.health.missing=0;assert.equal(healthView(s,st.hp,st.armor,st).regenActive,false);
 s.hp=0;s.health.missing=st.hp;assert.equal(healthView(s,st.hp,st.armor,st).regenActive,false);
});
