import {e,icon,button} from './atoms.js';
import {ABILITIES,FALLBACKS} from '../systems/abilities.js';
export function abilityArt(id){return Object.hasOwn(ABILITIES,id)||Object.hasOwn(FALLBACKS,id)?`<img class="ui-ability-art" src="/assets/ui/abilities/${e(id)}.png" alt="" width="64" height="64" decoding="async">`:'';}
// Branch badges count purchased nodes; a synergy counts only its own purchase.
export function abilityBranchOption(id,name,learned,selected){
 const count=learned.filter(key=>ABILITIES[id]?key===id:ABILITIES[key]?.branch===id).length;
 const label=`${name} · Изучено: ${count}`;
 return button(name,{action:'soul-branch','data-id':id,title:label,'aria-label':label,'aria-pressed':String(selected),variant:selected?'selected':'secondary'})
  .replace('><span>',`>${abilityArt(ABILITIES[id]?id:`${id}.0`)}${selected?'<i class="ui-branch-selected" aria-hidden="true">✓</i>':''}${count?`<i class="ui-branch-count" aria-hidden="true">${count}</i>`:''}<span>`);
}
export function abilityTree(card,previewId){
 if(!card)return '<p>Способность недоступна. Вернитесь к выбору.</p>';
 const nodes=card.nodes.length?card.nodes:[{...card,state:'available'}];
 const preview=nodes.find(n=>n.id===previewId)||nodes.find(n=>n.id===card.id)||card;
 const status=n=>n.state==='learned'?'Изучено':n.id===card.id&&!card.readOnly?'Выбрано':n.state==='available'?'Доступно':'Закрыто';
 const node=n=>`<button type="button" class="ui-skill-node is-${n.state} ${n.id===card.id&&!card.readOnly?'is-selected':''} ${n.id===preview.id?'is-inspected':''}" data-action="ability-node" data-id="${e(n.id)}" aria-pressed="${n.id===preview.id}" aria-label="${e(n.name)} · ${status(n)}">${abilityArt(n.id)}<span class="ui-skill-copy"><strong>${e(n.name)}</strong></span><span class="ui-skill-state">${icon(n.state==='learned'?'check':n.state==='locked'?'lock':n.id===card.id?'pointer':'plus')}${status(n)}</span></button>`;
 const junction=mode=>`<div class="ui-tree-join" aria-hidden="true"><span>${mode}</span></div>`;
 let graph;
 if(card.branch==='minor')graph=`<div class="ui-tree-single">${node(nodes[0])}</div><p class="ui-tree-rule">Повторяемое усиление · не требует других способностей.</p>`;
 else if(card.branch==='synergy')graph=`<div class="ui-tree-pair">${nodes.filter(n=>n.id!==card.id).map(node).join('')}</div>${junction('И')}<div class="ui-tree-single">${node(nodes.find(n=>n.id===card.id))}</div><p class="ui-tree-rule">Нужны обе указанные финальные способности.</p>`;
 else graph=`<div class="ui-tree-single">${nodes.filter(n=>n.tier===1).map(node).join('')}</div><div class="ui-tree-split" aria-hidden="true"></div><div class="ui-tree-pair">${nodes.filter(n=>n.tier===2).map(node).join('')}</div>${junction('ИЛИ')}<div class="ui-tree-single">${nodes.filter(n=>n.tier===3).map(node).join('')}</div><p class="ui-tree-rule">Для финала достаточно одного улучшения.<br><span>Можно изучить оба — они не исключают друг друга.</span></p>`;
 return `<div class="ui-skill-layout"><section class="ui-skill-tree" aria-label="Ветка ${e(card.branchName)}"><h3>${e(card.branchName)}</h3>${graph}</section><section class="ui-skill-inspector" aria-live="polite"><h4>Эффект: ${e(preview.name)}</h4><p>${e(preview.description)}</p>${!card.readOnly&&preview.id!==card.id?`<p class="ui-note">${preview.state==='learned'?'Уже изучено':preview.state==='locked'?'Сначала изучите требуемые способности.':preview.offered?'Есть в предложениях сверху — выберите её там.':'Может появиться при следующих повышениях уровня.'}</p>`:''}<p class="ui-note">${card.readOnly?'Навыки изучаются при повышении уровня.':card.branch==='minor'?'Бонус суммируется при повторном изучении.':'Изучение подтверждается отдельной кнопкой внизу.'}</p></section></div>`;
}
