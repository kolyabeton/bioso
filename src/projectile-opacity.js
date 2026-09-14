export const PROJECTILE_FADE_SECONDS=.25;
export const PROJECTILE_BODY_FADE_SECONDS=.10;
/** Active shots stay readable to full range. Only harmless presentation remnants fade. */
export function projectileOpacity(shot,trail=false){
 if(shot.presentationAge==null)return 1;
 const t=Math.max(0,Math.min(1,shot.presentationAge/(trail?PROJECTILE_FADE_SECONDS:PROJECTILE_BODY_FADE_SECONDS)));
 return trail?1-t:1-t*t*(3-2*t);
}

/** Bounded view-only afterglow: a removed shot leaves a stationary trace, never a collider. */
export function createProjectileAfterglow(capacity=1000){
 let previous=new Map(),remnants=[],lastTime=-Infinity,lastScope;
 return{
  update(shots,time,scope){
   if(time<lastTime||scope!==lastScope){previous.clear();remnants=[];}lastTime=time;lastScope=scope;
   const key=q=>q.id??q,current=new Map(shots.map(q=>[key(q),q]));
   remnants=remnants.filter(q=>time-q.presentationTime<PROJECTILE_FADE_SECONDS&&!current.has(q.presentationKey));
   for(const [id,q] of previous){
    if(current.has(id)||q.mode==='rocket')continue;
    remnants.push({...q,w:q.w?{...q.w}:undefined,presentationKey:id,presentationTime:time});
   }
   if(remnants.length>capacity)remnants=remnants.slice(-capacity);
   previous=current;
   return [...shots,...remnants.map(q=>({...q,presentationAge:Math.max(0,time-q.presentationTime)}))];
  },
  reset(){previous.clear();remnants=[];lastTime=-Infinity;lastScope=undefined;},
 };
}
