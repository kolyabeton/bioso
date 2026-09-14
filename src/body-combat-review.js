import {createPart,stats} from './assembly.js';
import {spawnEnemy} from './game.js';
import {BODIES} from './catalog.js';
/** DEV-only demonstration with harmless durable targets; normal attack/turn/move code. */
export function installBodyCombatReview(s,setInput){
 const requested=new URLSearchParams(location.search).get('body'),body=BODIES[requested]?requested:'rootwalker',meta=BODIES[body];
 s.body=createPart(s,body);s.arms=Array.from({length:meta.arms},(_,i)=>i<2?createPart(s,i?'whip':'claws'):null);s.legs=Array.from({length:meta.legs},()=>createPart(s,'universal'));s.organs=Array(meta.organs).fill(null);s.hp=stats(s).hp;
 const panel=document.createElement('aside');panel.style.cssText='position:fixed;top:86px;left:50%;transform:translateX(-50%);width:280px;max-width:90vw;padding:8px;background:#142521ee;color:#ddd;z-index:60;font:12px sans-serif;text-align:center';
 panel.innerHTML='<div>'+meta.name+' · руки и ноги в движении</div><small>Тест: безвредные стойкие цели</small><br><button style="min-height:44px">Показать атаки</button><output style="display:block"></output>';
 document.body.append(panel);let start=null,phase=-1,target=null;const out=panel.querySelector('output'),button=panel.querySelector('button');
 button.onclick=()=>{start=s.time;phase=-1;button.hidden=true;};
 return{tick(){s.enemies=target?[target]:[];s.hostileShots=[];let z=0;
 if(start!==null){const t=s.time-start,p=Math.floor(t/4);if(t<16){if(p!==phase){phase=p;s.enemies=[];target=spawnEnemy(s,'normal',{x:s.player.x+(p%2?-2.6:2.6),z:s.player.z});if(target){target.assembly=null;target.speed=target.damage=0;target.hp=target.maxHp=10000;target.contact=999;target.volatile=false;}}z=p%2?.12:-.12;}else{target=null;button.hidden=false;}}
 setInput({x:0,z});out.textContent=target?'Ходьба · доворот · атака своей стороной':'Готов';}};
}
