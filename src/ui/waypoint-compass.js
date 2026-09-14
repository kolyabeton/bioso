import {compassTarget} from '../systems/waypoint.js';
import {icon} from './atoms.js';
export function createWaypointCompass(root){
 const make=(className,label)=>{const indicator=document.createElement('span');indicator.className=`hud-compass ${className}`;indicator.setAttribute('role','img');indicator.setAttribute('aria-label',label);indicator.hidden=true;indicator.innerHTML=icon('navigation','compass-arrow')+icon('check','compass-arrived');const arrow=indicator.querySelector('.compass-arrow');return{indicator,arrow};};
 const compass=make('hud-compass--map','Направление к цели');
 compass.arrow.insertAdjacentHTML('afterbegin',`<defs><pattern id="hud-compass-olive" width="1" height="1" patternContentUnits="objectBoundingBox"><image href="${import.meta.env.BASE_URL}assets/ui/materials/metal-olive-v1.jpg" width="1" height="1" preserveAspectRatio="xMidYMid slice"/></pattern></defs>`);
 let current=null;root.querySelector('#map-button').after(compass.indicator);
 const renderTarget=(view,target,project,label)=>{view.indicator.hidden=!target||current.dead;if(!target)return;const arrived=target.distance<=3;view.indicator.classList.toggle('is-arrived',arrived);view.arrow.style.transform=`rotate(${project(current.player,target)}deg)`;const text=`${label}: ${target.label} · ${arrived?'вы на месте':'направление к цели'}`;view.indicator.setAttribute('aria-label',text);view.indicator.title=text;};
 return (s,project)=>{
  current=s;const target=compassTarget(s);renderTarget(compass,target,project,target?.source==='mission'?'Автоцель':'Карта');
 };
}
