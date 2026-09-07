import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createWorldRun} from '../src/world-run.js';
import {setWaypoint,waypointTarget,screenBearing} from '../src/systems/waypoint.js';
import {atlasGeometry} from '../src/ui/map-terrain.js';
import {atlasSelection} from '../src/ui/map-atlas.js';

test('map clicks invert world projection in both zooms and multiple aspect ratios',()=>{
 const s=createWorldRun(undefined,'survival',12);
 for(const zoom of ['world','near'])for(const [w,h] of [[348,340],[520,420]]){
  const g=atlasGeometry(s,w,h,zoom),point={x:56,z:24},picked=g.worldAt(g.X(point.x),g.Z(point.z));
  assert.ok(Math.abs(picked.x-point.x)<1e-8);assert.ok(Math.abs(picked.z-point.z)<1e-8);
 }
});
test('point waypoint survives map presentation, rejects invalid terrain, belongs only to run',()=>{
 const s=createWorldRun(undefined,'survival',12),p=s.world.tiles[2].safe[2];
 assert.ok(setWaypoint(s,p));const w={...s.waypoint};atlasSelection(s,'waypoint');assert.deepEqual(s.waypoint,w);
 assert.equal(setWaypoint(s,{x:999,z:999}),false);assert.deepEqual(s.waypoint,w);
 assert.equal(setWaypoint(s,{x:NaN,z:3}),false);
 assert.equal(waypointTarget(createWorldRun(undefined,'survival',12)),null);
});
test('enemy marker tracks a moving enemy and expires when killed; completed encounter expires',()=>{
 const s=createWorldRun(undefined,'survival',12),e=s.enemies[0];setWaypoint(s,{...e,label:'Босс'});e.x+=10;
 assert.equal(waypointTarget(s).x,e.x);e.hp=0;assert.equal(waypointTarget(s),null);
 const n=s.encounters.nodes[0];setWaypoint(s,{...n,label:'Секрет'});assert.ok(waypointTarget(s));n.state='complete';assert.equal(waypointTarget(s),null);
});
test('bearing matches actual orthographic camera projection and pixel aspect',()=>{
 const camera=new T.OrthographicCamera(-10,10,20,-20,.1,600);camera.position.set(0,42,32);camera.lookAt(0,0,-1.2);camera.updateMatrixWorld();
 const origin=new T.Vector3(0,0,0).project(camera),project=(x,z)=>new T.Vector3(x,0,z).project(camera);
 assert.ok(Math.abs(screenBearing(origin,project(5,0),390,780)-90)<1e-8);
 assert.ok(Math.abs(screenBearing(origin,project(0,-5),390,780))<1e-8);
 assert.ok(Math.abs(screenBearing(origin,project(-5,0),390,780)+90)<1e-8);
 assert.ok(Math.abs(Math.abs(screenBearing(origin,project(0,5),390,780))-180)<1e-8);
 const diagonal=screenBearing(origin,project(5,-5),390,780);assert.ok(diagonal>45&&diagonal<60);
});
