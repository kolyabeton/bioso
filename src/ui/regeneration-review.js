// Development-only: real HUD state for deterministic regeneration timing review.
import {createPart,stats} from '../assembly.js';
import {tickHealth} from '../systems/health.js';

export function prepareRegenerationReview(run,params){
 const requested=Math.max(5,Math.min(15,Number(params.get('seconds'))||15)),root=createPart(run,'root');
 root.upgrades.regen=15-requested;run.legs[0]=root;run.organs[0]=createPart(run,'regen');
 const st=stats(run),progress=Math.max(0,Math.min(.95,Number(params.get('progress'))||0));
 run.hp=Math.max(.5,st.hp-1);run.health.missing=st.hp-run.hp;run.health.regenDelay=st.regenDelay;run.health.regenAt=run.time+st.regenDelay*(1-progress);
 let last=performance.now();
 return{paused:true,tick(){const now=performance.now();if(!params.has('freeze')){run.time+=(now-last)/1000;tickHealth(run,stats(run));}last=now;}};
}
