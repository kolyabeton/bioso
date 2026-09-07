import * as T from 'three';
import {availableEncounter,ENCOUNTERS,encounterStatus} from '../systems/encounters.js';
import {EVENT_PRESENTATION} from '../gameplay-modules/event-presentation.js';
import {worldLabel} from './world-label.js';
import './world-label.css';
/** Labels project from the same nodes as the 3D assets; never alter simulation. */
export function createEventMarkers(stage){
 const layer=document.createElement('div');layer.className='event-world-labels';stage.append(layer);
 const labels=new Map(),point=new T.Vector3();
 return {update(s,camera){
  // During a challenge, show only its compact progress above the world object.
  const active=s.encounters?.active;
  const visible=(active?[active]:s.encounters?.nodes||[]).filter(n=>EVENT_PRESENTATION[n.type]&&availableEncounter(s,n)&&Math.hypot(n.x-s.player.x,n.z-s.player.z)<22).sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z)).slice(0,2);
  const keep=new Set(visible);
  for(const [n,el]of labels)if(!keep.has(n)){el.remove();labels.delete(n);}
  for(const n of visible){let el=labels.get(n);if(!el){el=document.createElement('div');el.className='event-world-label';layer.append(el);labels.set(n,el);}
   const title=ENCOUNTERS[n.type].name,level=n.recommended||ENCOUNTERS[n.type].recommended,category=EVENT_PRESENTATION[n.type].category;
   const progress=n===active?encounterStatus(s):null;
   const contentKey=JSON.stringify([title,level,category,n.state,progress]);
   if(el.dataset.contentKey!==contentKey){el.classList.toggle('event-world-label--progress',progress!==null);if(progress!==null)el.textContent=progress;else el.innerHTML=worldLabel({title,level,category,state:n.state});el.dataset.contentKey=contentKey;}
   point.set(n.x,(n.y||0)+EVENT_PRESENTATION[n.type].height+(progress!==null?.8:3.2),n.z).project(camera);
   const x=(point.x+1)/2*stage.clientWidth,y=(1-point.y)/2*stage.clientHeight;
   el.hidden=point.z<-1||point.z>1||x<16||x>stage.clientWidth-16||y<100||y>stage.clientHeight-180;
   const half=el.offsetWidth/2,center=Math.max(half+16,Math.min(stage.clientWidth-half-16,x));
   el.style.left=center+'px';el.style.top=(progress!==null?y:Math.max(el.offsetHeight+100,y))+'px';
   el.style.setProperty('--label-anchor',Math.max(8,Math.min(el.offsetWidth-8,x-center+half))+'px');
  }
 },reset(){for(const el of labels.values())el.remove();labels.clear();}};
}
