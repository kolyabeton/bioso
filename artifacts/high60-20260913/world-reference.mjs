import {obstacleContains,obstacleHeight} from '../../src/architecture-collision.js';
import {obstacleCandidates} from '../../src/obstacle-index.js';
import {seededRandom} from '../../src/simulation.js';
import {findPath} from '../../src/world-navigation.js';
import {biomeFeatures} from '../../src/biome-features.js';
import {environmentHeight,environmentProfile,ENVIRONMENT_MODULES,applyEnvironmentCover} from '../../src/environment-profiles.js';
import {ENVIRONMENT_MODEL_BOUNDS} from '../../src/environment-model-bounds.js';
import {survivalStoryProps} from '../../src/environment-story-props.js';
import {applySurvivalLandmarks} from '../../src/survival-landmarks.js';

export const TILE=64;
export const BIOMES=[
 {id:'gardens',name:'Верхние сады',color:'#9b9862',atlas:0},
 {id:'forest',name:'Корневой лес',color:'#596c43',atlas:1},
 {id:'city',name:'Заросший город',color:'#b6a786',atlas:2},
 {id:'scrapyard',name:'Тихая свалка',color:'#94714c',atlas:3},
];
export const TERRAIN_ASSETS={ground:'/assets/biomes/ground-atlas-v2.png',decor:'/assets/biomes/decor-atlas-v4.png'};
const slots=[[0,0],[1,0],[2,0],[3,0],[4,0],[4,1],[4,2],[4,3],[4,4],[3,4],[2,4],[1,4],[0,4],[0,3],[0,2],[0,1]];
const variants=['clearing','grove','meadow'];
export const MODULES=BIOMES.flatMap(b=>variants.map(kind=>({id:b.id+'-'+kind,biome:b.id,kind,layers:TERRAIN_ASSETS})));
export const TRANSITIONS=BIOMES.map((b,i)=>({id:b.id+'-'+BIOMES[(i+1)%4].id,biome:b.id,nextBiome:BIOMES[(i+1)%4].id,kind:'transition',layers:TERRAIN_ASSETS}));
const inside=(x,z,r)=>Math.abs(x)<=r&&Math.abs(z)<=r;
export function localHeight(tile,x,z){
 return inside(x,z,32)?environmentHeight(tile,x,z):null;
}
export function assembleBiomeWorld(seed){
 const flat=true;
 const rng=seededRandom(seed),definitions=[];
 for(let b=0;b<4;b++){
  const order=[...variants];for(let i=2;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  definitions.push(...order.map(kind=>MODULES.find(m=>m.biome===BIOMES[b].id&&m.kind===kind)),TRANSITIONS[b]);
 }
 const cells=[...slots,...Array.from({length:9},(_,i)=>[1+i%3,1+Math.floor(i/3)])];
 const tiles=cells.map(([cx,cz],i)=>{
  const x=cx*TILE,z=cz*TILE,ports=cells.filter(([nx,nz])=>Math.abs(nx-cx)+Math.abs(nz-cz)===1).map(([nx,nz])=>({dx:nx-cx,dz:nz-cz,x:x+(nx-cx)*32,z:z+(nz-cz)*32,y:0,width:24}));
  const base=definitions[i]||MODULES.find(m=>m.biome===BIOMES[Math.min(3,Math.floor((cx+cz)/2))].id&&m.kind==='clearing');
  // Three nursery modules are part of the shared five-family visual catalog.
  // Keep legacy gameplay biome IDs and authored Forest tile indices stable.
  const broodIndex=[18,21,24].indexOf(i),broodKind=variants[(broodIndex+(seed%3))%3];
  const d=broodIndex>=0?{...MODULES.find(m=>m.biome==='gardens'&&m.kind===broodKind),visualEnvironmentId:'brood-nursery',environmentName:'Роевой питомник',groundStyle:'brood',ambientDensity:0}:base;
  const visual=environmentProfile(d),visualModule=ENVIRONMENT_MODULES.find(m=>m.environment===(d.visualEnvironmentId||({gardens:'upper-gardens',forest:'root-forest',city:'overgrown-city',scrapyard:'quiet-scrapyard'}[d.biome]))&&m.kind===d.kind);
  const decorations=[{x:x-12,z:z-23,radius:2,height:12,biome:d.biome},{x:x+12,z:z+23,radius:2,height:10,biome:d.nextBiome||d.biome}];
  if(flat){
   const architecture={gardens:['arch-planter','arch-solar-panel','arch-pillar'],forest:['arch-pillar','arch-planter','arch-wall-corner'],city:['arch-wall-straight','arch-cistern','arch-planter'],scrapyard:['arch-cistern','arch-turbine','arch-solar-panel']};
   decorations.push({x:x-16,z:z+14,biome:d.biome});
   decorations.forEach((item,n)=>{item.model=architecture[item.biome][n];item.size=item.model==='arch-turbine'?11:8;item.height=item.size;item.radius=item.size*.71;item.rotation=(i%4)*Math.PI/2;});
  }
  // Forest owns its new ruin/root composition, not the legacy three toy-sized props.
  if(d.biome==='forest')decorations.length=0;
  if(d.visualEnvironmentId==='brood-nursery')decorations.forEach((item,n)=>{item.model=['veg-seedpod','arch-planter','arch-cistern'][n];item.size=n===0?6:8;item.height=item.size;item.radius=item.size*.71;});
  if(d.biome!=='forest'){
   for(const [n,item] of decorations.entries()){const signature=visual.pieces[n%visual.pieces.length];item.model=signature;item.collisionProfile=ENVIRONMENT_MODEL_BOUNDS[signature];item.environmentSignature=true;}
  }
  applySurvivalLandmarks(decorations,d,x,z);
  decorations.push(...biomeFeatures(x,z,d.biome,seed,i));
  decorations.push(...survivalStoryProps(d,x,z));
  applyEnvironmentCover(decorations,d);
  const safe=[{x:x-18,z},{x:x+18,z},{x,z:z+22},{x,z:z-22}];
  const loot=safe[Math.floor(rng()*safe.length)];
  return{...d,flat,id:'tile-'+i,moduleId:d.id,visualModuleId:visualModule?.id||d.id,index:i,x,z,cx,cz,ports,decorations,safe,loot:{...loot},jumps:[]};
 });
 const byCell=new Map(tiles.map(t=>[t.cx+','+t.cz,t]));
 const at=(x,z)=>byCell.get(Math.floor((x+32)/64)+','+Math.floor((z+32)/64));
 const world={seed,flat,presentation:'biomes',tiles,bounds:{minX:-32,minZ:-32,maxX:288,maxZ:288},landmarks:tiles.map(t=>({id:t.id,x:t.x,z:t.z+22,name:t.environmentName||BIOMES.find(b=>b.id===t.biome).name})),roads:[],
  tileAt:at,neighbors(t){return tiles.filter(q=>Math.abs(q.cx-t.cx)+Math.abs(q.cz-t.cz)===1);},
  heightAt(x,z){const t=at(x,z);return t?localHeight(t,x-t.x,z-t.z):null;},
  obstacles(x,z){const t=at(x,z);return t?(t.collisionDecorations??=[t,...this.neighbors(t)].flatMap(q=>q.decorations)):[];},
  solidAt(x,y,z,r=0){return obstacleCandidates(this.obstacles(x,z),x,z,r).some(o=>obstacleContains(o,x,z,r)&&y<(this.heightAt(o.x,o.z)??0)+obstacleHeight(o));},
  flyable(x,z,r=.4){const h=this.heightAt(x,z);if(h===null||obstacleCandidates(this.obstacles(x,z),x,z,r).some(o=>o.feature!=='thicket'&&obstacleContains(o,x,z,r)))return false;for(let i=0;i<8;i++){const a=i*Math.PI/4;if(this.heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r)===null)return false;}return true;},
  walkable(x,z,r=2.4){const h=this.heightAt(x,z);if(h===null||this.solidAt(x,h+.1,z,r))return false;for(let i=0;i<8;i++){const a=i*Math.PI/4,q=this.heightAt(x+Math.cos(a)*r,z+Math.sin(a)*r);if(q===null||Math.abs(q-h)>r*.6+.2)return false;}return true;},
  canFly(a,b,r=.4){return this.heightAt(a.x,a.z)!==null&&this.flyable(b.x,b.z,r);},
  canMove(a,b,r=2.4){const h=this.heightAt(a.x,a.z),k=this.heightAt(b.x,b.z);return h!==null&&k!==null&&this.walkable(b.x,b.z,r)&&Math.abs(h-k)<=Math.hypot(b.x-a.x,b.z-a.z)*.6+.05;},
  lineClear(a,b){const d=Math.hypot(b.x-a.x,b.z-a.z,(b.y??0)-(a.y??0)),n=Math.max(1,Math.ceil(d/.4));for(let i=1;i<=n;i++){const t=i/n,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=(a.y??1)+((b.y??1)-(a.y??1))*t,h=this.heightAt(x,z);if(h!==null&&y<h+.03||this.solidAt(x,y,z))return false;}return true;},
  findPath(a,b,r=2.4){return findPath(this,a,b,r,{cell:2,budget:12000});},
  chunk(cx,cz){const t=at(cx*64,cz*64);return{cx,cz,obstacles:[],lair:t?.safe[0]||{x:0,z:22}};},
 };
 world.roads=tiles.map(t=>[[t.x,t.z+22],...t.ports.map(p=>[p.x,p.z])]);
 return world;
}
export function validateWorld(w){
 const failures=[];
 for(const biome of BIOMES)if(!w.tiles.some(t=>t.biome===biome.id))failures.push('world:missing-biome:'+biome.id);
 for(const t of w.tiles){
  if(!variants.includes(t.kind)&&t.kind!=='transition')failures.push(t.id+':kind');
  const targets=[...t.safe,t.loot,...t.ports];
  for(const p of targets)if(!w.walkable(p.x,p.z,2.4))failures.push(t.id+':clearance');
  for(const p of t.ports){const near=w.neighbors(t).find(n=>n.ports.some(q=>q.x===p.x&&q.z===p.z&&q.y===p.y&&q.width===p.width&&q.dx===-p.dx&&q.dz===-p.dz));if(!near||Math.abs(w.heightAt(p.x,p.z)-p.y)>.01)failures.push(t.id+':seam');}
  // Flood the authored footprint, across the flat ground.
  const seen=new Set(),todo=[t.safe[2]],key=p=>Math.round((p.x-t.x)/2)+','+Math.round((p.z-t.z)/2);
  while(todo.length){const p=todo.pop(),k=key(p);if(seen.has(k))continue;seen.add(k);for(const [dx,dz]of [[2,0],[-2,0],[0,2],[0,-2]]){const q={x:p.x+dx,z:p.z+dz};if(Math.abs(q.x-t.x)>32||Math.abs(q.z-t.z)>32||seen.has(key(q)))continue;if(w.canMove(p,q,2.4))todo.push(q);}}
  // Connect off-grid target footprints to the flood grid.
  for(const p of targets){
   const xs=[Math.floor((p.x-t.x)/2),Math.ceil((p.x-t.x)/2)],zs=[Math.floor((p.z-t.z)/2),Math.ceil((p.z-t.z)/2)];
   if(!xs.some(x=>zs.some(z=>{const q={x:t.x+x*2,z:t.z+z*2};return seen.has(key(q))&&w.canMove(p,q,2.4);})))failures.push(t.id+':disconnected');
  }
 }
 return failures;
}
export function createBiomeWorld(seed=1,options={}){for(let attempt=0;attempt<3;attempt++){const w=assembleBiomeWorld((seed+attempt)>>>0,options);if(!validateWorld(w).length){w.requestedSeed=seed;w.fallback=false;return w;}}const w=assembleBiomeWorld(1,options);if(validateWorld(w).length)throw Error('Invalid authored biome modules');w.requestedSeed=seed;w.fallback=true;return w;}
