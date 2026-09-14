import {e,icon,button,frame} from './atoms.js';
import {ABILITIES,FALLBACKS,abilityDescriptionAtLevel,abilityRankGrowth} from '../systems/abilities.js';
const ART_ALIASES={'minor.hp':'vitality.0','ricochet.0':'projectiles.1','ricochet.1':'might.0','ricochet.2':'electric.1','ricochet.3':'might.1'};
export function abilityArt(id){if(!Object.hasOwn(ABILITIES,id)&&!Object.hasOwn(FALLBACKS,id))return'';const artId=ART_ALIASES[id]||id;return`<img class="ui-ability-art" src="/assets/ui/abilities/${e(artId)}.png" alt="" width="64" height="64" decoding="async">`;}
// Branch badges count purchased ranks; a synergy counts only its own ranks.
export function abilityBranchOption(id,name,learned,selected,levels={}){
 const ids=learned.filter(key=>ABILITIES[id]?key===id:ABILITIES[key]?.branch===id),count=[...new Set(ids)].reduce((sum,key)=>sum+(levels[key]||ids.filter(id=>id===key).length),0);
 const label=`${name} · Получено уровней: ${count}`;
 return button(name,{action:'soul-branch','data-id':id,title:name,'aria-label':label,'aria-pressed':String(selected),variant:'quiet',className:'ui-branch-button'})
  .replace('><span>',`>${abilityArt(ABILITIES[id]?id:`${id}.0`)}<span>`);
}
const browseSpine=()=>`<span class="ui-ability-spine" aria-hidden="true">${'<i></i>'.repeat(9)}</span>`;
function browseNode(node,preview,position){
 const active=node.id===preview.id;
 return `<div class="ui-spine-stop ui-spine-stop--${position}">${frame(abilityArt(node.id),{tag:'button',className:`ui-spine-node${active?' is-inspected':''}`,'data-action':'ability-node','data-id':node.id,'aria-pressed':String(active),'aria-label':node.name})}</div>`;
}
function browseTree(card,preview,previewDescription){
 const nodes=card.nodes;
 let graph='';
 if(card.branch==='synergy'){
  const prerequisites=nodes.filter(node=>node.id!==card.id),final=nodes.find(node=>node.id===card.id);
  graph=`<div class="ui-spine-tree ui-spine-tree--synergy">${browseSpine()}${browseNode(prerequisites[0],preview,'left')}${browseNode(prerequisites[1],preview,'right')}${browseNode(final,preview,'final')}</div>`;
 }else{
  const root=nodes.find(node=>node.tier===1)||nodes[0],middle=nodes.filter(node=>node.tier===2),final=nodes.find(node=>node.tier===3);
  graph=`<div class="ui-spine-tree${final?'':' ui-spine-tree--fanout'}">${browseSpine()}${browseNode(root,preview,'root')}${middle.map((node,index)=>browseNode(node,preview,index===0?'left':index===1?'right':'final')).join('')}${final?browseNode(final,preview,'final'):''}</div>`;
 }
 return `${graph}${frame(`<header>${abilityArt(preview.id)}<div><h4>${e(preview.name)}</h4></div></header><p>${e(previewDescription)}</p>`,{className:'ui-spine-inspector'})}`;
}
export function abilityTree(card,previewId){
 if(!card)return '<p>Способность недоступна. Вернитесь к выбору.</p>';
 const nodes=card.nodes.length?card.nodes:[{...card,state:'available'}];
 const preview=nodes.find(n=>n.id===previewId)||nodes.find(n=>n.id===card.id)||card;
 const previewLevel=preview.id===card.id&&!card.readOnly?preview.nextLevel:(preview.level||1);
 const previewDescription=abilityDescriptionAtLevel(preview,previewLevel);
 if(card.readOnly)return browseTree(card,preview,previewDescription);
 const growth=abilityRankGrowth(preview),rankRule=growth===0?'Изучается один раз.':growth===1?'Повторные уровни дают полный базовый шаг.':growth===.5?'Повторные уровни дают 50% базового шага.':growth==='custom'?'У способности своя сбалансированная кривая рангов.':'Повторные уровни дают 40% базового шага.';
 const status=n=>n.id===card.id&&!card.readOnly?(n.level?`Улучшить: ${n.level} → ${n.nextLevel}`:`Изучить: 1 / ${n.maxLevel}`):n.maxed?`Максимум: ${n.maxLevel} / ${n.maxLevel}`:n.state==='learned'?`Уровень ${n.level} / ${n.maxLevel}`:n.state==='available'?'Доступно':'Закрыто';
 const node=n=>`<button type="button" class="ui-skill-node is-${n.state} ${n.maxed?'is-maxed':''} ${n.id===card.id&&!card.readOnly?'is-selected':''} ${n.id===preview.id?'is-inspected':''}" data-action="ability-node" data-id="${e(n.id)}" aria-pressed="${n.id===preview.id}" aria-label="${e(n.name)} · ${status(n)}">${abilityArt(n.id)}<span class="ui-skill-copy"><strong>${e(n.name)}</strong></span><span class="ui-skill-state">${icon(n.state==='learned'?'check':n.state==='locked'?'lock':n.id===card.id?'pointer':'plus')}${status(n)}</span></button>`;
 const junction=mode=>`<div class="ui-tree-join" aria-hidden="true"><span>${mode}</span></div>`;
 let graph;
 if(card.branch==='minor')graph=`<div class="ui-tree-single">${node(nodes[0])}</div><p class="ui-tree-rule">Повторяемое усиление · не требует других способностей.</p>`;
 else if(card.branch==='synergy')graph=`<div class="ui-tree-pair">${nodes.filter(n=>n.id!==card.id).map(node).join('')}</div>${junction('И')}<div class="ui-tree-single">${node(nodes.find(n=>n.id===card.id))}</div><p class="ui-tree-rule">Нужны обе указанные финальные способности.</p>`;
 else if(!nodes.some(n=>n.tier===3))graph=`<div class="ui-tree-single">${nodes.filter(n=>n.tier===1).map(node).join('')}</div><div class="ui-tree-split ui-tree-split--three" aria-hidden="true"></div><div class="ui-tree-triple">${nodes.filter(n=>n.tier===2).map(node).join('')}</div><p class="ui-tree-rule">Три независимых направления улучшают открытую механику.</p>`;
 else graph=`<div class="ui-tree-single">${nodes.filter(n=>n.tier===1).map(node).join('')}</div><div class="ui-tree-split" aria-hidden="true"></div><div class="ui-tree-pair">${nodes.filter(n=>n.tier===2).map(node).join('')}</div>${junction('ИЛИ')}<div class="ui-tree-single">${nodes.filter(n=>n.tier===3).map(node).join('')}</div><p class="ui-tree-rule">Для финала достаточно одного улучшения.<br><span>Можно изучить оба — они не исключают друг друга.</span></p>`;
 return `<div class="ui-skill-layout"><section class="ui-skill-tree" aria-label="Ветка ${e(card.branchName)}"><h3>${e(card.branchName)}</h3>${graph}</section><section class="ui-skill-inspector" aria-live="polite"><h4>Эффект: ${e(preview.name)}</h4><p>${e(previewDescription)}</p><p class="ui-note">Уровень ${preview.level||0} / ${preview.maxLevel}. ${preview.maxed?'Достигнут максимум.':rankRule}</p>${!card.readOnly&&preview.id!==card.id?`<p class="ui-note">${preview.maxed?'Достигнут максимум.':preview.state==='learned'?'Уже изучено — может снова появиться при повышении уровня.':preview.state==='locked'?'Сначала изучите требуемые способности.':preview.offered?'Есть в предложениях сверху — выберите её там.':'Может появиться при следующих повышениях уровня.'}</p>`:''}<p class="ui-note">${card.readOnly?'Навыки изучаются при повышении уровня.':card.branch==='minor'?'Бонус суммируется до пятого уровня.':'Изучение подтверждается отдельной кнопкой внизу.'}</p></section></div>`;
}
