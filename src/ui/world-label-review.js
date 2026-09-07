import {ENCOUNTERS,discoverEncounters} from '../systems/encounters.js';
import {EVENT_PRESENTATION} from '../gameplay-modules/event-presentation.js';
import {WORLD_LABEL_STATES} from './world-label.js';

/** Prepared data in the real game renderer; review mode uses an in-memory profile. */
export function prepareWorldLabelReview(run,params){
 const type=params.get('event')||'altar_organs';
 const node=run.encounters.nodes.find(n=>n.type===type&&EVENT_PRESENTATION[n.type]);
 if(!node)throw new Error(`No world label review encounter: ${type}`);
 run.level=Math.max(5,node.unlockLevel||0,ENCOUNTERS[type].recommended||0);
 run.time=300;run.enemies=[];run.ground=[];
 const state=params.get('state')||'complete';
 node.state=Object.hasOwn(WORLD_LABEL_STATES,state)?state:'ready';
 const approach={x:node.x,y:node.y,z:node.z+7};
 Object.assign(run.player,run.world.walkable(approach.x,approach.z,.8)?approach:{x:node.x,y:node.y,z:node.z+3});
 discoverEncounters(run);
 return {paused:true};
}
