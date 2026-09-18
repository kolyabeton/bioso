import test from 'node:test';
import assert from 'node:assert/strict';
import {HEALTH_SEGMENT_LIMIT,healthSegments} from '../src/ui/atoms.js';
import {stats} from '../src/assembly.js';
import {createRun} from '../src/game.js';
import {prepareMaxHealthReview} from '../src/ui/max-health-review.js';

const view=max=>({current:max,max,segments:Array.from({length:max},()=>true),armor:0,armorMax:0,shield:false,shieldEquipped:false});

test('health HUD switches from cells to a progress bar only above twelve health',()=>{
 assert.equal(HEALTH_SEGMENT_LIMIT,12);
 assert.match(healthSegments(view(12)),/ui-health-segments/);
 assert.doesNotMatch(healthSegments(view(12)),/ui-health-progress/);
 assert.match(healthSegments(view(13)),/ui-health-progress/);
 assert.doesNotMatch(healthSegments(view(13)),/ui-health-segments/);
});

test('continuous health bar preserves health, regeneration, armor and shield layers',()=>{
 const html=healthSegments({...view(36),current:18,armor:6,armorMax:10,regenProgress:.5,regenAmount:2,shield:true,shieldEquipped:true,shieldMax:2,shieldCharges:2});
 assert.match(html,/ui-health-progress-fill" style="width:50%/);
 assert.match(html,/ui-health-progress-regen" style="left:50%;width:2\.778%/);
 assert.match(html,/ui-health-progress-armor" style="left:22\.222%;width:16\.667%/);
 assert.match(html,/ui-shield-ring/);assert.match(html,/>2</);
});

test('max-health review reaches the legitimate 34 HP cap',()=>{
 const run=createRun();
 prepareMaxHealthReview(run);
 assert.equal(stats(run).hp,34);
 assert.equal(run.hp,34);
});
