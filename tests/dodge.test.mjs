import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,MAX_DODGE_CHANCE} from '../src/assembly.js';
import {ABILITIES,FALLBACKS,abilityDescriptionAtLevel,learn} from '../src/systems/abilities.js';
import {receiveHit} from '../src/systems/health.js';

test('reflex organ and Mobility ranks share one bounded dodge stat',()=>{
 const s=createRun();s.organs=[createPart(s,'reflexNerve'),null];
 assert.equal(stats(s).dodge,.1);
 for(let rank=0;rank<5;rank++)learn(s,'motion.2');
 assert.equal(stats(s).dodge,.35);
 s.organs=[createPart(s,'reflexNerve',5),createPart(s,'reflexNerve',5)];
 assert.equal(stats(s).dodge,MAX_DODGE_CHANCE);
 assert.doesNotMatch(abilityDescriptionAtLevel(ABILITIES['motion.2'],5),/предел|максимум/i);
});

test('a dodge consumes no health, armor, shield or hit invulnerability',()=>{
 const s=createRun();s.organs=[createPart(s,'reflexNerve'),null];const st=stats(s),hp=s.hp;s.health.armorSpent=st.armor;
 s.rng=()=>0;assert.equal(receiveHit(s,st,{source:{x:s.player.x-2,z:s.player.z}}),'dodged');assert.equal(s.hp,hp);assert.equal(s.health.invulnerableUntil,0);assert.equal(s.health.dodged,1);assert.deepEqual(s.events.at(-1),{type:'dodge',x:s.player.x,y:s.player.y??0,z:s.player.z,dx:1,dz:0});
 s.rng=()=>1;assert.equal(receiveHit(s,st),'hurt');assert.equal(s.hp,hp-1);
});

test('repeatable health skill grants one maximum-health segment per rank',()=>{
 const s=createRun();for(let rank=0;rank<5;rank++)learn(s,'minor.hp');
 assert.equal(stats(s).hp,7);assert.equal(FALLBACKS['minor.hp'].bonus.hp,1);
 assert.match(abilityDescriptionAtLevel(FALLBACKS['minor.hp'],5),/5 делений/);
});
