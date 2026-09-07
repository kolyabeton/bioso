import {createWorldRun,stepWorldRun} from '../src/world-run.js';
import {spawnEnemy} from '../src/game.js';
import {newProfile,createPart,stats,upgrade,installed,load} from '../src/assembly.js';
import {CATALOG} from '../src/catalog.js';
import {learn} from '../src/systems/abilities.js';
import {createPilot} from '../src/qa-pilot.js';
import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
export const BUILDS={melee:['might.0','might.1','might.3','tempo.0','tempo.1','tempo.2'],ranged:['projectiles.0','projectiles.1','projectiles.3','tempo.0','tempo.1','tempo.2'],elements:['fire.0','fire.1','electric.0','electric.1','cold.0','cold.2'],summons:['summons.0','summons.1','summons.3','tempo.0','tempo.1','tempo.3'],mixed:['might.0','projectiles.0','electric.0','summons.0','fire.0','cold.0']};
const SCENARIOS={crowd:{count:12,kind:'normal',role:'mass'},single:{count:1,kind:'normal',role:'mass'},ranged:{count:6,kind:'normal',role:'ranged'},elite:{count:1,kind:'elite',role:'elite'},boss:{count:1,kind:'boss',role:'boss'}};
export function fixture(style,catalog,seed,scenario){
 const profile=newProfile();if(catalog==='full')profile.unlocked=Object.keys(CATALOG);const s=createWorldRun(profile,'core',seed);s.mode='comparison';s.mission=null;s.encounters={nodes:[],active:null};s.exploration.groups=[];s.enemies=[];
 // Fixed flat arena removes navigation and reward confounds. Production combat still runs.
 s.world={landmarks:[],walkable:(x,z,r=2.4)=>Math.abs(x)<1024-r&&Math.abs(z)<1024-r};
 s.arms=(catalog==='starter'?['claws','seed']:['hammer','needle']).map(k=>createPart(s,k));s.inventory=[];
 for(const id of ['vitality.0','vitality.2',...BUILDS[style]])learn(s,id);s.hp=stats(s).hp;s.biomass=24;for(const p of s.arms)upgrade(s,p.id,'damage',true);
 const config=SCENARIOS[scenario];for(let i=0;i<config.count;i++){const a=s.rng()*Math.PI*2,r=8+s.rng()*4;spawnEnemy(s,config.kind,{x:s.player.x+Math.cos(a)*r,z:s.player.z+Math.sin(a)*r},config.role,480);}
 return s;
}
export function compare(style,catalog,seed,scenario,{dt=.1,limit=240,controller='style'}={}){
 const s=fixture(style,catalog,seed,scenario),bot=createPilot({style:controller==='contact-control'?'melee':controller==='ranged-control'?'ranged':style}),contract={body:s.body.key,arms:s.arms.map(p=>p.key),defense:s.abilities.learned.filter(id=>id.startsWith('vitality')),choices:s.abilities.learned.length,ranks:installed(s).reduce((n,p)=>n+Object.values(p.upgrades).reduce((a,b)=>a+b,0),0),equipmentCost:installed(s).reduce((n,p)=>n+p.spent,0),weight:load(s)};let burning=0,chilled=0,warning=0;
 while(s.time<limit&&!s.dead&&s.enemies.some(e=>e.hp>0)){stepWorldRun(s,dt,bot.direction(s));burning+=s.enemies.filter(e=>e.burn?.until>s.time).length*dt;chilled+=s.enemies.filter(e=>e.chillUntil>s.time).length*dt;warning+=s.enemies.filter(e=>e.windup).length*dt;s.xpDrops=[];s.ground=[];s.inventory=[];s.events=[];if(s.pending)throw Error('Fixture collected unexpected XP');}
 const clear=!s.enemies.some(e=>e.hp>0);return{style,catalog,seed,scenario,controller,contract,clear,dead:s.dead,censored:!clear&&!s.dead,seconds:+s.time.toFixed(2),hits:s.health.hits,damage:s.metrics.damage||{},burnTargetSeconds:burning,chillTargetSeconds:chilled,warningSeconds:warning,attacks:Object.values(s.abilities.attacks).reduce((a,b)=>a+b,0),kills:s.metrics.killed,remainingHp:s.enemies.reduce((n,e)=>n+e.hp,0)};
}
async function sourceFiles(dir='src'){const files=[];for(const d of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+d.name;if(d.isDirectory())files.push(...await sourceFiles(path));else if(d.name.endsWith('.js'))files.push(path);}return files.sort();}
export async function run(){const paths=[...await sourceFiles(),'scripts/build-comparison.mjs','package-lock.json'],hashes={};for(const path of paths)hashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');const rows=[],count=Number(process.env.COMPARISON_SEEDS||20);
 for(const catalog of ['starter','full'])for(const style of Object.keys(BUILDS)){for(let i=0;i<count;i++)for(const scenario of Object.keys(SCENARIOS))for(const controller of ['style','contact-control','ranged-control'])rows.push(compare(style,catalog,20260907+i,scenario,{controller}));console.log(catalog,style,rows.length);}
 const drift=(await sourceFiles()).filter(p=>!paths.includes(p));for(const path of paths)if(hashes[path]!==createHash('sha256').update(await readFile(path)).digest('hex'))drift.push(path);
 const summaries=[];for(const catalog of ['starter','full'])for(const style of Object.keys(BUILDS))for(const scenario of Object.keys(SCENARIOS))for(const controller of ['style','contact-control','ranged-control']){const xs=rows.filter(r=>r.catalog===catalog&&r.style===style&&r.scenario===scenario&&r.controller===controller),success=xs.filter(r=>r.clear),times=success.map(r=>r.seconds).sort((a,b)=>a-b),damage={};for(const r of xs)for(const [k,v]of Object.entries(r.damage))damage[k]=(damage[k]||0)+v/xs.length;summaries.push({catalog,style,scenario,controller,n:xs.length,clears:success.length,deaths:xs.filter(r=>r.dead).length,censored:xs.filter(r=>r.censored).length,medianTTK:times[Math.floor(times.length/2)]??null,meanHits:xs.reduce((n,r)=>n+r.hits,0)/xs.length,meanDamage:damage});}
 const report={method:'5 styles x 20 matched seeds x 2 catalogues x 5 encounter types x 3 controller policies (style-aware, identical close control, identical ranged control). The two common controllers isolate build coefficients from positioning. Controlled fixture, production combat. Same chassis, legs, HP, defence, weapon pair, tier, rank count (2), biomass cost (24) and load WITHIN each catalogue. All parts otherwise have no shop price. Eight learned choices: six offensive, two identical defensive. No rewards or further progression during fight. Starter pair claws/seed; full pair hammer/needle. Flat arena isolates combat from world navigation. Style-aware bot uses melee reach / ranged distance / summon radius and avoids real telegraphs. TTK is elapsed encounter time; 240s survivors are censored, not victories.',hashes,sourceDrift:drift,summaries,rows};await writeFile('proof/world-v1/build-comparison.json',JSON.stringify(report,null,2));if(drift.length)throw Error('Source drift: '+drift.join(','));
}
if(process.argv[1]===new URL(import.meta.url).pathname)await run();
