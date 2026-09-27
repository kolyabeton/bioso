import {spatialDistance,visibleBetween} from '../../elevation.js';
import {EVENTS} from './definitions.js';
export const nearEncounter=(s,n,r=3)=>spatialDistance(s.player,n)<=r&&visibleBetween(s,s.player,n);
export const encounterLevel=n=>n.unlockLevel||EVENTS[n.type]?.recommended||0;
export const encounterInLayer=(s,n)=>n.dungeonId?s.encounters?.active?.id===n.dungeonId:!s.encounters?.active?.dungeon||s.encounters.active===n;
export const layerEncounters=s=>(s.encounters?.nodes||[]).filter(n=>encounterInLayer(s,n));
export const availableEncounter=(s,n)=>encounterInLayer(s,n)&&(n.dungeonId?s.level>=encounterLevel(n):!(EVENTS[n.type]?.survivalOnly&&(s.mode!=='survival'||!s.world?.flat))&&(s.world?.flat&&EVENTS[n.type]?s.level>=encounterLevel(n):n.unlockLevel?s.level>=n.unlockLevel:s.time>=(EVENTS[n.type]?.available||0)||(s.world?.flat&&s.level>=(EVENTS[n.type]?.recommended??Infinity))));
