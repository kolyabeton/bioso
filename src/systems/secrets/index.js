import {playerAttackRange} from '../../elevation.js';
import {SECRETS} from './definitions.js';
import {nearEncounter as near} from '../events/proximity.js';
export {SECRETS};
export function openSecret(s,n){if(n.state!=='ready'||SECRETS[n.type]?.kind!=='secret')return false;n.state='reward';n.discovered=true;s.events.push({type:'notice',text:n.type==='slab'?'Плита вскрыта · заберите деталь и 30 биомассы':SECRETS[n.type].name+' · награда доступна'});return true;}
export function secretTarget(s,p,w){return(s.encounters?.nodes||[]).find(n=>n.state==='ready'&&SECRETS[n.type]?.kind==='secret'&&SECRETS[n.type].keys.includes(p.key)&&near(s,n,playerAttackRange(s,w)));}
