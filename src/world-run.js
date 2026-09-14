import {prepareEncounters} from './systems/encounters.js';
import {prepareTerritories} from './systems/territories.js';
import {createRun,step,spawnEnemy} from './game.js';
import {prepareBiomes} from './biome-run.js';
import {prepareMission} from './mission-run.js';
import {selectFirstBoss} from './systems/survival-objective.js';
export const createWorldRun=(profile,mode,seed)=>{const s=createRun(profile,mode,seed);if(s.mode==='survival'){prepareEncounters(prepareBiomes(s));prepareTerritories(s,(...args)=>spawnEnemy(s,...args));return selectFirstBoss(s);}prepareMission(s);s.encounters={nodes:[],active:null};return s;};
export {step as stepWorldRun};
