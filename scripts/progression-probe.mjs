import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPaintedRun,stepPaintedRun} from '../src/painterly-stage.js';
import {chooseUpgrade} from '../src/game.js';
import {newProfile,stats,weaponStats,equip,swapBody,pickup,drop,digest,upgrade,upgradeOptions,ranks,def} from '../src/assembly.js';
import {movementFactor} from '../src/combat-feel.js';
import {CATALOG} from '../src/catalog.js';
import {upgradeCost,xpRequired} from '../src/systems/balance.js';
export const STYLES={melee:['might','tempo','vitality','motion','cold'],ranged:['projectiles','tempo','might','vitality','motion'],elements:['fire','cold','electric','vitality','tempo'],summons:['summons','tempo','vitality','fire','cold'],mixed:['might','electric','projectiles','vitality','tempo']};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function partScore(s,p,style){const d=def(p);if(d.kind==='arm'){const w=weaponStats(s,p),melee=['sector','area','contact'].includes(w.mode);return w.damage/(w.interval+(w.reload||0)/(w.magazine||1))*(melee?style==='melee'?1.6:.12:style==='melee'?.2:1)*(1+(w.pierce||1)*.1)*(w.mode==='area'?3:w.mode==='sector'?2:1);}if(d.kind==='body')return d.arms*30+d.hp*8+d.capacity*.1;if(d.kind==='leg')return d.speed*10;return ['regen','shield','accelerator'].includes(p.key)?100:p.key==='digestion'?80:30;}
function assemble(s,style){
 for(const q of [...s.ground])if(distance(q,s.player)<=3&&!s.discarded.has(q.part.id))pickup(s,q.id);
 for(const p of [...s.inventory]){const d=def(p);if(d.kind==='body'){if(partScore(s,p,style)>partScore(s,s.body,style)&&d.legs<=s.legs.filter(Boolean).length+s.inventory.filter(p=>def(p).kind==='leg').length)swapBody(s,p.id);continue;}
 const group={arm:'arms',leg:'legs',organ:'organs'}[d.kind];let index=s[group].findIndex(x=>!x);
 if(index<0){index=s[group].map((x,i)=>({i,score:partScore(s,x,style)})).sort((a,b)=>a.score-b.score)[0]?.i;if(index==null||partScore(s,p,style)<=partScore(s,s[group][index],style))continue;}
 equip(s,p.id,index);
 }
 const digester=s.inventory.find(p=>p.key==='digestion');let restored=null;
 if(digester&&!s.organs.some(p=>p?.key==='digestion')){restored=s.organs[0];equip(s,digester.id,0);}
 let spareLegs=0;
 for(const p of [...s.inventory]){if(p===restored||p.key==='digestion'||def(p).kind==='leg'&&spareLegs++<2)continue;if(!digest(s,p.id)){s.discarded.add(p.id);drop(s,p.id);}}
 if(restored)equip(s,restored.id,0);
 while(stats(s).weight>stats(s).capacity&&s.inventory.length){const p=s.inventory.at(-1);s.discarded.add(p.id);drop(s,p.id);} 
 // Purchasing uses earned biomass only; no items, ranks, XP or health are granted.
 for(const p of [...s.arms.filter(Boolean),s.body]){const options=upgradeOptions(p),stat=options.includes('damage')?'damage':options.includes('hp')?'hp':null;if(stat&&s.biomass>=upgradeCost(ranks(p)))upgrade(s,p.id,stat,true);}
}
function steering(s,style){
 const nearby=s.enemies.filter(e=>e.hp>0&&distance(e,s.player)<12),resources=[...s.xpDrops,...s.ground.filter(q=>q.part&&!s.discarded?.has(q.part.id))];
 let target=resources.sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0]||s.enemies.filter(e=>e.hp>0).sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];
 const boss=s.enemies.find(e=>['boss','final'].includes(e.kind)&&e.hp>0);if(boss&&s.time%12<7)target=boss;
 if((!boss||s.time%12>=7)&&style==='melee'&&nearby.length&&(!target||distance(target,s.player)>2))target=nearby.sort((a,b)=>distance(a,s.player)-distance(b,s.player))[0];if(!target)return{x:0,z:0};let best={x:0,z:0},bestScore=-Infinity;const speed=stats(s).speed*movementFactor(s);
 for(let i=0;i<24;i++){const a=i*Math.PI/12,x=Math.cos(a),z=Math.sin(a),p={x:s.player.x+x*speed*(style==='melee'?.1:.25),z:s.player.z+z*speed*(style==='melee'?.1:.25)};if(!s.world.walkable(p.x,p.z))continue;
 let score=(s.botHeading?x*s.botHeading.x+z*s.botHeading.z:0)*.2-(style==='melee'?Math.abs(distance(p,target)-((target.radius||.5)+2)):distance(p,target))*.65;for(const e of nearby){const toward=distance(e,s.player)||1,forecast={x:e.x+(s.player.x-e.x)/toward*e.speed*(style==='melee'?.1:.25),z:e.z+(s.player.z-e.z)/toward*e.speed*(style==='melee'?.1:.25)},d=distance(p,forecast),safe=e.radius+1.2;score-=Math.max(0,(style==='melee'?2.2:5)-d)**2*(style==='melee'?.2:1.5);if(d<safe)score-=80;}
 for(const q of s.hostileShots)if(distance(p,q)<2)score-=20;
 if(score>bestScore){bestScore=score;best={x,z};}}
 s.botHeading=best;return best;
}
export function probe(style,seed,{seconds=2490,dt=.1}={}){
 const profile=newProfile();profile.unlocked=Object.keys(CATALOG);const s=createPaintedRun(profile,'survival',seed);s.discarded=new Set();const checkpoints=[],started=performance.now();let firstChoice=null,nextAssembly=0;
 while(s.time<seconds&&!s.dead&&!s.finalDefeated){
  while(s.pending){firstChoice??=s.time;const priority=STYLES[style];const choices=s.choices.map((c,i)=>{const branch=c.id.split('.')[0],rank=priority.indexOf(branch);return{i,score:(rank<0?0:20-rank*2)+(c.id.endsWith('.3')?5:0)+(c.id==='vitality.0'?24:c.id==='vitality.2'?22:0)};}).sort((a,b)=>b.score-a.score);chooseUpgrade(s,choices[0].i);}
  if(s.time>=nextAssembly){const before=new Set(s.inventory.map(p=>p.id));assemble(s,style);for(const q of s.ground)if(before.has(q.part.id))s.discarded.add(q.part.id);nextAssembly=s.time+1;}
  stepPaintedRun(s,dt,steering(s,style));s.events.length=0;
  for(const minute of [2,8,16,24,32,40])if(s.time>=minute*60&&!checkpoints.some(c=>c.minute===minute))checkpoints.push({minute,choices:s.level-1,xp:s.xp,nextXP:xpRequired(s.level),hp:s.hp,kills:s.kills,biomass:s.biomass,arms:s.arms.filter(Boolean).map(p=>`${p.key}:${p.tier}`)});
 }
 const times={};for(const kind of ['normal','elite','boss','final']){const xs=s.metrics.killed.filter(k=>k.kind===kind).map(k=>k.combatSeconds).sort((a,b)=>a-b);times[kind]={n:xs.length,median:xs[Math.floor(xs.length/2)]??null,p90:xs[Math.floor(xs.length*.9)]??null};}
 return{style,seed,distantEnemies:s.enemies.filter(e=>distance(e,s.player)>15).length,nearEnemies:s.enemies.filter(e=>distance(e,s.player)<7).length,seconds:+s.time.toFixed(1),alive:!s.dead,won:s.finalDefeated,firstChoice,choices:s.level-1,hits:s.health.hits,cause:s.dead?s.health.lastCause:null,kills:s.kills,maxEnemies:s.metrics.maxEnemies,checkpoints,times,wallSeconds:(performance.now()-started)/1000};
}
export async function runProbes(){const count=Number(process.env.PROBE_SEEDS||20),seconds=Number(process.env.PROBE_SECONDS||2490),styles=process.env.PROBE_STYLE?[process.env.PROBE_STYLE]:Object.keys(STYLES),rows=[];const sourceHashes={};for(const path of ['src/game.js','src/assembly.js','src/catalog.js','src/combat-feel.js','src/living-combat.js','src/painterly-stage.js','src/terrain.js','src/simulation.js','src/systems/balance.js','src/systems/abilities.js','src/systems/health.js','src/systems/progression.js','src/systems/waves.js','src/systems/effects.js'])sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');for(const style of styles)for(let i=0;i<count;i++){const row=probe(style,20260907+i,{seconds});rows.push(row);console.log(JSON.stringify(row));}await mkdir('proof',{recursive:true});await writeFile(process.env.PROBE_OUTPUT||'proof/progression-probe.json',JSON.stringify({sourceHashes,method:'Production painted-stage runs from time zero. Persistent catalogue unlocked; all actual equipment, XP and biomass earned during run. 24-direction avoidance controller. No invulnerability or HP grants. Automated evidence, not human difficulty acceptance.',rows},null,2));}

if(process.argv[1]===new URL(import.meta.url).pathname)await runProbes();
