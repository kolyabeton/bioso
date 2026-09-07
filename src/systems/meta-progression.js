import {CATALOG} from '../catalog.js';
const count=x=>Number.isSafeInteger(x)&&x>=0?Math.min(x,1000000):0;
export function normalizeMeta(m={}){return{runs:count(m?.runs),wins:count(m?.wins),overruns:count(m?.overruns),rerolls:count(m?.rerolls),best:Object.fromEntries(Object.entries(m?.best&&typeof m.best==='object'?m.best:{}).filter(([k])=>['meta:harpoon','meta:mirror','meta:reactor','meta:spring'].includes(k)).map(([k,v])=>[k,count(v)]))};}
export const meta=p=>p.meta??=normalizeMeta();
export const START_BODIES=['wanderer','hunter','bastion'];
export const START_WEAPONS=['claws','seed','harpoon'];
export const START_ORGANS=['stabilizer','regen','shield'];
export function starterAllowed(p,key){const n=meta(p).overruns;return ['wanderer','claws','seed'].includes(key)||key==='hunter'&&n>=1||key==='bastion'&&n>=2||key==='harpoon'&&n>=1||START_ORGANS.includes(key)&&n>=3;}
export function starterRequirement(key){return ({hunter:'1 усиленная победа',bastion:'2 усиленные победы',harpoon:'1 усиленная победа',stabilizer:'3 усиленные победы',regen:'3 усиленные победы',shield:'3 усиленные победы'})[key]||'Доступно с начала';}
export function validLoadout(p,choice={}){return{body:START_BODIES.includes(choice.body)&&starterAllowed(p,choice.body)?choice.body:'wanderer',arm:START_WEAPONS.includes(choice.arm)&&starterAllowed(p,choice.arm)?choice.arm:'claws',organ:START_ORGANS.includes(choice.organ)&&starterAllowed(p,choice.organ)?choice.organ:null};}
export const META_ACHIEVEMENTS=[
 {id:'meta:harpoon',key:'harpoon',name:'За пределом',description:'Пройдите усиленные 30 секунд после победы над Маткой.',goal:1,progress:s=>meta(s.profile).overruns},
 {id:'meta:mirror',key:'mirrorGland',name:'Ответный удар',description:'Победите 5 элит за один забег.',goal:5,progress:s=>s.elites||0},
 {id:'meta:reactor',key:'reactor',name:'Повторный прорыв',description:'Завершите 2 усиленных продолжения в разных забегах.',goal:2,progress:s=>meta(s.profile).overruns},
 {id:'meta:spring',key:'spring',name:'Первопроходец',description:'За один забег посетите 4 вида биомов и завершите 2 разных типа событий.',goal:6,progress:s=>Math.min(4,new Set((s.world?.tiles||[]).filter(t=>s.exploration?.visited?.has(t.id)||s.exploration?.visited?.has(t.index)).map(t=>t.biome)).size)+Math.min(2,new Set((s.encounters?.nodes||[]).filter(n=>n.state==='complete'||n.state==='completed').map(n=>n.type)).size)},
];
export function awardMeta(s,createPart){for(const a of META_ACHIEVEMENTS){const m=meta(s.profile);m.best??={};const progress=Math.min(a.goal,a.progress(s));if(progress>(m.best[a.id]||0)){m.best[a.id]=progress;s.events.push({type:'profile-progress'});}if(s.profile.achievements.includes(a.id)||a.progress(s)<a.goal)continue;s.profile.achievements.push(a.id);if(!s.profile.unlocked.includes(a.key))s.profile.unlocked.push(a.key);s.inventory.push(createPart(s,a.key));s.events.push({type:'unlock',text:`${a.name}: открыто ${CATALOG[a.key].name}`});}}
export function recordVictory(s){if(s.mode!=='survival'||s.metaVictory)return;s.metaVictory=true;meta(s.profile).wins++;s.events.push({type:'unlock',text:'Победа записана в профиль'});}
export function startOverrun(s,spawn){
 if(s.mode!=='survival'||!s.finalDefeated||!s.won||s.dead||s.overrun)return false;
 const guards=[];for(let i=0;i<2;i++){const e=spawn('elite',null,'mass',Math.max(960,s.time));if(e){e.hp=e.maxHp=Math.round(e.maxHp*1.5);e.overrunGuard=true;e.territory=null;guards.push(e.id);}}
 if(guards.length!==2){s.enemies=s.enemies.filter(e=>!guards.includes(e.id));return false;}
 s.overrun={state:'active',elapsed:0,guards,nextWave:0};s.continued=true;return true;
}
export function tickOverrun(s,dt,spawn,createPart){
 const o=s.overrun;if(o?.state!=='active')return;
 if(s.dead||s.hp<=0){o.state='failed';return;}
 o.elapsed+=dt;
 if(o.elapsed>=o.nextWave){o.nextWave=o.elapsed+4;for(let i=0;i<6&&s.enemies.filter(e=>e.hp>0).length<100;i++)spawn('normal',null,i%3===0?'ranged':i%3===1?'fast':'armored',Math.max(960,s.time));}
 if(o.elapsed<30||s.enemies.some(e=>o.guards.includes(e.id)&&e.hp>0))return;
 o.state='complete';meta(s.profile).overruns++;meta(s.profile).rerolls+=2;s.continued=false;
 for(const [n,key]of [[1,'hunter'],[2,'bastion'],[3,'stabilizer'],[3,'regen'],[3,'shield']])if(meta(s.profile).overruns>=n&&!s.profile.unlocked.includes(key))s.profile.unlocked.push(key);
 s.events.push({type:'unlock',text:'Усиленная победа! +2 жетона перевыбора'});awardMeta(s,createPart);
}
export function spendReroll(s,roll){if(meta(s.profile).rerolls<1||s.dead)return false;roll();meta(s.profile).rerolls--;return true;}
