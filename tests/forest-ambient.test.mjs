import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createAmbientGovernor,createForestAmbientState,AMBIENT_TIERS} from '../src/forest-ambient-state.js';
import {createForestAmbientView} from '../src/forest-ambient-view.js';
import {renderCadence} from '../src/render-cadence.js';
import {readSettings} from '../src/ui/settings.js';
const run=()=>({world:{presentation:'biomes',tiles:[{biome:'forest',decorations:[{feature:'thicket',x:0,z:0,size:3}]}],tileAt:()=>({biome:'forest'})},player:{x:1,z:0},motion:{x:1,z:0},enemies:[]});
test('combat scatters life and requires five active quiet seconds; pause cannot advance recovery',()=>{
 const a=createForestAmbientState(),s=run();assert.equal(a.update(s,.1).combat,false);
 a.event({type:'attack'});assert.equal(a.update(s,0).combat,true);
 for(let i=0;i<49;i++)a.update(s,.1);assert.equal(a.update(s,0).combat,true);
 a.update(s,.1);assert.equal(a.update(s,.1).combat,false);
 s.enemies=[{x:2,z:2,hp:10}];assert.equal(a.update(s,.1).combat,true);
 s.world.tileAt=()=>({biome:'city'});assert.equal(a.update(s,.1).active,false);
});
test('high quality keeps the complete ambient tier under sustained load',()=>{
 const a=createAmbientGovernor();for(let i=0;i<1200;i++)a.sample(40,1/60,60,true,'high');
 assert.equal(a.tier('high'),'high');assert.equal(a.info().ambientCeiling,'high');
 const b=createAmbientGovernor();for(let i=0;i<1200;i++)b.sample(40,1/60,60,true,'medium');
 assert.equal(b.tier('medium'),'low');assert.equal(b.tier('high'),'high');
});
test('ambient pools obey tiers, player proximity, combat density, reduced motion and reset',()=>{
 const scene=new T.Scene(),a=createForestAmbientView(scene),s=run();
 for(const tier of Object.keys(AMBIENT_TIERS)){a.reset();a.update(s,.1,tier,false);assert.equal(a.info().birds,AMBIENT_TIERS[tier].birds);assert.equal(a.info().particles,AMBIENT_TIERS[tier].particles);}
 a.event({type:'attack'});a.update(s,.1,'medium',false);assert.equal(a.info().particles,12);
 a.update(s,.1,'high',true);assert.equal(a.info().birds,0);assert.equal(a.info().particles,0);assert.ok(a.info().contactShadows>0);assert.equal(a.uniforms.forestMotion.value,0);
 a.reset();assert.equal(a.info().birds,0);a.dispose();assert.equal(scene.children.length,0);
});
test('new installs default to 60, saved choices survive and menus throttle',()=>{
 assert.equal(readSettings({getItem:()=>null},{coarse:true}).fps,60);
 assert.equal(readSettings({getItem:()=>'{"fps":60}'},{coarse:true}).fps,60);
 assert.equal(readSettings({getItem:()=>null},{coarse:false}).fps,60);
 assert.equal(renderCadence({hidden:true,fps:60}),0);
 assert.equal(renderCadence({menu:true,preview:false,fps:60}),10);
 assert.equal(renderCadence({menu:true,preview:true,fps:60}),30);
});
