import * as T from 'three';
import {SOUL_PROCS} from './soul-procs.js';
import {combatTime} from './mutations.js';
import {VOLATILE} from '../living-combat.js';
import {modifiers} from './abilities.js';

// Camera-facing, noise-eroded particles. Two fixed buffers, no per-hit geometry,
// canvas labels, hard rings or scene lights. All animation uses simulation dt.
const CAPACITY=1536;
const vertexShader=`
 attribute vec3 center; attribute vec3 endpoint; attribute vec2 extent;
 attribute vec3 tint; attribute vec4 data;
 varying vec2 vUv; varying vec3 vTint; varying vec4 vData;
 void main(){
  vUv=uv;vTint=tint;vData=data;
  vec4 p=modelViewMatrix*vec4(center,1.);
  vec2 q=position.xy;
  if(data.x>6.5){
   p=modelViewMatrix*vec4(center+vec3(q.x*extent.x,0.,-q.y*extent.y),1.);
  }else if(data.x>4.5&&data.x<5.5){
   vec4 end=modelViewMatrix*vec4(endpoint,1.);vec2 delta=end.xy-p.xy;
   float len=max(length(delta),.001);vec2 along=delta/len;
   p.xy+=along*(q.y+.5)*len+vec2(-along.y,along.x)*q.x*extent.x;
  }else{
   float a=data.w;mat2 rot=mat2(cos(a),sin(a),-sin(a),cos(a));
   p.xy+=rot*(q*extent);
  }
  gl_Position=projectionMatrix*p;
 }`;
const fragmentShader=`
 precision highp float;
 uniform float clock;
 varying vec2 vUv; varying vec3 vTint; varying vec4 vData;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 float fbm(vec2 p){return noise(p)*.57+noise(p*2.03+17.)*.28+noise(p*4.11+7.)*.15;}
 void main(){
  vec2 p=vUv*2.-1.;float seed=vData.z,type=vData.x,alpha=0.;vec3 color=vTint;
  float n=fbm(vUv*5.+vec2(seed,-clock*1.7));
  if(type<.5){
   // Hot base, turbulent tapering tongues, cool translucent perimeter.
   float y=vUv.y;float warp=(fbm(vec2(y*5.-clock*2.4,seed))- .5)*.65*y;
   float width=(1.-y)*.74+.05;
   float body=1.-abs(p.x+warp)/width;
   float density=body-(n*.85+y*.5);
   alpha=smoothstep(-.13,.32,density)*smoothstep(0.,.15,y)*(1.-smoothstep(.78,1.,y));
   float heat=clamp(density*1.7+(1.-y)*.3,0.,1.);
   color=mix(vec3(.55,.075,.015),vec3(1.,.43,.07),smoothstep(.05,.55,heat));
   color=mix(color,vec3(1.,.88,.5),smoothstep(.5,1.,heat));
  }else if(type<1.5){
   float density=(1.-length(p))*.95+(n-.5)*.75;
   alpha=smoothstep(.03,.55,density)*.6;
   color*=.75+n*.45;
  }else if(type<2.5){
   alpha=exp(-dot(p,p)*6.)*(1.-smoothstep(.65,1.,length(p)));
  }else if(type<3.5){
   // Small asymmetric translucent splinters, not radial crystal crowns.
   float edge=abs(p.x)*2.5+abs(p.y+.18)*.65;
   alpha=(1.-smoothstep(.65,.92,edge))*.8;
   color*=mix(.45,1.4,step(p.x,p.y*.13));
  }else if(type<4.5){
   alpha=exp(-dot(p,p)*4.)*.45*(1.-smoothstep(.6,1.,length(p)));
  }else if(type<5.5){
   float core=exp(-p.x*p.x*70.);float halo=exp(-p.x*p.x*7.);
   alpha=(core+halo*.3)*smoothstep(0.,.08,vUv.y)*(1.-smoothstep(.92,1.,vUv.y));
   color=mix(vTint,vec3(.94,1.,1.),core);
  }else if(type>7.5){
   float r=length(p);
   float edge=1.-smoothstep(.82,1.,r);
   alpha=edge*(.35+n*.65);
   color=mix(vTint*.55,vec3(1.,.75,.38),n*n);
  }else if(type>6.5){
   float r=length(p);
   float edge=1.-smoothstep(.65,1.,r);
   alpha=edge*(.12+n*.35)*(1.-smoothstep(.92,1.,r));
   color=mix(vTint*.5,vTint,n);
  }else{
   // Translucent protective membrane: soft rim and irregular fine veins.
   float r=length(p);float rim=exp(-pow((r-.72)*15.,2.));
   float veins=pow(1.-abs(noise(p*17.+seed)*2.-1.),20.);
   alpha=(rim*.36+veins*.15)*(1.-smoothstep(.74,.98,r));
   color*=.7+n*.5;
  }
  alpha*=vData.y;if(alpha<.008)discard;
  gl_FragColor=vec4(color,alpha);
 }`;
