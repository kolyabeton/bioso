import {button,icon,iconButton,frame,badge} from '../../../src/ui/atoms.js';
import {abilityArt} from '../../../src/ui/ability-tree.js';
import {ABILITIES,BRANCHES,abilityDescriptionAtLevel} from '../../../src/systems/abilities.js';

const mount=document.getElementById('ability-spine-review');
const learned=new Set(['might.0']);
const levels={'might.0':1};
const synergies=Object.values(ABILITIES).filter(ability=>ability.branch==='synergy');
let branch='might',selected='might.2';

const definition=id=>ABILITIES[id];
const branchNodes=id=>{
  const direct=definition(id);
  if(direct?.branch==='synergy')return [...direct.requires.map(definition),direct].filter(Boolean);
  return Object.values(ABILITIES).filter(ability=>ability.branch===id);
};
const learnedLevels=id=>branchNodes(id).reduce((sum,node)=>sum+(levels[node.id]||0),0);
const branches=[...Object.entries(BRANCHES),...synergies.map(ability=>[ability.id,ability.name])]
  .sort(([left],[right])=>Number(learnedLevels(right)>0)-Number(learnedLevels(left)>0));
const stateOf=ability=>{
  if(learned.has(ability.id))return'learned';
  if(!ability.requires.length)return'available';
  const complete=ability.requireMode==='all'
    ?ability.requires.every(id=>learned.has(id))
    :ability.requires.some(id=>learned.has(id));
  return complete?'available':'locked';
};
const stateLabel=state=>state==='learned'?'Изучено':state==='available'?'Доступно':'Закрыто';
const stateIcon=state=>icon(state==='learned'?'check':state==='locked'?'lock':'plus');
const spine=()=>`<span class="ds-spine-core" aria-hidden="true">${'<i></i>'.repeat(9)}</span>`;

function branchButton(id,name){
  const ability=definition(id)||definition(`${id}.0`),active=id===branch,count=learnedLevels(id);
  return button(name,{action:'review-branch','data-id':id,'aria-label':`${name}. ${count?`Изучено уровней: ${count}`:'Не изучено'}`,'aria-pressed':String(active),title:name,variant:'quiet',className:'ds-branch-button'})
    .replace('><span>',`>${abilityArt(ability?.id)}<span>`);
}

function node(ability,position){
  const state=stateOf(ability),active=ability.id===selected;
  const content=`${abilityArt(ability.id)}<span class="ds-node-status">${stateIcon(state)}<span>${stateLabel(state)}</span></span>`;
  return `<div class="ds-spine-stop ds-spine-stop--${position}">${frame(content,{tag:'button',className:`ds-spine-node is-${state}${active?' is-inspected':''}`,'data-action':'review-node','data-id':ability.id,'aria-pressed':String(active),'aria-label':`${ability.name}. ${stateLabel(state)}`})}</div>`;
}

function tree(){
  const nodes=branchNodes(branch),direct=definition(branch);
  if(direct?.branch==='synergy'){
    const [left,right,final]=nodes;
    return `<div class="ds-spine-tree ds-spine-tree--synergy">${spine()}${node(left,'left')}${node(right,'right')}${node(final,'final')}</div>`;
  }
  const root=nodes.find(ability=>ability.tier===1)||nodes[0];
  const middle=nodes.filter(ability=>ability.tier===2);
  const final=nodes.find(ability=>ability.tier===3)||nodes.at(-1);
  return `<div class="ds-spine-tree">${spine()}${node(root,'root')}${middle.map((ability,index)=>node(ability,index%2?'right':'left')).join('')}${final&&final!==root?node(final,'final'):''}</div>`;
}

function inspector(){
  const ability=definition(selected)||branchNodes(branch)[0],state=stateOf(ability),rank=levels[ability.id]||0;
  return frame(`<header>${abilityArt(ability.id)}<div><span class="ui-eyebrow">Выбранный узел</span><h4>${ability.name}</h4></div>${badge(stateLabel(state),state==='available'?'mint':'neutral')}</header><p>${abilityDescriptionAtLevel(ability,Math.max(1,rank||1))}</p><p class="ds-inspector-note">${state==='available'?'Может появиться при следующем повышении уровня.':state==='learned'?`Уровень ${rank} / ${ability.maxLevel}.`:'Сначала изучите требуемые способности.'}</p>`,{className:'ds-spine-inspector'});
}

function render(){
  const name=definition(branch)?.name||BRANCHES[branch];
  mount.innerHTML=`<header class="ui-screen-header">${iconButton('back','Назад',{action:'review-back'})}<div><span class="ui-eyebrow">Душа · ветки</span><h2>Развитие способности</h2></div></header><div class="ds-spine-workspace"><aside class="ds-branch-rail"><nav aria-label="Ветки развития">${branches.map(([id,label])=>branchButton(id,label)).join('')}</nav></aside><section class="ds-spine-reading"><header><span class="ui-eyebrow">Ветка</span><h3>${name}</h3></header><div class="ds-spine-scroll" tabindex="0" aria-label="Ветка ${name} — прокрутка вниз">${tree()}${inspector()}</div></section></div>`;
}

mount.addEventListener('click',event=>{
  const target=event.target.closest('[data-action]');if(!target)return;
  if(target.dataset.action==='review-branch'){
    branch=target.dataset.id;selected=branchNodes(branch)[0]?.id;render();
  }else if(target.dataset.action==='review-node'){
    selected=target.dataset.id;render();document.querySelector(`[data-id="${CSS.escape(selected)}"]`)?.focus({preventScroll:true});
  }
});

render();
