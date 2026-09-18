import {createPart,stats} from './assembly.js';
import {bodySize} from './body-size.js';
import {BODIES} from './catalog.js';
/** DEV-only reproducible passage on the real seed-20317 biome, no custom obstacles. */
export function installBodySizeReview(s,setInput){
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;bottom:12px;left:50%;transform:translateX(-50%);width:280px;max-width:90vw;padding:8px;background:#142521ee;color:#ddd;z-index:60;font:12px sans-serif';
 panel.innerHTML='<button type="button" data-body="wanderer">Садовник</button> <button type="button" data-body="rootwalker">Лесник</button><output style="display:block;padding:6px 0" aria-live="polite"></output>';
 document.body.append(panel);const out=panel.querySelector('output');let moving=false,startTime=0;
 function select(key){s.body=createPart(s,key);s.arms=Array(BODIES[key].arms).fill(null);s.legs=Array.from({length:BODIES[key].legs},()=>createPart(s,'universal'));s.organs=Array(BODIES[key].organs).fill(null);s.inventory=[];s.enemies=[];s.ground=[];s.player.x=8.5;s.player.z=-18;s.player.y=0;s.hp=stats(s).hp;s.health.missing=0;moving=true;startTime=s.time;}
 panel.addEventListener('click',e=>{if(e.target.dataset.body)select(e.target.dataset.body);});select('wanderer');moving=false;
 return{tick(){s.enemies=[];s.hostileShots=[];const finish=s.player.x>=14.5||s.time-startTime>3;if(finish)moving=false;setInput({x:moving?1:0,z:0});out.textContent=`${BODIES[s.body.key].name} · Ø ${bodySize(s.body).diameter.toFixed(2)} м · путь ${(s.player.x-8.5).toFixed(2)} из 6 м${moving?'':s.player.x>=14.5?' · прошёл':s.time-startTime>3?' · не помещается':''}`;}};
}
