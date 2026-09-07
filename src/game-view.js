import {createRecoveryDropsView} from './recovery-drops-view.js';
import {createDeathView} from './death-view.js';
import {createMeleeTrail,updateMeleeTrail} from './melee-trail.js';
import {clampArmYaw} from './body-facing.js';
import {fitPreview} from './preview-fit.js';
import {createDamageNumbersView} from './damage-numbers-view.js';
import {equipmentLayout} from './equipment-mounts.js';
import {createEventMarkers} from './ui/event-markers.js';
import {bodySize} from './body-size.js';
import {createEnemyHealthView} from './enemy-health-view.js';
import {createGroundItemsView} from './ground-items-view.js';
import {screenBearing} from './systems/waypoint.js';
import {createSoulFxView} from './systems/soul-fx-view.js';
import {projectileStyle} from './weapon-visuals.js';
import {createEnemyAssemblyView} from './enemy-assembly-view.js';
import {createEnemyWarningView} from './enemy-warning-view.js';
import {createBioFxView} from './bio-fx-view.js';
import {createIsaacView} from './isaac-view.js';
import {mutationView,combatTime,activeMutation} from './systems/mutations.js';
import {createBiomeView} from './biome-view.js';
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


export function creatureModel(s,modelOptions){
 const root=new T.Group(),d=def(s.body),layout=equipmentLayout(s),wide=layout.wide;
 piece(root,'chassis','shell','dark',[0,.8,0],[.65*wide,.4,.8]);
 piece(root,'body-'+s.body.key,d.legs===4?'shell':'box','ceramic',[0,1.05,0],[1.12*wide,.55,1.5]);
 piece(root,'soul','shell','cyan',[0,1.42,0],[.24,.19,.24]);
 piece(root,'soul-ring','ring','amber',[0,1.4,0],[.29,.29,.29],[Math.PI/2,0,0]);
 root.userData.legs=[];root.userData.arms=new Map();
 s.legs.forEach((p,i)=>{if(!p)return;const {side,position}=layout.legs[i],g=new T.Group();g.name='leg-'+p.id;g.userData.slot=i;g.userData.partId=p.id;g.position.set(...position);root.add(g);
  link(root,'mounting-leg-'+i,[0,.82,position[2]*.6],position,.105,'dark');piece(root,'mounting-hip-'+i,'joint','ceramic',position,[.14,.14,.14]);
  const thickness=p.key==='plated'?.16:p.key==='runner'?.07:.11;
  if(p.key==='root'){
   link(g,'root-trunk',[0,0,0],[side*.55,-.4,0],.13,'deepGreen');
   for(const z of [-.25,0,.25])link(g,'root-toe',[side*.55,-.4,0],[side*.8,-.6,z],.07,'dark');
  }else{link(g,'thigh',[0,0,0],[side*.6,-.1,.1],thickness,'ceramic');link(g,'shin',[side*.6,-.1,.1],[side*.8,-.55,-.1],thickness,'dark');piece(g,'foot','shell','amber',[side*.8,-.57,-.13],[.18,.08,.25]);}root.userData.legs.push(g);
 });
 // Equipped hands retain their own pivots without visible socket geometry.
 s.arms.forEach((p,i)=>{const {side,position}=layout.arms[i];
  if(!p)return;
  const g=new T.Group();g.name='arm-'+p.id;g.position.set(...position);g.userData.slot=i;g.userData.partId=p.id;g.userData.rest=g.position.clone();g.userData.side=side;root.add(g);root.userData.arms.set(p.id,g);
  link(root,'mounting-arm-'+i,[0,1.12,position[2]*.5],position,.105,'dark');piece(g,'mounting-collar','joint','ceramic',[0,0,0],[.16,.16,.16]);
  if(isMelee(p.key)){const trail=createMeleeTrail(p.key);g.add(trail);g.userData.meleeTrail=trail;}
  link(g,'support',[0,0,0],[0,0,.55],.13,'dark');piece(g,'cuff','shell','ceramic',[0,0,.48],[.25,.2,.35]);
  if(['claws','fangs'].includes(p.key)){for(const a of [-1,1])link(g,'claw',[a*.2,0,.5],[a*.13,-.08,1.15],.07,p.key==='fangs'?'cyan':'amber');}
  else if(p.key==='hammer')piece(g,'shield-bash','shell','ceramic',[0,0,.85],[.65,.5,.18]);
  else if(p.key==='drill')piece(g,'drill','cone','amber',[0,0,1],[.24,.9,.24],[Math.PI/2,0,0]);
  else if(p.key==='whip'){for(let a=0;a<4;a++)link(g,'whip',[a*.08,0,.5+a*.28],[(a+1)*.08,0,.78+a*.28],.06,'green');}
  else if(p.key==='rocket'){piece(g,'hive','box','ceramic',[0,0,.8],[.65,.5,.65]);for(const x of [-.2,0,.2])piece(g,'rocket','shell','green',[x,0,1.18],[.075,.12,.2]);}
  else if(p.key==='arc'){for(const x of [-.18,.18])link(g,'fork',[x,0,.5],[x,0,1.15],.06,'cyan');piece(g,'coil','ring','amber',[0,0,.7],[.25,.25,.25]);}
  else if(p.key==='acid'){piece(g,'gland','shell','green',[0,0,.8],[.32,.28,.5]);piece(g,'mouth','ring','amber',[0,0,1.22],[.14,.14,.14]);}
  else{piece(g,'barrel','cylinder','dark',[0,0,.87],[p.key==='needle'?.08:.14,p.key==='needle'?1.2:.7,.14],[Math.PI/2,0,0]);piece(g,'muzzle','joint','cyan',[0,0,p.key==='needle'?1.45:1.2],[.1,.1,.1]);}
 });
 root.userData.modelsReady=dressCreature(root,s,modelOptions);
 const active=mutationView(s).filter(f=>f.active).map(f=>f.id);
 const mutationRoot=new T.Group();mutationRoot.name='mutation-features';root.add(mutationRoot);
 if(active.includes('hive'))root.userData.modelsReady=Promise.all([root.userData.modelsReady,dressHiveDetails(mutationRoot,modelOptions)]);
 if(active.includes('conductor'))for(let i=0;i<s.arms.length;i++){const side=i%2?-1:1;link(mutationRoot,'conductor-vein',[0,1.55,0],[side*.7,1.2,(Math.floor(i/2)-.5)*.6],.045,'cyan');}
 if(active.includes('mire')){piece(mutationRoot,'mire-trail','disk','green',[0,.04,-.5],[.9,.02,1.4]);for(const x of [-.45,.45])link(mutationRoot,'wet-seam',[x,1.4,-.5],[x,1.4,.5],.045,'green');}
 return root;
}
export function createView(canvas,preview,{painted=true}={}){
 const renderer=new T.WebGLRenderer({canvas,alpha:painted,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const damageNumbers=createDamageNumbersView(canvas);const eventMarkers=createEventMarkers(canvas.parentElement);const scene=new T.Scene();if(painted)renderer.setClearColor(0,0);else{scene.background=new T.Color('#c6cfb1');scene.fog=new T.Fog('#c6cfb1',65,120);}
 const deathView=createDeathView(scene);
 const camera=new T.OrthographicCamera(-25,25,25,-25,.1,600);scene.add(new T.HemisphereLight('#fff4d2','#344330',1.5));const sun=new T.DirectionalLight('#ffdfad',2.5);sun.position.set(-45,90,45);scene.add(sun);
 if(painted){renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-45,right:45,top:65,bottom:-65,near:1,far:220});sun.shadow.bias=-.0003;sun.shadow.normalBias=.06;const stage=new T.Group();stage.scale.setScalar(STAGE_SCALE);buildPainterlyWorld(stage);scene.add(stage);}
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:220});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;scene.add(sun.target);
 const groundMat=new T.MeshStandardMaterial({color:'#a8b388',roughness:1}),pathMat=new T.MeshStandardMaterial({color:'#d3ccb0',roughness:1});
 const land=new T.Mesh(new T.PlaneGeometry(2048,2048),groundMat);land.rotation.x=-Math.PI/2;land.position.y=-.06;if(!painted)scene.add(land);
 const worldView=painted?null:createWorldView(scene);const biomeView=createBiomeView(scene);let biomeActive=false,quality='medium',reducedMotion=false,hitImpulse=0,previewImpulse=0,previousVitals=null;
 const recoveryDrops=createRecoveryDropsView(scene,renderer);
 const groundItems=createGroundItemsView(scene),enemyHealth=createEnemyHealthView(scene);
 const chunks=new Map(),root=new T.Group();scene.add(root);let hero=null,signature='',previewSignature='';
 const dummy=new T.Object3D(),color=new T.Color(),hitColor=new T.Color('#fff4cd');
 function instance(geometry,material,capacity){const m=new T.InstancedMesh(geometry,material,capacity);m.instanceMatrix.setUsage(T.DynamicDrawUsage);m.frustumCulled=false;scene.add(m);return m;}
 const enemyBodies=instance(geo.shell,materials.amber,1200),enemyHeads=instance(geo.cone,materials.dark,1200),drops=instance(geo.joint,materials.cyan,2000),projectiles=instance(geo.shell,new T.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),1000),puddles=instance(geo.disk,new T.MeshBasicMaterial({color:'#79a144',transparent:true,opacity:.5}),400);
 const trails=instance(geo.shell,new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.6,depthWrite:false,toneMapped:false}),1000);
 const markers=new T.Group();scene.add(markers);let markerSig='';const bioFx=createBioFxView(scene),muzzlePoint=new T.Vector3();const soulFx=createSoulFxView(scene),abilityEffects=createEffectsView(scene),livingView=createLivingView(scene,canvas),isaacView=createIsaacView(scene),assetEnemies=createAssetEnemies(scene),modularEnemies=createEnemyAssemblyView(scene),enemyWarnings=createEnemyWarningView(scene);let renderTime=0;const meleeAnimation=createMeleeAnimation();
 const pr=new T.WebGLRenderer({canvas:preview,alpha:true,antialias:true});pr.setPixelRatio(Math.min(devicePixelRatio,1.5));pr.setClearColor(0,0);const ps=new T.Scene(),pc=new T.PerspectiveCamera(35,1,.1,100);pc.zoom=1.9;pc.position.set(4,4.5,5.5);pc.lookAt(0,.9,0);ps.add(new T.HemisphereLight('#ffefd0','#294b3e',1.6));const pl=new T.DirectionalLight('#ffffff',2);pl.position.set(2,5,3);ps.add(pl);let ph=null;
 function syncHero(s){const sig=JSON.stringify([s.body.id,s.arms.map(p=>p?.id),s.legs.map(p=>p?.id),s.organs.map(p=>p?.id)]);if(sig!==signature){if(hero){retireModel(hero);root.remove(hero);}hero=creatureModel(s);hero.userData.heroOutline=true;if(!painted){const meshes=[];hero.traverse(o=>{if(o.isMesh&&!o.name.includes('sweep'))meshes.push(o);});const outlineMat=new T.MeshBasicMaterial({color:'#143c34',side:T.BackSide});for(const o of meshes){const outline=new T.Mesh(o.geometry,outlineMat);outline.scale.setScalar(1.12);o.add(outline);}}root.add(hero);signature=sig;}if(sig!==previewSignature){if(ph){retireModel(ph);ps.remove(ph);}ph=creatureModel(s);ph.visible=false;const pendingPreview=ph;ph.userData.modelsReady.then(()=>{if(!pendingPreview.userData.retired)pendingPreview.visible=true;});ps.add(ph);if(previewSignature)previewImpulse=.4;previewSignature=sig;}}
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
  damageNumbers.event(e);
  soulFx.event(e,hero);meleeAnimation.attack(e,renderTime);livingView.event(e,renderTime);
  if(e.type==='player-hit')hitImpulse=.24;
  const arm=hero?.userData.arms.get(e.source);
  if(e.type==='attack'&&arm&&!isMelee(e.key)){hero.updateMatrixWorld(true);muzzlePoint.set(0,0,1.2);arm.localToWorld(muzzlePoint);bioFx.event({...e,x:muzzlePoint.x,y:muzzlePoint.y-.85,z:muzzlePoint.z});}
  else bioFx.event(e.type==='player-hit'&&hero?{...e,x:hero.position.x,y:hero.position.y,z:hero.position.z}:e);
 }
 function render(s,dt,assembly=false,paused=false){
  const previewDt=reducedMotion?0:dt;dt=paused?0:dt;
  renderTime=combatTime(s);
  meleeAnimation.retain(s.arms.filter(Boolean).map(p=>p.id));
  syncHero(s);biomeActive=s.world.presentation==='biomes';renderer.shadowMap.enabled=(painted||biomeActive)&&quality!=='low';land.visible=!biomeActive;worldView?.setVisible?.(!biomeActive);if(!painted&&!biomeActive)updateChunks(s);const p=s.player;hero.scale.setScalar((painted?STAGE_SCALE:1)*bodySize(s.body).scale);hero.position.set(p.x,p.y??0,p.z);
  const vitals={level:s.level,biomass:s.biomass,xp:s.xp,blocked:s.health?.blocked||0,shield:s.organs.some(o=>o?.key==='shield'&&o.shieldCharge>=1)};
  if(previousVitals){for(const [key,type]of [['level','level'],['biomass','pickup'],['xp','pickup'],['blocked','shield'],['shield','shield']])if(vitals[key]>previousVitals[key])bioFx.event({type,x:p.x,y:p.y??0,z:p.z});}
  previousVitals=vitals;hitImpulse=Math.max(0,hitImpulse-dt);
  const speed=Math.hypot(s.motion?.x||0,s.motion?.z||0);
  hero.rotation.y=s.player.facing??0;
  const stride=speed>.05?Math.sin(combatTime(s)*(s.motion?.pace<1?9:16)):0;
  hero.position.y=(p.y??0)+(reducedMotion?0:Math.abs(stride)*.18+Math.sin(renderTime*2.2)*.035);hero.rotation.z=reducedMotion?0:stride*.025+Math.sin(hitImpulse*35)*hitImpulse*.12;hero.rotation.x=reducedMotion?0:-hitImpulse*.2;
  const features=hero.getObjectByName('mutation-features');features?.children.filter(o=>o.name==='hive-insect').forEach((o,i)=>{const a=(reducedMotion?0:combatTime(s)*1.8)+i*Math.PI/2;o.position.set(Math.cos(a)*1.2,1.65+Math.sin(a*2)*.1,Math.sin(a)*1.2);});features?.children.filter(o=>o.name==='conductor-vein').forEach(o=>{o.scale.y=1+(reducedMotion?0:Math.sin(combatTime(s)*8)*.08);});
  hero.userData.legs.forEach(leg=>leg.rotation.x=stride*(leg.userData.slot%2?1:-1)*(s.legs[leg.userData.slot]?.key==='root'?.2:.48));
  let kickX=0,kickZ=0;
  for(const arm of s.arms.filter(Boolean)){const g=hero.userData.arms.get(arm.id);if(!g)continue;const slot=s.arms.indexOf(arm),aim=clampArmYaw((arm.aim??hero.rotation.y)-hero.rotation.y,slot),pose=weaponPose(arm);g.rotation.y=aim;g.position.copy(g.userData.rest);g.position.x-=Math.sin(aim)*pose.retract;g.position.z-=Math.cos(aim)*pose.retract;g.rotation.x=-pose.lift;g.rotation.z=0;const strike=meleeAnimation.pose(arm.id,combatTime(s),g.userData.side);updateMeleeTrail(g.userData.meleeTrail,strike,arm.key,reducedMotion);if(strike){g.rotation.y=clampArmYaw(strike.aim-hero.rotation.y+strike.yaw,slot);g.rotation.x=strike.pitch;g.rotation.z=strike.roll;g.position.x+=Math.sin(g.rotation.y)*strike.extension;g.position.z+=Math.cos(g.rotation.y)*strike.extension;const drill=g.userData.drillVisual||g.getObjectByName("drill");if(drill)drill.rotation.y=strike.spin;}kickX-=Math.sin(arm.aim??Math.PI)*(arm.recoil||0)*.55;kickZ-=Math.cos(arm.aim??Math.PI)*(arm.recoil||0)*.55;}
  const kickLength=Math.hypot(kickX,kickZ),kickScale=kickLength>.9?.9/kickLength:1;if(!reducedMotion){hero.position.x+=kickX*kickScale*.65;hero.position.z+=kickZ*kickScale*.65;}
  deathView.update(s,hero,dt,{paused,reducedMotion});camera.zoom=reducedMotion?1:deathView.zoom();
  const w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
  const height=painted?PLATE_VIEW_HEIGHT*STAGE_SCALE*Math.min(1,(9/16)/(w/h)):38;camera.left=-height*w/h/2;camera.right=height*w/h/2;camera.top=height/2;camera.bottom=-height/2;if(painted){camera.position.set(0,42*STAGE_SCALE,32*STAGE_SCALE);camera.lookAt(0,0,0);}else{camera.position.set(p.x,42+(p.y??0),p.z+32);camera.lookAt(p.x,p.y??0,p.z-1.2);}camera.updateProjectionMatrix();
  const near=e=>Math.hypot(e.x-p.x,e.z-p.z)<65;
  const enemyScale=painted?2:1;modularEnemies.update(s.enemies.filter(near),p,combatTime(s),enemyScale,reducedMotion);enemyWarnings.update(s);const enemies=assetEnemies.update(s.enemies.filter(e=>near(e)&&!e.assembly),p,combatTime(s),enemyScale);enemyBodies.castShadow=painted||biomeActive;enemyHeads.castShadow=painted||biomeActive;hero.traverse(o=>{if(o.isMesh)o.castShadow=o.name!=='melee-sweep';});batch(enemyBodies,enemies,(e,i)=>{const shape=e.volatile?[1.25,1.5,1.25]:e.role==='fast'?[.5,.45,1.55]:e.role==='armored'?[1.5,.65,1.1]:e.role==='ranged'?[.55,1.8,.65]:[1,.7,1.2];dummy.position.set(e.x,(e.y??0)+shape[1]*e.radius*enemyScale,e.z);dummy.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);const impact=impactShape(e);dummy.scale.set(shape[0]*e.radius*impact.stretch,shape[1]*e.radius*impact.squash,shape[2]*e.radius).multiplyScalar(enemyScale);color.set(e.volatile?'#c28644':e.role==='ranged'?'#557c72':e.role==='armored'?'#797062':e.role==='fast'?'#97714d':e.kind==='normal'?'#a68a55':e.kind==='elite'?'#a55e42':e.kind==='objective'?'#796f80':'#763e45');color.lerp(hitColor,impact.flash);enemyBodies.setColorAt(i,color);});if(enemyBodies.instanceColor)enemyBodies.instanceColor.needsUpdate=true;
  batch(enemyHeads,enemies,e=>{const tall=e.role==='ranged';dummy.position.set(e.x,(e.y??0)+(tall?3.6:.9)*e.radius*enemyScale,e.z);dummy.rotation.set(tall?Math.PI/2:0,Math.atan2(p.x-e.x,p.z-e.z),0);dummy.scale.set(e.radius*(e.role==='armored'?1.1:.4),e.radius*(tall?1.5:.5),e.radius*.5).multiplyScalar(enemyScale);});
  recoveryDrops.update((s.recoveryDrops??[]).filter(near),camera,renderTime,reducedMotion);
  groundItems.update(s.ground.filter(near),painted?2:1,renderTime,reducedMotion);
  batch(drops,s.xpDrops.filter(near),d=>{dummy.position.set(d.x,(d.y??0)+.4+(reducedMotion?0:Math.sin(s.time*2)*.08),d.z);dummy.scale.setScalar(.12*(painted?2:1));dummy.rotation.y=reducedMotion?0:s.time;});
  const visibleShots=s.shots.filter(near);
  batch(projectiles,visibleShots,(q,i)=>{const v=projectileStyle(q);dummy.position.set(q.x,biomeActive?(q.y??.8):(painted?2.4:.8),q.z);dummy.scale.set(v.width,v.height,v.length);dummy.rotation.y=Math.atan2(q.dx,q.dz);projectiles.setColorAt(i,color.setHex(v.color));});
  batch(trails,visibleShots,(q,i)=>{const v=projectileStyle(q),length=Math.min(q.travel,reducedMotion?0:v.trail);dummy.position.set(q.x-q.dx*length*.5,biomeActive?(q.y??.8):(painted?2.4:.8),q.z-q.dz*length*.5);dummy.scale.set(v.thickness,v.thickness,length*.5);dummy.rotation.y=Math.atan2(q.dx,q.dz);trails.setColorAt(i,color.setHex(v.color));});
  if(projectiles.instanceColor)projectiles.instanceColor.needsUpdate=true;if(trails.instanceColor)trails.instanceColor.needsUpdate=true;
  batch(puddles,s.puddles.filter(near),q=>{dummy.position.set(q.x,(q.y??0)+.02,q.z);dummy.scale.setScalar(2.5*(activeMutation(s,'mire')?1.5:1));dummy.rotation.x=-Math.PI/2;});
  const ms=JSON.stringify(s.mission?.nodes.map(n=>[n.id,n.active,n.hp>0]));if(ms!==markerSig){markers.clear();markerSig=ms;for(const n of s.mission?.nodes||[]){piece(markers,'objective','ring',n.active?'cyan':'amber',[n.x,.1,n.z],[3,3,3],[Math.PI/2,0,0]);piece(markers,'beacon','cylinder','cyan',[n.x,2,n.z],[.12,4,.12]);}}
  bioFx.update(dt);
  for(const g of chunks.values())g.traverse(o=>{if(o.userData.fade){const close=Math.hypot(o.position.x-p.x,o.position.z-p.z)<9&&o.position.z>p.z-3;o.material.opacity=close?.25:1;o.material.depthWrite=!close;}});if(!biomeActive){worldView?.update(s,camera);if(!painted){scene.background=new T.Color('#c6cfb1');scene.fog??=new T.Fog('#c6cfb1',65,120);}}else{biomeView.update(s,camera,dt);scene.background=new T.Color('#343a37');scene.fog=null;sun.position.set(p.x-45,90+(p.y??0),p.z+45);sun.target.position.set(p.x,p.y??0,p.z);sun.target.updateMatrixWorld();}soulFx.update(dt,reducedMotion,s);abilityEffects.update(s,reducedMotion);livingView.update(s,reducedMotion);if(s.isaac?.heartAt>0&&combatTime(s)-s.isaac.heartAt+5<.05)isaacView.event({type:'heart-pulse'},s);isaacView.update(s,reducedMotion);eventMarkers.update(s,camera);enemyHealth.update(s.enemies.filter(near),camera,enemyScale);renderer.render(scene,camera);damageNumbers.update(dt,camera,reducedMotion,enemyScale);
  if(assembly&&preview.clientWidth){pr.setSize(preview.clientWidth,preview.clientHeight,false);previewImpulse=Math.max(0,previewImpulse-previewDt);ph.rotation.y+=previewDt*.25;ph.scale.setScalar(1+(reducedMotion?0:Math.sin(previewImpulse/.4*Math.PI)*.035));if(ph.visible)fitPreview(pc,ph,preview.clientWidth/Math.max(1,preview.clientHeight));pr.render(ps,pc);}
 }
 function reset(){deathView.reset();damageNumbers.reset();eventMarkers.reset();enemyHealth.reset();groundItems.reset();recoveryDrops.reset();soulFx.reset();bioFx.reset();previousVitals=null;hitImpulse=previewImpulse=0;biomeView.reset();assetEnemies.reset();modularEnemies.reset();enemyWarnings.reset();meleeAnimation.reset();livingView.reset();isaacView.reset();renderTime=0;abilityEffects.reset();for(const g of chunks.values()){retireModel(g);scene.remove(g);g.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.userData.fade)o.material.dispose();});}chunks.clear();markerSig='';}

 function setQuality(level){const caps={low:1,medium:1.5,high:2};if(!(level in caps))return false;quality=level;soulFx.configure(level);bioFx.configure(quality,reducedMotion);renderer.setPixelRatio(Math.min(devicePixelRatio,caps[level]));pr.setPixelRatio(Math.min(devicePixelRatio,caps[level]));renderer.shadowMap.enabled=level!=='low';renderer.shadowMap.needsUpdate=true;return true;}
 function setReducedMotion(value){reducedMotion=Boolean(value);bioFx.configure(quality,reducedMotion);}
 function directionTo(from,to){const a=new T.Vector3(from.x,from.y??0,from.z).project(camera),b=new T.Vector3(to.x,to.y??0,to.z).project(camera);return screenBearing(a,b,canvas.clientWidth,canvas.clientHeight);}
 return{render,event,reset,setQuality,setReducedMotion,directionTo,deathPending:deathView.pending,retryAssets:()=>biomeView.retry(),info:()=>({death:deathView.info(),soulEffects:soulFx.count(),drawCalls:renderer.info.render.calls,bioParticles:bioFx.count(),reducedMotion,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,...(biomeActive?biomeView.info():{}),assetEnemies:assetEnemies.count()+modularEnemies.count(),...modularEnemies.info(),...modelInfo()})};
}
