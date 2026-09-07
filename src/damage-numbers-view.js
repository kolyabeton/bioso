import {Vector3} from 'three';
const LIMIT=48,LIFETIME=.8;
const periodic=new Set(['burn','acid']);
export function damageLabel(amount){return String(amount<1?amount.toFixed(1):Math.round(amount));}
/** Screen-space text keeps its mobile size while tracking the world impact point. */
export function createDamageNumbersView(canvas){
 const layer=document.createElement('div');layer.className='damage-numbers';layer.setAttribute('aria-hidden','true');canvas.parentElement.append(layer);
 const items=[],point=new Vector3();let serial=0;
 function event(e){
  if(e.type!=='enemy-damage'||!Number.isFinite(e.amount)||e.amount<=0)return;
  const existing=periodic.has(e.source)&&items.find(q=>q.target===e.target&&q.source===e.source&&q.age<.3&&!q.critical);
  if(existing){existing.amount+=e.amount;existing.node.textContent=damageLabel(existing.amount);return;}
  if(items.length>=LIMIT)items.shift().node.remove();
  const node=document.createElement('span');node.className=`damage-number${e.critical?' is-critical':''}`;node.textContent=damageLabel(e.amount);layer.append(node);
  items.push({...e,node,age:0,lane:(serial++%3)-1});
 }
 function update(dt,camera,reducedMotion=false,scale=1){
  for(let i=items.length-1;i>=0;i--){const q=items[i];q.age+=dt;
   if(q.age>=LIFETIME){q.node.remove();items.splice(i,1);continue;}
   point.set(q.x,q.y+q.radius*scale*2+1,q.z).project(camera);
   const x=(point.x+1)*canvas.clientWidth/2+q.lane*12,y=(1-point.y)*canvas.clientHeight/2-(reducedMotion?0:q.age*20);
   q.node.hidden=point.z< -1||point.z>1||x<20||x>canvas.clientWidth-20||y<16||y>canvas.clientHeight-16;
   q.node.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;
   q.node.style.opacity=String(Math.min(1,(LIFETIME-q.age)/.25));
  }
 }
 return{event,update,reset(){for(const q of items)q.node.remove();items.length=0;serial=0;}};
}
