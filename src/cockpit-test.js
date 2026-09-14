// Standalone development experiment. Not imported by the game or its production build.
import './cockpit-test.css';
import * as T from 'three';
import {createRun} from './game.js';
import {createPart} from './assembly.js';
import {prepareBiomes} from './biome-run.js';
import {createBiomeView} from './biome-view.js';
import {createForestAmbientView} from './forest-ambient-view.js';
import {creatureModel} from './game-view.js';
import {movePlayer} from './elevation.js';
import {bodySize} from './body-size.js';
import {frameWork} from './frame-work.js';
import {movementFromDrag} from './simulation.js';

const $=id=>document.getElementById(id),canvas=$('world'),stage=$('cockpit-test');
const run=prepareBiomes(createRun(undefined,'survival',20260913));
run.arms=[createPart(run,'pistol'),createPart(run,'pistol')];
const spawn={...run.player},scale=bodySize(run.body).scale;
const scene=new T.Scene(),cockpitFog=new T.Fog('#b0c3c7',38,110);scene.background=new T.Color('#b0c3c7');scene.fog=cockpitFog;
const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'low-power'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const sky=new T.HemisphereLight('#d6e5ef','#65737b',.9),sun=new T.DirectionalLight('#ffdfad',3.2);scene.add(sky,sun,sun.target);
const ambient=createForestAmbientView(scene),world=createBiomeView(scene,ambient.uniforms,renderer);
const hero=creatureModel(run);scene.add(hero);hero.scale.setScalar(scale);
let modelsReady=false;hero.userData.modelsReady.then(()=>{modelsReady=true;}).catch(()=>{$('status').textContent='Не удалось загрузить робота. Обновите страницу.';});
const cockpit=new T.PerspectiveCamera(70,1,.07,180),overhead=new T.OrthographicCamera(-25,25,25,-25,.1,600);
let mode='cockpit',yaw=Math.PI,pitch=-.12,targetYaw=yaw,targetPitch=pitch,last=performance.now(),walking=0;
let movePointer=null,lookPointer=null;const movement={x:0,z:0},keys=new Set(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
function stop(){keys.clear();movement.x=movement.z=0;const pointers=[movePointer,lookPointer];movePointer=lookPointer=null;$('stick').hidden=true;for(const p of pointers)if(p&&canvas.hasPointerCapture(p.id))canvas.releasePointerCapture(p.id);}
function setMode(value){stop();mode=value;scene.fog=value==='cockpit'?cockpitFog:null;stage.dataset.mode=value;for(const id of ['cockpit','overhead'])$(id).setAttribute('aria-pressed',String(id===value));$('controls').textContent=value==='cockpit'?'WASD — ходьба · мышь с зажатием / Q E — обзор':'WASD или перетаскивание мышью — ходьба';canvas.focus({preventScroll:true});}
for(const id of ['cockpit','overhead'])$(id).onclick=()=>setMode(id);
$('reset').onclick=()=>{stop();Object.assign(run.player,spawn);yaw=targetYaw=Math.PI;pitch=targetPitch=-.12;walking=0;canvas.focus({preventScroll:true});};
canvas.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;canvas.focus({preventScroll:true});
 const rect=canvas.getBoundingClientRect(),look=mode==='cockpit';
 if(look?lookPointer:movePointer)return;
 const pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
 if(look)lookPointer=pointer;else{movePointer=pointer;$('stick').hidden=false;Object.assign($('stick').style,{left:(pointer.x-rect.left)+'px',top:(pointer.y-rect.top)+'px'});}
 canvas.setPointerCapture(event.pointerId);event.preventDefault();
});
canvas.addEventListener('pointermove',event=>{
 if(lookPointer?.id===event.pointerId){targetYaw=wrap(targetYaw-(event.clientX-lookPointer.x)*.004);targetPitch=Math.max(-.7,Math.min(.55,targetPitch-(event.clientY-lookPointer.y)*.003));lookPointer.x=event.clientX;lookPointer.y=event.clientY;}
 if(movePointer?.id===event.pointerId){Object.assign(movement,movementFromDrag(event.clientX-movePointer.x,event.clientY-movePointer.y));$('stick').firstElementChild.style.transform=`translate(${movement.x*26}px,${movement.z*26}px)`;}
});
function release(event){if(movePointer?.id===event.pointerId){movePointer=null;movement.x=movement.z=0;$('stick').hidden=true;}if(lookPointer?.id===event.pointerId)lookPointer=null;}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,release);
window.addEventListener('keydown',event=>{if(event.target!==canvas)return;if(/^(Key[WASDQE]|Arrow(Up|Down|Left|Right))$/.test(event.code)){event.preventDefault();keys.add(event.code);}if(event.code==='Escape')stop();});
window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();$('status').textContent='Графический контекст потерян. Обновите страницу.';});
setMode('cockpit');
let statusKey='';
function frame(now){
 requestAnimationFrame(frame);if(document.hidden){last=now;return;}if(now-last<1000/30-1)return;
 const dt=Math.min(.05,(now-last)/1000);last=now;frameWork.pump();
 const w=canvas.clientWidth,h=canvas.clientHeight,aspect=w/Math.max(1,h);
 if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);
 targetYaw=wrap(targetYaw+(Number(keys.has('KeyQ'))-Number(keys.has('KeyE')))*dt*1.6);
 const blend=reducedMotion?1:1-Math.exp(-18*dt);yaw=wrap(yaw+wrap(targetYaw-yaw)*blend);pitch+=(targetPitch-pitch)*blend;
 const keyboard={x:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),z:Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'))};
 const input=keyboard.x||keyboard.z?keyboard:movement,length=Math.max(1,Math.hypot(input.x,input.z)),ix=input.x/length,iz=input.z/length;
 // Camera forward is +Z at yaw=0; its right vector is -X.
 const vx=mode==='cockpit'?-Math.cos(yaw)*ix-Math.sin(yaw)*iz:ix,vz=mode==='cockpit'?Math.sin(yaw)*ix-Math.cos(yaw)*iz:iz;
 const before={...run.player};if(run.streaming?.ready.has(run.world.tileAt(run.player.x,run.player.z)?.id))movePlayer(run,dt,vx*5*dt,vz*5*dt);
 const moved=Math.hypot(run.player.x-before.x,run.player.z-before.z);walking+=moved;
 run.time+=dt;run.motion={x:(run.player.x-before.x)/dt,z:(run.player.z-before.z)/dt,pace:1};
 if(mode==='overhead'&&moved>.001)yaw=targetYaw=Math.atan2(vx,vz);
 run.player.facing=yaw;hero.position.set(run.player.x,run.player.y??0,run.player.z);hero.rotation.y=yaw;
 const stride=reducedMotion?0:Math.sin(walking*3);hero.userData.legs.forEach((leg,i)=>leg.rotation.x=stride*(i%2?1:-1)*.25);
 hero.visible=modelsReady;hero.userData.structuralFrame?.update();
 cockpit.aspect=aspect;cockpit.fov=T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(66)/2)/Math.min(1,aspect)));
 const bob=reducedMotion||moved<.001?0:Math.sin(walking*4)*.018;
 cockpit.position.set(run.player.x,(run.player.y??0)+1.72*scale+bob,run.player.z);
 cockpit.lookAt(cockpit.position.x+Math.sin(yaw)*Math.cos(pitch),cockpit.position.y+Math.sin(pitch),cockpit.position.z+Math.cos(yaw)*Math.cos(pitch));cockpit.updateProjectionMatrix();
 overhead.left=-17*aspect;overhead.right=17*aspect;overhead.top=17;overhead.bottom=-17;overhead.position.set(run.player.x,(run.player.y??0)+30,run.player.z+40);overhead.lookAt(run.player.x,run.player.y??0,run.player.z-1.4);overhead.updateProjectionMatrix();
 const camera=mode==='cockpit'?cockpit:overhead;camera.updateMatrixWorld();
 sun.position.set(run.player.x-45,(run.player.y??0)+75,run.player.z-45);sun.target.position.copy(hero.position);sun.target.updateMatrixWorld();
 ambient.update(run,dt,'low',reducedMotion);world.update(run,camera,dt);
 // Hide the chassis only during the cabin pass; preserve authored visibility and async model loading.
 const hidden=mode==='cockpit'?hero.children.filter(child=>child.visible&&![...hero.userData.arms.values()].includes(child)):[];
 for(const child of hidden)child.visible=false;
 renderer.render(scene,camera);
 for(const child of hidden)child.visible=true;
 const info=world.info(),ready=run.streaming?.ready.has(run.world.tileAt(run.player.x,run.player.z)?.id),nextStatus=info.assetErrors?'Не удалось загрузить окружение. Обновите страницу.':!ready||!modelsReady?'Загрузка окружения…':'';
 if(nextStatus!==statusKey){$('status').textContent=nextStatus;statusKey=nextStatus;}
 stage.dataset.ready=String(ready&&modelsReady);stage.dataset.position=`${run.player.x.toFixed(2)},${(run.player.y??0).toFixed(2)},${run.player.z.toFixed(2)}`;stage.dataset.yaw=yaw.toFixed(3);stage.dataset.pitch=pitch.toFixed(3);stage.dataset.assetErrors=String(info.assetErrors);stage.dataset.moveActive=String(!!movePointer);stage.dataset.lookActive=String(!!lookPointer);
}
requestAnimationFrame(frame);
