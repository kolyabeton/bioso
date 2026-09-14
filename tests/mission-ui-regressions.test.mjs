import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createWorldRun} from '../src/world-run.js';
import {missionRetryMode} from '../src/ui/mission-retry.js';

test('retry keeps the current mission while survival returns to preparation',()=>{
 assert.equal(missionRetryMode(createWorldRun(undefined,'garden',42)),'garden');
 assert.equal(missionRetryMode(createWorldRun(undefined,'survival',42)),null);
});

test('the permanent assembly control is not hidden with nearby loot',async()=>{
 const css=await readFile(new URL('../src/hud-integration.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/dock-controls:has\(#nearby\[hidden\]\)/);
});
