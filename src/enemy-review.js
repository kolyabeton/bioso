import {hurtEnemy,spawnEnemy} from './game.js';
import {tickEffects} from './systems/effects.js';
import {createPart} from './assembly.js';
import {prepareIsaacAttack,isaacHit,isaacDeath} from './systems/organs/combat.js';
import {VOLATILE} from './living-combat.js';
import {ENEMY_RECIPES,assembleEnemy,assignEnemyAssembly} from './systems/enemy-assembly.js';
/** Explicitly labelled development fixtures. Never grants anything to real runs. */
export function prepareEnemyReview(s,params){
 const fixture=params.get('fixture')||'boss';s.enemies=[];const home={...s.player};let specialReview=null;
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
 }else if(fixture==='elite-tactics'){
  s.time=180;s.health.invulnerableUntil=Infinity;s.arms=[];s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
  for(const [x,z]of [[-3.2,-7],[3.2,-7],[0,-11]]){const e=spawnEnemy(s,'elite',{x:home.x+x,z:home.z+z},'mass',180);if(e)e.enemyAttack.readyAt=s.time;}
 }else if(fixture==='projectiles'){
  s.time=960;s.health.invulnerableUntil=Infinity;const place=(id,x,z)=>{const recipe=ENEMY_RECIPES.find(r=>r.id===id),e=spawnEnemy(s,'normal',{x:home.x+x,z:home.z+z},'ranged',960);e.recipeId=recipe.id;e.assemblyRole=recipe.role;e.assembly=assembleEnemy(recipe,3,'normal');e.enemyAttack={index:0,readyAt:s.time,warning:null};e.hp=e.maxHp=10000;e.speed=0;return e;};
  place('sower',-3.2,-7);place('needler',3.2,-7);
  const legacy=spawnEnemy(s,'boss',{x:home.x,z:home.z-10},'ranged',960);delete legacy.assembly;delete legacy.enemyAttack;delete legacy.recipeId;legacy.role='ranged';legacy.hp=legacy.maxHp=10000;legacy.speed=0;legacy.shootAt=s.time;
 }else if(fixture==='combat-vfx'){
  const effect=params.get('effect')||'all',showWhip=effect==='whip',showClaws=['all','claws'].includes(effect),showDrill=['all','drill'].includes(effect),showSeed=['all','seed'].includes(effect),showNeedle=['all','needle'].includes(effect),showBoss=['all','boss'].includes(effect);
  s.time=960;s.health.invulnerableUntil=Infinity;s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.arms=[showClaws?createPart(s,'claws',4):null,showDrill?createPart(s,'drill',4):null,showWhip?createPart(s,'whip',4):null].filter(Boolean);
  if(showClaws||showDrill||showWhip){const target=spawnEnemy(s,'normal',{x:home.x,z:home.z+(showWhip?4.5:3.45)},'mass',960);target.hp=target.maxHp=10000;target.radius=.48;target.speed=target.damage=0;target.assembly=null;target.shootAt=Infinity;target.vfxAnchor={x:target.x,z:target.z};}
  const place=(id,x,z)=>{const recipe=ENEMY_RECIPES.find(r=>r.id===id),e=spawnEnemy(s,'normal',{x:home.x+x,z:home.z+z},'ranged',960);e.recipeId=recipe.id;e.assemblyRole=recipe.role;e.assembly=assembleEnemy(recipe,3,'normal');e.enemyAttack={index:0,readyAt:s.time,warning:null};e.hp=e.maxHp=10000;e.speed=e.damage=0;return e;};
  if(showSeed)place('sower',0,-7);if(showNeedle)place('needler',0,-7);if(showBoss){const legacy=spawnEnemy(s,'boss',{x:home.x,z:home.z-10},'ranged',960);delete legacy.assembly;delete legacy.enemyAttack;delete legacy.recipeId;legacy.role='ranged';legacy.hp=legacy.maxHp=10000;legacy.speed=legacy.damage=0;legacy.shootAt=s.time;}
 }else if(fixture==='boss-movement'){
  s.time=1440;s.health.invulnerableUntil=Infinity;s.arms=[];s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;s.survivalBosses={nextAt:Infinity,count:0};s.survivalElites={nextAt:Infinity,count:0};
  const enemy=spawnEnemy(s,'boss',{x:home.x,z:home.z+8},'mass',s.time);enemy.hp=enemy.maxHp=10000;enemy.bossName='Орхидея';enemy.bossLevel=16;enemy.enemyAttack.readyAt=Infinity;s.mode='review';s.exploration.groups=[];
 }else if(fixture==='acid'){
  s.time=1440;const enemy=spawnEnemy(s,'boss',{x:home.x,z:home.z-8},'mass',1440);enemy.hp=enemy.maxHp=10000;enemy.speed=0;enemy.enemyAttack.readyAt=s.time;
 }else if(fixture==='locomotion'){
  s.time=960;s.health.invulnerableUntil=Infinity;s.arms=[];s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
  const place=(id,x,z)=>{const recipe=ENEMY_RECIPES.find(r=>r.id===id),e=spawnEnemy(s,'normal',{x:home.x+x,z:home.z+z},recipe.role,960,{promote:false});assignEnemyAssembly(s,e,960,{missionRole:recipe.role,missionRecipeId:id});e.hp=e.maxHp=10000;e.enemyAttack.readyAt=Infinity;return e;};
  place('worker',0,-11);place('small-hunter',-6,-7);place('gatherer',6,-7);place('digger',0,-8);place('runner',-8,-2);place('crusher',8,-2);
  for(const [x,z]of [[-4,4],[-1.4,6],[1.4,6],[4,4]])place('biter',x,z);
 }else if(fixture==='crowd'){
  s.time=960;for(let i=0;i<3000&&s.enemies.length<100;i++){const a=i*2.39996323,r=7+(i%13);spawnEnemy(s,'normal',{x:home.x+Math.cos(a)*r,z:home.z+Math.sin(a)*r},['mass','fast','armored','ranged'][i%4],960);}
 }else if(fixture==='effects'){
  s.time=0;s.nextElite=s.nextBoss=Infinity;s.waves.nextElite=s.waves.nextBoss=Infinity;s.waves.credit=0;
  const elite=spawnEnemy(s,'elite',{x:home.x-3,z:home.z+2.5},'mass',180),boss=spawnEnemy(s,'boss',{x:home.x+3,z:home.z+2.5},'mass',480);
  for(const enemy of [elite,boss])if(enemy){enemy.hp=enemy.maxHp*.64;enemy.speed=0;enemy.enemyAttack.readyAt=Infinity;}
  if(elite)elite.burn={dps:0,until:999};
  s.puddles=[{id:900,source:0,x:home.x+3.2,y:home.y??0,z:home.z-3.5,life:999,damage:0}];
 }else if(fixture==='death'){
  s.time=180;s.health.invulnerableUntil=Infinity;s.arms=[];s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
  for(const [i,[x,z,role]]of [[-2.6,-4.5,'fast'],[0,-6,'mass'],[2.6,-4.5,'armored']].entries()){const e=spawnEnemy(s,i===2?'elite':'normal',{x:home.x+x,z:home.z+z},role,180);if(e){e.speed=0;e.enemyAttack.readyAt=Infinity;e.hp=e.maxHp=1;}}
 }else if(fixture==='special'){
  const id=params.get('enemy')||'shield-bearer',recipe=ENEMY_RECIPES.find(r=>r.id===id&&r.specialty);if(!recipe)throw Error('Unknown special enemy: '+id);
  s.time=960;s.health.invulnerableUntil=Infinity;s.waves.credit=-1e6;s.nextElite=s.nextBoss=s.waves.nextElite=s.waves.nextBoss=Infinity;
  if(id==='mirrorling')s.arms=[createPart(s,'needle',3),null];else s.arms=[];
  const z=id==='shield-bearer'?-2.7:id==='divider'?-1.5:id==='puppeteer'?-3.6:-6,e=spawnEnemy(s,'normal',{x:home.x,z:home.z+z},recipe.role,960,{promote:false});
  e.recipeId=recipe.id;e.specialty=recipe.specialty;e.specialReview=true;e.assemblyRole=recipe.role;e.assembly=assembleEnemy(recipe,3,'normal');e.enemyAttack={index:0,readyAt:s.time+(id==='shield-bearer'?.6:0),warning:null};e.hp=e.maxHp=10000;e.speed=0;
  if(id==='mirrorling')e.enemyAttack.readyAt=Infinity;
  if(id==='puppeteer')e.specialReadyAt=s.time+.35;
  specialReview={id,enemyId:e.id,killAt:id==='divider'?s.time+2.4:null};
 }else{const kind=fixture==='elite'?'elite':'boss';s.time=kind==='elite'?180:480;const enemy=spawnEnemy(s,kind,{x:home.x,z:home.z+8},'mass',s.time);if(enemy&&fixture==='health')enemy.hp=enemy.maxHp*.6;}
 const label=document.createElement('aside');label.style.cssText='position:fixed;top:8px;left:8px;z-index:100;background:#152620e8;color:#efce9a;padding:8px;font:12px system-ui;max-width:240px';label.textContent='Тестовая сцена: '+fixture+' · время и размещение заданы для проверки'+(fixture==='effects'?` · кислотных луж: ${s.puddles.length}`:'')+'. WASD — движение.';if(params.get('record')==='1')label.hidden=true;document.body.append(label);
 const recordMode=params.get('record')==='1';let paused=fixture!=='effects',recordStartsAt=recordMode&&fixture!=='special'?performance.now()+1500:null,captureWarning=false,captureAt=null,captureHit=null,effectsFreezeAt=fixture==='effects'?.8:null,stillPending=null,stillSaving=false;const button=document.createElement('button');button.textContent=paused?'Запустить тестовый бой':'Заморозить кадр';button.style.cssText='display:block;margin-top:8px';button.onclick=()=>{if(fixture==='acid'&&paused)captureHit=s.health.hits;paused=!paused;effectsFreezeAt=null;button.textContent=paused?'Продолжить тестовый бой':'Заморозить кадр';};label.append(button);
 const warningButton=document.createElement('button');warningButton.textContent=fixture==='combat-vfx'?'Показать эффекты':['projectiles','elite-tactics'].includes(fixture)?'Показать залп':['volatile','tactics'].includes(fixture)?'Показать суицидника':'Показать большую AoE';warningButton.onclick=()=>{if(fixture==='volatile')captureAt=120+VOLATILE.fuse*.55;else if(fixture==='tactics')captureAt=s.time+.3;else if(fixture==='elite-tactics')captureAt=s.time+.65;else if(fixture==='projectiles')captureAt=s.time+.65;else if(fixture==='combat-vfx')captureAt=s.time+.2;else captureWarning=true;paused=false;};label.append(warningButton);
 if(fixture==='death'){warningButton.textContent='Показать смерти';warningButton.onclick=()=>{for(const enemy of [...s.enemies])hurtEnemy(s,enemy,1e9,0,'direct');captureAt=params.has('capture')?null:s.time+.42;paused=false;};}
 if(fixture==='volatile'){const blastButton=document.createElement('button');blastButton.textContent='Показать взрыв';blastButton.onclick=()=>{captureAt=120+VOLATILE.fuse+.16;paused=false;};label.append(blastButton);}
 if(recordMode&&specialReview)setTimeout(()=>{
  const canvas=document.querySelector('#world'),stream=canvas.captureStream(30),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(v=>MediaRecorder.isTypeSupported(v)),chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});
  document.body.dataset.enemyProof='recording';paused=false;button.textContent='Заморозить кадр';
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  recorder.onstop=async()=>{stream.getTracks().forEach(track=>track.stop());paused=true;try{const response=await fetch('http://127.0.0.1:4190/__enemy-specialist-proof/'+specialReview.id,{method:'POST',body:new Blob(chunks,{type:mime})});if(!response.ok)throw Error('Proof server unavailable');stillPending=specialReview.id;document.body.dataset.enemyProof='saving-still';}catch(error){document.body.dataset.enemyProof='failed';document.body.dataset.enemyProofError=error.message;}};
  recorder.start();setTimeout(()=>recorder.stop(),specialReview.id==='puppeteer'?7600:8000);
 },1500);
 return {name:null,startCapture(){recordStartsAt=null;paused=false;button.textContent='Заморозить кадр';},get paused(){return paused;},afterRender(){if(!stillPending||stillSaving)return;const id=stillPending;stillPending=null;stillSaving=true;document.querySelector('#world').toBlob(async still=>{try{const response=await fetch('http://127.0.0.1:4190/__enemy-specialist-proof/'+id+'.png',{method:'POST',body:still});if(!response.ok)throw Error('Still proof unavailable');document.body.dataset.enemyProof='saved';}catch(error){document.body.dataset.enemyProof='failed';document.body.dataset.enemyProofError=error.message;}stillSaving=false;},'image/png');},tick(){if(fixture==='combat-vfx')for(const enemy of s.enemies){if(enemy.vfxAnchor){enemy.x=enemy.vfxAnchor.x;enemy.z=enemy.vfxAnchor.z;enemy.kickX=enemy.kickZ=0;}}if(recordStartsAt!=null&&performance.now()>=recordStartsAt){recordStartsAt=null;paused=false;button.textContent='Заморозить кадр';}if(recordMode&&!paused&&fixture==='combat-vfx'){for(const arm of s.arms)arm.cooldown=Math.min(arm.cooldown,.35);for(const enemy of s.enemies){if(enemy.enemyAttack&&!enemy.enemyAttack.warning)enemy.enemyAttack.readyAt=Math.min(enemy.enemyAttack.readyAt,s.time+.55);if(Number.isFinite(enemy.shootAt))enemy.shootAt=Math.min(enemy.shootAt,s.time+(enemy.kind==='boss'?1.5:.85));}}if(specialReview&&!paused){const enemy=s.enemies.find(e=>e.id===specialReview.enemyId&&e.hp>0);if(enemy){enemy.speed=0;if(specialReview.id!=='shield-bearer'&&specialReview.id!=='mirrorling'&&enemy.enemyAttack&&!enemy.enemyAttack.warning)enemy.enemyAttack.readyAt=Math.min(enemy.enemyAttack.readyAt,s.time+.25);if(specialReview.id==='mirrorling'&&enemy.mirrorReadyAt!=null)for(const arm of s.arms)if(arm)arm.disabled=true;if(specialReview.killAt!=null&&s.time>=specialReview.killAt){specialReview.killAt=null;hurtEnemy(s,enemy,Number.MAX_SAFE_INTEGER);}}}if(captureHit!=null&&s.health.hits>captureHit){captureAt=s.time+.26;captureHit=null;}if(effectsFreezeAt!=null&&s.time>=effectsFreezeAt){paused=true;effectsFreezeAt=null;button.textContent='Продолжить тестовый бой';}if(captureAt!=null&&s.time>=captureAt){paused=true;captureAt=null;button.textContent='Продолжить тестовый бой';}if(captureWarning&&s.enemies.some(e=>e.kind===(fixture==='elite'?'elite':'boss')&&e.enemyAttack?.warning)){paused=true;captureWarning=false;button.textContent='Продолжить тестовый бой';}}};
}
