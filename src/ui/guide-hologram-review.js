import {createPart,stats} from '../assembly.js';
import {button,iconButton} from './atoms.js';
import './guide-hologram-review.css';

const steps=[
 {eyebrow:'Сборка тела',title:'Найди деталь',copy:'Справа находится инвентарь. Нажми на «Инъектор», чтобы выбрать деталь.',action:'Выбрать'},
 {eyebrow:'Сборка тела',title:'Выбери крепление',copy:'Подходящее свободное крепление подсвечено слева. Нажми на «Рука 2».',action:'Установить'},
 {eyebrow:'Сборка тела',title:'Деталь установлена',copy:'Инъектор занял крепление «Рука 2» и появился на роботе. Сборку можно менять в любой момент.',action:'Готово'},
];

function interfaceMarkup(frame){
 return `<div class="guide-assembly-real ui-dialog" data-screen="assembly" open aria-label="Настоящий экран сборки из игры">
  <header class="guide-assembly-real-head ui-screen-header">${frame.header}</header>
  <div class="guide-assembly-content">${frame.body}</div>
 </div>`;
}

/** DEV-only concept route. It is intentionally not connected to the main menu. */
export function prepareGuideHologramReview(run,{updateHud=()=>{},renderAssembly=()=>({header:'',body:''}),previewHolder=null}={}){
 run.body=createPart(run,'wanderer');
 run.arms=[createPart(run,'claws'),null];
 run.legs=[createPart(run,'universal'),createPart(run,'universal')];
 run.organs=[null,null];
 run.inventory=[];run.enemies=[];run.hostileShots=[];run.ground=[];
 run.overloadGuide=true;
 run.guideHologram=true;
 // Use the real forest grove: its ground, foliage and morning weather stay shared.
 const grove=run.world.tiles.find(tile=>tile.biome==='forest'&&tile.kind==='grove'&&!tile.visualEnvironmentId);
 if(grove){
   Object.assign(run.player,{x:grove.x,z:grove.z,y:run.world.heightAt(grove.x,grove.z)??0});
   // Keep the close-up framed by the real grove foliage. The camera is much
   // tighter for this DEV tutorial, so the authored banks can otherwise fall
   // outside the narrow side edges; reuse the same forest detail shell and
   // leave the central robot lane clear.
   const source=grove.decorations.find(item=>item.feature==='thicket'&&item.forestDetail);
   if(source){
    const edgeBanks=[
     [-10.8,-1.4,8.4,7.4],[10.8,-1.4,8.4,7.4],[-10.1,7.6,7.2,6.4],[10.1,7.6,7.2,6.4],
     [-5.4,3.8,5.8,6.2],[5.4,3.8,5.8,6.2],[-6.0,9.0,6.4,7.2],[6.0,9.0,6.4,7.2]
    ];
    for(const [dx,dz,width,height] of edgeBanks){
     grove.decorations.push({...source,x:grove.x+dx,z:grove.z+dz,size:width,height,
      radius:width*.4,forestDetail:{...source.forestDetail,width,height,depth:source.forestDetail.depth},
      collisionProfile:undefined,collisionFootprint:undefined,coverModel:undefined});
    }
   }
 }
 run.health.invulnerableUntil=Infinity;run.hp=stats(run).hp;
 const demoPart=createPart(run,'needle');
 let step=0;
 const root=document.createElement('section');
 root.className='guide-hologram ui-dialog-surface';root.setAttribute('aria-label','Тестовая памятка: установка детали');
 document.body.classList.add('is-guide-hologram-review');
 document.querySelector('#game').append(root);

 function applyModel(){
  run.arms[1]=step===2?demoPart:null;
  run.inventory=step===2?[]:[demoPart];
  updateHud();
 }
 function markTarget(element,label,{selected=false,complete=false}={}){
  if(!element)return;
  element.classList.add('is-guide-target');
  if(selected){element.classList.add('is-guide-selected');element.setAttribute('aria-pressed','true');}
  if(complete)element.classList.add('is-guide-complete');
  element.dataset.guideTarget='true';
  element.insertAdjacentHTML('beforeend',`<span class="guide-target-badge">${label}</span>`);
 }
 function decorateStep(){
  const inventory=root.querySelector('.ui-inventory-scroll [data-action="part"]');
  const freeMount=root.querySelector('.ui-loadout-side:first-child .ui-slot:nth-child(2) button');
  if(step===0)markTarget(inventory,'Нажми');
  if(step===1){
   inventory?.classList.add('is-guide-selected');
   inventory?.setAttribute('aria-pressed','true');
   markTarget(freeMount,'Сюда',{selected:true});
  }
  if(step===2)markTarget(freeMount,'Готово',{complete:true});
 }
 function render(){
  const current=steps[step];applyModel();
  const assembly=renderAssembly();
  root.dataset.step=String(step);
  const progress=steps.map((_,i)=>`<i class="${i===step?'is-current':i<step?'is-done':''}"></i>`).join('');
  root.innerHTML=`<div class="guide-hologram-beam" aria-hidden="true"></div><div class="guide-hologram-scan" aria-hidden="true"></div><header class="guide-hologram-header"><small class="ui-eyebrow">${current.eyebrow}</small><div class="guide-hologram-header-actions"><div class="guide-progress" aria-label="Шаг ${step+1} из ${steps.length}"><span>${progress}</span></div>${iconButton('close','Закрыть памятку',{action:'guide-close',variant:'quiet',className:'guide-close'})}</div></header><div class="guide-hologram-copy"><span class="guide-hologram-copy-kicker">Что делать</span><h1>${current.title}</h1><p>${current.copy}</p></div>${interfaceMarkup(assembly)}<footer>${button('Назад',{action:'guide-back',variant:'quiet',disabled:step===0})}${button(current.action,{action:'guide-next',variant:'primary'})}</footer>`;
  if(previewHolder){const mount=root.querySelector('#preview-mount');if(mount){mount.append(previewHolder);previewHolder.hidden=false;}}
  decorateStep();
 }
 const review={paused:true,tick(){run.enemies.length=0;run.hostileShots.length=0;},close(){if(previewHolder){previewHolder.hidden=true;document.body.append(previewHolder);}root.remove();run.guideHologram=false;document.body.classList.remove('is-guide-hologram-review');review.paused=false;updateHud();}};
  root.addEventListener('click',event=>{
  const direct=event.target.closest('[data-guide-target]');
  if(direct&&step<steps.length-1){step+=1;render();return;}
  const action=event.target.closest('button')?.dataset.action;
  if(action==='guide-close'){review.close();return;}
  if(action==='guide-back'){step=Math.max(0,step-1);render();}
  if(action==='guide-next'){if(step===steps.length-1)review.close();else {step+=1;render();}}
 });
 render();
 return review;
}
