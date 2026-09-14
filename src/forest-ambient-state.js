export const AMBIENT_TIERS=Object.freeze({low:{birds:2,particles:8},medium:{birds:4,particles:24},high:{birds:6,particles:40}});
const ranks=['low','medium','high'];
/** Session-only, one-way decoration governor. Never changes user settings. */
export function createAmbientGovernor(){
 let ceiling=2,overload=0,windowTime=0;const samples=[];let p95=0;
 return{sample(ms,dt,fps,active=true,requested='high'){
  if(requested==='high'){ceiling=2;overload=windowTime=0;samples.length=0;return;}
  if(!active){overload=windowTime=0;samples.length=0;return;}
  samples.push(ms);if(samples.length>fps)samples.shift();windowTime+=dt;
  if(windowTime<1)return;const elapsed=windowTime;windowTime=0;
  const sorted=[...samples].sort((a,b)=>a-b);p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
  overload=p95>800/fps?overload+elapsed:0;
  if(overload>=5&&ceiling>0){ceiling=Math.max(0,Math.min(ceiling,ranks.indexOf(requested))-1);overload=0;samples.length=0;}
 },tier(requested){if(requested==='high')return 'high';return ranks[Math.min(ceiling,Math.max(0,ranks.indexOf(requested)))];},info:()=>({ambientP95Ms:p95,ambientCeiling:ranks[ceiling]})};
}
export function forestWind(time){
 const gust=Math.pow(Math.max(0,Math.sin(time*.31-.7)),6);
 return{strength:.24+gust*.68,pulse:gust,x:.87,z:.49};
}
export function createForestAmbientState(){
 let time=0,quiet=5,active=false,combat=false;
 return{update(s,dt){
  active=s.world.presentation==='biomes'&&s.world.tileAt(s.player.x,s.player.z)?.biome==='forest';
  if(dt>0){time+=Math.min(dt,.1);const threat=active&&s.enemies.some(e=>e.hp>0&&Math.hypot(e.x-s.player.x,e.z-s.player.z)<18);quiet=threat?0:Math.min(5,quiet+dt);}
  combat=active&&quiet<5;
  return{active,combat,time,...forestWind(time)};
 },event(e){if(active&&['attack','player-hit','blast'].includes(e.type))quiet=0;},reset(){time=0;quiet=5;active=combat=false;}};
}
