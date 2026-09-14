/** Shared preparation budget. Callbacks are small, synchronous work units;
 * promises only carry their results to the next preparation stage. */
export class FrameWorkQueue {
 constructor({budgetMs=1,now=()=>performance.now()}={}){this.budgetMs=budgetMs;this.now=now;this.jobs=[];this.lastMs=0;this.maxJobMs=0;}
 run(work,{valid=()=>true,priority=0}={}){return new Promise((resolve,reject)=>{this.jobs.push({work,valid,priority,resolve,reject});});}
 pump(){const start=this.now();let count=0;this.jobs.sort((a,b)=>a.priority-b.priority);
  while(this.jobs.length&&this.now()-start<this.budgetMs){const job=this.jobs.shift();if(!job.valid()){job.reject(new Error('Superseded preparation'));continue;}
   const at=this.now();try{job.resolve(job.work());}catch(error){job.reject(error);}const ms=this.now()-at;if(ms>this.maxJobMs){this.maxJobMs=ms;this.maxJobName=job.work.workLabel||job.work.toString().slice(0,140);}count++;
  }this.lastMs=this.now()-start;return count;
 }
 info(){return {preparationQueued:this.jobs.length,preparationMs:this.lastMs,preparationMaxJobMs:this.maxJobMs,preparationMaxJobName:this.maxJobName};}
}
export const frameWork=new FrameWorkQueue();
const loads=[];let active=0;
function drain(){while(active<2&&loads.length){const job=loads.shift();active++;Promise.resolve().then(job.work).then(job.resolve,job.reject).finally(()=>{active--;drain();});}}
export function limitedLoad(work){return new Promise((resolve,reject)=>{loads.push({work,resolve,reject});drain();});}
