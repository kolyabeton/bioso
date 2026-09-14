import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {prepareSpringLeapReview} from '../src/spring-leap-review.js';

test('spring review exercises a real safe spring contact from a fresh run',()=>{
 let now=0;const run=createRun(),review=prepareSpringLeapReview(run,()=>now);run.world={walkable:()=>true};now=500;review.tick();
 assert.equal(run.events.at(-1)?.type,'spring-leap');assert.equal(run.legs[0].key,'spring');assert.notEqual(run.player.x,0);
});
