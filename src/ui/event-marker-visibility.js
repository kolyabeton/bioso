import {availableEncounter} from '../systems/encounters.js';
import {nearEncounter} from '../systems/events/proximity.js';
import {EVENT_PRESENTATION} from '../gameplay-modules/event-presentation.js';
import {SECRETS} from '../systems/secrets/definitions.js';

export function visibleEventMarkers(s){
 const active=s.encounters?.active;
 if(active?.dungeon)return[];
 return(active?[active]:s.encounters?.nodes||[]).filter(n=>!SECRETS[n.type]&&EVENT_PRESENTATION[n.type]&&availableEncounter(s,n)&&(n===active?Math.hypot(n.x-s.player.x,n.z-s.player.z)<22:nearEncounter(s,n,4))).sort((a,b)=>Math.hypot(a.x-s.player.x,a.z-s.player.z)-Math.hypot(b.x-s.player.x,b.z-s.player.z)).slice(0,2);
}
