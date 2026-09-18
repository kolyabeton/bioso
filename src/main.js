import './ui/damage-numbers.css';
import {meta} from './systems/meta-progression.js';
import {applyStartingLoadout} from './game.js';
import {createEventHud} from './ui/event-hud.js';
import './ui/events.css';
import {createWrongWayFeedback} from './systems/waypoint.js';
import './ui/game-ui.css';
import './ui/biotech.css';
import {effectiveReducedMotion} from './ui/motion.js';
import {holdForAssets} from './ui/loading-gate.js';
import {createCombatAudio} from './combat-audio.js';
import {createGameMusic} from './game-music.js';
import {createWorldRun,stepWorldRun as step,spawnWorldEnemy} from './world-run.js';
import {stats} from './assembly.js';
import {createProfileStorage} from './profile-storage.js';
import {createView} from './game-view.js';
import {movementFromDrag} from './simulation.js';
import {createHandsHud,createHud} from './ui/hud.js';
import {createScreens} from './ui/screens.js';
import {createSettings,readSettings} from './ui/settings.js';
import {renderCadence} from './render-cadence.js';
import {createLocalizer} from './i18n/index.js';
import './ui/ceramic-theme.css';
import './ui/selection.css';
import './ui/item-icons.css';
import {createStoryRadio,storyRadioShouldSuspend} from './ui/story-radio.js';
import './ui/story-radio.css';
import {createStoryAudio} from './story-audio.js';
import {createStoryDirector} from './story-director.js';
import {storyCue,storyCueRecordId} from './story-cues.js';
import {STORY_EVIDENCE,evidenceCue,thoughtCue} from './story-evidence.js';

