import {createProjectileAfterglow,enableProjectileFade,projectileOpacity,setProjectileOpacity} from './projectile-fade.js';
import {createOrganicProjectileView,isOrganicProjectile} from './organic-projectile-view.js';
import {frameWork} from './frame-work.js';
import {createGpuFrameTimer} from './gpu-frame-timer.js';
import {createBossMechanicsView} from './boss-mechanics-view.js';
import {createRecoveryDropsView} from './recovery-drops-view.js';
import {createConsumableDropsView} from './consumable-drops-view.js';
import {createDeathView} from './death-view.js';
import {createEnemyDeathView} from './enemy-death-view.js';
import {alignMeleeTrail,createMeleeTrail,disposeMeleeTrail,updateMeleeTrail} from './melee-trail.js';
import {updateDrillExtension} from './drill-extension.js';
import {alignWhipVfx} from './whip-vfx.js';
import {clampArmYaw} from './body-facing.js';
import {fitPreview} from './preview-fit.js';
import {createDamageNumbersView} from './damage-numbers-view.js';
import {createCreatureFrame,createLimbBearing} from './creature-frame.js';
import {equipmentLayout} from './equipment-mounts.js';
import {createEventMarkers} from './ui/event-markers.js';
import {bodySize} from './body-size.js';
import {createEnemyHealthView} from './enemy-health-view.js';
import {createGroundItemsView} from './ground-items-view.js';
import {createNavigationGuideView} from './navigation-guide-view.js';
import {createAcidPuddleView} from './acid-puddle-view.js';
import {projectedOnScreen} from './render-culling.js';
import {screenBearing} from './systems/waypoint.js';
import {createSoulFxView} from './systems/soul-fx-view.js';
import {createHarpoonView} from './harpoon-view.js';
import {projectileStyle} from './weapon-visuals.js';
import {createRocketBeeView,RICOCHET_BEE_SCALE} from './rocket-bee-view.js';
import {createRocketExhaustView} from './rocket-exhaust-view.js';
import {createRocketExplosionView} from './rocket-explosion-view.js';
import {createEnemyAssemblyView} from './enemy-assembly-view.js';
import {createBossModelView} from './boss-model-view.js';
import {createEnemyWarningView} from './enemy-warning-view.js';
import {createBioFxView} from './bio-fx-view.js';
import {createShotgunFxView} from './shotgun-fx.js';
import {createIsaacView} from './isaac-view.js';
import {mutationView,combatTime,activeMutation} from './systems/mutations.js';
import {createBiomeView} from './biome-view.js';
import {createEnvironmentWeatherView} from './environment-weather-view.js';
import {createHeroContactShadow} from './hero-contact-shadow.js';
import {createEnemyContactShadows} from './enemy-contact-shadow.js';
import {ENVIRONMENT_SUN} from './environment-static-light.js';
import {createForestAmbientView} from './forest-ambient-view.js';
import {createAmbientGovernor} from './forest-ambient-state.js';
import {dressHiveDetails,dressCreature,retireModel,createAssetEnemies,modelInfo,decorateObstacle} from './asset-models.js';
import * as T from 'three';
import {createWorldView} from './world-view.js';
import {geo,materials,piece,link} from './kit.js';
import {def} from './assembly.js';
import {seededRandom} from './simulation.js';
import {PLATE_VIEW_HEIGHT,buildPainterlyWorld} from './painterly-world.js';
import {STAGE_SCALE} from './painterly-stage.js';
import {weaponPose,impactShape} from './combat-visual.js';
import {createEffectsView} from './systems/effects-view.js';
import {createLivingView} from './living-view.js';
import {createMeleeAnimation,isMelee} from './melee-animation.js';
import {HERO_HIT_SHAKE,heroHitShakeOffset} from './camera-shake.js';
import {createMissionBossCamera,GAMEPLAY_CAMERA,cameraPitchDegrees} from './mission-boss-camera.js';
import {createMissionEnvironmentView} from './mission-environment-view.js';
import {createDodgeAfterimageView} from './dodge-afterimage-view.js';
import {createSpringLeapView} from './spring-leap-view.js';
import {createDungeonView} from './dungeon-view.js';


