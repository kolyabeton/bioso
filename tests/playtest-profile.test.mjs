import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,readProfile} from '../src/assembly.js';
import {MISSIONS,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS,WEAPONS} from '../src/catalog.js';
import {ACHIEVEMENTS,achievementDone} from '../src/systems/achievements.js';
import {completePlaytestProfile,playtestStorage} from '../src/playtest-profile.js';

test('playtest profile represents five missions and one complete level-30 hard survival run',()=>{
 const ordinary=newProfile(),data=new Map([['biomecha.profile.v1',JSON.stringify(ordinary)]]);
 const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
 const isolated=playtestStorage(storage),profile=completePlaytestProfile(readProfile(isolated));
 isolated.setItem('biomecha.profile.v1',JSON.stringify(profile));
 const reloaded=readProfile(isolated);
 assert.deepEqual(readProfile(storage),ordinary);
 assert.equal(reloaded.meta.runs,1);
 assert.equal(reloaded.meta.wins,1);
 assert.equal(reloaded.meta.rerolls,5);
 assert.equal(reloaded.meta.biomassRecord,6000);
 assert.equal(reloaded.meta.overruns,0);
 assert.equal(reloaded.meta.survivalAchievements.level20Runs,1);
 assert.equal(reloaded.meta.survivalAchievements.elites,10);
 assert.deepEqual(MISSIONS.map(m=>achievementDone(reloaded,ACHIEVEMENTS.find(a=>a.id==='mission:'+m.id))),[true,true,true,true,true]);
 assert.deepEqual(ACHIEVEMENTS.filter(a=>achievementDone(reloaded,a)).map(a=>a.id),[
  ...WEAPON_UNLOCKS.map(a=>a.id),...SURVIVAL_UNLOCKS.map(a=>a.id),...MISSIONS.map(m=>'mission:'+m.id),
  'survival:level-25','survival:level-30','survival:escape-hard',
 ]);
 assert.deepEqual(Object.keys(WEAPONS).filter(key=>!reloaded.unlocked.includes(key)),['harpoon']);
 for(const key of ['reactor','reflexNerve'])assert.ok(!reloaded.unlocked.includes(key),key);
 assert.ok(reloaded.unlocked.includes('reverseHeart'));
 assert.deepEqual(completePlaytestProfile(reloaded).achievements,reloaded.achievements);
});
