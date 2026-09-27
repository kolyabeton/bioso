import test from 'node:test';
import assert from 'node:assert/strict';
import {soulRecoveryRows} from '../src/ui/soul-copy.js';
test('Soul shows one total continuous health rate and separate armor repair',()=>{
 assert.deepEqual(soulRecoveryRows({regenPerSecond:.023,armorRepairPerSecond:.01,setRegen:true}),[['Регенерация','2,3%/с'],['Ремонт брони','1% брони/с']]);
 assert.deepEqual(soulRecoveryRows({regenPerSecond:0}),[['Регенерация','Нет']]);
});
