import {environmentProfile,environmentId} from './environment-profiles.js';
import {SEAMLESS_GROUND_GLSL} from './ground-sampling.js';
export const SURFACE_KINDS={terraces:0,heaps:1,roots:2,foundations:3,nests:4};
export const ENVIRONMENT_BLEND_HALF_WIDTH=8;
function neighbour(tile,world,dx,dz){
 if(!world)return tile;
 const b=world.bounds,x=tile.x+dx*64,z=tile.z+dz*64;
 return world.tileAt(b?Math.max(b.minX+.001,Math.min(b.maxX-.001,x)):x,b?Math.max(b.minZ+.001,Math.min(b.maxZ-.001,z)):z)||tile;
}
export function environmentBlendWeights(tile,world,x,z,halfWidth=ENVIRONMENT_BLEND_HALF_WIDTH){
 const smooth=v=>{const t=Math.max(0,Math.min(1,(Math.abs(v)-(32-halfWidth))/(halfWidth*2)));return t*t*(3-2*t);};
 const dx=x<tile.x?-1:1,dz=z<tile.z?-1:1,wx=smooth(x-tile.x),wz=smooth(z-tile.z),weights={};
 for(const [ox,oz,w]of [[0,0,(1-wx)*(1-wz)],[dx,0,wx*(1-wz)],[0,dz,(1-wx)*wz],[dx,dz,wx*wz]]){
  if(!w)continue;const id=environmentId(neighbour(tile,world,ox,oz));weights[id]=(weights[id]||0)+w;
 }return weights;
}
/** Structurally different surfaces in world units, with neighbour-aware seams. */
export function environmentSurfaceCode(profile,tile,world){
 const kind=t=>SURFACE_KINDS[environmentProfile(t)?.relief??profile.relief];
 const sample=(dx,dz)=>`envSurface(p,${kind(neighbour(tile,world,dx,dz)).toFixed(1)})`;
 return `
 ${SEAMLESS_GROUND_GLSL}
 float envHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float envGrain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(envHash(i),envHash(i+vec2(1,0)),f.x),mix(envHash(i+vec2(0,1)),envHash(i+vec2(1,1)),f.x),f.y);}
 float envFbm(vec2 p){return envGrain(p)*.57+envGrain(p*2.03)*.28+envGrain(p*4.07)*.15;}
 vec3 envAtlasSample(vec2 p,vec2 cell){
  return envSeamless(envAtlas,p,cell+.008,vec2(.484));
 }
 vec4 envSurface(vec2 p,float kind){
  // World-space route accents continue through cells; this is pigment, not a
  // new obstacle or a promise of a traversable road across authored cover.
  vec2 local=mod(p+32.0,64.0)-32.0;
  float route=1.0-smoothstep(2.4,6.5,abs(local.x-sin(p.y*.13)*.9));
  float broad=envFbm(p*.12),wear=envFbm(p*.48);
  if(kind>1.5&&kind<2.5){
   vec3 rock=envSeamless(envStone,p*.075,vec2(.005),vec2(.99));
   vec3 soil=envSeamless(envMaterials,p*.21,vec2(.52),vec2(.46));
   float mineral=max(smoothstep(.36,.69,broad+wear*.15),route*.92);
   float luma=dot(rock,vec3(.2126,.7152,.0722));
   rock=mix(vec3(luma),rock,.58)*vec3(.91,1.0,1.08);
   vec3 color=mix(soil*.7,rock*.9,mineral);
   return vec4(color,broad*.3+dot(rock,vec3(.2126,.7152,.0722))*.2);
  }
  // Four real, independently authored albedos in one GPU texture.
  vec2 cell=kind<.5?vec2(0,0):kind<1.5?vec2(.5,0):kind<3.5?vec2(0,.5):vec2(.5,.5);
  float scale=kind<.5?.068:kind<1.5?.14:kind<3.5?.072:.10;
  vec2 q=p*scale;
  vec3 a=envAtlasSample(q,cell),b=envAtlasSample(q*.79+vec2(5.37,9.13),cell);
  vec3 color=mix(a,b,smoothstep(.3,.7,broad));
  vec3 soil=envSeamless(envMaterials,p*.19,vec2(.52),vec2(.46));
  if(kind<.5){
   float gardenSoil=smoothstep(.46,.74,broad+wear*.19)*(1.0-route*.85);
   color=mix(color,soil*.85,gardenSoil*.75);
   ${!tile.environmentId?'color*=.73;':''}
  }else if(kind<1.5){
   float track=(1.0-smoothstep(.35,1.0,abs(abs(local.x)-1.35)))*route;
   color*=.83+broad*.3-track*.14;
   ${!tile.environmentId?`vec3 mineral=envSeamless(envStone,p*.105,vec2(.005),vec2(.99));
   float mineralLuma=dot(mineral,vec3(.2126,.7152,.0722));
   mineral=mix(mineral,vec3(mineralLuma),.65)*vec3(.98,1.04,1.09);
   float exposed=smoothstep(.32,.69,envFbm(p*.4)+wear*.12)*(route*.12+.20);
   color=mix(color,mineral,exposed)*1.5;`:''}
  }else if(kind<3.5){
   color=mix(color,soil*.68,smoothstep(.53,.78,broad+wear*.14)*(1.0-route*.7)*.65);
  }else{
   float ridge=.5+.5*sin(length(local*vec2(.8,1.0))*1.8+wear*3.0);
   color*=.83+ridge*.15+broad*.15;
  }
  float luminance=dot(color,vec3(.2126,.7152,.0722));
  return vec4(color,luminance*.65);
 }
 vec4 envBlendedSurface(vec2 p){
  vec2 local=p-vec2(${tile.x.toFixed(1)},${tile.z.toFixed(1)}),w=smoothstep(vec2(${(32-ENVIRONMENT_BLEND_HALF_WIDTH).toFixed(1)}),vec2(${(32+ENVIRONMENT_BLEND_HALF_WIDTH).toFixed(1)}),abs(local));
  vec4 result=envSurface(p,${kind(tile).toFixed(1)});
  if(w.x>0.0)result=mix(result,local.x<0.0?${sample(-1,0)}:${sample(1,0)},w.x);
  if(w.y>0.0){
   vec4 row=local.y<0.0?${sample(0,-1)}:${sample(0,1)};
   if(w.x>0.0){vec4 corner=local.y<0.0?(local.x<0.0?${sample(-1,-1)}:${sample(1,-1)}):(local.x<0.0?${sample(-1,1)}:${sample(1,1)});row=mix(row,corner,w.x);}
   result=mix(result,row,w.y);
  }
  return result;
 }`;
}
