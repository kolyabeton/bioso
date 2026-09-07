import {prepareEncounters} from './systems/encounters.js';
import {prepareTerritories} from './systems/territories.js';
import {createRun,step,spawnEnemy} from './game.js';
import {prepareBiomes} from './biome-run.js';
import {prepareWorld} from './exploration.js';
export const createWorldRun=(profile,mode,seed)=>{const s=createRun(profile,mode,seed);prepareEncounters(s.mode==='survival'?prepareBiomes(s):prepareWorld(s));return prepareTerritories(s,(...args)=>spawnEnemy(s,...args));};
export {step as stepWorldRun};