const $=id=>document.getElementById(id),panel=$('panel'),previewHolder=$('preview-holder'),toast=$('toast'),notifications=$('notifications');
const params=new URLSearchParams(location.search),review=(import.meta.env.DEV||import.meta.env.MODE==='acceptance')?params.get('review'):null;
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Storage unavailable');}};}
if(review){const data=new Map();storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};}
const unlockedProfile=import.meta.env.MODE==='playtest'?await import('./unlocked-profile.js'):null;
if(unlockedProfile){storage=unlockedProfile.unlockedStorage(storage);try{if(!storage.getItem('biomecha.settings.v1'))storage.setItem('biomecha.settings.v1',JSON.stringify({language:'ru'}));}catch{}}
const localization=createLocalizer(document,readSettings(storage).language);
const profileStorage=createProfileStorage(storage,{notify});
if(unlockedProfile)unlockedProfile.unlockProfile(profileStorage.profile);
let profile=profileStorage.profile,run=createWorldRun(profile,'survival',review?20317:undefined),initialUnlocks=new Set(profile.unlocked);
// A prepared world behind the menu is not a started run.
const menuReviews=new Set(['home','missions','catalog','profile','achievements','journal','journal-entry','development','ability-detail','settings','credits','components']);
let gameplayActive=!!review&&!menuReviews.has(review)&&(review!=='meta'||['combat','assembly','soul','level','end','overrun','audit-reward','audit-quality','audit-organ'].includes(params.get('stage')));
let ui,view,last=performance.now(),toastUntil=0,overloadUntil=0,wasOverloaded=false,hudClock=0,frames=0,fpsClock=0,fps=0;
const subsystemSamples={simulation:[],render:[],ui:[]};
const collectPerformance=params.has('profile')||params.has('debug')||!!review;
function recordSubsystem(name,ms){if(!collectPerformance)return;const list=subsystemSamples[name];list.push(ms);if(list.length>180)list.shift();}
function subsystemSummary(){return Object.fromEntries(Object.entries(subsystemSamples).map(([name,list])=>{const sorted=[...list].sort((a,b)=>a-b);return[name,{mean:list.length?list.reduce((a,b)=>a+b,0)/list.length:0,p95:sorted[Math.floor(sorted.length*.95)]??0,max:sorted.at(-1)??0}];}));}
const movement={x:0,z:0},keys=new Set();let pointer=null;
function notify(text){(panel.open?panel:document.body).append(notifications);toast.textContent=text;localization.localize(toast);toast.classList.add('visible');toastUntil=performance.now()+3500;}
function save(){profileStorage.save();}
function stopInput(){keys.clear();movement.x=movement.z=0;pointer=null;$('joystick').hidden=true;}
try{view=createView($('world'),$('preview'),{painted:false});}catch(error){document.body.innerHTML='<div class="ui-frame ui-error"><h1>Не удалось открыть сады</h1><p>Для игры нужен WebGL 2. Перезагрузите страницу в браузере с поддержкой WebGL.</p></div>';throw error;}
const systemMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const backgroundMusic=createGameMusic(import.meta.env.BASE_URL);
backgroundMusic.setActive(!document.hidden);
let combatAudio,storyAudio,storyRadio,journalAudioActive=false;
const settings=createSettings(storage,{notify,feedback:cue=>combatAudio?.ui(cue),apply:value=>{localization.setLanguage(value.language);backgroundMusic.setVolume(value.soundEnabled?value.music:0);combatAudio?.syncVolume();storyAudio?.syncLanguage();storyAudio?.syncVolume();if(!value.storyEnabled){storyRadio?.clear();storyAudio?.stop();journalAudioActive=false;}const reduced=effectiveReducedMotion(value.reducedMotion,systemMotion.matches);view.setQuality?.(value.quality);view.setReducedMotion(reduced);document.body.dataset.reducedMotion=String(reduced);if(reduced)document.getAnimations().forEach(a=>a.cancel());}});settings.apply();
const wrongWayFeedback=createWrongWayFeedback(duration=>settings.haptic(duration));
window.addEventListener('pointerdown',backgroundMusic.unlock);
window.addEventListener('keydown',backgroundMusic.unlock);
window.addEventListener('input',backgroundMusic.unlock);
window.addEventListener('click',backgroundMusic.unlock);
window.addEventListener('blur',()=>backgroundMusic.setActive(false));
window.addEventListener('focus',()=>backgroundMusic.setActive(!document.hidden));
document.addEventListener('visibilitychange',()=>backgroundMusic.setActive(!document.hidden&&document.hasFocus()));
systemMotion.addEventListener('change',()=>settings.apply());
combatAudio=createCombatAudio(()=>settings.get().soundEnabled?settings.get().effects:0,{shotUrl:`${import.meta.env.BASE_URL}assets/audio/approved-pistol.mp3`});window.addEventListener('pointerdown',combatAudio.unlock);window.addEventListener('keydown',combatAudio.unlock);
storyAudio=createStoryAudio(import.meta.env.BASE_URL,settings.get,{setDucked:value=>backgroundMusic.setDucked(value),onEnded:cue=>{journalAudioActive=false;storyRadio?.audioEnded(cue.id);}});window.addEventListener('pointerdown',storyAudio.unlock);window.addEventListener('keydown',storyAudio.unlock);
const renderHands=createHandsHud($('hands'),()=>ui.open('assembly'));
const renderHud=createHud($('game'));
const eventHud=createEventHud($('encounter-button'));
storyRadio=createStoryRadio($('game'),{localize:localization.localize,play:cue=>{journalAudioActive=false;return settings.get().storyEnabled&&storyAudio.play(cue);},stop:()=>storyAudio.stop(),pause:()=>storyAudio.pause(),resumeAudio:()=>storyAudio.resume()});
const storyDirector=createStoryDirector(storyRadio,{enabled:!review,onRecord:cue=>{const records=meta(profile).storyCues,id=storyCueRecordId(cue);if(!records.includes(id)){records.push(id);save();}}});
function updateHud(){renderHud(run);renderHands(run);eventHud.update(run);}
function start(mode,seed,loadout){gameplayActive=true;wasOverloaded=false;overloadUntil=0;storyRadio.clear();$('game').inert=false;run=createWorldRun(profile,mode,seed);storyDirector.reset(run);if(mode==='survival'){applyStartingLoadout(run,loadout);meta(profile).runs++;save();}initialUnlocks=new Set(profile.unlocked);view.reset();wrongWayFeedback.reset();stopInput();$('world').focus();updateHud();toast.classList.remove('visible');toastUntil=0;}
ui=createScreens({dialog:panel,content:$('panel-content'),previewHolder,getRun:()=>run,getProfile:()=>profile,startRun:(...args)=>{start(...args);holdForAssets();},canResume:()=>gameplayActive,resume:()=>{stopInput();updateHud();},stopInput,notify,updateHud,settings,localize:localization.localize,getSaveStatus:()=>profileStorage.saved,saveProfile:save,getNewUnlocks:()=>profile.unlocked.filter(key=>!initialUnlocks.has(key)),playStoryCue:cue=>{journalAudioActive=settings.get().storyEnabled&&storyAudio.play(cue);return journalAudioActive;},onRoute:name=>{if(name==='home')gameplayActive=false;document.body.dataset.screen=name;backgroundMusic.updateRun(run);backgroundMusic.setScreen(name);if(storyRadioShouldSuspend(name))storyRadio.suspend();else if(!name)storyRadio.resume();if(!['journal','journal-entry'].includes(name)&&journalAudioActive){storyAudio.stop();journalAudioActive=false;}}});
$('encounter-button').onclick=()=>{const n=eventHud.target();if(n)ui.open('encounter-detail',{id:n.id});};
$('pause-button').onclick=()=>ui.open('pause');$('assembly-button').onclick=()=>ui.open('assembly');$('soul-button').onclick=()=>ui.open('soul');$('map-button').onclick=()=>ui.open('map');
$('world').addEventListener('pointerdown',event=>{if(panel.open)return;pointer={id:event.pointerId,x:event.clientX,y:event.clientY};$('world').setPointerCapture(event.pointerId);const rect=$('game').getBoundingClientRect();Object.assign($('joystick').style,{left:(event.clientX-rect.left)+'px',top:(event.clientY-rect.top)+'px'});$('joystick').hidden=false;});
$('world').addEventListener('pointermove',event=>{if(pointer?.id===event.pointerId)Object.assign(movement,movementFromDrag(event.clientX-pointer.x,event.clientY-pointer.y));});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,stopInput);
window.addEventListener('keydown',event=>{if(panel.open||run.dead)return;if(event.code==='KeyI'){ui.open('assembly');return;}if(event.code==='KeyU'){ui.open('soul');return;}if(event.code==='KeyM'){ui.open('map');return;}if(event.code==='Escape'){event.preventDefault();ui.open('pause');return;}if(/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(event.code)){event.preventDefault();keys.add(event.code);}});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>{stopInput();if(!panel.open&&!run.dead)ui.open('pause');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){combatAudio.updateAmbient({active:false});stopInput();if(!panel.open&&!run.dead)ui.open('pause');}});
$('world').addEventListener('webglcontextlost',event=>{event.preventDefault();if(!panel.open)ui.open('pause');notify('Графика потеряла контекст. Перезагрузите страницу.');});
let browserQA,isaacReview,enemyReview;
const loading=document.createElement('button');loading.className='ui-button';loading.style.cssText='position:absolute;left:12px;right:12px;bottom:130px;z-index:12';loading.hidden=true;loading.onclick=()=>view.retryAssets?.();$('game').append(loading);
const diagnostic=params.has('debug');$('diagnostics').hidden=!diagnostic;
function frame(now){requestAnimationFrame(frame);const cadence=renderCadence({hidden:document.hidden,menu:panel.open,preview:ui.previewVisible,fps:settings.get().fps});if(!cadence){last=now;return;}const elapsed=(now-last)/1000;if(elapsed<1/cadence-.001)return;last=now;const dt=Math.min(.05,elapsed),frameStarted=performance.now();
  browserQA?.tick();isaacReview?.tick?.();enemyReview?.tick?.();
  if(gameplayActive&&!panel.open&&!enemyReview?.paused&&!isaacReview?.paused&&(!run.world.tiles||run.streaming?.ready?.has(run.world.tileAt(run.player.x,run.player.z)?.id))){const input=keys.size?{x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))}:movement,simulationAt=performance.now();step(run,dt,input);wrongWayFeedback.update(run,input,dt);recordSubsystem('simulation',performance.now()-simulationAt);
    for(const event of run.events){view.event(event);renderHands.event(event,run);combatAudio.event(event);if(event.type==='lore-found'){if(settings.get().storyEnabled)storyDirector.discover(event.evidence);}else if(event.type==='profile-progress'){save();}else if(event.type==='unlock'){save();notify(event.text);}else if((event.type==='notice'&&event.category!=='landmark')||event.type==='group-cleared')notify(event.text);else if(event.type==='player-hit')settings.haptic();}run.events.length=0;
    if(run.dead){
      if(view.deathPending(run)){if(!$('game').inert){stopInput();notify('Существо погибло');$('game').inert=true;}}
      else{$('game').inert=false;ui.open('end');}
    }else if(run.bossRewards?.length)ui.open('boss-reward');else if(run.won&&!run.continued)ui.open('end');else if(run.pending)ui.open('level');
  }
  if(settings.get().storyEnabled&&!panel.open&&!run.dead)storyDirector.tick(run);
  backgroundMusic.updateRun(run);
  loading.hidden=!run.streaming?.errors?.length;loading.textContent='Не удалось загрузить участок · повторить';
  const paused=panel.open||enemyReview?.paused||isaacReview?.paused||run.dead&&(document.hidden||!document.hasFocus());
  const renderAt=performance.now();view.render(run,dt,ui.previewVisible,paused,cadence);recordSubsystem('render',performance.now()-renderAt);enemyReview?.afterRender?.();
  const ambient=view.ambientInfo();combatAudio.updateAmbient({active:gameplayActive,paused,combat:ambient.ambientCombat,strength:ambient.windStrength,weatherBlend:ambient.weatherBlend,weatherEnvironment:ambient.weatherEnvironment,world:run.world,player:run.player,mission:run.mission});
  const uiAt=performance.now();hudClock+=dt;if(hudClock>.1){updateHud();hudClock=0;}if(now>toastUntil)toast.classList.remove('visible');recordSubsystem('ui',performance.now()-uiAt);
  frames++;fpsClock+=elapsed;if(fpsClock>=1){fps=Math.round(frames/fpsClock);frames=fpsClock=0;if(diagnostic){const info=view.info(),rect=$('world').getBoundingClientRect(),pick=view.debugPick(rect.left+rect.width/2,44).map(hit=>`${hit.names.join('>')}@${hit.point.map(n=>n.toFixed(1)).join(',')}#${hit.map.split('/').at(-1)}`).join(' | '),near=(run.encounters?.nodes||[]).filter(n=>Math.hypot(n.x,n.z)<12).map(n=>`${n.type}:${n.state}@${n.x.toFixed(1)},${n.z.toFixed(1)}r${n.radius}`).join('|');$('diagnostics').textContent=`${fps} FPS · ${info.drawCalls} draws · ${info.loadedModels} GLB/${info.failedModels.length} errors · ${info.assetEnemies} mesh enemies\n${run.enemies.length} enemies · ${run.ground.length} parts\n${run.player.x.toFixed(1)}, ${run.player.z.toFixed(1)}\n${pick}\n${near}\n${view.debugBiomeChildren().join('|')}`;}}
  enemyReview?.afterFrame?.({cpuMs:performance.now()-frameStarted,intervalMs:elapsed*1000});
}
window.bioso={snapshot:()=>({mode:run.mode,time:run.time,level:run.level,hp:run.hp,kills:run.kills,biomass:run.biomass,consumableDrops:(run.consumableDrops??[]).map(q=>({id:q.id,kind:q.kind,x:q.x,y:q.y,z:q.z})),consumables:run.consumables,revivalCharges:run.consumables?.revivalCharges||0,firstPaidUpgrade:!!run.firstPaidUpgrade,organs:run.organs.map(p=>p?.key),lastHit:run.health.lastCause,deathCause:run.deathCause,stats:stats(run),player:{...run.player},mission:run.mission?{currentRoom:run.mission.currentFloor+1,event:run.mission.event?{...run.mission.event}:null,eventsClaimed:run.mission.eventHistory?.length||0}:null,dungeon:run.encounters?.active?.dungeon?{id:run.encounters.active.id,type:run.encounters.active.type,remaining:run.encounters.active.members.filter(id=>run.enemies.some(e=>e.id===id&&e.hp>0)).length,cleared:!!run.encounters.active.cleared}:null,companions:(run.abilities.companions||[]).map(c=>({id:c.id,source:c.sourceKey,target:c.target,phase:c.phase,interceptor:true})),nextCompanionSummons:{...(run.abilities.companionSummonReadyAt||{})},swarmInterceptions:run.abilities.swarmInterceptions||0,damage:{...(run.metrics.damage||{})},paused:panel.open,screen:ui.screen,storyRadio:{visible:storyRadio.visible,cue:storyRadio.cue,queued:storyRadio.queued,voiced:storyAudio.playing,seen:storyDirector.seen},storyEvidence:(run.storyEvidence??[]).map(item=>item.id),dead:run.dead,won:run.won,body:run.body.key,arms:run.arms.map(p=>p?.key),legs:run.legs.map(p=>p?.key),inventory:run.inventory.length,ground:run.ground.length,xpDrops:run.xpDrops.length,shots:run.shots.length,puddles:run.puddles.length,hostileShots:run.hostileShots.length,events:run.events.length,unlocked:[...profile.unlocked],learned:[...run.abilities.learned],abilityLevels:{...run.abilities.levels},pending:run.pending,choices:run.choices.map(c=>c.id),settings:settings.get(),enemies:run.enemies.length,fps,subsystemMs:subsystemSummary(),stepSubsystemMs:run.performanceTimings,...view.info()}),storyRadio,story:storyDirector,pick:(x,y)=>view.debugPick(x,y)};
function stageStoryReview(mission,room=1){
 start(mission,20260912);run.health.invulnerableUntil=Infinity;if(!run.mission)return;
 const index=Math.max(0,Math.min(run.mission.floors-1,Number(room)-1)),floor=run.mission.floorsState[index];run.mission.currentFloor=index;
 for(const state of run.mission.floorsState){state.entered=state.index<index;state.state=state.index<index?'cleared':state.index===index?'ready':'locked';run.exploration.groups[state.index].state=state.state;}
 run.player={...run.player,x:0,y:0,z:floor.z+20};step(run,0,{x:0,z:0});run.events.length=0;updateHud();
}
if(review&&['ru','en'].includes(params.get('lang')))settings.update('language',params.get('lang'));
if(review&&['low','medium','high'].includes(params.get('quality')))settings.update('quality',params.get('quality'));
if(review&&params.get('sound')==='0')settings.update('soundEnabled',false);
else if(review&&params.get('sound')==='1'){settings.update('soundEnabled',true);settings.update('effects',65);}
if(review==='story-evidence'){const evidence=STORY_EVIDENCE.find(item=>item.id===(params.get('id')||'core-charred-nest'))||STORY_EVIDENCE[0],cue=params.get('thought')==='1'?thoughtCue(evidence):evidenceCue(evidence);stageStoryReview(evidence.mission,params.get('room')||evidence.room);toast.style.display='none';storyRadio.show(cue||evidenceCue(evidence),{duration:0});document.body.dataset.screen='';}
else if(review==='story-radio'){
 const cue=params.get('cue')||'garden-01-child',entry=storyCue(cue),room=entry?.trigger==='mission-mid'?12:entry?.trigger?.startsWith('mission-boss')?999:1;
 if(entry?.mission)stageStoryReview(entry.mission,params.get('room')||room);
 toast.style.display='none';storyDirector.play(cue,{duration:0,playAudio:params.get('sound')==='1'});if(params.get('sound')==='1')$('world').addEventListener('pointerdown',()=>{if(storyRadio.visible&&storyRadio.cue===cue&&!storyAudio.playing)storyAudio.play(entry);},{once:true});document.body.dataset.screen='';
}
else if(review==='dungeons'){const {prepareDungeonReview}=await import('./dungeon-review.js');enemyReview=prepareDungeonReview(params,{getRun:()=>run,start,stopInput,ui});document.body.dataset.screen='';}
else if(review==='race'){const {prepareRaceReview}=await import('./ui/race-review.js');enemyReview=prepareRaceReview(run,params,value=>Object.assign(movement,value));ui.open('encounter-detail',{id:enemyReview.nodeId});}
else if(review==='survival-waves'){const {prepareSurvivalWaveReview}=await import('./survival-wave-review.js');enemyReview=prepareSurvivalWaveReview(run,params);document.body.dataset.screen='';}
else if(review==='survival-pressure'){const {prepareSurvivalPressureReview}=await import('./survival-pressure-review.js');enemyReview=prepareSurvivalPressureReview(params,{getRun:()=>run,start});document.body.dataset.screen='';}
else if(review==='survival-boss'){const {prepareSurvivalBossReview}=await import('./ui/survival-boss-review.js');enemyReview=prepareSurvivalBossReview(run,params);document.body.dataset.screen='';}
else if(review==='mission-environment'){if(params.get('lang')==='ru')settings.update('language','ru');start(params.get('mission')||'garden',20260908);const {prepareMissionEnvironmentReview}=await import('./mission-environment-review.js');enemyReview=prepareMissionEnvironmentReview(run,params,ui,{render:()=>view.render(run,0,false,true,settings.get().fps),snapshot:()=>window.bioso.snapshot()});if(!ui.screen)document.body.dataset.screen='';}
else if(review==='mission-boss'){start(params.get('mission')||'garden',20260908);const {prepareBossRuntimeReview}=await import('./boss-runtime-review.js');enemyReview=prepareBossRuntimeReview(run,params);document.body.dataset.screen='';}
else if(review==='stress'){const {installStressReview}=await import('./stress-review.js');enemyReview=installStressReview(run,value=>Object.assign(movement,value),()=>window.bioso.snapshot());document.body.dataset.screen='';}
else if(review==='ability-vfx'){const {prepareAbilityVfxReview}=await import('./ability-vfx-review.js');enemyReview=prepareAbilityVfxReview(run,params,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='summoner-combat'){const {prepareSummonerReview}=await import('./summoner-review.js');enemyReview=prepareSummonerReview(run,params);document.body.dataset.screen='';}
else if(review==='event-collision'){start('survival',20260913);const {prepareEventCollisionReview}=await import('./event-collision-review.js');enemyReview=prepareEventCollisionReview(run,value=>Object.assign(movement,value),(...args)=>spawnWorldEnemy(run,...args));document.body.dataset.screen='';}
else if(review==='organs'){const {prepareOrganModelReview}=await import('./organ-model-review.js');enemyReview=prepareOrganModelReview(run,params,ui,value=>Object.assign(movement,value));if(!ui.screen)document.body.dataset.screen='';}
else if(review==='secret-glb'){start('survival',20260912);const {prepareSecretGlbReview}=await import('./secret-glb-review.js');enemyReview=prepareSecretGlbReview(run);document.body.dataset.screen='';}
else if(review==='recovery'){const {prepareRecoveryReview}=await import('./ui/recovery-review.js');enemyReview=prepareRecoveryReview(run);document.body.dataset.screen='';}
else if(review==='consumables'){const {prepareConsumableReview}=await import('./ui/consumable-review.js');enemyReview=prepareConsumableReview(run,event=>{view.event(event);if(event.type==='notice')notify(event.text);});document.body.dataset.screen='';}
else if(review==='forest-living'){const {prepareForestLivingReview}=await import('./forest-living-review.js');enemyReview=prepareForestLivingReview(run,params,{snapshot:()=>window.bioso.snapshot(),render:()=>view.render(run,0,false,true,settings.get().fps),setInput:value=>Object.assign(movement,value),resetView:()=>view.reset(),settings});document.body.dataset.screen='';}
else if(review==='forest-border'){const {prepareForestBorderReview}=await import('./forest-border-review.js');enemyReview=prepareForestBorderReview(run,params);document.body.dataset.screen='';}
else if(review==='landscape-camera'){const {prepareLandscapeCameraReview}=await import('./landscape-camera-review.js');enemyReview=prepareLandscapeCameraReview(run,params);document.body.dataset.screen='';}
else if(review==='world-label'){const {prepareWorldLabelReview}=await import('./ui/world-label-review.js');enemyReview=prepareWorldLabelReview(run,params);document.body.dataset.screen='';}
else if(review==='damage'){const {prepareDamageReview}=await import('./ui/damage-review.js');enemyReview=prepareDamageReview(run,event=>view.event(event));document.body.dataset.screen='';}
else if(review==='projectile-fade'){const {prepareProjectileFadeReview}=await import('./projectile-fade-review.js');enemyReview=prepareProjectileFadeReview(run,params);document.body.dataset.screen='';}
else if(review==='hit-vfx'){const {prepareHitVfxReview}=await import('./hit-vfx-review.js');enemyReview=prepareHitVfxReview(run,event=>view.event(event));document.body.dataset.screen='';}
else if(review==='dodge-vfx'){const {prepareDodgeVfxReview}=await import('./dodge-vfx-review.js');enemyReview=prepareDodgeVfxReview(run,event=>view.event(event));document.body.dataset.screen='';}
else if(review==='spring-vfx'){start('survival',20317);const {prepareSpringLeapReview}=await import('./spring-leap-review.js');enemyReview=prepareSpringLeapReview(run);document.body.dataset.screen='';}
else if(review==='death'){const {prepareDeathReview}=await import('./ui/death-review.js');enemyReview=prepareDeathReview(run);document.body.dataset.screen='';}
else if(review==='achievements'){const {prepareAchievementsReview}=await import('./ui/achievements-review.js');const route=prepareAchievementsReview(run,params);if(params.get('lang')==='ru')settings.update('language','ru');ui.open(route.name,route.params||{});}
else if(review==='meta'){const {prepareMetaReview}=await import('./ui/meta-review.js');const screen=prepareMetaReview(run,params.get('stage')||'profile');if(screen)ui.open(screen);else document.body.dataset.screen='';}
else if(review==='defense'){const {prepareDefenseReview}=await import('./ui/defense-review.js');enemyReview=prepareDefenseReview(run);document.body.dataset.screen='';}
else if(review==='max-health'){const {prepareMaxHealthReview}=await import('./ui/max-health-review.js');enemyReview=prepareMaxHealthReview(run);document.body.dataset.screen='';}
else if(review==='regeneration'){const {prepareRegenerationReview}=await import('./ui/regeneration-review.js');enemyReview=prepareRegenerationReview(run,params);document.body.dataset.screen='';}
else if(review==='body-combat'){const {installBodyCombatReview}=await import('./body-combat-review.js');browserQA=installBodyCombatReview(run,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='body-walk'){const {installBodyWalkReview}=await import('./body-walk-review.js');browserQA=installBodyWalkReview(run,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='clearance'){const {installBodySizeReview}=await import('./body-size-review.js');browserQA=installBodySizeReview(run,value=>Object.assign(movement,value));document.body.dataset.screen='';}
else if(review==='enemies'){const {prepareEnemyReview}=await import('./enemy-review.js');enemyReview=prepareEnemyReview(run,params);document.body.dataset.screen='';}
else if(review==='isaac'){const {prepareIsaacReview}=await import('./isaac-review.js');isaacReview=prepareIsaacReview(run,params);if(isaacReview.name)ui.open(isaacReview.name,isaacReview.params);else document.body.dataset.screen='';}
else if(review&&['boss-reward','assembly','part','body-swap','level','map','catalog','end','pause','settings','missions','home','soul','ability-detail','development','journal','journal-entry'].includes(review)){const {prepareReview}=await import('./ui/review-fixtures.js');const routeParams=prepareReview(run,review);ui.open(review,routeParams);}else if(params.get('ui')==='components')ui.open('components');else ui.showHome();
if((import.meta.env.DEV||import.meta.env.MODE==='acceptance')&&params.get('review')==='playtest'){const {installBrowserQA}=await import('./qa-browser.js');browserQA=installBrowserQA({getRun:()=>run,start,ui,setInput:value=>Object.assign(movement,value),snapshot:()=>window.bioso.snapshot()});}
if(review&&params.has('capture')){const {installBiotechRecorder}=await import('./biotech-record.js');installBiotechRecorder($('world'),{onStart:()=>{isaacReview?.startCapture?.();enemyReview?.startCapture?.();}});}
if(unlockedProfile)profileStorage.save();
updateHud();requestAnimationFrame(now=>{frame(now);window.__biosoBoot?.finish();window.__biosoBoot?.hide();});
