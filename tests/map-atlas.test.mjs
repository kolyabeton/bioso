import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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

test('atlas player is a dot regardless of body facing',()=>{
 const s=createWorldRun(undefined,'survival',20317),paths=[];
 const context=new Proxy({measureText:text=>({width:String(text).length*6})},{get:(target,key)=>target[key]??((...args)=>{if(['moveTo','lineTo','arc'].includes(key))paths.push([key,...args]);})});
 const canvas={width:680,height:800,clientWidth:340,clientHeight:400,getContext:()=>context,ownerDocument:{documentElement:{lang:'ru'}}};
 s.player.facing=0;paintMap(canvas,s);const northUp=structuredClone(paths);
 paths.length=0;s.player.facing=Math.PI;paintMap(canvas,s);
 assert.deepEqual(paths,northUp);
 const g=atlasGeometry(s,340,400,'world'),px=g.X(s.player.x),pz=g.Z(s.player.z);
 assert.deepEqual(northUp.at(-1),['arc',px,pz,7,0,Math.PI*2]);
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
test('desktop map keeps portrait dialog bounds and never stretches atlas geometry',()=>{
 const css=readFileSync(new URL('../src/ui/biotech.css',import.meta.url),'utf8');
 assert.match(css,/body \.ui-dialog\{width:calc\(var\(--game-stage-width\) - 16px\)/);
 assert.doesNotMatch(css,/\.ui-dialog:is\(\[data-screen=map\]/);
 assert.doesNotMatch(css,/\.ui-dialog\[data-screen=map\]\[open\]\{height:100dvh/);
 const s=createWorldRun(undefined,'survival',20317),w=490,h=460,b=s.world.bounds,g=atlasGeometry(s,w,h,'world');
 assert.equal(g.scaleX,g.scaleZ);assert.ok(g.X(b.minX)>=19);assert.ok(g.X(b.maxX)<=w-19);assert.ok(g.Z(b.minZ)>=23);assert.ok(g.Z(b.maxZ)<=h-23);
 const point={x:56,z:24},picked=g.worldAt(g.X(point.x),g.Z(point.z));
 assert.ok(Math.abs(picked.x-point.x)<1e-8);assert.ok(Math.abs(picked.z-point.z)<1e-8);
});
test('terrain footprint data retains collision geometry and its world position',()=>{
 const s=createWorldRun(undefined,'survival',20317),marks=terrainFootprints(s.world);
 assert.equal(marks.length,s.world.tiles.reduce((n,t)=>n+t.decorations.length,0));
 for(const mark of marks){assert.ok(mark.radius>0);assert.ok(mark.collisionProfile||mark.collisionFootprint||s.world.solidAt(mark.x,.1,mark.z));}
 const tile=s.world.tiles[0],rock=tile.decorations.find(d=>d.feature==='rock');rock.x+=1;
 assert.ok(terrainFootprints(s.world).some(m=>m.x===rock.x&&m.z===rock.z&&m.feature==='rock'));
});
test('map filters retain locked and available public events and never mark secrets',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.time=300;
 const threats=filteredMapMarkers(s,'threats'),events=filteredMapMarkers(s,'events');
 assert.equal(threats.length,5);assert.ok(threats.every(m=>m.kind));assert.equal(events.length,15);assert.ok(events.every(m=>m.locked));assert.ok(events.every(m=>m.type));
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
test('map exposes lying health and armor pickups as a dedicated recovery filter',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.recoveryDrops=[
  {id:9001,kind:'health',x:s.player.x+6,y:0,z:s.player.z},
  {id:9002,kind:'armor',x:s.player.x,y:0,z:s.player.z+8},
 ];
 const recovery=filteredMapMarkers(s,'recovery');
 assert.deepEqual(recovery.map(m=>[m.pickupKind,m.label,m.glyph]),[['health','Здоровье','♥'],['armor','Броня','◆']]);
 assert.ok(filteredMapMarkers(s,'threats').every(m=>!m.pickupKind));
 assert.match(atlasSelection(s,9001).detail,/6 м · восстанавливает здоровье/);
 assert.equal(atlasSelection(s,9002).state,'Лежит');
});
test('map exposes every lying equipment part from the start as selectable loot',()=>{
 const s=createWorldRun(undefined,'survival',20317);s.recoveryDrops=[{id:9003,kind:'health',x:4,y:0,z:4}];const loot=filteredMapMarkers(s,'loot'),parts=loot.filter(m=>m.groundItem&&m.glyph==='✦');
 assert.equal(parts.length,s.ground.filter(item=>item.part).length);assert.ok(parts.length>=16);assert.ok(parts.every(m=>m.label));
 const selected=atlasSelection(s,parts[0].id);assert.equal(selected.state,'Лежит');assert.match(selected.detail,/м · (Оружие|Нога) · Ранг 1/);
 assert.ok(loot.some(m=>m.pickupKind==='health'));
});
