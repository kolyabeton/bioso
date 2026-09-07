import {abilityCard,abilityRow,abilityDetail,missionCard} from './molecules.js';
import {button,e} from './atoms.js';

// Compositions receive presentation data; game commands belong to the screen controller.
export function inventoryGrid(cards){return `<div class="ui-inventory-grid">${cards.join('')}</div>`;}
export function choicePanel(cards){return `<div class="ui-choices">${cards.map(abilityCard).join('')}</div>`;}
export function choiceList(cards,selected,{action}={}){return `<div class="ui-compact-choices">${cards.map(c=>button(c.name,{action,'data-index':c.index,'aria-pressed':String(selected===c.index),className:'ui-choice',variant:selected===c.index?'selected':'secondary'}).replace('><span>',`>${c.art}<span>`).replace('</button>',`<small>${e(c.description)}</small></button>`)).join('')}</div>`;}
export function compactChoicePanel(cards,selected){return `<div class="ui-compact-choices">${cards.map(c=>abilityRow(c,c.index===selected)).join('')}</div>${cards[selected]?abilityDetail(cards[selected]):'<section id="ability-detail" class="ui-ability-detail"><p>Нажмите на способность, чтобы прочитать описание и ветку.</p></section>'}`;}
export function missionList(missions,{selected,achievements=[],reward}){
  return missions.map((mission,index)=>missionCard(mission,{
    selected:mission.id===selected,complete:achievements.includes('mission:'+mission.id),
    index,rewardCards:mission.rewards.map(reward).join('')
  })).join('');
}
