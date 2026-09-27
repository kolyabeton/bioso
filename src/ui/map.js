import {encounterLevel,layerEncounters} from '../systems/events/proximity.js';
import {waypointTarget} from '../systems/waypoint.js';
import {atlasGeometry,paintAtlasTerrain} from './map-terrain.js';
import {eventGlyph} from '../gameplay-modules/event-presentation.js';
import {availableEncounter,ENCOUNTERS} from '../systems/encounters.js';
import {BIOMES,localHeight} from '../biome-world.js';
import {STAGE_ROWS} from '../painterly-stage.js';
import {translateText} from '../i18n/index.js';
import {CATALOG} from '../catalog.js';
import {dungeonSurface} from '../dungeon-surface.js';

// Shared terrain and real entities, rendered as an illustrated tactical overlay.
export function paintMap(canvas,run,zoom='world',options={}) {
  if(run.encounters?.active?.dungeon)return paintDungeonMap(canvas,run,{...options,filter:'all'});
  if(run.world.tiles)return paintBiomeMap(canvas,run,zoom,options);
  if(run.exploration)return paintWorldMap(canvas,run,zoom);
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const scale=zoom==='near'?2:1;
  const mapX=v=>w/2+(v-(zoom==='near'?run.player.x:0))*w/42*scale;
  const mapZ=v=>h/2+(v-(zoom==='near'?run.player.z:3))*h/66*scale;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#161d17b8';ctx.fillRect(0,0,w,h);
  ctx.beginPath();STAGE_ROWS.forEach(([z,left],i)=>ctx[i?'lineTo':'moveTo'](mapX(left),mapZ(z)));[...STAGE_ROWS].reverse().forEach(([z,,right])=>ctx.lineTo(mapX(right),mapZ(z)));ctx.closePath();ctx.fillStyle='#667a5140';ctx.fill();ctx.strokeStyle='#b6a17a';ctx.lineWidth=2;ctx.stroke();
  function marker(p,color,kind){const x=mapX(p.x),y=mapZ(p.z);ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle='#211f19';ctx.lineWidth=2;
    ctx.beginPath();if(kind==='loot'){ctx.rect(-7,-7,14,14);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(-3,-3,6,6);}else if(kind==='lair'){ctx.moveTo(-11,10);ctx.lineTo(-7,-4);ctx.lineTo(0,-12);ctx.lineTo(7,-4);ctx.lineTo(11,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeRect(-3,1,6,9);}else if(kind==='enemy'){ctx.moveTo(0,-10);ctx.lineTo(10,0);ctx.lineTo(0,10);ctx.lineTo(-10,0);ctx.closePath();ctx.fill();ctx.stroke();}else if(kind==='player'){ctx.fillStyle=color;ctx.arc(0,0,7,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }
  if(run.time>=180){const chunk=run.world.chunk(Math.floor(run.player.x/64),Math.floor(run.player.z/64));marker(chunk.lair,run.visitedLairs.has(chunk.cx+','+chunk.cz)?'#8c897e':'#edaa85','lair');}
  for(const q of run.ground)marker(q,'#a2dfbd','loot');
  for(const enemy of run.enemies.filter(e=>e.kind!=='normal'&&e.kind!=='objective'))marker(enemy,'#edaa85','enemy');
  for(const node of run.mission?.nodes||[])marker(node,node.active||node.hp<=0?'#a2dfbd':'#e4d6b8','target');
  for(const n of layerEncounters(run))if(n.discovered&&ENCOUNTERS[n.type].kind!=='secret')marker(n,n.state==='complete'?'#8c897e':n.state==='reward'?'#a2dfbd':'#c7b1f0','target');
  marker(run.player,'#b2f1cc','player');
}

export function dungeonMapMarkers(s){
 const dungeon=s.encounters?.active;if(!dungeon?.dungeon)return[];
 const zones=(dungeon.aggroZones||[]).map((zone,index)=>{const alive=zone.members.filter(id=>s.enemies.some(e=>e.id===id&&e.hp>0)).length;return{...zone,id:`dungeon-zone-${index+1}`,dungeonZone:true,alive,mapCategory:'threat',label:`Зона агро ${index+1} · элит: ${alive}`,glyph:String(alive),color:zone.state==='engaged'?'#c9604f':zone.state==='cleared'?'#66716a':'#b28c4f'};});
 const loot=(s.ground||[]).filter(q=>q.dungeonLoot).map(q=>({...q,groundItem:true,mapCategory:'loot',label:CATALOG[q.part?.key]?.name||'Добыча',glyph:'✦',color:'#bfa25d'}));
 const altars=layerEncounters(s).filter(n=>n.dungeonId).map(n=>({...n,mapCategory:'event',requiredLevel:encounterLevel(n),label:ENCOUNTERS[n.type].name,glyph:eventGlyph(n),color:n.state==='complete'?'#818b76':'#79648b'}));
 return [...zones,...loot,...altars];
}

function paintDungeonMap(canvas,s,{filter='all',selected}={}){
 const active=s.encounters.active,graph=active.tunnelGraph,c=canvas.getContext('2d'),w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;
 const xs=graph.nodes.map(p=>p.x),zs=graph.nodes.map(p=>p.z),minX=Math.min(...xs)-6,maxX=Math.max(...xs)+6,minZ=Math.min(...zs)-6,maxZ=Math.max(...zs)+6,scale=Math.min((w-40)/(maxX-minX),(h-40)/(maxZ-minZ)),center={x:(minX+maxX)/2,z:(minZ+maxZ)/2};
 const X=x=>w/2+(x-center.x)*scale,Z=z=>h/2+(z-center.z)*scale,geometry={w,h,scale,scaleX:scale,scaleZ:scale,X,Z,center,worldAt:(x,z)=>({x:center.x+(x-w/2)/scale,z:center.z+(z-h/2)/scale})};
 c.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);c.fillStyle='#050607';c.fillRect(0,0,w,h);c.save();c.beginPath();c.rect(16,16,w-32,h-32);c.clip();
 c.lineCap='round';c.lineJoin='round';c.beginPath();
 for(const contour of dungeonSurface(graph).contours){contour.forEach((p,i)=>c[i?'lineTo':'moveTo'](X(p.x),Z(p.z)));c.closePath();}
 c.fillStyle=active.type==='dungeon_roots'?'#697064':'#666a6b';c.fill('evenodd');c.strokeStyle='#111513';c.lineWidth=1.8*scale;c.stroke();
 const markers=filteredMapMarkers(s,filter);
 for(const marker of markers){const x=X(marker.x),z=Z(marker.z);if(marker.dungeonZone){const radius=marker.radius*scale;c.beginPath();c.arc(x,z,radius,0,Math.PI*2);c.fillStyle=marker.state==='engaged'?'#b94d3c42':marker.state==='cleared'?'#56615a32':'#b38b4930';c.fill();c.strokeStyle=marker.color;c.lineWidth=1.5;c.stroke();c.fillStyle='#f3ead6';c.font='600 12px Onest, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(marker.alive),x,z);}else{c.fillStyle=marker.color;c.fillRect(x-4,z-4,8,8);}}
 const entrance=active.exit;c.beginPath();c.arc(X(entrance.x),Z(entrance.z),7,0,Math.PI*2);c.fillStyle='#8dd5b3';c.fill();c.strokeStyle='#e6f2df';c.lineWidth=1.5;c.stroke();
 const px=X(s.player.x),pz=Z(s.player.z);c.beginPath();c.arc(px,pz,7,0,Math.PI*2);c.fillStyle='#f4ffea';c.fill();c.strokeStyle='#345a4b';c.lineWidth=2;c.stroke();c.restore();
 return{geometry,markers:markers.filter(m=>X(m.x)>28&&X(m.x)<w-28&&Z(m.z)>28&&Z(m.z)<h-28)};
}

function paintWorldMap(canvas,s,zoom){
 const language=canvas.ownerDocument?.documentElement.lang;
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,span=zoom==='world'?2048:zoom==='near'?180:820,center=zoom==='near'?s.player:{x:20,z:0},scale=Math.min(w,h)/span,X=x=>w/2+(x-center.x)*scale,Z=z=>h/2+(z-center.z)*scale;
 c.fillStyle='#18221d';c.fillRect(0,0,w,h);c.strokeStyle='#6e695040';c.lineWidth=1;for(let i=-1024;i<=1024;i+=64){c.beginPath();c.moveTo(X(i),Z(-1024));c.lineTo(X(i),Z(1024));c.moveTo(X(-1024),Z(i));c.lineTo(X(1024),Z(i));c.stroke();}
 c.fillStyle='#62745870';for(const cell of s.exploration.cells){const [x,z]=cell.split(',').map(Number);c.fillRect(X(x*32),Z(z*32),32*scale+.5,32*scale+.5);}
 c.strokeStyle='#b3a57c80';c.lineWidth=Math.max(2,8*scale);for(const road of s.world.roads){c.beginPath();road.forEach(([x,z],i)=>c[i?'lineTo':'moveTo'](X(x),Z(z)));c.stroke();}
 const dot=(p,color,r=5)=>{c.fillStyle=color;c.beginPath();c.arc(X(p.x),Z(p.z),r,0,Math.PI*2);c.fill();};
 c.font='16px Onest, sans-serif';c.textAlign='center';
 for(const p of s.world.landmarks){const seen=s.exploration.visited.has(p.id);if(!seen&&!['depot','camp','near-exit'].includes(p.id))continue;dot(p,seen?'#b6e6c8':'#cbb98b',seen?6:10);c.fillStyle=seen?'#e4d6b8':'#b3a57c';c.fillText(translateText(!seen&&p.id==='depot'?'Хранилище · область поиска':p.name,language),X(p.x),Z(p.z)-16);}
 for(const g of s.exploration.groups){if(g.state==='cleared'){c.strokeStyle='#a2dfbd';c.lineWidth=2;c.strokeRect(X(g.x)-9,Z(g.z)-9,18,18);c.fillStyle='#a2dfbd';c.fillText('✓',X(g.x),Z(g.z)+6);}else if(g.state==='active')dot(g,'#da9a6c',4);}
 for(const q of s.ground){c.fillStyle='#a2dfbd';c.fillRect(X(q.x)-4,Z(q.z)-4,8,8);}
 for(const n of s.mission?.nodes||[]){const explored=s.exploration.cells.has(Math.floor(n.x/32)+','+Math.floor(n.z/32));if(explored||s.mode==='core'&&s.mission.carrying)dot(n,n.active||n.hp<=0?'#a2dfbd':'#ecdca7',4);}
 for(const n of layerEncounters(s))if(n.discovered&&ENCOUNTERS[n.type].kind!=='secret'){dot(n,n.state==='reward'?'#a2dfbd':n.state==='complete'?'#8c897e':'#c7b1f0',6);if(zoom==='near'){c.fillStyle='#e4d6b8';c.fillText(translateText(({membrane:'Мембрана',slab:'Плита',nursery:'Питомник',altar:'Алтарь',sealed:'Испытание',infection:'Круг',hunt:'Носитель'})[n.type],language),X(n.x),Z(n.z)-12);}}
 dot(s.player,'#f4ffea',7);c.strokeStyle='#a2dfbd';c.lineWidth=2;c.beginPath();c.arc(X(s.player.x),Z(s.player.z),12,0,Math.PI*2);c.stroke();
 c.textAlign='left';c.fillStyle='#c5b794';c.font='14px Onest, sans-serif';c.fillText(translateText('2048 × 2048 м · тёмное: не исследовано',language),18,h-34);c.fillText(translateText(s.mode==='survival'?'Волны продолжаются на зачищенных участках':'✓ зачищено · ■ оставленная деталь',language),18,h-14);
}

export function biomeMapMarkers(s){
 const markers=[];
 for(const n of layerEncounters(s))if(ENCOUNTERS[n.type].kind!=='secret')markers.push({...n,mapCategory:'event',locked:!availableEncounter(s,n),requiredLevel:encounterLevel(n),label:ENCOUNTERS[n.type].name,glyph:ENCOUNTERS[n.type].kind==='secret'&&n.state==='ready'?'?':eventGlyph(n),color:n.state==='complete'?'#818b76':n.state==='reward'?'#397964':'#79648b'});
 for(const e of s.enemies)if(e.hp>0&&['boss','final','elite'].includes(e.kind))markers.push({...e,mapCategory:'threat',label:e.kind==='final'?'Матка · финальный босс':e.id===s.introBossId?'Первый босс':e.bossName||'Босс',glyph:e.kind==='final'?'♛':e.kind==='elite'?'◇':'Б',color:e.kind==='final'?'#982f36':e.kind==='elite'?'#aa7834':'#b35e4f'});
 for(const q of s.recoveryDrops||[])markers.push({id:q.id,x:q.x,y:q.y,z:q.z,pickupKind:q.kind,mapCategory:'recovery',label:q.kind==='armor'?'Броня':'Здоровье',glyph:q.kind==='armor'?'◆':'♥',color:q.kind==='armor'?'#566e78':'#a24d49'});
 for(const q of s.consumableDrops||[]){const info=CONSUMABLE_BY_KIND[q.kind];if(info)markers.push({id:q.id,x:q.x,y:q.y,z:q.z,pickupKind:q.kind,mapCategory:'recovery',label:info.name,itemDetail:info.description,glyph:'●',color:info.color});}
 const kindLabel={body:'Корпус',arm:'Оружие',leg:'Нога',organ:'Орган'};
 for(const q of s.ground||[]){
  if(q.lore){markers.push({id:q.id,x:q.x,y:q.y,z:q.z,groundItem:true,mapCategory:'loot',label:'Неизвестная запись',itemDetail:'Фрагмент истории',glyph:'⌁',color:'#326d5b'});continue;}
  const d=CATALOG[q.part?.key];if(d)markers.push({id:q.id,x:q.x,y:q.y,z:q.z,groundItem:true,mapCategory:'loot',label:d.name,itemDetail:`${kindLabel[d.kind]} · Ранг ${q.part.tier}`,glyph:'✦',color:'#8a662a'});
 }
 return markers;
}
export function filteredMapMarkers(s,filter='all'){
 const markers=s.encounters?.active?.dungeon?dungeonMapMarkers(s):biomeMapMarkers(s);
 return markers.filter(m=>filter==='threats'?m.mapCategory==='threat':filter==='events'?m.mapCategory==='event':filter==='loot'?['loot','recovery'].includes(m.mapCategory):filter==='recovery'?m.mapCategory==='recovery':true);
}
function paintBiomeMap(canvas,s,zoom,{filter='all',selected}={}){
 const language=canvas.ownerDocument?.documentElement.lang;
 const selectionInk=canvas.ownerDocument?.defaultView?.getComputedStyle(canvas).getPropertyValue('--ui-selection-ink').trim()||'#684619';
 const c=canvas.getContext('2d'),w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height,g=atlasGeometry(s,w,h,zoom),{scale,scaleX=scale,scaleZ=scale,X,Z}=g;
 c.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);paintAtlasTerrain(c,s,g,language);
 c.save();c.beginPath();c.rect(16,18,w-32,h-36);c.clip();
 const race=s.encounters?.active;
 if(race?.type==='race'){c.strokeStyle=selectionInk;c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();race.race.path.forEach((p,i)=>c[i?'lineTo':'moveTo'](X(p.x),Z(p.z)));c.stroke();c.setLineDash([]);}
 const markers=filteredMapMarkers(s,filter).sort((a,b)=>Number(a.kind==='final')-Number(b.kind==='final'));
 for(const m of markers){
  const x=X(m.x),z=Z(m.z),home=m.territory?.home;
  if(home){const rx=m.territory.aggro*scaleX,rz=m.territory.aggro*scaleZ;c.save();c.beginPath();c.ellipse(X(home.x),Z(home.z),rx,rz,0,0,Math.PI*2);c.fillStyle=m.territory.state==='engaged'?'#b653493a':'#b56e5620';c.fill();c.strokeStyle=m.color;c.lineWidth=1;c.stroke();c.clip();c.strokeStyle='#ac705235';for(let k=-rz*2;k<rz*2;k+=6){c.beginPath();c.moveTo(X(home.x)-rx,Z(home.z)+k);c.lineTo(X(home.x)+rx,Z(home.z)+k-rz*2);c.stroke();}c.restore();}
  c.fillStyle='#f8f5e9';c.beginPath();c.arc(x,z,10,0,Math.PI*2);c.fill();c.strokeStyle=m.color;c.lineWidth=m.pickupKind?2:1.5;c.stroke();
  if(m.pickupKind){c.beginPath();c.arc(x,z,13,0,Math.PI*2);c.strokeStyle=m.color+'70';c.lineWidth=1;c.stroke();}
  if(m.locked){c.font='600 10px Onest, sans-serif';c.textAlign='center';c.textBaseline='middle';const label=translateText(m.requiredLevel+' ур.',language),lw=c.measureText(label).width+8;c.fillStyle='#f8f5e9';c.fillRect(x-lw/2,z-27,lw,13);c.fillStyle='#604f71';c.fillText(label,x,z-20);}
  if(String(m.id)===String(selected)){c.beginPath();c.arc(x,z,14,0,Math.PI*2);c.strokeStyle=selectionInk;c.lineWidth=2;c.stroke();}
  c.font='600 13px "Onest", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=m.color;c.fillText(translateText(m.glyph==='?'?'✚':m.glyph,language),x,z+.5);
  if(m.kind==='final'&&x>=18&&x<=w-18&&z>=20&&z<=h-20){
   c.beginPath();c.moveTo(x,z-17);c.lineTo(x+17,z);c.lineTo(x,z+17);c.lineTo(x-17,z);c.closePath();c.fillStyle=m.color;c.fill();c.strokeStyle='#fff3d9';c.lineWidth=2;c.stroke();
   c.font='600 18px Onest, sans-serif';c.fillStyle='#fff3d9';c.fillText('♛',x,z);
   const label=translateText('Финал · '+m.recommended+' ур.',language);c.font='600 10px Onest, sans-serif';const width=c.measureText(label).width+12,lx=Math.max(18+width/2,Math.min(w-18-width/2,x)),lz=z+33<h-18?z+28:z-28;
   c.fillStyle=m.color;c.fillRect(lx-width/2,lz-8,width,16);c.fillStyle='#fff3d9';c.fillText(label,lx,lz);
  }
 }
 const waypoint=waypointTarget(s);if(waypoint){const x=X(waypoint.x),z=Z(waypoint.z);c.strokeStyle=selectionInk;c.lineWidth=2;c.beginPath();c.arc(x,z,17,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x,z-23);c.lineTo(x,z-19);c.moveTo(x+19,z);c.lineTo(x+23,z);c.moveTo(x,z+19);c.lineTo(x,z+23);c.moveTo(x-23,z);c.lineTo(x-19,z);c.stroke();}
 // The player dot is the final layer and stays visible in every filter.
 const px=X(s.player.x),pz=Z(s.player.z);c.beginPath();c.arc(px,pz,7,0,Math.PI*2);c.fillStyle='#345a4b';c.fill();c.strokeStyle='#f8f6e8';c.lineWidth=2;c.stroke();
 c.restore();
 return {geometry:g,markers:markers.filter(m=>X(m.x)>28&&X(m.x)<w-28&&Z(m.z)>30&&Z(m.z)<h-30)};
}
import {CONSUMABLE_BY_KIND} from '../systems/consumable-drops.js';
