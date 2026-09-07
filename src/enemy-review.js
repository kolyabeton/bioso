import {spawnEnemy} from './game.js';
import {tickEffects} from './systems/effects.js';
import {createPart} from './assembly.js';
import {prepareIsaacAttack,isaacHit,isaacDeath} from './systems/organs/combat.js';
import {VOLATILE} from './living-combat.js';
/** Explicitly labelled development fixtures. Never grants anything to real runs. */
export function prepareEnemyReview(s,params){
 const fixture=params.get('fixture')||'boss';s.enemies=[];const home={...s.player};
 if(fixture==='larvae'){
  s.organs=[createPart(s,'parasite')];
  const carrier={x:home.x,y:home.y??0,z:home.z-2,hp:0,kind:'normal'};
  const arm=s.arms.find(Boolean);let attack;
  for(let i=0;i<3;i++)attack=prepareIsaacAttack(s,arm,{damage:20});
  isaacHit(s,carrier,20,attack);isaacDeath(s,carrier,'arm');
  spawnEnemy(s,'normal',{x:home.x+3,z:home.z-5},'mass',0);
 }else if(fixture==='symbionts'){
  s.abilities.learned=['summons.0','summons.1'];
  spawnEnemy(s,'normal',{x:home.x+4,z:home.z-5},'mass',0);
  tickEffects(s,0,()=>{});
 }else if(fixture==='volatile'){
  s.time=120;const e=spawnEnemy(s,'normal',{x:home.x+1,z:home.z-4},'mass',120);if(e){e.volatile=true;e.fuseRemaining=VOLATILE.fuse;e.fuseAnchor={x:e.x,z:e.z};}
 }else if(fixture==='tactics'){
  s.time=120;for(const [i,role]of ['mass','ranged','flying','armored'].entries()){const e=spawnEnemy(s,'normal',{x:home.x+(i%2?1:-1)*1.7,z:home.z-3-Math.floor(i/2)*3},role,480);if(e&&i===0){e.volatile=true;e.fuseRemaining=1.2;e.fuseAnchor={x:e.x,z:e.z};}}
 }else if(fixture==='crowd'){
  s.time=960;for(let i=0;i<3000&&s.enemies.length<100;i++){const a=i*2.39996323,r=7+(i%13);spawnEnemy(s,'normal',{x:home.x+Math.cos(a)*r,z:home.z+Math.sin(a)*r},['mass','fast','armored','ranged'][i%4],960);}
 }else{const kind=fixture==='elite'?'elite':'boss';s.time=kind==='elite'?180:480;const enemy=spawnEnemy(s,kind,{x:home.x,z:home.z+8},'mass',s.time);if(enemy&&fixture==='health')enemy.hp=enemy.maxHp*.6;}
 const label=document.createElement('aside');label.style.cssText='position:fixed;top:8px;left:8px;z-index:100;background:#152620e8;color:#efce9a;padding:8px;font:12px system-ui;max-width:240px';label.textContent='Тестовая сцена: '+fixture+' · время и размещение заданы для проверки. WASD — движение.';document.body.append(label);
 let paused=true,captureWarning=false,captureAt=null;const button=document.createElement('button');button.textContent='Запустить тестовый бой';button.style.cssText='display:block;margin-top:8px';button.onclick=()=>{paused=!paused;button.textContent=paused?'Продолжить тестовый бой':'Заморозить кадр';};label.append(button);
 const warningButton=document.createElement('button');warningButton.textContent='Показать предупреждение';warningButton.onclick=()=>{if(fixture==='volatile')captureAt=120+VOLATILE.fuse*.55;else captureWarning=true;paused=false;};label.append(warningButton);
 if(fixture==='volatile'){const blastButton=document.createElement('button');blastButton.textContent='Показать взрыв';blastButton.onclick=()=>{captureAt=120+VOLATILE.fuse+.16;paused=false;};label.append(blastButton);}
 return {name:null,get paused(){return paused;},tick(){if(captureAt!=null&&s.time>=captureAt){paused=true;captureAt=null;button.textContent='Продолжить тестовый бой';}if(captureWarning&&s.enemies.some(e=>e.kind===(fixture==='elite'?'elite':'boss')&&e.enemyAttack?.warning)){paused=true;captureWarning=false;button.textContent='Продолжить тестовый бой';}}};
}
