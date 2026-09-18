/** Adaptive render resolution. The ambient governor only lowers foliage and weather
 * tiers, and it ignores the 'high' preset entirely, so a phone that cannot hold its
 * frame budget keeps paying for every pixel. This governor watches the same frame
 * timings and scales the render resolution instead, which is the cost a mobile GPU
 * actually struggles with. Pure state so it can be tested without a GL context. */
export const RENDER_SCALE_MIN=.6,RENDER_SCALE_MAX=1,RENDER_SCALE_STEP=.2;
/** Frame time above budget*OVERLOAD for DROP_AFTER seconds lowers the scale;
 * below budget*RELAXED for RAISE_AFTER seconds raises it back one step. */
export const OVERLOAD=1.15,RELAXED=.7,DROP_AFTER=3,RAISE_AFTER=8;
export function createRenderScaleGovernor({min=RENDER_SCALE_MIN,max=RENDER_SCALE_MAX,step=RENDER_SCALE_STEP}={}){
 let scale=max,over=0,under=0,windowTime=0,p95=0;const samples=[];
 const reset=()=>{over=under=windowTime=0;samples.length=0;};
 return{
  sample(ms,dt,fps){
   if(!(dt>0)||!(fps>0))return scale;
   samples.push(Math.max(0,Number(ms)||0));if(samples.length>Math.ceil(fps))samples.shift();
   windowTime+=dt;if(windowTime<1)return scale;
   const elapsed=windowTime;windowTime=0;
   const sorted=[...samples].sort((a,b)=>a-b);p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
   const budget=1000/fps;
   if(p95>budget*OVERLOAD){over+=elapsed;under=0;}else if(p95<budget*RELAXED){under+=elapsed;over=0;}else{over=under=0;}
   if(over>=DROP_AFTER&&scale>min){scale=Math.max(min,Number((scale-step).toFixed(4)));reset();}
   else if(under>=RAISE_AFTER&&scale<max){scale=Math.min(max,Number((scale+step).toFixed(4)));reset();}
   return scale;
  },
  scale:()=>scale,
  /** Called when the player picks a quality preset, so the governor re-measures. */
  restore(){scale=max;reset();},
  info:()=>({renderScale:scale,renderScaleP95Ms:p95}),
 };
}
