import {rarityText} from './rarity.js';
import {RARITIES,SETS} from '../systems/sets-loot.js';
import {e,icon,iconButton,button} from './atoms.js';
import {partArt} from './molecules.js';

// A light-dismiss item inspector shared by screens and the gameplay dock.
// Interactive controls make this a non-modal popover, rather than an ARIA tooltip.
export function createItemTooltip(host){
 let tip=null,anchor=null;
 function close(restore=false){
  const previous=anchor;tip?.remove();tip=null;anchor=null;
  previous?.removeAttribute('aria-expanded');previous?.removeAttribute('aria-controls');
  if(restore&&previous?.isConnected)previous.focus({preventScroll:true});
 }
 function show(target,{key,name,subtitle,primaryEffect,rows=[],lines=[],setBonus,preview,options=[],selected,rank,maxRank=10,biomass,notice,disabled=false,actionLabel,onAction,onSelect,dropLabel,onDrop,recycleLabel,onRecycle}){
  if(anchor===target&&tip?.matches(':popover-open')){close(true);return;}
  close();anchor=target;
  tip=document.createElement('div');tip.className='ui-frame ui-item-tooltip';
  tip.id='item-inspector';tip.setAttribute('popover','auto');tip.setAttribute('role','dialog');tip.setAttribute('aria-label',name);
  const rarityLine=lines.find(line=>Object.values(RARITIES).some(label=>line===label||line?.startsWith(label+' ·')));
  const rarity=rarityLine?.split(' ·')[0];
  const setName=rarity?rarityLine.slice(rarity.length).replace(/^ ·\s*/, ''):'';
  const copyLines=lines.filter(line=>!rarity||line!==rarityLine);
  const bonusName=setBonus?SETS[setBonus.id]?.name:setName;
  tip.innerHTML=`<header>${partArt(key)}<div class="ui-item-tooltip-heading"><h3>${e(name)}</h3>${subtitle||rarity||bonusName?`<p>${e(subtitle||'')}${subtitle&&rarity?' · ':''}${rarity?rarityText(rarity):''}${bonusName?`${subtitle||rarity?' · ':''}<span class="ui-item-set-label">${e(bonusName)}</span>`:''}</p>`:''}</div>${iconButton('close','Закрыть подсказку',{action:'item-tip-close'})}</header><div class="ui-item-tooltip-panel"><div class="ui-item-tooltip-scroll" tabindex="0" role="region" aria-label="Характеристики и свойства">${primaryEffect?`<p class="ui-item-primary-effect">${e(primaryEffect)}</p>`:''}${preview?`<section class="ui-item-upgrade-preview"><p>${e(preview.label)}</p><div class="ui-item-upgrade-values"><span>${e(preview.before)}</span><span aria-label="станет">→</span><strong>${e(preview.after)}</strong></div></section>`:''}${rank!=null?`<p class="ui-item-upgrade-rank">Усиления <strong>${rank} из ${maxRank}</strong></p>`:''}${rows.length?`<dl class="ui-item-stats">${rows.map(r=>`<div${r.wide?' class="is-wide"':''}><dt>${e(r.label)}</dt><dd>${e(r.value)}</dd></div>`).join('')}</dl>`:''}<div class="ui-item-tooltip-copy">${copyLines.filter(line=>line&&line!==primaryEffect).map(line=>`<p>${rarityText(line)}</p>`).join('')}</div></div>${actionLabel||notice||dropLabel||recycleLabel?`<footer>${biomass!=null?`<div class="ui-item-biomass"><span>Биомасса</span><strong>${icon('soul')}${e(biomass)}</strong></div>`:''}${notice?`<p class="ui-item-notice">${e(notice)}</p>`:''}${actionLabel?button(actionLabel,{action:'item-tip-action',variant:'primary',disabled}):''}${recycleLabel?button(recycleLabel,{action:'item-tip-recycle',icon:'soul'}):''}${dropLabel?button(dropLabel,{action:'item-tip-drop',variant:'outline'}):''}</footer>`:''}</div>`;
  host.append(tip);target.setAttribute('aria-expanded','true');target.setAttribute('aria-controls',tip.id);
  tip.addEventListener('click',event=>{event.stopPropagation();const action=event.target.closest('[data-action]')?.dataset.action;if(action==='item-tip-close')close(true);if(action==='item-tip-recycle'){close();onRecycle?.();}if(action==='item-tip-drop'){close();onDrop?.();}if(action==='item-tip-action'&&!event.target.closest('button')?.disabled){close();onAction?.();}});
  tip.addEventListener('toggle',event=>{if(event.newState==='closed'&&event.target===tip)close(true);});
  tip.showPopover();
  const a=target.getBoundingClientRect(),b=tip.getBoundingClientRect(),margin=8;
  const left=a.left>=b.width+margin*2?a.left-b.width-margin:Math.min(innerWidth-b.width-margin,Math.max(margin,a.right+margin));
  const bounds=host.matches('dialog')?host.getBoundingClientRect():{left:margin,right:innerWidth-margin};
  tip.style.left=`${Math.max(bounds.left,Math.min(left,bounds.right-b.width))}px`;
  tip.style.top=`${Math.max(margin,Math.min(a.top,innerHeight-b.height-margin))}px`;
 }
 host.addEventListener('pointerdown',event=>{if(event.target.closest('[data-drag-source]'))close();});
 host.addEventListener('keydown',event=>{if(event.key==='Escape'&&tip){event.preventDefault();event.stopPropagation();close(true);}},true);
 window.addEventListener('resize',()=>close());
 return {show,close};
}
