import {nearbyEncounters,ENCOUNTERS} from '../systems/encounters.js';
import {EVENT_PRESENTATION,eventState,eventGlyph} from '../gameplay-modules/event-presentation.js';
export function createEventHud(button){
 const card=document.createElement('aside');card.className='event-nearby';card.hidden=true;button.before(card);
 const kicker=document.createElement('small'),title=document.createElement('strong'),hint=document.createElement('span');
 card.append(kicker,title,hint,button);let selected=null;
 return {target:()=>selected,update(s){
  const nodes=(s.encounters?.active&&!s.encounters.active.dungeon?[]:nearbyEncounters(s)).filter(n=>!['complete','failed'].includes(n.state)).sort((a,b)=>Number(b.state==='reward')-Number(a.state==='reward')||Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z));
  selected=nodes[0]||null;card.hidden=!selected;button.hidden=!selected;
  if(selected){const d=EVENT_PRESENTATION[selected.type];kicker.textContent=eventGlyph(selected)+' '+(d?'СОБЫТИЕ · '+d.category:'СЕКРЕТ');title.textContent=ENCOUNTERS[selected.type].name;hint.textContent=selected.state==='ready'?(d?.summary||ENCOUNTERS[selected.type].hint):eventState(selected);button.textContent=selected.state==='reward'?'Награда':selected.dungeon&&selected.state==='active'?'Выход':selected.dungeon&&selected.state==='paused'?'Войти':selected.state==='active'?'Условия':'Осмотреть';}
 }};
}
