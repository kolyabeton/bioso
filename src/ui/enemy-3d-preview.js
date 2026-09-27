import * as T from 'three';
import {assembleEnemy} from '../systems/enemy-assembly.js';
import {createEnemyAssemblyView,enemyVisualParts} from '../enemy-assembly-view.js';
import {loadModel} from '../asset-models.js';

// The atlas keeps one live preview at a time. This uses the same modular
// assembly view as the combat scene, so the inspector shows the real chassis,
// limbs, organs and weapon GLBs instead of a second icon language.
export function enemyPreviewArt(entry){
 return `<canvas class="ui-enemy-3d-preview" data-enemy-3d="${entry.key}" width="144" height="144" aria-label="3D-модель: ${entry.name}"></canvas>`;
}

export function enemyPreviewThumb(entry){
 return `<canvas class="ui-enemy-3d-thumb" data-enemy-3d-thumb="${entry.key}" width="128" height="128" aria-label="3D-модель: ${entry.name}"></canvas>`;
}

const previewEnemy=entry=>({id:1,x:0,y:0,z:0,radius:1.15,hp:1,kind:entry.kind,role:entry.role,assemblyRole:entry.role,recipeId:entry.id,specialty:entry.specialty??null,flying:entry.role==='flying',tier:entry.kind==='boss'?3:1,enemyAttack:{index:0,readyAt:Infinity,warning:null},assembly:assembleEnemy(entry,entry.kind==='boss'?3:1,entry.kind==='boss'?'boss':'normal')});
const anatomyByRole=Object.freeze({mass:'anatomy-quadruped',fast:'anatomy-flyer',armored:'anatomy-crawler',ranged:'anatomy-biped',flying:'anatomy-flyer',boss:'boss-warden'});
const thumbEnemy=entry=>{const enemy=previewEnemy(entry);enemy.previewParts=[{asset:anatomyByRole[entry.role]||'anatomy-quadruped',size:2,position:[0,0,0],rotation:[0,Math.PI,0],anchor:'bottom'}];return enemy;};

function previewScene(canvas,{thumb=false}={}){
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 const scene=new T.Scene();scene.add(new T.HemisphereLight('#f5ebd0','#29433d',2.2));
 const key=new T.DirectionalLight('#fff3d6',3.2);key.position.set(3,6,5);scene.add(key);
 const fill=new T.DirectionalLight('#79c6bb',1.1);fill.position.set(-4,3,-3);scene.add(fill);
 const camera=new T.OrthographicCamera(-2.5,2.5,2.5,-2.5,.1,100);camera.position.set(4.5,3.7,6.5);camera.lookAt(0,.9,0);
 const view=createEnemyAssemblyView(scene,{load:loadModel,renderer,camera});
 const resize=()=>{const width=thumb?128:Math.max(1,canvas.clientWidth||144),height=thumb?128:Math.max(1,canvas.clientHeight||144),aspect=width/height,span=3.7;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();renderer.setSize(width,height,false);};
 resize();return{renderer,scene,camera,view,resize};
}

export function mountEnemyPreview(canvas,entry){
 if(!canvas||!entry)return()=>{};
 const {renderer,scene,camera,view,resize}=previewScene(canvas);
 const enemy=previewEnemy(entry);let raf=0,disposed=false;
 const frame=now=>{
  if(disposed)return;
  raf=requestAnimationFrame(frame);resize();
  const time=now/1000;
  enemy.facing=Math.sin(time*.35)*.3;
  view.update([enemy],{x:0,z:100},time,1,true,camera);
  renderer.render(scene,camera);last=now;
 };
 raf=requestAnimationFrame(frame);
 return()=>{disposed=true;cancelAnimationFrame(raf);view.dispose();renderer.dispose();scene.clear();};
}

let thumbState=null;
function ensureThumbState(){
 if(thumbState)return thumbState;
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;canvas.setAttribute('aria-hidden','true');
 const stage=previewScene(canvas,{thumb:true});thumbState={...stage,canvas,queued:new Set(),generation:0};return thumbState;
}

export function mountEnemyCatalogThumbs(root,entries=[]){
 const state=ensureThumbState(),generation=++state.generation,nodes=[...root.querySelectorAll('[data-enemy-3d-thumb]')];
 const jobs=nodes.map(canvas=>({canvas,entry:entries.find(item=>item?.key===canvas.getAttribute('data-enemy-3d-thumb'))})).filter(job=>job.entry);
 const assets=new Set();
 for(const {entry} of jobs){const enemy=thumbEnemy(entry);state.view.update([enemy],{x:0,z:100},0,1,true,state.camera);for(const part of (awaitableParts(enemy)))assets.add(part.asset);}
 const allAssets=Promise.all([...assets].map(loadModel)).catch(()=>[]);
 const drawThumbs=()=>{
  if(state.generation!==generation)return;
  jobs.forEach(({canvas,entry})=>{
   if(!canvas.isConnected)return;
   try{state.view.reset();const enemy=thumbEnemy(entry);enemy.facing=.18;state.view.update([enemy],{x:0,z:100},0,1,true,state.camera);state.renderer.render(state.scene,state.camera);
    const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(state.canvas,0,0,canvas.width,canvas.height);canvas.classList.add('is-ready');
   }catch{}
  });
 };
 // Show the first resolved assemblies quickly, then redraw once the slower
 // weapon and organ GLBs have arrived.
 Promise.race([allAssets,new Promise(resolve=>setTimeout(resolve,2200))]).then(drawThumbs);
 allAssets.then(drawThumbs);
}

function awaitableParts(enemy){
 return enemy.previewParts||enemyVisualParts(enemy,0,true);
}
