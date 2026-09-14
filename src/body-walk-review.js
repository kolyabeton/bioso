import {createPart,stats} from './assembly.js';
/** Explicit DEV/acceptance fixture: real movement and facing, no combat distractions. */
export function installBodyWalkReview(s,setInput){
 s.body=createPart(s,'rootwalker');s.arms=Array(4).fill(null);s.legs=Array.from({length:4},()=>createPart(s,'universal'));s.organs=Array(3).fill(null);s.hp=stats(s).hp;
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;top:86px;left:50%;transform:translateX(-50%);width:280px;max-width:90vw;padding:8px;background:#142521ee;color:#ddd;z-index:60;font:12px sans-serif;text-align:center';
 panel.innerHTML='<div>Лесник · 4 ноги · тест ходьбы</div><button style="min-height:44px;margin-top:4px">Показать развороты</button><output style="display:block"></output>';
 document.body.append(panel);let start=null;const out=panel.querySelector('output'),button=panel.querySelector('button');
 button.onclick=()=>{start=s.time;button.hidden=true;};
 return{tick(){s.enemies=[];s.hostileShots=[];let z=0;if(start!==null){const t=s.time-start;if(t<16)z=Math.floor(t/2)%2?1:-1;else button.hidden=false;}setInput({x:0,z});out.textContent=`${Math.round(stats(s).turnSpeed*180/Math.PI)}°/с · ${z<0?'вперёд':z>0?'назад':'стоит'}`;}};
}
