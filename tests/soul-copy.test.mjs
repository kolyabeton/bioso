import test from 'node:test';
import assert from 'node:assert/strict';
import {soulRecoveryRows} from '../src/ui/soul-copy.js';
import {translateText} from '../src/i18n/index.js';

test('soul health recovery uses compact HP notation',()=>{
 assert.deepEqual(soulRecoveryRows({regen:true,regenAmount:1,regenDelay:8.3,setRegen:true}),[
  ['Регенерация','+1 HP / 8.3 с без урона'],
  ['Живые ткани','+1 HP / 12 с'],
 ]);
});

test('root recovery omits the damage-free condition',()=>{
 assert.deepEqual(soulRecoveryRows({regen:true,regenAmount:1,regenDelay:8.3,regenPersistsThroughDamage:true,setRegen:false}),[
  ['Регенерация','+1 HP / 8.3 с'],
 ]);
});

test('soul recovery rows keep the empty regeneration state',()=>{
 assert.deepEqual(soulRecoveryRows({regen:false,setRegen:false}),[['Регенерация','Нет']]);
});

test('root persistent regeneration copy has an English presentation',()=>{
 assert.equal(translateText('Не сбрасывает таймер','en'),'Does not reset the timer');
 assert.equal(translateText('Восстанавливает HP по таймеру. Полученный урон не сбрасывает отсчёт.','en'),'Restores HP on its own timer. Taking damage does not reset it.');
});