export function creatureModel(s,modelOptions){
 const root=new T.Group(),d=def(s.body),layout=equipmentLayout(s,{authoredChassis:true}),wide=layout.wide;
 piece(root,'chassis','shell','dark',[0,.8,0],[.65*wide,.4,.8]);
 piece(root,'body-'+s.body.key,d.legs===4?'shell':'box','ceramic',[0,1.05,0],[1.12*wide,.55,1.5]);
 piece(root,'soul','shell','cyan',[0,1.42,0],[.24,.19,.24]);
 piece(root,'soul-ring','ring','amber',[0,1.4,0],[.29,.29,.29],[Math.PI/2,0,0]);
 root.userData.legs=[];root.userData.arms=new Map();
 s.legs.forEach((p,i)=>{if(!p)return;const {side,position}=layout.legs[i],g=new T.Group();g.name='leg-'+p.id;g.userData.slot=i;g.userData.partId=p.id;g.position.set(...position);root.add(g);
  createLimbBearing(g,.15);
  const thickness=p.key==='plated'?.16:p.key==='runner'?.07:.11;
  if(p.key==='root'){
   link(g,'root-trunk',[0,0,0],[side*.55,-.4,0],.13,'deepGreen');
   for(const z of [-.25,0,.25])link(g,'root-toe',[side*.55,-.4,0],[side*.8,-.6,z],.07,'dark');
  }else{link(g,'thigh',[0,0,0],[side*.6,-.1,.1],thickness,'ceramic');link(g,'shin',[side*.6,-.1,.1],[side*.8,-.55,-.1],thickness,'dark');piece(g,'foot','shell','amber',[side*.8,-.57,-.13],[.18,.08,.25]);}root.userData.legs.push(g);
 });
 // Limbs keep their gameplay pivots; the chassis sleeves bridge to those pivots.
 s.arms.forEach((p,i)=>{const {side,position}=layout.arms[i];
  if(!p)return;
  const g=new T.Group();g.name='arm-'+p.id;g.position.set(...position);g.userData.slot=i;g.userData.partId=p.id;g.userData.rest=g.position.clone();g.userData.side=side;root.add(g);root.userData.arms.set(p.id,g);
  createLimbBearing(g,.17);
  if(isMelee(p.key)){const trail=createMeleeTrail(p.key);g.add(trail);g.userData.meleeTrail=trail;}
  link(g,'support',[0,0,0],[0,0,.55],.13,'dark');piece(g,'cuff','shell','ceramic',[0,0,.48],[.25,.2,.35]);
  if(['claws','fangs'].includes(p.key)){for(const a of [-1,1])link(g,'claw',[a*.2,0,.5],[a*.13,-.08,1.15],.07,p.key==='fangs'?'cyan':'amber');}
  else if(p.key==='hammer')piece(g,'shield-bash','shell','ceramic',[0,0,.85],[.65,.5,.18]);
  else if(p.key==='drill')piece(g,'drill','cone','amber',[0,0,1],[.24,.9,.24],[Math.PI/2,0,0]);
  else if(p.key==='whip'){for(let a=0;a<4;a++)link(g,'whip',[a*.08,0,.5+a*.28],[(a+1)*.08,0,.78+a*.28],.06,'green');}
  else if(p.key==='rocket'){piece(g,'hive','box','ceramic',[0,0,.8],[.65,.5,.65]);for(const x of [-.2,0,.2])piece(g,'rocket','shell','green',[x,0,1.18],[.075,.12,.2]);}
  else if(p.key==='arc'){for(const x of [-.18,.18])link(g,'fork',[x,0,.5],[x,0,1.15],.06,'cyan');piece(g,'coil','ring','amber',[0,0,.7],[.25,.25,.25]);}
  else if(p.key==='acid'){piece(g,'gland','shell','green',[0,0,.8],[.32,.28,.5]);piece(g,'mouth','ring','amber',[0,0,1.22],[.14,.14,.14]);}
  else if(p.key==='pistol'){piece(g,'pistol-chamber','shell','ceramic',[0,0,.62],[.26,.2,.34]);piece(g,'pistol-barrel','cylinder','dark',[0,0,.78],[.13,.46,.13],[Math.PI/2,0,0]);piece(g,'pistol-muzzle','ring','amber',[0,0,1.02],[.14,.14,.14]);}
  else{piece(g,'barrel','cylinder','dark',[0,0,.87],[p.key==='needle'?.08:.14,p.key==='needle'?1.2:.7,.14],[Math.PI/2,0,0]);piece(g,'muzzle','joint','cyan',[0,0,p.key==='needle'?1.45:1.2],[.1,.1,.1]);}
 });
 createCreatureFrame(root,s);
 root.userData.modelsReady=dressCreature(root,s,modelOptions);
 const active=mutationView(s).filter(f=>f.active).map(f=>f.id);
 const mutationRoot=new T.Group();mutationRoot.name='mutation-features';root.add(mutationRoot);
 if(active.includes('hive'))root.userData.modelsReady=Promise.all([root.userData.modelsReady,dressHiveDetails(mutationRoot,modelOptions)]);
 if(active.includes('conductor'))for(let i=0;i<s.arms.length;i++){const side=i%2?-1:1;link(mutationRoot,'conductor-vein',[0,1.55,0],[side*.7,1.2,(Math.floor(i/2)-.5)*.6],.045,'cyan');}
 if(active.includes('mire')){piece(mutationRoot,'mire-trail','disk','green',[0,.04,-.5],[.9,.02,1.4]);for(const x of [-.45,.45])link(mutationRoot,'wet-seam',[x,1.4,-.5],[x,1.4,.5],.045,'green');}
 return root;
}
export function createView(canvas,preview,{painted=true}={}){
 let currentCadence=60;
 const renderer=new T.WebGLRenderer({canvas,alpha:painted,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=false;
 const gpuTiming=createGpuFrameTimer(renderer);
 const damageNumbers=createDamageNumbersView(canvas);const eventMarkers=createEventMarkers(canvas.parentElement);const scene=new T.Scene();if(painted)renderer.setClearColor(0,0);else{scene.background=new T.Color('#c6cfb1');scene.fog=new T.Fog('#c6cfb1',65,120);}
 const deathView=createDeathView(scene),enemyDeathView=createEnemyDeathView(scene,{scale:painted?2:1});
 const missionEnvironment=createMissionEnvironmentView(scene);
 const dungeonView=createDungeonView(scene);
 const heroContact=createHeroContactShadow(scene);
 const enemyContacts=createEnemyContactShadows(scene);
 const camera=new T.OrthographicCamera(-25,25,25,-25,.1,600),missionBossCamera=createMissionBossCamera();let bossCameraPose=null;const sky=new T.HemisphereLight('#fff4d2','#344330',1.5);scene.add(sky);const sun=new T.DirectionalLight('#ffdfad',2.5);sun.position.set(-45,90,45);scene.add(sun);
 if(painted){const stage=new T.Group();stage.scale.setScalar(STAGE_SCALE);buildPainterlyWorld(stage);scene.add(stage);}sun.castShadow=false;scene.add(sun.target);
 const groundMat=new T.MeshStandardMaterial({color:'#a8b388',roughness:1}),pathMat=new T.MeshStandardMaterial({color:'#d3ccb0',roughness:1});
 const land=new T.Mesh(new T.PlaneGeometry(2048,2048),groundMat);land.rotation.x=-Math.PI/2;land.position.y=-.06;if(!painted)scene.add(land);
 const weatherView=createEnvironmentWeatherView(scene,sun,sky);
 const worldView=painted?null:createWorldView(scene),forestAmbient=createForestAmbientView(scene),ambientGovernor=createAmbientGovernor();const biomeView=createBiomeView(scene,forestAmbient.uniforms,renderer);let biomeActive=false,quality='medium',reducedMotion=false,hitImpulse=0,hitShakeRemaining=0,previewImpulse=0,previousVitals=null;
 const recoveryDrops=createRecoveryDropsView(scene,renderer);
 const consumableDrops=createConsumableDropsView(scene);
 const groundItems=createGroundItemsView(scene),navigationGuide=createNavigationGuideView(scene),enemyHealth=createEnemyHealthView(scene),acidPuddles=createAcidPuddleView(scene);
 const chunks=new Map(),root=new T.Group();scene.add(root);let hero=null,signature='',previewSignature='',visibleEnemyCount=0;
 const dummy=new T.Object3D(),color=new T.Color(),hitColor=new T.Color('#fff4cd'),projected=new T.Vector3();
 function instance(geometry,material,capacity){const m=new T.InstancedMesh(geometry,material,capacity);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
 const enemyBodies=instance(geo.shell,materials.amber,1200),enemyHeads=instance(geo.cone,materials.dark,1200),drops=instance(geo.joint,materials.cyan,2000),projectiles=enableProjectileFade(instance(geo.shell.clone(),new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),1000));
 const trails=enableProjectileFade(instance(geo.shell.clone(),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.6,depthWrite:false,toneMapped:false}),1000),{trail:true});
 const organicProjectiles=createOrganicProjectileView(scene);
 const markers=new T.Group();scene.add(markers);let markerSig='';const shotAfterglow=createProjectileAfterglow();const bioFx=createBioFxView(scene),shotgunFx=createShotgunFxView(scene),muzzlePoint=new T.Vector3();const soulFx=createSoulFxView(scene),dodgeAfterimage=createDodgeAfterimageView(scene),springLeap=createSpringLeapView(scene),abilityEffects=createEffectsView(scene),livingView=createLivingView(scene,canvas),isaacView=createIsaacView(scene),harpoons=createHarpoonView(scene),rocketBees=createRocketBeeView(scene),ricochetBees=createRocketBeeView(scene,96,{scale:RICOCHET_BEE_SCALE,formation:false}),rocketExhaust=createRocketExhaustView(scene),rocketExplosion=createRocketExplosionView(scene),assetEnemies=createAssetEnemies(scene),modularEnemies=createEnemyAssemblyView(scene,{renderer,camera}),bossModels=createBossModelView(scene,{renderer}),bossMechanics=createBossMechanicsView(scene),enemyWarnings=createEnemyWarningView(scene);let renderTime=0;const meleeAnimation=createMeleeAnimation();
 const pr=new T.WebGLRenderer({canvas:preview,alpha:true,antialias:true});pr.setPixelRatio(Math.min(devicePixelRatio,1.5));pr.setClearColor(0,0);const ps=new T.Scene(),pc=new T.PerspectiveCamera(35,1,.1,100);pc.zoom=1.9;pc.position.set(4,4.5,5.5);pc.lookAt(0,.9,0);ps.add(new T.HemisphereLight('#ffefd0','#294b3e',1.6));const pl=new T.DirectionalLight('#ffffff',2);pl.position.set(2,5,3);ps.add(pl);let ph=null;
 function retireCreature(model,parent){model?.userData?.arms?.forEach(arm=>disposeMeleeTrail(arm.userData.meleeTrail));retireModel(model);parent.remove(model);}
 function syncHero(s){const sig=JSON.stringify([s.body.id,s.arms.map(p=>p?.id),s.legs.map(p=>p?.id),s.organs.map(p=>p?.id)]);if(sig!==signature){if(hero)retireCreature(hero,root);hero=creatureModel(s);root.add(hero);signature=sig;}if(sig!==previewSignature){if(ph)retireCreature(ph,ps);ph=creatureModel(s);ph.visible=false;const pendingPreview=ph;ph.userData.modelsReady.then(()=>{if(!pendingPreview.userData.retired)pendingPreview.visible=true;});ps.add(ph);if(previewSignature)previewImpulse=.4;previewSignature=sig;}}
 function updateChunks(s){const cx=Math.floor(s.player.x/64),cz=Math.floor(s.player.z/64),keep=new Set();for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const x=cx+a,z=cz+b;if(x< -16||x>15||z< -16||z>15)continue;const key=x+','+z;keep.add(key);if(chunks.has(key))continue;const data=s.world.chunk(x,z),g=new T.Group();
 const random=seededRandom((s.seed^Math.imul(x+32,1987)^Math.imul(z+32,9281))>>>0),plants=new T.InstancedMesh(geo.leaf,materials.green,240),plantDummy=new T.Object3D();
 for(let i=0;i<240;i++){const px=x*64+random()*64,pz=z*64+random()*64,scale=.15+random()*.35;plantDummy.position.set(px,scale*.4,pz);plantDummy.rotation.set(.3,random()*6.28,.4);plantDummy.scale.set(scale,scale*.8,scale*.45);plantDummy.updateMatrix();plants.setMatrixAt(i,plantDummy.matrix);plants.setColorAt(i,new T.Color().setHSL(.17+random()*.1,.25,.3+random()*.2));}g.add(plants);
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)piece(g,'garden-inlay','ring','earth',[x*64+a*16+8,.005,z*64+b*16+8],[2.3,2.3,2.3],[Math.PI/2,0,0]);
 data.obstacles.slice(0,2).forEach((o,i)=>decorateObstacle(g,o,i));
 for(const o of data.obstacles){if(o.architecture)continue;piece(g,'outcrop','shell','earth',[o.x,o.height*.32,o.z],[o.radius,o.height*.55,o.radius]);piece(g,'moss','shell','green',[o.x,o.height*.65,o.z],[o.radius*.92,.5,o.radius*.92]);for(let i=0;i<3;i++)piece(g,'frond','leaf','deepGreen',[o.x+(i-1),o.height+1,o.z],[.7,1.8,.7],[0,i,0]);}
 const path1=new T.Mesh(geo.box,pathMat);path1.position.set(x*64+32,-.05,z*64+32);path1.scale.set(64,.08,5);g.add(path1);const path2=new T.Mesh(geo.box,pathMat);path2.position.copy(path1.position);path2.scale.set(5,.08,64);g.add(path2);
 if(Math.hypot(data.lair.x,data.lair.z)>50)piece(g,'lair','ring','amber',[data.lair.x,.06,data.lair.z],[3,3,3],[Math.PI/2,0,0]);const border=new T.Mesh(geo.box,pathMat);border.position.set(x*64,-.04,z*64+32);border.scale.set(3,.08,64);g.add(border);const edge=new T.Mesh(geo.box,pathMat);edge.position.set(x*64+32,-.04,z*64);edge.scale.set(64,.08,3);g.add(edge);g.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&['outcrop','moss','frond'].includes(o.name)){o.material=o.material.clone();o.material.transparent=true;o.userData.fade=true;}});scene.add(g);chunks.set(key,g);}
 for(const [key,g] of chunks)if(!keep.has(key)){retireModel(g);scene.remove(g);g.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.fade)o.material.dispose();});chunks.delete(key);}}
 function batch(mesh,items,transform){if(items.length>mesh.instanceMatrix.count){mesh.dispose();mesh.instanceMatrix=new T.InstancedBufferAttribute(new Float32Array(16*items.length*2),16).setUsage(T.DynamicDrawUsage);mesh.instanceColor=null;}mesh.count=items.length;for(let i=0;i<mesh.count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);transform(items[i],i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;}
 function event(e){
  forestAmbient.event(e);
  damageNumbers.event(e);
  rocketExplosion.event(e);
  enemyDeathView.event(e);
   enemyWarnings.event(e,renderTime);
   soulFx.event(e,hero);dodgeAfterimage.event(e,hero);springLeap.event(e);meleeAnimation.attack(e,renderTime);livingView.event(e,renderTime);
  if(e.type==='player-hit'){hitImpulse=.24;hitShakeRemaining=HERO_HIT_SHAKE.duration;}
  if(e.type==='attack'&&e.key==='hammer'&&e.animationStarted)hitShakeRemaining=Math.max(hitShakeRemaining,.14);
  if(e.type==='ability-impact')hitShakeRemaining=Math.max(hitShakeRemaining,e.kind==='sporebrood'?.16:.1);
  const arm=hero?.userData.arms.get(e.source);
  if(e.type==='hit'&&e.key==='shotgun')shotgunFx.event({...e,y:(e.y??0)+.85});
  if(e.type==='attack'&&arm&&!isMelee(e.key)){
   hero.updateMatrixWorld(true);const nozzle=e.key==='shotgun'?arm.userData.shotgunMuzzle:e.key==='pistol'?arm.userData.pistolMuzzle:null;
   if(nozzle)nozzle.getWorldPosition(muzzlePoint);else{muzzlePoint.set(0,0,1.2);arm.localToWorld(muzzlePoint);}
   if(e.key==='shotgun')shotgunFx.event({...e,originX:e.x,originZ:e.z,x:muzzlePoint.x,y:muzzlePoint.y,z:muzzlePoint.z});
   else bioFx.event({...e,x:muzzlePoint.x,y:muzzlePoint.y-.85,z:muzzlePoint.z});
  }
  else if(!(e.type==='blast'&&e.key==='rocket'))bioFx.event(e.type==='player-hit'&&hero?{...e,x:hero.position.x,y:hero.position.y,z:hero.position.z}:e);
 }
 function render(s,dt,assembly=false,paused=false,targetFps=60){
 const renderStarted=performance.now();gpuTiming.beginFrame();
 frameWork.pump();if(s.mode==='survival')modularEnemies.preload(s.time);
  currentCadence=targetFps;
  bossModels.preload(s.mission?.bossId);
  const previewDt=reducedMotion?0:dt;dt=paused?0:dt;
  renderTime=combatTime(s);
  meleeAnimation.retain(s.arms.filter(Boolean).map(p=>p.id));
  syncHero(s);biomeActive=s.world.presentation==='biomes';renderer.shadowMap.enabled=false;land.visible=!biomeActive;worldView?.setVisible?.(!biomeActive);if(!painted&&!biomeActive)updateChunks(s);const p=s.player,visualPlayer=springLeap.update(dt,p,reducedMotion);hero.scale.setScalar((painted?STAGE_SCALE:1)*bodySize(s.body).scale);hero.position.set(visualPlayer.x,visualPlayer.y,visualPlayer.z);
  dungeonView.update(s,reducedMotion);
  const vitals={level:s.level,biomass:s.biomass,xp:s.xp,blocked:s.health?.blocked||0,shield:s.organs.some(o=>o?.key==='shield'&&o.shieldCharge>=1)};
  if(previousVitals){for(const [key,type]of [['level','level'],['biomass','pickup'],['xp','pickup'],['blocked','shield'],['shield','shield']])if(vitals[key]>previousVitals[key])bioFx.event({type,x:p.x,y:p.y??0,z:p.z});}
  previousVitals=vitals;hitImpulse=Math.max(0,hitImpulse-dt);hitShakeRemaining=Math.max(0,hitShakeRemaining-dt);
  const speed=Math.hypot(s.motion?.x||0,s.motion?.z||0);
  hero.rotation.y=s.player.facing??0;
  const stride=!visualPlayer.airborne&&speed>.05?Math.sin(combatTime(s)*(s.motion?.pace<1?9:16)):0;
  hero.position.y=visualPlayer.y+(reducedMotion?0:Math.abs(stride)*.18+Math.sin(renderTime*2.2)*.035);hero.rotation.z=reducedMotion?0:stride*.025+Math.sin(hitImpulse*35)*hitImpulse*.12;hero.rotation.x=reducedMotion?0:-hitImpulse*.2-Math.sin(Math.PI*visualPlayer.progress)*.11;
  const features=hero.getObjectByName('mutation-features');features?.children.filter(o=>o.name==='hive-insect').forEach((o,i)=>{const a=(reducedMotion?0:combatTime(s)*1.8)+i*Math.PI/2;o.position.set(Math.cos(a)*1.2,1.65+Math.sin(a*2)*.1,Math.sin(a)*1.2);});features?.children.filter(o=>o.name==='conductor-vein').forEach(o=>{o.scale.y=1+(reducedMotion?0:Math.sin(combatTime(s)*8)*.08);});
  hero.userData.legs.forEach(leg=>leg.rotation.x=stride*(leg.userData.slot%2?1:-1)*(s.legs[leg.userData.slot]?.key==='root'?.2:.48));
  let kickX=0,kickZ=0;
  for(const arm of s.arms.filter(Boolean)){const g=hero.userData.arms.get(arm.id);if(!g)continue;const slot=s.arms.indexOf(arm),aim=clampArmYaw((arm.aim??hero.rotation.y)-hero.rotation.y,slot),pose=weaponPose(arm);g.rotation.y=aim;g.position.copy(g.userData.rest);g.position.x-=Math.sin(aim)*pose.retract;g.position.z-=Math.cos(aim)*pose.retract;g.rotation.x=-pose.lift;g.rotation.z=g.userData.side*pose.roll;const slide=g.userData.pistolSlide,slideRest=g.userData.pistolSlideRest;if(slide&&slideRest){slide.position.copy(slideRest.position);slide.position.y+=pose.slide;}const breech=g.userData.pistolBreech,breechRest=g.userData.pistolBreechRest;if(breech&&breechRest){breech.rotation.copy(breechRest.rotation);breech.rotation.y+=pose.breech;}const strike=meleeAnimation.pose(arm.id,combatTime(s),g.userData.side);if(strike){g.rotation.y=clampArmYaw(strike.aim-hero.rotation.y+strike.yaw,slot);g.rotation.x=strike.pitch;g.rotation.z=strike.roll;g.position.x+=Math.sin(g.rotation.y)*strike.extension;g.position.z+=Math.cos(g.rotation.y)*strike.extension;const drill=g.userData.drillVisual||g.getObjectByName("drill");if(drill)drill.rotation.y=strike.spin;}if(arm.key==='drill')updateDrillExtension(g,strike,hero);if(arm.key==='whip')alignWhipVfx(g.userData.meleeTrail,g,strike,hero);alignMeleeTrail(g.userData.meleeTrail,g,arm.key,(strike?.aim??arm.aim??hero.rotation.y)-hero.rotation.y);const meleeImpact=updateMeleeTrail(g.userData.meleeTrail,strike,arm.key,reducedMotion);if(meleeImpact&&!reducedMotion){hitShakeRemaining=Math.max(hitShakeRemaining,.075);hitImpulse=Math.max(hitImpulse,.085);}kickX-=Math.sin(arm.aim??Math.PI)*(arm.recoil||0)*.55;kickZ-=Math.cos(arm.aim??Math.PI)*(arm.recoil||0)*.55;}
  hero.userData.structuralFrame?.update();
  const kickLength=Math.hypot(kickX,kickZ),kickScale=kickLength>.9?.9/kickLength:1;if(!reducedMotion){hero.position.x+=kickX*kickScale*.65;hero.position.z+=kickZ*kickScale*.65;}
  deathView.update(s,hero,dt,{paused,reducedMotion});camera.zoom=reducedMotion?1:deathView.zoom();
  const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
  bossCameraPose=missionBossCamera.update(s,dt,reducedMotion);
  const forestFrame=forestAmbient.update(s,dt,ambientGovernor.tier(quality),reducedMotion);
  // Survival and missions use the same inclination; biome transitions do not tilt the camera.
  sky.color.set(biomeActive?'#d6e5ef':'#fff4d2');sky.groundColor.set(biomeActive?'#65737b':'#344330');
  // Shared warm key agrees with the Forest bake and environment side-volume shadows.
  const forestKey=forestFrame.active&&!s.mission;
  const scrapKey=!s.mission&&biomeActive&&s.world.tileAt(p.x,p.z)?.biome==='scrapyard';
  sun.position.set(-45,scrapKey?52:forestKey?65:90,forestKey||scrapKey?-35:45);
  sun.intensity=forestKey?3.2:biomeActive?4.6:2.5;sky.intensity=forestKey?.9:biomeActive?.72:1.5;
  sun.color.set(biomeActive&&!forestFrame.active?'#ffe3b4':'#ffdfad');
  heroContact.update(s,biomeActive,bodySize(s.body).scale,visualPlayer);
  missionEnvironment.update(s,dt,reducedMotion||paused);
  const height=painted?PLATE_VIEW_HEIGHT*STAGE_SCALE*Math.min(1,(9/16)/(w/h)):GAMEPLAY_CAMERA.viewHeight,shake=heroHitShakeOffset(hitShakeRemaining,reducedMotion),cameraX=s.world.missionLine&&!s.world.dungeonVoid?0:visualPlayer.x,cameraGroundY=visualPlayer.groundY??visualPlayer.y;camera.left=-height*w/h/2;camera.right=height*w/h/2;camera.top=height/2;camera.bottom=-height/2;if(painted){camera.position.set(shake.x,42*STAGE_SCALE,32*STAGE_SCALE+shake.z);camera.lookAt(0,0,0);}else{camera.position.set(cameraX+shake.x,bossCameraPose.height+cameraGroundY,visualPlayer.z+bossCameraPose.depth+shake.z);camera.lookAt(cameraX+shake.x,cameraGroundY+bossCameraPose.lookHeight,visualPlayer.z-bossCameraPose.lookAhead+shake.z);}camera.updateProjectionMatrix();
  const lane=s.world.playBounds;if(s.world.missionLine&&!s.world.dungeonVoid&&lane){const half=Math.max(Math.abs(lane.minX),Math.abs(lane.maxX)),screenHalf=Math.min(49,half/(height*w/h)*100);canvas.parentElement.style.setProperty('--mission-lane-half',screenHalf.toFixed(3)+'%');}else canvas.parentElement.style.removeProperty('--mission-lane-half');
  camera.updateMatrixWorld();navigationGuide.update(s,camera,canvas,renderTime,reducedMotion||paused);const onScreen=e=>projectedOnScreen(camera,projected,e),visibleEnemies=s.enemies.filter(onScreen);visibleEnemyCount=visibleEnemies.length;
  const enemyScale=painted?2:1;enemyContacts.update(visibleEnemies,s.world,quality==='high'&&biomeActive,enemyScale);const regularEnemies=bossModels.update(visibleEnemies.filter(e=>!e.bossOwner),p,combatTime(s),enemyScale,reducedMotion);bossMechanics.update(s,reducedMotion);modularEnemies.update(regularEnemies,p,combatTime(s),enemyScale,reducedMotion,camera);enemyWarnings.update(s);const enemies=assetEnemies.update(regularEnemies.filter(e=>!e.assembly),p,combatTime(s),enemyScale);enemyBodies.castShadow=false;enemyHeads.castShadow=false;batch(enemyBodies,enemies,(e,i)=>{const shape=e.volatile?[1.25,1.5,1.25]:e.role==='fast'?[.5,.45,1.55]:e.role==='armored'?[1.5,.65,1.1]:e.role==='ranged'?[.55,1.8,.65]:[1,.7,1.2];dummy.position.set(e.x,(e.y??0)+shape[1]*e.radius*enemyScale,e.z);dummy.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);const impact=impactShape(e);dummy.scale.set(shape[0]*e.radius*impact.stretch,shape[1]*e.radius*impact.squash,shape[2]*e.radius).multiplyScalar(enemyScale);color.set(e.volatile?'#c28644':e.role==='ranged'?'#557c72':e.role==='armored'?'#797062':e.role==='fast'?'#97714d':e.kind==='normal'?'#a68a55':e.kind==='elite'?'#a55e42':e.kind==='objective'?'#796f80':'#763e45');color.lerp(hitColor,impact.flash);enemyBodies.setColorAt(i,color);});if(enemyBodies.instanceColor)enemyBodies.instanceColor.needsUpdate=true;
  batch(enemyHeads,enemies,e=>{const tall=e.role==='ranged';dummy.position.set(e.x,(e.y??0)+(tall?3.6:.9)*e.radius*enemyScale,e.z);dummy.rotation.set(tall?Math.PI/2:0,Math.atan2(p.x-e.x,p.z-e.z),0);dummy.scale.set(e.radius*(e.role==='armored'?1.1:.4),e.radius*(tall?1.5:.5),e.radius*.5).multiplyScalar(enemyScale);});
  recoveryDrops.update((s.recoveryDrops??[]).filter(onScreen),camera,renderTime,reducedMotion);
  consumableDrops.update(s,camera,renderTime,reducedMotion,onScreen);
  groundItems.update(s.ground.filter(onScreen),painted?2:1,renderTime,reducedMotion,s.world.heightAt?.bind(s.world));
  batch(drops,s.xpDrops.filter(onScreen),d=>{dummy.position.set(d.x,(d.y??0)+.4+(reducedMotion?0:Math.sin(s.time*2)*.08),d.z);dummy.scale.setScalar(.12*(painted?2:1));dummy.rotation.y=reducedMotion?0:s.time;});
  const visibleShots=shotAfterglow.update([...s.shots,...s.hostileShots.filter(q=>q.reflectedByMirror)],renderTime,s.world).filter(onScreen),rocketShots=visibleShots.filter(q=>q.mode==='rocket'),meleeRicochetShots=visibleShots.filter(q=>q.meleeRicochet),harpoonShots=visibleShots.filter(q=>q.w?.key==='harpoon'&&!q.meleeRicochet),standardShots=visibleShots.filter(q=>q.mode!=='rocket'&&!q.meleeRicochet&&q.w?.key!=='harpoon'),shotHeight=q=>biomeActive?(q.y??.8):(painted?2.4:.8);
  organicProjectiles.update(standardShots,shotHeight);
  batch(projectiles,standardShots.filter(q=>!isOrganicProjectile(q)),(q,i)=>{const v=projectileStyle(q);setProjectileOpacity(projectiles,i,projectileOpacity(q));dummy.position.set(q.x,shotHeight(q),q.z);dummy.scale.set(v.width,v.height,v.length);dummy.rotation.y=Math.atan2(q.dx,q.dz);projectiles.setColorAt(i,color.setHex(v.color));});
  harpoons.update(harpoonShots,shotHeight,(q,point)=>{const arm=hero?.userData.arms.get(q.source);if(!arm)return false;point.set(0,0,1.2);arm.localToWorld(point);return true;});
  rocketBees.update(rocketShots,shotHeight,renderTime,reducedMotion);
  rocketExhaust.update(rocketShots,shotHeight,renderTime,reducedMotion);
  rocketExplosion.update(dt,reducedMotion);
  ricochetBees.update(meleeRicochetShots,shotHeight,renderTime,reducedMotion);
  batch(trails,[...standardShots,...visibleShots.filter(q=>q.presentationAge!=null&&(q.meleeRicochet||q.w?.key==='harpoon'))],(q,i)=>{const v=projectileStyle(q),length=Math.min(q.travel||v.trail,reducedMotion?0:v.trail);setProjectileOpacity(trails,i,projectileOpacity(q,true));dummy.position.set(q.x-q.dx*length*.5,shotHeight(q),q.z-q.dz*length*.5);dummy.scale.set(v.thickness,v.thickness,length*.5);dummy.rotation.y=Math.atan2(q.dx,q.dz);trails.setColorAt(i,color.setHex(v.color));});
  if(projectiles.instanceColor)projectiles.instanceColor.needsUpdate=true;if(trails.instanceColor)trails.instanceColor.needsUpdate=true;
  acidPuddles.update(s.puddles,dt,reducedMotion,activeMutation(s,'mire'));
  const ms=JSON.stringify(s.mission?.nodes?.map(n=>[n.id,n.active,n.hp>0]));if(ms!==markerSig){markers.clear();markerSig=ms;for(const n of s.mission?.nodes||[]){piece(markers,'objective','ring',n.active?'cyan':'amber',[n.x,.1,n.z],[3,3,3],[Math.PI/2,0,0]);piece(markers,'beacon','cylinder','cyan',[n.x,2,n.z],[.12,4,.12]);}}
  bioFx.update(dt);shotgunFx.update(dt);dodgeAfterimage.update(dt,reducedMotion);enemyDeathView.update(dt,{reducedMotion});
  for(const g of chunks.values())g.traverse(o=>{if(o.userData.fade){const close=Math.hypot(o.position.x-p.x,o.position.z-p.z)<9&&o.position.z>p.z-3;o.material.opacity=close?.25:1;o.material.depthWrite=!close;}});if(!biomeActive){worldView?.update(s,camera);if(!painted){scene.background=new T.Color('#c6cfb1');scene.fog??=new T.Fog('#c6cfb1',65,120);}}else{biomeView.update(s,camera,dt);scene.background=new T.Color(s.world.dungeonVoid?'#b8cbd8':'#343a37');scene.fog=null;sun.position.set(p.x-45,90+(p.y??0),p.z+45);sun.target.position.set(p.x,p.y??0,p.z);sun.target.updateMatrixWorld();}soulFx.update(dt,reducedMotion,s);abilityEffects.update(s,reducedMotion);livingView.update(s,reducedMotion);if(s.isaac?.heartAt>0&&combatTime(s)-s.isaac.heartAt+5<.05)isaacView.event({type:'heart-pulse'},s);isaacView.update(s,reducedMotion);eventMarkers.update(s,camera);enemyHealth.update(visibleEnemies,camera,enemyScale);
  if(new URLSearchParams(location.search).has('biomeOnly')){const query=new URLSearchParams(location.search),biomeRoot=scene.getObjectByName('painted-biomes'),hidden=new Set((query.get('hideChildren')||'').split(',').filter(Boolean).map(Number));for(const child of scene.children)if(child!==biomeRoot&&!child.isLight&&!child.isCamera)child.visible=false;if(query.has('groundOnly'))for(const tile of biomeRoot.children)for(let i=1;i<tile.children.length;i++)tile.children[i].visible=false;if(query.has('showChild'))for(const tile of biomeRoot.children)for(let i=1;i<tile.children.length;i++)tile.children[i].visible=i===Number(query.get('showChild'));for(const tile of biomeRoot.children)for(const i of hidden)if(tile.children[i])tile.children[i].visible=false;}
  if(biomeActive){sun.position.set(p.x+ENVIRONMENT_SUN.x,(forestKey?75:ENVIRONMENT_SUN.y)+(p.y??0),p.z+(forestKey?-45:ENVIRONMENT_SUN.z));sun.updateMatrixWorld();}
  else if(!biomeActive){sun.position.set(-45,90,45);sun.target.position.set(0,0,0);sun.target.updateMatrixWorld();}
  weatherView.update(s,dt,{quality:ambientGovernor.tier(quality),reducedMotion,paused,windUniforms:forestAmbient.uniforms});
  renderer.render(scene,camera);damageNumbers.update(dt,camera,reducedMotion,enemyScale);
  ambientGovernor.sample(Math.max(performance.now()-renderStarted,gpuTiming.info().gpuMs||0),dt,targetFps,forestFrame.active&&!paused,quality);
  if(assembly&&preview.clientWidth){pr.setSize(preview.clientWidth,preview.clientHeight,false);previewImpulse=Math.max(0,previewImpulse-previewDt);ph.rotation.y+=previewDt*.25;ph.scale.setScalar(1+(reducedMotion?0:Math.sin(previewImpulse/.4*Math.PI)*.035));if(ph.visible)fitPreview(pc,ph,preview.clientWidth/Math.max(1,preview.clientHeight));pr.render(ps,pc);}
  gpuTiming.endFrame();
 }
 function reset(){weatherView.reset();forestAmbient.reset();missionEnvironment.reset();dungeonView.reset();missionBossCamera.reset();bossCameraPose=null;consumableDrops.reset();deathView.reset();enemyDeathView.reset();enemyContacts.reset();damageNumbers.reset();eventMarkers.reset();enemyHealth.reset();groundItems.reset();navigationGuide.reset();acidPuddles.reset();recoveryDrops.reset();soulFx.reset();dodgeAfterimage.reset();springLeap.reset();bioFx.reset();shotgunFx.reset();harpoons.reset();rocketBees.reset();ricochetBees.reset();rocketExhaust.reset();rocketExplosion.reset();shotAfterglow.reset();organicProjectiles.reset();previousVitals=null;hitImpulse=hitShakeRemaining=previewImpulse=0;biomeView.reset();assetEnemies.reset();modularEnemies.reset();bossModels.reset();bossMechanics.reset();enemyWarnings.reset();meleeAnimation.reset();livingView.reset();isaacView.reset();renderTime=0;abilityEffects.reset();for(const g of chunks.values()){retireModel(g);scene.remove(g);g.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.fade)o.material.dispose();});}chunks.clear();markerSig='';}

 function setQuality(level){const caps={low:1,medium:1.5,high:2};if(!(level in caps))return false;quality=level;soulFx.configure(level);bioFx.configure(quality,reducedMotion);shotgunFx.configure(quality,reducedMotion);renderer.setPixelRatio(Math.min(devicePixelRatio,caps[level]));pr.setPixelRatio(Math.min(devicePixelRatio,caps[level]));renderer.shadowMap.enabled=false;return true;}
 function setReducedMotion(value){reducedMotion=Boolean(value);dodgeAfterimage.update(0,reducedMotion);bioFx.configure(quality,reducedMotion);shotgunFx.configure(quality,reducedMotion);}
 function directionTo(from,to){const a=new T.Vector3(from.x,from.y??0,from.z).project(camera),b=new T.Vector3(to.x,to.y??0,to.z).project(camera);return screenBearing(a,b,canvas.clientWidth,canvas.clientHeight);}
 function debugPick(clientX,clientY){const rect=canvas.getBoundingClientRect(),pointer=new T.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),raycaster=new T.Raycaster();raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(scene.children,true).filter(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;return true;}).slice(0,12).map(hit=>{const names=[];for(let o=hit.object;o;o=o.parent)if(o.name)names.push(o.name);return{distance:hit.distance,names,point:hit.point.toArray(),material:hit.object.material?.name||'',map:hit.object.material?.map?.source?.data?.src||''};});}
 function debugBiomeChildren(){const tile=scene.getObjectByName('tile-0');return tile?.children.map((o,i)=>{let mesh=null;o.traverse(q=>{if(!mesh&&q.isMesh)mesh=q;});return `${i}:${o.name||o.type}:${mesh?.material?.map?.source?.data?.src?.split('/').at(-1)||''}`;})||[];}
 return{render,event,reset,frameInfo:()=>({...gpuTiming.drain(),...frameWork.info()}),ambientInfo:forestAmbient.info,setQuality,setReducedMotion,directionTo,debugPick,debugBiomeChildren,deathPending:deathView.pending,retryAssets:()=>biomeView.retry(),info:()=>({renderCadence:document.hidden?0:currentCadence,...forestAmbient.info(),...weatherView.info(),...ambientGovernor.info(),forestCameraDegrees:cameraPitchDegrees(bossCameraPose??GAMEPLAY_CAMERA),...missionEnvironment.info(),...dungeonView.info(),missionBossCamera:bossCameraPose,...consumableDrops.info(),death:deathView.info(),...enemyDeathView.info(),...enemyContacts.info(),soulEffects:soulFx.count(),dodgeAfterimages:dodgeAfterimage.info().active,springLeapVfx:springLeap.info(),harpoons:harpoons.count(),rocketBees:rocketBees.count(),ricochetBees:ricochetBees.count(),rocketExhaust:rocketExhaust.count(),rocketExplosion:rocketExplosion.info(),drawCalls:renderer.info.render.calls,bioParticles:bioFx.count(),shotgunParticles:shotgunFx.count(),reducedMotion,shadows:quality==='high'&&biomeActive,...gpuTiming.info(),...frameWork.info(),visibleEnemies:visibleEnemyCount,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,...groundItems.info(),...navigationGuide.info(),...(biomeActive?biomeView.info():{}),assetEnemies:assetEnemies.count()+modularEnemies.count()+bossModels.count(),...modularEnemies.info(),...bossModels.info(),...modelInfo()})};
}
