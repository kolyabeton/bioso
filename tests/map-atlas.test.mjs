import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {atlasGeometry,terrainFootprints} from '../src/ui/map-terrain.js';
import {filteredMapMarkers,paintMap} from '../src/ui/map.js';
import {atlasSelection} from '../src/ui/map-atlas.js';

test('canvas map translates rendered labels and preserves Russian when switched back',()=>{
 const s=createWorldRun(undefined,'survival',20317),texts=[];
 const context=new Proxy({fillText:text=>texts.push(text),measureText:text=>({width:String(text).length*6})},{get:(target,key)=>target[key]??(()=>{})});
 const canvas={width:680,height:800,clientWidth:340,clientHeight:400,getContext:()=>context,ownerDocument:{documentElement:{lang:'en'}}};
 for(const language of ['en','ru','en']){
  canvas.ownerDocument.documentElement.lang=language;texts.length=0;paintMap(canvas,s);
  if(language==='en'){
   assert.ok(texts.includes('GARDENS'));assert.ok(texts.includes('FOREST'));assert.ok(texts.includes('CITY'));assert.ok(texts.includes('SCRAPYARD'));
   assert.ok(texts.includes('B'));assert.ok(texts.includes('5 lv.'));assert.ok(texts.includes('50 m'));
   assert.ok(texts.every(text=>!/[А-Яа-яЁё]/.test(text)),texts.join(', '));
  }else{assert.ok(texts.includes('САДЫ'));assert.ok(texts.includes('Б'));assert.ok(texts.includes('5 ур.'));assert.ok(texts.includes('50 м'));}
 }
});

test('atlas fits the real world at mobile and desktop sizes without stretching distances',()=>{
 const s=createWorldRun(undefined,'survival',20317);
 for(const [w,h] of [[320,400],[468,400],[360,520]]){
  const g=atlasGeometry(s,w,h),b=s.world.bounds;
  assert.ok(g.X(b.minX)>=19);assert.ok(g.X(b.maxX)<=w-19);assert.ok(g.Z(b.minZ)>=23);assert.ok(g.Z(b.maxZ)<=h-23);
  assert.ok(Math.abs((g.X(100)-g.X(0))-(g.Z(100)-g.Z(0)))<1e-8);
  const near=atlasGeometry(s,w,h,'near');assert.equal(near.X(s.player.x),w/2);assert.equal(near.Z(s.player.z),h/2);
 }
});
test('terrain footprint data retains every actual solid and its world position',()=>{
 const s=createWorldRun(undefined,'survival',20317),marks=terrainFootprints(s.world);
 assert.equal(marks.length,s.world.tiles.reduce((n,t)=>n+t.decorations.length,0));
 for(const mark of marks){assert.ok(s.world.solidAt(mark.x,.1,mark.z));assert.ok(mark.radius>0);}
 const tile=s.world.tiles[0],rock=tile.decorations.find(d=>d.feature==='rock');rock.x+=1;
 assert.ok(terrainFootprints(s.world).some(m=>m.x===rock.x&&m.z===rock.z&&m.feature==='rock'));
});
test('map filters retain locked and available public events and never mark secrets',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.time=300;
 const threats=filteredMapMarkers(s,'threats'),events=filteredMapMarkers(s,'events');
 assert.equal(threats.length,5);assert.ok(threats.every(m=>m.kind));assert.equal(events.length,14);assert.ok(events.every(m=>m.locked));assert.ok(events.every(m=>m.type));
 const selected=atlasSelection(s,events[0].id);assert.equal(selected.state,'Закрыто');assert.match(selected.access,/Вход с .*уровня/);
 const secret=s.encounters.nodes.find(n=>n.type==='membrane');secret.discovered=true;secret.state='reward';
 assert.ok(!filteredMapMarkers(s,'events').some(m=>m.id===secret.id));
 assert.equal(atlasSelection(s,secret.id).state,'');
});
test('selected enemy reflects live aggro state and distance without modifying the run',()=>{
 const s=createWorldRun(undefined,'survival',20317),boss=s.enemies.find(e=>e.habitat),before=s.rng;
 s.player={x:boss.x-10,z:boss.z};boss.territory.state='returning';
 const detail=atlasSelection(s,boss.id);assert.equal(detail.state,'Возвращается');assert.match(detail.detail,/^10 м/);assert.equal(s.rng,before);
});
