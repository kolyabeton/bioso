import {ENVIRONMENT_MODEL_BOUNDS} from './environment-model-bounds.js';
import {survivalRelief} from './survival-relief.js';
// One visual identity for each mission and its survival counterpart.
export const ENVIRONMENT_PROFILES=Object.freeze({
 'upper-gardens':Object.freeze({biome:'gardens',relief:'terraces',height:1.5,tint:'#c6c5af',roughness:.86,accent:'#a4b589',plants:['veg-grass'],pieces:['environment-garden-bank-v1','environment-garden-tree-v2']}),
 'quiet-scrapyard':Object.freeze({biome:'scrapyard',relief:'heaps',height:1.8,tint:'#a39b8e',roughness:.94,accent:'#806653',plants:[],pieces:['environment-scrap-bank-v1','environment-scrap-engine-v2']}),
 'root-forest':Object.freeze({biome:'forest',relief:'roots',height:1.0,tint:'#a8afa0',roughness:.96,accent:'#75836b',pieces:['forest-root-bank-v2','forest-tree-broad-v4']}),
 'overgrown-city':Object.freeze({biome:'city',relief:'foundations',height:1.2,tint:'#bcc3c0',roughness:.9,accent:'#858f89',plants:['forest-fern-v3'],pieces:['environment-city-bank-v1','environment-city-pier-v2']}),
 'brood-nursery':Object.freeze({biome:'gardens',relief:'nests',height:1.7,tint:'#aca993',roughness:.97,accent:'#a0a976',plants:[],pieces:['environment-nest-bank-v1','environment-brood-pod-v2']}),
});
const BIOME_ENV={gardens:'upper-gardens',forest:'root-forest',city:'overgrown-city',scrapyard:'quiet-scrapyard'};
export const environmentId=tile=>tile?.environmentId||tile?.visualEnvironmentId||BIOME_ENV[tile?.biome];
export const environmentProfile=tile=>ENVIRONMENT_PROFILES[environmentId(tile)];
export const ENVIRONMENT_MODULES=Object.keys(ENVIRONMENT_PROFILES).flatMap(environment=>['clearing','grove','meadow'].map(kind=>({id:environment+'-'+kind,environment,kind})));
export function applyEnvironmentCover(items,tile){
 const p=environmentProfile(tile);if(!p||p.relief==='roots')return;
 items.filter(d=>d.feature==='thicket').forEach((d,i)=>{
  const archShoulder=!tile.environmentId&&p.relief==='foundations'&&items.some(q=>q.model==='forest-ruin-arch-v2'&&Math.hypot(q.x-d.x,q.z-d.z)<7);
  d.coverModel=p.pieces[archShoulder||(!tile.environmentId&&p.relief==='heaps')?0:i%p.pieces.length];d.collisionProfile=ENVIRONMENT_MODEL_BOUNDS[d.coverModel];
  // Thicket height historically uses a separate scale; equalise it with the GLB fit.
  d.height=d.size;
 });
}
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
/** Actual mesh + collision sampler. No discontinuities at portals or tile edges. */
export function environmentHeight(tile,x,z){
 const p=environmentProfile(tile);if(!p)return 0;
 // Keep the approved, offline-lit survival Forest ground unchanged; its relief
 // is provided by real boulders/root banks. Mission forests use the shared banks.
 if(tile.biome==='forest'&&!tile.environmentId)return 0;
 if(!tile.environmentId)return survivalRelief(p.relief,x,z,tile.index);
 const edge=1-smooth(25,32,Math.max(Math.abs(x),Math.abs(z)));
 const lane=tile.environmentId?smooth(4.5,8.5,Math.abs(x)):smooth(5,10,Math.abs(x))*smooth(5,10,Math.abs(z));
 const phase=(tile.index%3)*.7;
 let h;
 if(p.relief==='terraces')h=.3+.7*smooth(-.25,.25,Math.sin(z*.32+phase));
 else if(p.relief==='foundations')h=.2+.8*smooth(-.2,.2,Math.sin(x*.27)*Math.cos(z*.25+phase));
 else if(p.relief==='nests'){
  const qx=((x+25.5)%17+17)%17-8.5,qz=((z+25.5)%17+17)%17-8.5;
  h=.12+.88*Math.exp(-((Math.hypot(qx,qz)-4.2)**2)/5.5);
 }else if(p.relief==='heaps'){
  h=.12+.88*Math.max(...[[14,-14],[-14,16],[-16,-9]].map(([cx,cz])=>Math.exp(-((x-cx)**2+(z-cz)**2)/100)));
 }
 else h=.3+.7*(.5+.5*Math.sin(z*.23+x*.17+phase));
 return p.height*h*lane*edge*(tile.environmentId?.85:.6);
}
