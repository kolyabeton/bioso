import test from 'node:test';
import assert from 'node:assert/strict';
import {soulSummonStats} from '../src/ui/soul-summon-stats.js';

test('Soul omits summon statistics when no helpers are available',()=>{
  assert.deepEqual(soulSummonStats({abilities:{companions:[]}},{}),[]);
});

test('Soul adds summon statistics to the common table for the full build',()=>{
  const s={body:{key:'broodmother',tier:5,setId:'broodmother'},arms:[{key:'drone',setId:'broodmother'}],legs:Array.from({length:3},()=>({key:'swarmLeg',setId:'broodmother'})),organs:Array.from({length:2},()=>({key:'broodNode',setId:'broodmother'})),abilities:{companions:Array(8).fill({})}};
  assert.deepEqual(soulSummonStats(s,{summons:3,summonDamage:.75,summonRate:.6}),[
    ['Помощники','8 из 10'],['Урон роя','×2.60'],['Темп роя','×1.60'],['Призыв нового','0.75 с'],['Поиск роя','12 м'],['Поиск дронов','10 м'],
  ]);
});

test('Soul shows helpers unlocked by Colony on another body',()=>{
  assert.equal(soulSummonStats({abilities:{companions:[{}]}},{summons:1})[0][1],'1 из 1');
});

test('Soul shows a missing destroyed interceptor until its replacement is summoned',()=>{
  const s={body:{key:'broodmother',tier:2,setId:'broodmother'},arms:[{key:'drone',setId:'broodmother'}],abilities:{companions:[{}]}};
  assert.equal(soulSummonStats(s,{})[0][1],'1 из 4');
});
