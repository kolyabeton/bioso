import {encounterLevel} from '../systems/events/proximity.js';
import {waypointTarget} from '../systems/waypoint.js';
import {atlasGeometry,paintAtlasTerrain} from './map-terrain.js';
import {eventGlyph} from '../gameplay-modules/event-presentation.js';
import {availableEncounter,ENCOUNTERS} from '../systems/encounters.js';
import {BIOMES,localHeight} from '../biome-world.js';
import {STAGE_ROWS} from '../painterly-stage.js';
import {translateText} from '../i18n/index.js';

// Shared terrain and real entities, rendered as an illustrated tactical overlay.
export function paintMap(canvas,run,zoom='world',options={}) {
  if(run.world.tiles)return paintBiomeMap(canvas,run,zoom,options);
  if(run.exploration)return paintWorldMap(canvas,run,zoom);
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const scale=zoom==='near'?2:1;
  const mapX=v=>w/2+(v-(zoom==='near'?run.player.x:0))*w/42*scale;
  const mapZ=v=>h/2+(v-(zoom==='near'?run.player.z:3))*h/66*scale;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#161d17b8';ctx.fillRect(0,0,w,h);
  ctx.beginPath();STAGE_ROWS.forEach(([z,left],i)=>ctx[i?'lineTo':'moveTo'](mapX(left),mapZ(z)));[...STAGE_ROWS].reverse().forEach(([z,,right])=>ctx.lineTo(mapX(right),mapZ(z)));ctx.closePath();ctx.fillStyle='#667a5140';ctx.fill();ctx.strokeStyle='#b6a17a';ctx.lineWidth=2;ctx.stroke();
  function marker(p,color,kind){const x=mapX(p.x),y=mapZ(p.z);ctx.save();ctx.translate(x,y);ctx.strokeStyle=color;ctx.fillStyle='#211f19';ctx.lineWidth=2;
    ctx.beginPath();if(kind==='loot'){ctx.rect(-7,-7,14,14);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(-3,-3,6,6);}else if(kind==='lair'){ctx.moveTo(-11,10);ctx.lineTo(-7,-4);ctx.lineTo(0,-12);ctx.lineTo(7,-4);ctx.lineTo(11,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeRect(-3,1,6,9);}else if(kind==='enemy'){ctx.moveTo(0,-10);ctx.lineTo(10,0);ctx.lineTo(0,10);ctx.lineTo(-10,0);ctx.closePath();ctx.fill();ctx.stroke();}else if(kind==='player'){ctx.fillStyle=color;ctx.moveTo(0,-14);ctx.lineTo(9,10);ctx.lineTo(0,6);ctx.lineTo(-9,10);ctx.closePath();ctx.fill();ctx.stroke();}else{ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.stroke();}ctx.restore();
  }
  if(run.time>=180){const chunk=run.world.chunk(Math.floor(run.player.x/64),Math.floor(run.player.z/64));marker(chunk.lair,run.visitedLairs.has(chunk.cx+','+chunk.cz)?'#8c897e':'#edaa85','lair');}
  for(const q of run.ground)marker(q,'#a2dfbd','loot');
  for(const enemy of run.enemies.filter(e=>e.kind!=='normal'&&e.kind!=='objective'))marker(enemy,'#edaa85','enemy');
  for(const node of run.mission?.nodes||[])marker(node,node.active||node.hp<=0?'#a2dfbd':'#e4d6b8','target');
  for(const n of run.encounters?.nodes||[])if(n.discovered&&ENCOUNTERS[n.type].kind!=='secret')marker(n,n.state==='complete'?'#8c897e':n.state==='reward'?'#a2dfbd':'#c7b1f0','target');
  marker(run.player,'#b2f1cc','player');
}

function paintWorldMap(canvas,s,zoom){
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,span=zoom==='world'?2048:zoom==='near'?180:820,center=zoom==='near'?s.player:{x:20,z:0},scale=Math.min(w,h)/span,X=x=>w/2+(x-center.x)*scale,Z=z=>h/2+(z-center.z)*scale;
 c.fillStyle='#18221d';c.fillRect(0,0,w,h);c.strokeStyle='#6e695040';c.lineWidth=1;for(let i=-1024;i<=1024;i+=64){c.beginPath();c.moveTo(X(i),Z(-1024));c.lineTo(X(i),Z(1024));c.moveTo(X(-1024),Z(i));c.lineTo(X(1024),Z(i));c.stroke();}
 c.fillStyle='#62745870';for(const cell of s.exploration.cells){const [x,z]=cell.split(',').map(Number);c.fillRect(X(x*32),Z(z*32),32*scale+.5,32*scale+.5);}
 c.strokeStyle='#b3a57c80';c.lineWidth=Math.max(2,8*scale);for(const road of s.world.roads){c.beginPath();road.forEach(([x,z],i)=>c[i?'lineTo':'moveTo'](X(x),Z(z)));c.stroke();}
 const dot=(p,color,r=5)=>{c.fillStyle=color;c.beginPath();c.arc(X(p.x),Z(p.z),r,0,Math.PI*2);c.fill();};
 c.font='16px Onest, sans-serif';c.textAlign='center';
 for(const p of s.world.landmarks){const seen=s.exploration.visited.has(p.id);if(!seen&&!['depot','camp','near-exit'].includes(p.id))continue;dot(p,seen?'#b6e6c8':'#cbb98b',seen?6:10);c.fillStyle=seen?'#e4d6b8':'#b3a57c';c.fillText(!seen&&p.id==='depot'?'Хранилище · область поиска':p.name,X(p.x),Z(p.z)-16);}
 for(const g of s.exploration.groups){if(g.state==='cleared'){c.strokeStyle='#a2dfbd';c.lineWidth=2;c.strokeRect(X(g.x)-9,Z(g.z)-9,18,18);c.fillStyle='#a2dfbd';c.fillText('✓',X(g.x),Z(g.z)+6);}else if(g.state==='active')dot(g,'#da9a6c',4);}
 for(const q of s.ground){c.fillStyle='#a2dfbd';c.fillRect(X(q.x)-4,Z(q.z)-4,8,8);}
 for(const n of s.mission?.nodes||[]){const explored=s.exploration.cells.has(Math.floor(n.x/32)+','+Math.floor(n.z/32));if(explored||s.mode==='core'&&s.mission.carrying)dot(n,n.active||n.hp<=0?'#a2dfbd':'#ecdca7',4);}
 for(const n of s.encounters?.nodes||[])if(n.discovered&&ENCOUNTERS[n.type].kind!=='secret'){dot(n,n.state==='reward'?'#a2dfbd':n.state==='complete'?'#8c897e':'#c7b1f0',6);if(zoom==='near'){c.fillStyle='#e4d6b8';c.fillText(({membrane:'Мембрана',slab:'Плита',nursery:'Питомник',altar:'Алтарь',sealed:'Испытание',infection:'Круг',hunt:'Носитель'})[n.type],X(n.x),Z(n.z)-12);}}
 dot(s.player,'#f4ffea',7);c.strokeStyle='#a2dfbd';c.lineWidth=2;c.beginPath();c.arc(X(s.player.x),Z(s.player.z),12,0,Math.PI*2);c.stroke();
 c.textAlign='left';c.fillStyle='#c5b794';c.font='14px Onest, sans-serif';c.fillText('2048 × 2048 м · тёмное: не исследовано',18,h-34);c.fillText(s.mode==='survival'?'Волны продолжаются на зачищенных участках':'✓ зачищено · ■ оставленная деталь',18,h-14);
}

export function biomeMapMarkers(s){
 const markers=[];
 for(const n of s.encounters?.nodes||[])if(ENCOUNTERS[n.type].kind!=='secret')markers.push({...n,locked:!availableEncounter(s,n),requiredLevel:encounterLevel(n),label:ENCOUNTERS[n.type].name,glyph:ENCOUNTERS[n.type].kind==='secret'&&n.state==='ready'?'?':eventGlyph(n),color:n.state==='complete'?'#818b76':n.state==='reward'?'#397964':'#79648b'});
 for(const e of s.enemies)if(e.hp>0&&['boss','final','elite'].includes(e.kind))markers.push({...e,label:e.kind==='final'?'Матка':e.kind==='boss'?'Босс':'Элита',glyph:e.kind==='elite'?'◇':'Б',color:e.kind==='elite'?'#aa7834':'#b35e4f'});
 return markers;
}
export function filteredMapMarkers(s,filter='all'){
 return biomeMapMarkers(s).filter(m=>filter==='threats'?!!m.kind:filter==='events'?!!m.type:true);
}
function paintBiomeMap(canvas,s,zoom,{filter='all',selected}={}){
 const language=canvas.ownerDocument?.documentElement.lang;
 const selectionInk=canvas.ownerDocument?.defaultView?.getComputedStyle(canvas).getPropertyValue('--ui-selection-ink').trim()||'#684619';
 const c=canvas.getContext('2d'),w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height,g=atlasGeometry(s,w,h,zoom),{scale,X,Z}=g;
 c.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);paintAtlasTerrain(c,s,g,language);
 c.save();c.beginPath();c.rect(16,18,w-32,h-36);c.clip();
 if(filter==='all')for(const p of s.ground){c.fillStyle='#527e69';c.fillRect(X(p.x)-2,Z(p.z)-2,4,4);c.strokeStyle='#f8f6e5';c.lineWidth=.5;c.strokeRect(X(p.x)-2,Z(p.z)-2,4,4);}
 const markers=filteredMapMarkers(s,filter);
 for(const m of markers){
  const x=X(m.x),z=Z(m.z),home=m.territory?.home;
  if(home){const r=m.territory.aggro*scale;c.save();c.beginPath();c.arc(X(home.x),Z(home.z),r,0,Math.PI*2);c.fillStyle=m.territory.state==='engaged'?'#b653493a':'#b56e5620';c.fill();c.strokeStyle=m.color;c.lineWidth=1;c.stroke();c.clip();c.strokeStyle='#ac705235';for(let k=-r*2;k<r*2;k+=6){c.beginPath();c.moveTo(X(home.x)-r,Z(home.z)+k);c.lineTo(X(home.x)+r,Z(home.z)+k-r*2);c.stroke();}c.restore();}
  c.fillStyle='#f8f5e9';c.beginPath();c.arc(x,z,10,0,Math.PI*2);c.fill();c.strokeStyle=m.color;c.lineWidth=1.5;c.stroke();
  if(m.locked){c.font='600 10px Onest, sans-serif';c.textAlign='center';c.textBaseline='middle';const label=translateText(m.requiredLevel+' ур.',language),lw=c.measureText(label).width+8;c.fillStyle='#f8f5e9';c.fillRect(x-lw/2,z-27,lw,13);c.fillStyle='#604f71';c.fillText(label,x,z-20);}
  if(String(m.id)===String(selected)){c.beginPath();c.arc(x,z,14,0,Math.PI*2);c.strokeStyle=selectionInk;c.lineWidth=2;c.stroke();}
  c.font='600 13px "Onest", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=m.color;c.fillText(translateText(m.glyph==='?'?'✚':m.glyph,language),x,z+.5);
 }
 const waypoint=waypointTarget(s);if(waypoint){const x=X(waypoint.x),z=Z(waypoint.z);c.strokeStyle=selectionInk;c.lineWidth=2;c.beginPath();c.arc(x,z,17,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(x,z-23);c.lineTo(x,z-19);c.moveTo(x+19,z);c.lineTo(x+23,z);c.moveTo(x,z+19);c.lineTo(x,z+23);c.moveTo(x-23,z);c.lineTo(x-19,z);c.stroke();}
 // The player is the final layer and stays visible in every filter.
 const px=X(s.player.x),pz=Z(s.player.z);c.beginPath();c.arc(px,pz,14,0,Math.PI*2);c.fillStyle='#345a4b';c.fill();c.strokeStyle='#f8f6e8';c.lineWidth=2;c.stroke();
 c.beginPath();c.moveTo(px,pz-9);c.lineTo(px+7,pz+7);c.lineTo(px,pz+3);c.lineTo(px-7,pz+7);c.closePath();c.fillStyle='#c7ead7';c.fill();c.restore();
 return {geometry:g,markers:markers.filter(m=>X(m.x)>28&&X(m.x)<w-28&&Z(m.z)>30&&Z(m.z)<h-30)};
}
