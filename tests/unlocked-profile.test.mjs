import test from 'node:test';
import assert from 'node:assert/strict';
import {newProfile,readProfile,stats} from '../src/assembly.js';
import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {applyStartingLoadout} from '../src/game.js';
import {CATALOG,MISSIONS} from '../src/catalog.js';
import {ACHIEVEMENTS,achievementDone} from '../src/systems/achievements.js';
import {missionAvailable,starterAllowed,starterSlotAllowed} from '../src/systems/meta-progression.js';
import {unlockProfile,unlockedStorage} from '../src/unlocked-profile.js';

test('all achievements, weapons and missions survive reload without touching normal saves',()=>{
 const normal=newProfile(),data=new Map([['biomecha.profile.v1',JSON.stringify(normal)],['bioso.playtest.v1:biomecha.profile.v1',JSON.stringify({...normal,meta:{...normal.meta,rerolls:999}})]]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},isolated=unlockedStorage(storage),p=readProfile(isolated);
 unlockProfile(p);isolated.setItem('biomecha.profile.v1',JSON.stringify(p));const reloaded=readProfile(isolated);
 assert.deepEqual(readProfile(storage),normal);assert.equal(reloaded.meta.rerolls,0);
 assert.deepEqual(new Set(reloaded.unlocked),new Set(Object.keys(CATALOG)));
 for(const a of ACHIEVEMENTS)assert.equal(achievementDone(reloaded,a),true,a.id);
 for(const m of MISSIONS)assert.equal(missionAvailable(reloaded,m.id),true,m.id);
 for(const key of Object.keys(CATALOG))assert.equal(starterAllowed(reloaded,key),true,key);
 assert.equal(starterSlotAllowed(reloaded,'organ'),true);
});
test('unlocked profile preserves ordinary initial resources, equipment, abilities and combat stats',()=>{
 const normal=createWorldRun(newProfile(),'survival',20317),open=createWorldRun(unlockProfile(newProfile()),'survival',20317);
 for(const s of [normal,open])applyStartingLoadout(s,{body:'wanderer',arm:'pistol',organ:null});
 for(const key of ['level','xp','biomass','pending','hp','kills','time'])assert.equal(open[key],normal[key],key);
 assert.deepEqual(stats(open),stats(normal));assert.equal(open.biomass,0);assert.equal(open.level,1);
 assert.deepEqual(open.abilities.learned,[]);assert.equal(open.inventory.length,0);assert.equal(open.profile.meta.rerolls,0);
 unlockProfile(open.profile);assert.equal(open.profile.meta.rerolls,0);
});
test('every unlocked mission uses its ordinary starting state and simulation',()=>{
 for(const m of MISSIONS){const s=createWorldRun(unlockProfile(newProfile()),m.id,20317);assert.equal(s.biomass,0);assert.equal(s.level,1);
  for(let i=0;i<120;i++){stepWorldRun(s,1/30,{x:0,z:-1});s.events.length=0;}
  assert.ok(Number.isFinite(s.hp)&&s.hp>0,m.id);assert.ok(Number.isFinite(s.player.z));assert.equal(s.dead,false);
 }
});
