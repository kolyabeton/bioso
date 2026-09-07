import {prepareEncounters} from './systems/encounters.js';
import {createRun,step} from './game.js';
import {ARENA_ROWS,arenaBounds,clampPosition} from './simulation.js';

// Stage adapter: retain the combat/assembly engine, supply the original painted terrain.
export const STAGE_SCALE=3;
export const STAGE_ROWS=ARENA_ROWS.map(row=>row.map(v=>v*STAGE_SCALE));
export function paintedTerrain(seed){
  return {
    seed,presentation:'painterly',
    chunk(){return{cx:0,cz:0,obstacles:[],lair:{x:3,z:-15},shade:0};},
    obstacles(){return[];},
    walkable(x,z){
      if(!Number.isFinite(x)||!Number.isFinite(z)||z<STAGE_ROWS[0][0]||z>STAGE_ROWS.at(-1)[0])return false;
      const b=arenaBounds(z/STAGE_SCALE);
      // The traced contour already includes the largest creature's visual clearance.
      return x>=b.left*STAGE_SCALE&&x<=b.right*STAGE_SCALE;
    },
  };
}
export function createPaintedRun(profile,mode='survival',seed){
  const run=createRun(profile,mode,seed);
  run.world=paintedTerrain(run.seed);
  run.player={x:1.5,z:21};
  const nodes=mode==='core'?[[4,-21],[1.5,24]]:mode==='nursery'?[[1.5,3]]:[[4,-19],[-2,2],[5,20],[9,-3]];
  run.mission?.nodes.forEach((node,i)=>{[node.x,node.z]=nodes[i];});
  return prepareEncounters(run);
}

export function stepPaintedRun(run,dt,input){
  step(run,dt,input);
  // Death/unlock scatter can cross an edge; keep its loot reachable on the plate.
  for(const item of [...run.ground,...run.xpDrops]){
    if(run.world.walkable(item.x,item.z))continue;
    const p=clampPosition({x:item.x/STAGE_SCALE,z:item.z/STAGE_SCALE});
    item.x=p.x*STAGE_SCALE;item.z=p.z*STAGE_SCALE;
  }
}

export function drawTerraceMap(canvas,run){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const x=v=>w/2+v*w/42,z=v=>32+(v+30)*(h-64)/66;
  ctx.fillStyle='#222920';ctx.fillRect(0,0,w,h);
  ctx.beginPath();STAGE_ROWS.forEach(([zz,left],i)=>ctx[i?'lineTo':'moveTo'](x(left),z(zz)));
  [...STAGE_ROWS].reverse().forEach(([zz,,right])=>ctx.lineTo(x(right),z(zz)));ctx.closePath();
  ctx.fillStyle='#52573c';ctx.fill();ctx.strokeStyle='#ab9970';ctx.lineWidth=2;ctx.stroke();
  const dot=(p,color,r)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(x(p.x),z(p.z),r,0,Math.PI*2);ctx.fill();};
  for(const q of run.ground)dot(q,'#dfb46d',4);
  for(const e of run.enemies.filter(e=>e.kind!=='normal'))dot(e,'#dd9279',5);
  for(const n of run.mission?.nodes||[])dot(n,n.active?'#a3e8c3':'#d2c1a0',6);
  dot(run.player,'#a3e8c3',7);
}
