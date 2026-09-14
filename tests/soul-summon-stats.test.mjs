import test from 'node:test';
import assert from 'node:assert/strict';
import {soulSummonStats} from '../src/ui/soul-summon-stats.js';

test('Soul omits summon statistics when no helpers are available',()=>{
  assert.deepEqual(soulSummonStats({abilities:{companions:[]}},{}),[]);
});

test('Soul adds summon statistics to the common table for the full build',()=>{
  const s={body:{key:'broodmother',tier:5},legs:Array(3).fill({key:'swarmLeg'}),organs:Array(2).fill({key:'broodNode'}),abilities:{companions:Array(8).fill({})}};
  assert.deepEqual(soulSummonStats(s,{summons:3,summonDamage:.75,summonRate:.6}),[
    ['Помощники','8 / 9'],['Урон роя','×2.15'],['Темп роя','×2.05'],['Призыв нового','0.59 с'],['Поиск роя','12 м'],
  ]);
});

test('Soul shows helpers unlocked by Colony on another body',()=>{
  assert.equal(soulSummonStats({abilities:{companions:[{}]}},{summons:1})[0][1],'1 / 1');
});

test('Soul shows a missing destroyed interceptor until its replacement is summoned',()=>{
  const s={body:{key:'broodmother',tier:2},abilities:{companions:[{}]}};
  assert.equal(soulSummonStats(s,{})[0][1],'1 / 2');
});
