import {frameWork,pendingLoads} from '../frame-work.js';

// Downloads are only half the wait: terrain and props are still assembled on the shared preparation budget.
const outstanding=()=>pendingLoads()+frameWork.info().preparationQueued;
/** Raises the boot curtain over any screen that is about to stream assets, so the player never sees a half-built scene.
 * Progress is the share of requests already settled; the curtain drops once nothing has been queued for a short while. */
let generation=0;
export function holdForAssets({settleMs=260,graceMs=150,ready=()=>true,initial=false,onComplete=()=>{}}={}){
 const curtain=globalThis.__biosoBoot,token=++generation;
 if(!initial)curtain?.show();
 const opened=performance.now();let peak=0,idleSince=0,shown=0;
 const step=now=>{
  if(token!==generation)return;
  const pending=outstanding(),sceneReady=ready();if(pending>peak)peak=pending;
  // Queues grow while they drain, so the raw share dips; the bar only ever moves forward.
  shown=Math.max(shown,Math.min(.99,peak?(peak-pending)/peak:0));curtain?.set(shown);
  if(pending||!sceneReady||now-opened<graceMs)idleSince=0;else if(!idleSince)idleSince=now;
  if(idleSince&&now-idleSince>=settleMs){onComplete();if(initial)curtain?.finish();curtain?.set(1);curtain?.hide();return;}
  requestAnimationFrame(step);
 };
 requestAnimationFrame(step);
}