function createBatch(root,additive){
 const geometry=new T.InstancedBufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0],3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);
 const attrs={};for(const [key,n]of Object.entries({center:3,endpoint:3,extent:2,tint:3,data:4})){
  attrs[key]=new T.InstancedBufferAttribute(new Float32Array(CAPACITY*n),n).setUsage(T.DynamicDrawUsage);geometry.setAttribute(key,attrs[key]);
 }
 geometry.instanceCount=0;
 const material=new T.ShaderMaterial({vertexShader,fragmentShader,uniforms:{clock:{value:0}},transparent:true,depthWrite:false,depthTest:true,blending:additive?T.AdditiveBlending:T.NormalBlending,toneMapped:false});
 const mesh=new T.Mesh(geometry,material);mesh.frustumCulled=false;mesh.renderOrder=additive?9:8;root.add(mesh);
 return{geometry,material,attrs};
}
export function createSoulFxView(scene){
 const root=new T.Group();root.name='soul-activation-effects';scene.add(root);
 const mist=createBatch(root,false),light=createBatch(root,true),batches=[mist,light];
 const particles=Array.from({length:CAPACITY},()=>({life:0}));
 const emitters=Array.from({length:24},()=>({life:0}));
 let now=0,cursor=0,serial=0,quality='medium',reduced=false,statusAt=0;
 const ghosts=Array.from({length:2},()=>{const group=new T.Group();root.add(group);return{group,life:0,material:new T.MeshBasicMaterial({color:0xbadbd2,transparent:true,opacity:0,depthWrite:false,toneMapped:false})};});
 let ghostCursor=0;
 function snapshotHero(hero,e){
  if(!hero||reduced)return;const g=ghosts[ghostCursor++%2];g.group.clear();g.group.position.set(0,0,0);hero.updateMatrixWorld(true);let count=0;
  hero.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||!o.visible||count++>96)return;const mesh=new T.Mesh(o.geometry,g.material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(o.matrixWorld);g.group.add(mesh);});
  const dx=(e.tx??e.x)-e.x,dz=(e.tz??e.z+1)-e.z,d=Math.hypot(dx,dz)||1;g.dx=-dx/d;g.dz=-dz/d;g.life=.55;
 }
 const budget=()=>quality==='low'?512:quality==='high'?CAPACITY:1024;
 // Presentation-only PRNG, independent of gameplay randomness.
 let seed=918273;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function particle(at,type,color,size,life,velocity={},extra={}){
  const p=particles[cursor++%budget()];
  Object.assign(p,{home:null,spiral:0,blastRadius:0,x:at.x,y:at.y??0,z:at.z,type,color,size,stretch:1,life,duration:life,vx:velocity.x??0,vy:velocity.y??0,vz:velocity.z??0,seed:rand()*100,angle:0,opacity:1,add:type>=2,gravity:0,tx:0,ty:0,tz:0,...extra});return p;
 }
 function cloud(e,cold=false,strength=1,continuous=false){
  const count=continuous?(reduced?1:quality==='low'?2:4):(reduced?3:quality==='low'?5:10);
  for(let i=0;i<count;i++){
   const angle=rand()*Math.PI*2,r=rand()*.5,at={x:e.x+Math.cos(angle)*r,y:(e.y??0)+.35+rand()*.8,z:e.z+Math.sin(angle)*r};
   if(cold){
    particle(at,1,[.62,.72,.75],1.2+rand(),.65+rand()*.6,{x:Math.cos(angle)*1.4*strength,y:.25,z:Math.sin(angle)*1.4*strength},{angle:rand()*6,opacity:continuous?.16:.32});
    if(!reduced&&(!continuous||i%2===0))particle(at,3,[.64,.83,.9],.07+rand()*.13,.4+rand()*.6,{x:Math.cos(angle)*2.5,y:1+rand()*2,z:Math.sin(angle)*2.5},{stretch:2+rand()*2,angle:rand()*6,gravity:4});
   }else{
    particle(at,0,[1,.4,.1],.8+rand()*.7,.4+rand()*.45,{x:Math.cos(angle)*.25,y:1+rand(),z:Math.sin(angle)*.25},{stretch:1.8,opacity:.85});
    particle({...at,y:at.y+.5},1,[.24,.25,.24],.9+rand(),.8+rand()*.8,{x:.25,y:1.2,z:.1},{angle:rand()*6,opacity:.28});
    if(!reduced)particle(at,2,[1,.48,.14],.035+rand()*.06,.4+rand()*.65,{x:Math.cos(angle)*1.5,y:2+rand()*3,z:Math.sin(angle)*1.5},{stretch:2.5,gravity:2});
   }
  }
 }
 function bolt(e,plasma=false){
  if(!Number.isFinite(e.tx)||!Number.isFinite(e.tz))return;
  const start=new T.Vector3(e.x,(e.y??0)+1,e.z),end=new T.Vector3(e.tx,(e.ty??0)+1,e.tz),length=start.distanceTo(end);
  const steps=Math.max(5,Math.min(24,Math.ceil(length*3)));let prev=start.clone();
  for(let i=1;i<=steps;i++){
   const t=i/steps,p=start.clone().lerp(end,t),jitter=Math.sin(t*Math.PI)*.28;
   p.x+=(rand()-.5)*jitter;p.y+=(rand()-.5)*jitter;p.z+=(rand()-.5)*jitter;
   particle(prev,5,plasma?[1,.6,.3]:[.43,.7,.8],plasma?.3:.16,.16+rand()*.08,{}, {tx:p.x,ty:p.y,tz:p.z});
   if(i%4===0){const branch=p.clone().add(new T.Vector3((rand()-.5)*.9,.3+rand()*.5,(rand()-.5)*.9));particle(p,5,[.4,.6,.72],.07,.12,{}, {tx:branch.x,ty:branch.y,tz:branch.z});}
   prev=p;
  }
  particle(end,4,[.5,.8,1],1.8,.25);for(let i=0;i<7;i++)particle(end,2,[.7,.9,1],.05,.3,{x:(rand()-.5)*3,y:rand()*3,z:(rand()-.5)*3});
 }
 function streak(at,to,color,width=.08,life=.35){
  particle(at,5,color,width,life,{}, {tx:to.x,ty:to.y??0,tz:to.z});
 }
 function threads(e,revive=false){
  const center={x:e.x,y:(e.y??0)+1,z:e.z},color=revive?[.9,.82,.56]:[.4,.73,.56];
  for(let i=0;i<(reduced?5:revive?36:18);i++){
   const a=rand()*Math.PI*2,r=revive?2.3:.9+rand()*.8,at={x:e.x+Math.cos(a)*r,y:(e.y??0)+rand()*.5,z:e.z+Math.sin(a)*r};
   particle(at,2,color,.17,.7+rand()*.4,{}, {home:center,spiral:revive?1.8:1.1,stretch:2});
  }
  particle(center,4,color,revive?4:1.7,revive?1.5:.8,{}, {opacity:.5});
  if(revive)particle(center,6,[.81,.88,.76],3.8,1.8,{}, {stretch:1.2,opacity:.8});
 }
 function armor(e,ready=false){
  const at={...e,y:(e.y??0)+1};
  particle(at,6,ready?[.48,.66,.61]:[.9,.78,.52],ready?2.5:3.4,ready?1.3:.65,{}, {stretch:1.1,opacity:ready?.65:1});
  if(ready)return;
  for(let i=0;i<(reduced?5:24);i++){const a=rand()*Math.PI*2;particle(at,2,[1,.72,.34],.045,.3+rand()*.35,{x:Math.cos(a)*(2+rand()*2),y:1+rand()*2,z:Math.sin(a)*(2+rand()*2)},{stretch:3,gravity:6});}
 }
 function directed(e,kind){
  const dx=(e.tx??e.x+(e.dx??0))-e.x,dz=(e.tz??e.z+(e.dz??1))-e.z,a=Math.atan2(dz,dx),color=kind==='echo'?[.56,.72,.73]:[.68,.82,.71];
  const count=kind==='splinter'?3:kind==='multishot'?Math.min(5,e.count??3):kind==='swarm'?2:1;
  for(let i=0;i<count;i++){
   const angle=a+(kind==='splinter'?i*Math.PI*2/3:(i-(count-1)/2)*.22),length=kind==='pierce'?1.8:kind==='echo'?2.5:1.1;
   const at={x:e.x,y:(e.y??0)+1,z:e.z},to={x:e.x+Math.cos(angle)*length,y:at.y,z:e.z+Math.sin(angle)*length};
   streak(at,to,color,kind==='echo'?.18:.09,kind==='echo'?.4:.25);
   for(let j=0;j<5;j++)particle(at,2,color,.055,.25+rand()*.25,{x:Math.cos(angle)*(3+rand()*2),y:(rand()-.5)*.4,z:Math.sin(angle)*(3+rand()*2)},{stretch:2});
  }
 }
 function burst(e){
  switch(e.kind){
   case 'burn':cloud(e);break;
   case 'cold':cloud(e,true,.6);break;
   case 'freeze':cloud(e,true,1.4);particle({...e,y:(e.y??0)+.7},6,[.6,.8,.9],2.1,.9,{}, {opacity:.7});break;
   case 'electric':bolt(e);break;
   case 'plasma':bolt(e,true);if(Number.isFinite(e.tx))cloud({x:e.tx,y:e.ty,z:e.tz});break;
   case 'spread':{
    if(Number.isFinite(e.tx))for(let i=0;i<12;i++){const u=i/11;particle({x:e.x+(e.tx-e.x)*u,y:(e.y??0)+.6+Math.sin(u*Math.PI)*.6,z:e.z+(e.tz-e.z)*u},0,[1,.5,.1],.4,.35+rand()*.35,{y:.8},{stretch:1.8});}
    cloud(Number.isFinite(e.tx)?{x:e.tx,y:e.ty,z:e.tz}:e);break;
   }
   case 'thermal':{
    cloud(e);cloud(e,true,2.5);particle({...e,y:(e.y??0)+.8},4,[1,.83,.6],5,.4);
    for(let i=0;i<24;i++){const a=rand()*6.283;particle({...e,y:(e.y??0)+.7},1,[.7,.74,.73],1.4,.7,{x:Math.cos(a)*3,y:.5,z:Math.sin(a)*3},{opacity:.25});}break;
   }
   case 'armorReady':armor(e,true);break;
   case 'armor':armor(e);break;
   case 'regen':threads(e);break;
   case 'revive':threads(e,true);break;
   case 'echo':case 'splinter':case 'pierce':case 'multishot':case 'swarm':directed(e,e.kind);break;
   case 'running':{
    const color=[.57,.67,.61];for(let i=0;i<12;i++)particle({...e,y:(e.y??0)+.1},1,color,.5+rand()*.6,.4+rand()*.3,{x:(rand()-.5)*2,y:.2,z:(rand()-.5)*2},{opacity:.25});break;
   }
   case 'summon':{
    threads(e);for(let i=0;i<8;i++)particle({...e,y:(e.y??0)+1.3},1,[.5,.63,.48],.4,.6,{x:(rand()-.5),y:.6,z:(rand()-.5)},{opacity:.2});break;
   }
   case 'critical':{
    const at={...e,y:(e.y??0)+.8};particle(at,4,[1,.8,.5],1.5,.2);
    for(let i=0;i<16;i++)particle(at,2,[1,.7,.34],.04,.2+rand()*.4,{x:(rand()-.5)*6,y:rand()*4,z:(rand()-.5)*6},{stretch:3,gravity:7});break;
   }
  }
 }
 // Reuse the ability flame/smoke renderer, keeping the blast free of hard geometry.
 function volatileCharge(e){
  const heat=1-Math.max(0,e.fuseRemaining)/VOLATILE.fuse,at={x:e.x,y:(e.y??0)+.7,z:e.z};
  particle({...e,y:(e.y??0)+.08},7,[1,.25,.035],VOLATILE.radius*2,.24,{}, {opacity:.65+heat*.3});
  particle(at,4,[1,.3+.25*heat,.06],1.2+heat*.9,.25,{}, {opacity:.45+heat*.35});
  const n=reduced?1:quality==='low'?2:4;
  for(let i=0;i<n;i++){
   const a=rand()*Math.PI*2,r=.2+rand()*.35,p={x:e.x+Math.cos(a)*r,y:(e.y??0)+.3,z:e.z+Math.sin(a)*r};
   particle(p,0,[1,.4,.1],.5+heat*.45,.3+rand()*.2,{y:.4+heat},{stretch:1.5+heat,opacity:.6});
   if(!reduced)particle(p,2,[1,.65,.2],.04,.4,{x:Math.cos(a)*.7,y:1+heat*2,z:Math.sin(a)*.7},{stretch:2.5});
  }
 }
 function volatileBlast(e){
  const radius=e.radius??VOLATILE.radius,ground=e.y??0;
  // A short, ground-hugging pressure flash reaches the exact damage radius in .12 s.
  particle({...e,y:ground+.12},8,[1,.4,.1],radius*2,.34,{}, {opacity:reduced?.4:.75});
  particle({...e,y:ground+.3},4,[1,.72,.38],radius,.18,{}, {opacity:reduced?.3:.65,stretch:.45});
  const n=reduced?8:quality==='low'?14:26;
  for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2+rand()*.1,r=radius*(.6+rand()*.23);
   const at={x:e.x,y:ground+.18+rand()*.18,z:e.z};
   const spread={blastRadius:r,blastX:e.x,blastZ:e.z,blastAngle:a};
   particle(at,1,[.4,.34,.25],.65+rand()*.4,.45+rand()*.2,{y:.25},{...spread,opacity:.5,stretch:.55,angle:rand()*.3});
   particle(at,4,[1,.48,.16],.6+rand()*.5,.22+rand()*.1,{}, {...spread,opacity:.65,stretch:.5});
   if(!reduced)particle(at,2,[1,.7,.3],.045,.3+rand()*.1,{y:.35},{...spread,stretch:2,angle:a});
  }
 }
 function event(e,hero){
  if(e.type==='volatile-blast'&&Number.isFinite(e.x)&&Number.isFinite(e.z)){volatileBlast(e);return;}
  if(e.type!=='soul-proc'||!SOUL_PROCS[e.kind]||!Number.isFinite(e.x)||!Number.isFinite(e.z))return;
  // Merge rapid refreshes on the same target instead of stacking opaque bursts.
  if(emitters.some(v=>v.life>v.duration-.12&&v.kind===e.kind&&Math.hypot(v.x-e.x,v.z-e.z)<.3))return;
  const slot=emitters.find(v=>v.life<=0)||emitters.reduce((a,b)=>a.life<b.life?a:b);
  Object.assign(slot,e,{life:e.kind==='revive'?1.8:1.15,duration:e.kind==='revive'?1.8:1.15,id:serial++});burst(e);if(e.kind==='echo')snapshotHero(hero,e);
 }
 function update(dt,nextReduced=false,s){
  reduced=nextReduced;now+=dt;
  for(const e of emitters)e.life=Math.max(0,e.life-dt);
  // Attach ongoing flames/frost to current enemy positions and status durations.
  if(s&&dt>0&&now>=statusAt){statusAt=now+(quality==='low'?.16:.09);let count=0;
   const b=modifiers(s),player=s.player;
   if(b.running&&s.abilities.moving>=2&&!reduced){
    const dx=s.motion?.x??0,dz=s.motion?.z??0,d=Math.hypot(dx,dz)||1;
    for(const side of [-1,1])particle({x:player.x+dz/d*side*.35,y:(player.y??0)+.15,z:player.z-dx/d*side*.35},1,[.5,.57,.51],.6,.45,{x:-dx/d*.8,y:.12,z:-dz/d*.8},{opacity:.17});
   }
   for(const c of s.abilities?.companions||[]){
    particle({...c,y:(c.y??0)+(c.hover??1.5)},4,[.4,.67,.45],.25,.2,{}, {opacity:.2});
    particle({...c,y:(c.y??0)+(c.hover??1.5)},2,[.64,.79,.43],.06,.4,{y:.12});
   }
   for(const q of s.abilities?.summonShots||[]){if(q.delay>0||q.life<=0)continue;particle({...q,y:(q.y??0)+1.1},4,[.55,.79,.4],.5,.16,{}, {opacity:.75});}
   for(const e of s.enemies){if(e.hp<=0||Math.hypot(e.x-s.player.x,e.z-s.player.z)>35)continue;
    if(e.volatile&&e.fuseRemaining!=null&&!(e.frozenUntil>combatTime(s))){volatileCharge(e);}
    const burning=e.burn?.until>combatTime(s),cold=e.chillUntil>combatTime(s)||e.frozenUntil>combatTime(s);if(!burning&&!cold)continue;if(count++>=24)break;
    if(burning)cloud(e,false,1,true);if(cold)cloud(e,true,e.frozenUntil>combatTime(s)?1.3:.6,true);
   }
  }
  for(const g of ghosts){g.life=Math.max(0,g.life-dt);g.group.visible=g.life>0;g.material.opacity=g.life*.32;g.group.position.set(g.dx*(.55-g.life)*1.7||0,0,g.dz*(.55-g.life)*1.7||0);}
  const counts=[0,0];
  for(const p of particles){if(p.life<=0)continue;p.life=Math.max(0,p.life-dt);if(!p.life)continue;
   const motion=reduced?.2:1;p.x+=p.vx*dt*motion;p.y+=p.vy*dt*motion;p.z+=p.vz*dt*motion;p.vy-=p.gravity*dt;
   const age=1-p.life/p.duration;
   if(p.blastRadius){const travel=1-Math.pow(1-Math.min(1,(p.duration-p.life)/.12),3);p.x=p.blastX+Math.cos(p.blastAngle)*p.blastRadius*travel;p.z=p.blastZ+Math.sin(p.blastAngle)*p.blastRadius*travel;}
   if(p.home&&dt>0){const dx=p.home.x-p.x,dz=p.home.z-p.z;p.x+=(dx*3-dz*p.spiral)*dt;p.z+=(dz*3+dx*p.spiral)*dt;p.y+=(p.home.y-p.y)*dt*3;}
   const fade=Math.min(1,p.life*5)*Math.min(1,age*12+.2)*p.opacity;
   const b=p.add?1:0,i=counts[b]++,attrs=batches[b].attrs;
   attrs.center.setXYZ(i,p.x,p.y,p.z);attrs.endpoint.setXYZ(i,p.tx,p.ty,p.tz);
   const grow=p.type===8?.2+.8*Math.min(1,(p.duration-p.life)/.12):p.type===1?1+age*.9:1;attrs.extent.setXY(i,p.size*grow,p.size*p.stretch*grow);
   attrs.tint.setXYZ(i,...p.color);attrs.data.setXYZW(i,p.type,fade,p.seed,p.angle);
  }
  batches.forEach((b,i)=>{b.geometry.instanceCount=counts[i];b.material.uniforms.clock.value=now;for(const a of Object.values(b.attrs))a.needsUpdate=true;});
 }
 function reset(){for(const g of ghosts){g.life=0;g.group.clear();g.group.visible=false;}for(const p of particles)p.life=0;for(const e of emitters)e.life=0;for(const b of batches)b.geometry.instanceCount=0;now=statusAt=cursor=serial=0;seed=918273;}
 return{event,update,reset,configure(value){quality=value;for(let i=budget();i<particles.length;i++)particles[i].life=0;},count:()=>emitters.filter(e=>e.life>0).length,
  info:()=>({particles:particles.filter(p=>p.life>0).length,drawCalls:2}),
  dispose(){root.removeFromParent();for(const g of ghosts)g.material.dispose();for(const b of batches){b.geometry.dispose();b.material.dispose();}}};
}
