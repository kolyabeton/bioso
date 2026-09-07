import './ui/damage-numbers.css';
import {meta} from './systems/meta-progression.js';
import {applyStartingLoadout} from './game.js';
import {createEventHud} from './ui/event-hud.js';
import './ui/events.css';
import {createWaypointCompass} from './ui/waypoint-compass.js';
import './ui/game-ui.css';
import './ui/biotech.css';
import {effectiveReducedMotion} from './ui/motion.js';
import {createCombatAudio} from './combat-audio.js';
import {createBackgroundMusic} from './background-music.js';
import {createWorldRun,stepWorldRun as step} from './world-run.js';
import {stats} from './assembly.js';
import {createProfileStorage} from './profile-storage.js';
import {createView} from './game-view.js';
import {movementFromDrag} from './simulation.js';
import {createHandsHud,createHud} from './ui/hud.js';
import {createScreens} from './ui/screens.js';
import {createSettings,readSettings} from './ui/settings.js';
import {createLocalizer} from './i18n/index.js';
import './ui/ceramic-theme.css';
import './ui/selection.css';

const $=id=>document.getElementById(id),panel=$('panel'),previewHolder=$('preview-holder'),toast=$('toast'),notifications=$('notifications');
const params=new URLSearchParams(location.search),review=(import.meta.env.DEV||import.meta.env.MODE==='acceptance')?params.get('review'):null;
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
if(review){const data=new Map();storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};}
const localization=createLocalizer(document,readSettings(storage).language);
const profileStorage=createProfileStorage(storage,{notify});
let profile=profileStorage.profile,run=createWorldRun(profile,'survival',review?20317:undefined),initialUnlocks=new Set(profile.unlocked);
let ui,view,last=performance.now(),toastUntil=0,overloadUntil=0,wasOverloaded=false,hudClock=0,frames=0,fpsClock=0,fps=0;
const movement={x:0,z:0},keys=new Set();let pointer=null;
function notify(text){(panel.open?panel:document.body).append(notifications);toast.textContent=text;toast.classList.add('visible');toastUntil=performance.now()+3500;}
function save(){profileStorage.save();}
function stopInput(){keys.clear();movement.x=movement.z=0;pointer=null;$('joystick').hidden=true;}
try{view=createView($('world'),$('preview'),{painted:false});}catch(error){document.body.innerHTML='<div class="ui-frame ui-error"><h1>Не удалось открыть сады</h1><p>Для игры нужен WebGL 2. Перезагрузите страницу в браузере с поддержкой WebGL.</p></div>';throw error;}
const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const backgroundMusic=createBackgroundMusic(`${import.meta.env.BASE_URL}assets/audio/zambian-holizna.mp3`);
backgroundMusic.setActive(!document.hidden);
let combatAudio;
const settings=createSettings(storage,{notify,apply:value=>{localization.setLanguage(value.language);backgroundMusic.setVolume(value.soundEnabled?value.music:0);combatAudio?.syncVolume();const reduced=effectiveReducedMotion(value.reducedMotion,systemMotion.matches);view.setQuality?.(value.quality);view.setReducedMotion(reduced);document.body.dataset.reducedMotion=String(reduced);if(reduced)document.getAnimations().forEach(a=>a.cancel());}});settings.apply();
window.addEventListener('pointerdown',backgroundMusic.unlock);
window.addEventListener('keydown',backgroundMusic.unlock);
window.addEventListener('input',backgroundMusic.unlock);
window.addEventListener('click',backgroundMusic.unlock);
window.addEventListener('blur',()=>backgroundMusic.setActive(false));
window.addEventListener('focus',()=>backgroundMusic.setActive(!document.hidden));
document.addEventListener('visibilitychange',()=>backgroundMusic.setActive(!document.hidden&&document.hasFocus()));
systemMotion.addEventListener('change',()=>settings.apply());
combatAudio=createCombatAudio(()=>settings.get().soundEnabled?settings.get().effects:0,{shotUrl:`${import.meta.env.BASE_URL}assets/audio/approved-pistol.mp3`});window.addEventListener('pointerdown',combatAudio.unlock);window.addEventListener('keydown',combatAudio.unlock);
const renderHands=createHandsHud($('hands'),()=>ui.open('assembly'));
const renderHud=createHud($('game'));
const renderCompass=createWaypointCompass($('game'),()=>ui.open('map'));
const eventHud=createEventHud($('encounter-button'));
function updateHud(){renderHud(run);renderHands(run);eventHud.update(run);}
function start(mode,seed,loadout){wasOverloaded=false;overloadUntil=0;$('game').inert=false;run=createWorldRun(profile,mode,seed);if(mode==='survival'){applyStartingLoadout(run,loadout);meta(profile).runs++;save();}initialUnlocks=new Set(profile.unlocked);view.reset();stopInput();$('world').focus();updateHud();toast.classList.remove('visible');toastUntil=0;}
ui=createScreens({dialog:panel,content:$('panel-content'),previewHolder,getRun:()=>run,getProfile:()=>profile,startRun:start,resume:()=>{stopInput();updateHud();},stopInput,notify,updateHud,settings,localize:localization.localize,getSaveStatus:()=>profileStorage.saved,saveProfile:save,getNewUnlocks:()=>profile.unlocked.filter(key=>!initialUnlocks.has(key)),onRoute:name=>{document.body.dataset.screen=name;}});
$('encounter-button').onclick=()=>{const n=eventHud.target();if(n)ui.open('encounter-detail',{id:n.id});};
$('pause-button').onclick=()=>ui.open('pause');$('assembly-button').onclick=()=>ui.open('assembly');$('map-button').onclick=()=>ui.open('map');
$('world').addEventListener('pointerdown',event=>{if(panel.open)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY};$('world').setPointerCapture(event.pointerId);const rect=$('game').getBoundingClientRect();Object.assign($('joystick').style,{left:(event.clientX-rect.left)+'px',top:(event.clientY-rect.top)+'px'});$('joystick').hidden=false;});
$('world').addEventListener('pointermove',event=>{if(pointer?.id===event.pointerId)Object.assign(movement,movementFromDrag(event.clientX-pointer.x,event.clientY-pointer.y));});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,stopInput);
window.addEventListener('keydown',event=>{if(panel.open||run.dead)return;if(event.code==='KeyI'){ui.open('assembly');return;}if(event.code==='KeyM'){ui.open('map');return;}if(event.code==='Escape'){event.preventDefault();ui.open('pause');return;}if(/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code)){event.preventDefault();keys.add(event.code);}});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{stopInput();if(!panel.open&&!run.dead)ui.open('pause');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopInput();if(!panel.open&&!run.dead)ui.open('pause');}});
$('world').addEventListener('webglcontextlost',event=>{event.preventDefault();if(!panel.open)ui.open('pause');notify('Графика потеряла контекст. Перезагрузите страницу.');});
let browserQA,isaacReview,enemyReview;
const loading=document.createElement('button');loading.className='ui-button';loading.style.cssText='position:absolute;left:12px;right:12px;bottom:130px;z-index:12';loading.hidden=true;loading.onclick=()=>view.retryAssets?.();$('game').append(loading);
const diagnostic=params.has('debug');$('diagnostics').hidden=!diagnostic;
function frame(now){requestAnimationFrame(frame);const elapsed=(now-last)/1000;if(elapsed<1/settings.get().fps-.001)return;last=now;const dt=Math.min(.05,elapsed);
  browserQA?.tick();isaacReview?.tick?.();enemyReview?.tick?.();
  if(!panel.open&&!enemyReview?.paused&&(!run.world.tiles||run.streaming?.ready?.has(run.world.tileAt(run.player.x,run.player.z)?.id))){const input=keys.size?{x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))}:movement;step(run,dt,input);
    for(const event of run.events){view.event(event);renderHands.event(event,run);combatAudio.event(event);if(event.type==='profile-progress'){save();}else if(event.type==='unlock'){save();notify(event.text);}else if((event.type==='notice'&&event.category!=='landmark')||event.type==='group-cleared')notify(event.text);else if(event.type==='player-hit')settings.haptic();}run.events.length=0;
    if(run.dead){
      if(view.deathPending(run)){if(!$('game').inert){stopInput();notify('Существо погибло');$('game').inert=true;}}
      else{$('game').inert=false;ui.open('end');}
    }else if(run.bossRewards?.length)ui.open('boss-reward');else if(run.won&&!run.continued)ui.open('end');else if(run.pending)ui.open('level');
  }
  loading.hidden=!run.streaming?.errors?.length;loading.textContent='Не удалось загрузить участок · повторить';
  view.render(run,dt,ui.previewVisible,panel.open||enemyReview?.paused||run.dead&&(document.hidden||!document.hasFocus()));renderCompass(run,view.directionTo);hudClock+=dt;if(hudClock>.1){updateHud();hudClock=0;}if(now>toastUntil)toast.classList.remove('visible');
  frames++;fpsClock+=elapsed;if(fpsClock>=1){fps=Math.round(frames/fpsClock);frames=fpsClock=0;$('diagnostics').textContent=`${fps} FPS · ${view.info().drawCalls} draws · ${view.info().loadedModels} GLB/${view.info().failedModels.length} errors · ${view.info().assetEnemies} mesh enemies\n${run.enemies.length} enemies · ${run.ground.length} parts\n${run.player.x.toFixed(1)}, ${run.player.z.toFixed(1)}`;}
}
window.bioso={snapshot:()=>({mode:run.mode,time:run.time,level:run.level,hp:run.hp,kills:run.kills,biomass:run.biomass,firstPaidUpgrade:!!run.firstPaidUpgrade,organs:run.organs.map(p=>p?.key),lastHit:run.health.lastCause,deathCause:run.deathCause,stats:stats(run),player:{...run.player},paused:panel.open,screen:ui.screen,dead:run.dead,won:run.won,body:run.body.key,arms:run.arms.map(p=>p?.key),legs:run.legs.map(p=>p?.key),inventory:run.inventory.length,ground:run.ground.length,unlocked:[...profile.unlocked],learned:[...run.abilities.learned],pending:run.pending,choices:run.choices.map(c=>c.id),settings:settings.get(),enemies:run.enemies.length,fps,...view.info()})};
if(review==='stress'){const {installStressReview}=await import('./stress-review.js');enemyReview=installStressReview(run,value=>Object.assign(movement,value),()=>window.bioso.snapshot());document.body.dataset.screen='';}
else if(review==='recovery'){const {prepareRecoveryReview}=await import('./ui/recovery-review.js');enemyReview=prepareRecoveryReview(run);document.body.dataset.screen='';}
else if(review==='forest-border'){const {prepareForestBorderReview}=await import('./forest-border-review.js');enemyReview=prepareForestBorderReview(run,params);document.body.dataset.screen='';}
else if(review==='world-label'){const {prepareWorldLabelReview}=await import('./ui/world-label-review.js');enemyReview=prepareWorldLabelReview(run,params);document.body.dataset.screen='';}
else if(review==='damage'){const {prepareDamageReview}=await import('./ui/damage-review.js');enemyReview=prepareDamageReview(run,event=>view.event(event));document.body.dataset.screen='';}
else if(review==='death'){const {prepareDeathReview}=await import('./ui/death-review.js');enemyReview=prepareDeathReview(run);document.body.dataset.screen='';}
else if(review==='meta'){const {prepareMetaReview}=await import('./ui/meta-review.js');const screen=prepareMetaReview(run,params.get('stage')||'profile');if(screen)ui.open(screen);else document.body.dataset.screen='';}
else if(review==='defense'){const {prepareDefenseReview}=await import('./ui/defense-review.js');enemyReview=prepareDefenseReview(run);document.body.dataset.screen='';}
else if(review==='body-combat'){const {installBodyCombatReview}=await import('./body-combat-review.js');browserQA=installBodyCombatReview(run,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='body-walk'){const {installBodyWalkReview}=await import('./body-walk-review.js');browserQA=installBodyWalkReview(run,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='clearance'){const {installBodySizeReview}=await import('./body-size-review.js');browserQA=installBodySizeReview(run,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='enemies'){const {prepareEnemyReview}=await import('./enemy-review.js');enemyReview=prepareEnemyReview(run,params);document.body.dataset.screen='';}
else if(review==='isaac'){const {prepareIsaacReview}=await import('./isaac-review.js');isaacReview=prepareIsaacReview(run,params);if(isaacReview.name)ui.open(isaacReview.name,isaacReview.params);else document.body.dataset.screen='';}
else if(review&&['boss-reward','assembly','part','body-swap','level','map','catalog','end','pause','settings','missions','home'].includes(review)){const {prepareReview}=await import('./ui/review-fixtures.js');const routeParams=prepareReview(run,review);ui.open(review,routeParams);}else if(params.get('ui')==='components')ui.open('components');else ui.showHome();
if((import.meta.env.DEV||import.meta.env.MODE==='acceptance')&&params.get('review')==='playtest'){const {installBrowserQA}=await import('./qa-browser.js');browserQA=installBrowserQA({getRun:()=>run,start,ui,setInput:value=>Object.assign(movement,value),snapshot:()=>window.bioso.snapshot()});}
if(review&&params.has('capture')){const {installBiotechRecorder}=await import('./biotech-record.js');installBiotechRecorder($('world'),{onStart:()=>isaacReview?.startCapture?.()});}
updateHud();requestAnimationFrame(frame);
