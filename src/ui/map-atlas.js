import {setWaypoint,waypointTarget} from '../systems/waypoint.js';
import {paintMap,filteredMapMarkers} from './map.js';
import {loadAtlasGround} from './map-terrain.js';
import {e} from './atoms.js';

export function atlasSelection(s,selected){
 const m=selected==='waypoint'?waypointTarget(s):filteredMapMarkers(s).find(m=>String(m.id)===String(selected));
 if(!m)return {title:'Куда идём?',detail:'Нажмите на объект или свободную точку',state:'',access:'События видны сразу · вход по уровню'};
 const distance=Math.round(Math.hypot(m.x-s.player.x,m.z-s.player.z));
 const state=m.locked?'Закрыто':m.kind?(m.territory?.state==='engaged'?'В бою':m.territory?.state==='returning'?'Возвращается':'Не в бою'):({ready:'Доступно',active:'Испытание',reward:'Награда',complete:'Пройдено',failed:'Завершено'}[m.state]||'Цель компаса');
 return {title:m.label,access:m.type?`Вход с ${m.requiredLevel}-го уровня · ваш уровень ${s.level}`:'События видны сразу · вход по уровню',detail:`${distance} м${m.territory?' · агро '+m.territory.aggro+' м':''}${m.recommended?' · рекомендуемый уровень '+m.recommended:''}`,state};
}
export function mountAtlas(host,s,params,onSelect){
 const canvas=host.querySelector('#atlas'),layer=host.querySelector('.atlas-targets');let disposed=false,geometry;
 const draw=()=>{
  if(disposed||!canvas.isConnected||!canvas.clientWidth||!canvas.clientHeight)return;
  canvas.width=Math.round(canvas.clientWidth*2);canvas.height=Math.round(canvas.clientHeight*2);
  const result=paintMap(canvas,s,params.zoom||'world',{filter:params.filter||'all',selected:params.selected});
  if(!layer||!result)return;
  const {geometry:g,markers}=result;geometry=g;const focus=layer.contains(document.activeElement)?document.activeElement.dataset.marker:null;
  layer.innerHTML=markers.map(m=>`<button type="button" class="atlas-target" style="left:${g.X(m.x)}px;top:${g.Z(m.z)}px" data-marker="${e(m.id)}" aria-label="${e(m.label)}${m.locked?' · Вход с '+m.requiredLevel+'-го уровня':''} · ${Math.round(Math.hypot(m.x-s.player.x,m.z-s.player.z))} м" aria-pressed="${String(m.id)===String(params.selected)}"></button>`).join('');
  if(focus)[...layer.children].find(b=>b.dataset.marker===focus)?.focus({preventScroll:true});
 };
 const observer=new ResizeObserver(draw);observer.observe(canvas);
 if(layer)layer.onclick=event=>{const button=event.target.closest('[data-marker]');if(button){const m=filteredMapMarkers(s).find(m=>String(m.id)===button.dataset.marker);if(setWaypoint(s,m))onSelect(button.dataset.marker);}};
 canvas.onclick=event=>{if(!geometry)return;const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.clientWidth/rect.width,z=(event.clientY-rect.top)*canvas.clientHeight/rect.height;if(x<16||x>geometry.w-16||z<18||z>geometry.h-18)return;const point=geometry.worldAt(x,z);if(setWaypoint(s,point))onSelect('waypoint');};
 const cancelImage=loadAtlasGround(draw);
 return {disconnect(){disposed=true;observer.disconnect();cancelImage?.();}};
}
