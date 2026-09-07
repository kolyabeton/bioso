import {waypointTarget} from '../systems/waypoint.js';
import {icon,iconButton} from './atoms.js';
export function createWaypointCompass(root,openMap){
 const template=document.createElement('template');template.innerHTML=iconButton('navigation','Направление к цели · открыть карту',{className:'hud-compass',hidden:true});
 const button=template.content.firstElementChild,arrow=button.querySelector('.ui-icon');arrow.classList.add('compass-arrow');
 button.insertAdjacentHTML('beforeend',icon('check','compass-arrived'));
 button.onclick=openMap;root.querySelector('#map-button').after(button);
 return (s,project)=>{
  const target=waypointTarget(s);button.hidden=!target||s.dead;if(!target){s.waypoint=null;return;}
  const arrived=target.distance<=3;button.classList.toggle('is-arrived',arrived);
  arrow.style.transform=`rotate(${project(s.player,target)}deg)`;
  const label=`${target.label} · ${arrived?'вы на месте':'направление к цели'} · открыть карту`;
  button.setAttribute('aria-label',label);button.title=label;
 };
}
