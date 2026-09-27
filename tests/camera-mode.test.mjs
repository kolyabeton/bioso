import test from 'node:test';
import assert from 'node:assert/strict';
import {createMissionBossCamera,cameraPitchDegrees} from '../src/mission-boss-camera.js';
import {createSettings,readSettings,SETTINGS_KEY} from '../src/ui/settings.js';
test('angled camera lowers pitch and returns to the original pose',()=>{
 const camera=createMissionBossCamera(),run={enemies:[]};
 const normal=camera.update(run,0,false,'standard'),angled=camera.update(run,0,false,'angled');
 assert.ok(cameraPitchDegrees(angled)>24&&cameraPitchDegrees(angled)<26);
 assert.ok(cameraPitchDegrees(angled)<cameraPitchDegrees(normal));
 assert.deepEqual(camera.update(run,0,false,'standard'),normal);
});
test('camera selection persists and invalid stored values use the original camera',()=>{
 const entries=new Map(),storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};
 const settings=createSettings(storage);settings.update('cameraMode','angled');
 assert.equal(readSettings(storage).cameraMode,'angled');
 storage.setItem(SETTINGS_KEY,JSON.stringify({cameraMode:'invalid'}));
 assert.equal(readSettings(storage).cameraMode,'standard');
});
