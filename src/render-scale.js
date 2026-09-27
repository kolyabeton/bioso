/** Session-only frame budget governor. Thin decoration before lowering resolution.
 * GPU samples are optional; real frame intervals remain usable without GPU queries. */
export const RENDER_SCALE_MIN=.6,RENDER_SCALE_MAX=1,RENDER_SCALE_STEP=.2;
export const OVERLOAD=1.15,RELAXED=.7,DROP_AFTER=3,RAISE_AFTER=12;
const COOLDOWN=4,WARMUP=1;
export function createRenderScaleGovernor({min=RENDER_SCALE_MIN,max=RENDER_SCALE_MAX,step=RENDER_SCALE_STEP}={}){
 let floor=min,scale=max,decoration=1,over=0,under=0,windowTime=0,p95=0,intervalP95=0,cooldown=0,warmup=WARMUP,active=false,lastFps=0,lastGpuId=null,gpuMs=null;
 const samples=[];
 const resetWindow=()=>{over=under=windowTime=0;samples.length=0;};
 function suspend(){active=false;warmup=WARMUP;lastGpuId=null;gpuMs=null;resetWindow();}
 function sampleFrame({cpuMs,intervalMs,gpuMs:gpu=null,gpuSampleId=null,fps,active:running=true}){
  if(!running||!(fps>0)||!Number.isFinite(intervalMs)||intervalMs<=0||intervalMs>1000||!Number.isFinite(cpuMs)||cpuMs<0){suspend();return scale;}
  // Never attribute a menu/background interval to gameplay or a new FPS target.
  if(!active||fps!==lastFps){suspend();active=true;lastFps=fps;return scale;}
  const dt=intervalMs/1000;
  if(warmup>0){warmup-=dt;return scale;}
  const freshGpu=Number.isFinite(gpu)&&gpu>=0&&(gpuSampleId==null||gpuSampleId!==lastGpuId);
  gpuMs=freshGpu?gpu:null;if(freshGpu)lastGpuId=gpuSampleId;
  samples.push({work:Math.max(cpuMs,gpuMs??cpuMs),interval:intervalMs});
  if(samples.length>Math.ceil(fps*2))samples.shift();
  if(cooldown>0){cooldown=Math.max(0,cooldown-dt);resetWindow();return scale;}
  windowTime+=dt;if(windowTime<1)return scale;
  const elapsed=windowTime;windowTime=0;
  const percentile=key=>{const a=samples.map(s=>s[key]).sort((a,b)=>a-b);return a[Math.min(a.length-1,Math.floor(a.length*.95))]??0;};
  p95=percentile('work');intervalP95=percentile('interval');const budget=1000/fps;
  if(Math.max(p95,intervalP95)>budget*OVERLOAD){over+=elapsed;under=0;}
  else if(p95<budget*RELAXED&&intervalP95<=budget*1.1){under+=elapsed;over=0;}
  else{over=under=0;}
  let changed=false;
  if(over>=DROP_AFTER){
   if(decoration> .5){decoration=.5;changed=true;}
   else if(scale>floor){scale=Math.max(floor,Number((scale-step).toFixed(4)));changed=true;}
  }else if(under>=RAISE_AFTER){
   if(scale<max){scale=Math.min(max,Number((scale+step).toFixed(4)));changed=true;}
   else if(decoration<1){decoration=1;changed=true;}
  }
  if(changed){cooldown=COOLDOWN;resetWindow();}
  return scale;
 }
 return{
  sampleFrame,suspend,
  setMinimum(value){floor=Math.max(min,Math.min(max,value));scale=Math.max(scale,floor);resetWindow();},
  // Compatibility for callers with only CPU work and a measured frame duration.
  sample:(ms,dt,fps)=>sampleFrame({cpuMs:ms,intervalMs:dt*1000,fps,active:dt>0}),
  scale:()=>scale,decorationScale:()=>decoration,
  restore(){scale=max;decoration=1;cooldown=0;p95=intervalP95=0;suspend();},
  info:()=>({renderScale:scale,decorationScale:decoration,renderScaleP95Ms:p95,frameIntervalP95Ms:intervalP95,adaptationGpuMs:gpuMs}),
 };
}
