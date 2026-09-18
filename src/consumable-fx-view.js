import * as T from 'three';
import {CONSUMABLE_BY_KIND} from './systems/consumable-drops.js';

// One bounded batch for pickup trails, status wisps and actual damage contacts.
// State-based sleep indicators disappear on wake/death; events never alter combat.
const CAPACITY=512,EVENT_LIMIT=32;
const HUES={shield:'#9abfc6',phase:'#b4a8c8',attraction:'#a1c5b6',recharge:'#cabb8b',beacon:'#b4bf8f',sleep:'#b6a1ca',impulse:'#9fbdd1',hunter:'#cf9a7a',parasite:'#bb92a4'};
export function createConsumableFxView(scene){
 const geometry=new T.PlaneGeometry(2,2),style=new T.InstancedBufferAttribute(new Float32Array(CAPACITY*2),2);
 geometry.setAttribute('fxStyle',style);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`attribute vec2 fxStyle;varying vec2 coord;varying vec2 style;varying vec3 tint;
   void main(){coord=uv*2.0-1.0;style=fxStyle;tint=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 coord;varying vec2 style;varying vec3 tint;
   void main(){float r=length(coord),a;
    if(style.x<.5)a=exp(-r*r*9.0)*(1.0-smoothstep(.6,1.0,r));
    else if(style.x<1.5)a=exp(-pow((r-.77)/.065,2.0));
    else if(style.x<2.5){float moon=1.0-smoothstep(.68,.76,r);float cut=smoothstep(.62,.70,length(coord-vec2(.30,.18)));a=moon*cut;}
    else if(style.x>3.5){a=(1.0-smoothstep(.65,.95,abs(coord.x)+abs(coord.y)*.6))*.65;}
    else a=exp(-r*r*19.0)+exp(-abs(coord.x)*38.0-abs(coord.y)*5.0)*.5+exp(-abs(coord.y)*38.0-abs(coord.x)*5.0)*.5;
    gl_FragColor=vec4(tint,a*style.y);}`});
 const mesh=new T.InstancedMesh(geometry,material,CAPACITY);mesh.name='consumable-vfx';mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.setColorAt(0,new T.Color());scene.add(mesh);
 const dummy=new T.Object3D(),color=new T.Color(),events=[];let count=0,sleepers=0,shieldActive=false,shieldHit=false;const endpoint=new T.Vector3();
 function event(e){
  const pickup=e.type==='pickup'&&CONSUMABLE_BY_KIND[e.kind],hit=e.type==='enemy-damage'&&(e.source==='consumable'||e.marked);
  const types={'consumable-burst':'wave','consumable-mark':'mark','consumable-attract':'attract','consumable-recharge':'recharge','consumable-parasite':'parasite','consumable-lured':'lured'};
  if(e.type==='reload-start'&&e.boosted)e={...e,type:'consumable-recharge'};
  const block=e.type==='shield'&&e.kind==='consumable',fx=pickup?'pickup':hit?'hit':block?'break':e.type==='arc'&&e.kind==='consumable-parasite'?'parasite':types[e.type];
  if(!fx||!Number.isFinite(e.x)||!Number.isFinite(e.z))return;
  if(block)shieldHit=true;
  if(events.length===EVENT_LIMIT)events.shift();
  const durations={pickup:.75,hit:.38,mark:.55,attract:1.05,recharge:.65,parasite:.24,lured:.7,break:.65};
  events.push({...e,kind:block?'shield':fx==='parasite'?'parasite':e.kind??(['attract','recharge','parasite'].includes(fx)?{attract:'attraction',recharge:'recharge',parasite:'parasite'}[fx]:undefined),age:0,duration:durations[fx]??.85,fx});
 }
 function update(s,camera,time,dt,reduced=false,onScreen=()=>true,hero=null){
  count=0;sleepers=0;
  function add(x,y,z,size,tint,alpha,type=0,ground=false){
   if(count>=CAPACITY||alpha<=0)return;
   dummy.position.set(x,y,z);dummy.scale.setScalar(size);
   if(ground)dummy.rotation.set(-Math.PI/2,0,0);else dummy.quaternion.copy(camera.quaternion);
   dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);mesh.setColorAt(count,color.set(tint));style.setXY(count,type,alpha);count++;
  }
  const a=s.consumables,shieldNow=!s.dead&&a?.shieldCharges>0&&a.shieldUntil>time;
  if(shieldActive&&!shieldNow&&!shieldHit&&!s.dead){event({type:'shield',kind:'consumable',...s.player});events.at(-1).fx='dissolve';}
  shieldActive=shieldNow;shieldHit=false;
  // Status gets priority over transient particles during large fights.
  for(const e of s.enemies??[]){
   if(e.hp<=0||e.pickupSleepUntil<=time||!Number.isFinite(e.pickupSleepUntil)||!onScreen(e)||sleepers>=64)continue;
   sleepers++;const y=(e.y??0)+Math.max(1.1,(e.radius??.6)*2),phase=reduced?0:time*.7+e.id;
   add(e.x,y+.6,e.z,.34,HUES.sleep,.82,2);
   if(!reduced)for(let i=0;i<3;i++){const u=(phase*.45+i/3)%1,a=phase+i*2.1;add(e.x+Math.cos(a)*.42,y+.25+u*.85,e.z+Math.sin(a)*.42,.14,HUES.sleep,Math.sin(u*Math.PI)*.55);}
  }
  if(!s.dead&&a?.rechargeUntil>time&&hero){
   hero.updateMatrixWorld(true);const fade=Math.min(1,(a.rechargeUntil-time)/.6);
   for(const p of s.arms??[])if(p?.reloadRemaining>0){const arm=hero.userData.arms?.get(p.id);if(!arm)continue;endpoint.set(0,0,.7);arm.localToWorld(endpoint);
    add(endpoint.x,endpoint.y,endpoint.z,.25,HUES.recharge,fade*(reduced?.3:.35+.15*Math.sin(time*6)),0);
   }
  }
  if(!s.dead&&a?.beacon?.until>time){
   const b=a.beacon,ending=Math.min(1,(b.until-time)/.8),phase=reduced?.3:(time*.8)%1;
   add(b.x,(b.y??0)+.15,b.z,(.6+phase*4)/.77,HUES.beacon,(1-phase)*.3*ending,1,true);
   for(const e of s.enemies??[])if(e.hp>0&&!(e.pickupSleepUntil>time)&&e.pickupBeaconUntil===b.until&&onScreen(e)){
    add(e.x,(e.y??0)+Math.max(1.6,(e.radius??.6)*2),e.z,.22,HUES.beacon,.6*ending,1);
   }
  }
  for(let j=events.length-1;j>=0;j--){const e=events[j];e.age+=Math.max(0,dt);if(e.age>=e.duration||reduced){events.splice(j,1);continue;}
   const u=e.age/e.duration,fade=1-u,y=(e.y??0)+.8,tint=HUES[e.kind]??(e.marked?HUES.hunter:e.source==='consumable'?HUES.parasite:'#c2b58d');
   if(e.fx==='pickup'){
    const p=s.player;add(p.x,(p.y??0)+1,p.z,.6*Math.sin(u*Math.PI),tint,fade*.7,3);
    for(let i=0;i<14;i++){const a=i*2.39996+u*2.8,r=(1-u)*(1.3+i%3*.18);add(p.x+Math.cos(a)*r,(p.y??0)+.25+u*.9+Math.sin(i)*fade*.15,p.z+Math.sin(a)*r,.13,tint,Math.sin(u*Math.PI)*.9);}
   }else if(e.fx==='attract'){
    for(const [k,origin] of (e.origins??[]).entries())for(let i=0;i<5;i++){
     const t=Math.max(0,Math.min(1,(u-i*.025-k%4*.025)*1.2)),bend=Math.sin(t*Math.PI),p=s.player;
     add(origin.x+(p.x-origin.x)*t,(origin.y??0)+.25+((p.y??0)+.8-(origin.y??0))*t+bend*.7,origin.z+(p.z-origin.z)*t,.13+(i===0?.05:0),tint,(1-i/6)*Math.sin(t*Math.PI));
    }
   }else if(e.fx==='recharge'){
    const arm=hero?.userData.arms?.get(e.source);if(!arm)continue;
    hero.updateMatrixWorld(true);endpoint.set(0,0,.7);arm.localToWorld(endpoint);
    const p=s.player;for(let i=0;i<7;i++){const t=Math.max(0,Math.min(1,u*1.5-i*.065));add(p.x+(endpoint.x-p.x)*t,(p.y??0)+1+(endpoint.y-(p.y??0)-1)*t,p.z+(endpoint.z-p.z)*t,.17,tint,(1-i/8)*fade);}
    if(u>.45)add(endpoint.x,endpoint.y,endpoint.z,.32,tint,Math.sin((u-.45)/.55*Math.PI),3);
   }else if(e.fx==='parasite'){
    for(let i=0;i<12;i++){const t=i/11,bend=Math.sin(t*Math.PI)*.12*Math.sin(i*2.4);add(e.x+(e.tx-e.x)*t+bend,e.y+(e.ty-e.y)*t,e.z+(e.tz-e.z)*t,.105,tint,fade);}
   }else if(e.fx==='break'||e.fx==='dissolve'){
    if(e.fx==='break')add(e.x+(e.dx??0)*1.35,y+.2,e.z+(e.dz??0)*1.35,.65,tint,fade,3);
    for(let i=0;i<20;i++){const az=i*2.39996,v=1-2*(i+.5)/20,h=Math.sqrt(1-v*v),r=1.4+u*.9;
     add(e.x+Math.cos(az)*h*r,y+.2+v*r-u*u*.5,e.z+Math.sin(az)*h*r,.10+fade*.12,tint,fade*.65,4);
    }
   }else if(e.fx==='lured'){
    const target=(s.enemies??[]).find(q=>q.id===e.target);if(!target||target.hp<=0)continue;
    add(target.x,(target.y??0)+Math.max(1.6,(target.radius??.6)*2),target.z,.25+u*.4,HUES.beacon,fade*.65,1);
   }else if(e.fx==='wave'){
    const r=(e.radius??12)*u;add(e.x,(e.y??0)+.15,e.z,r/.77,tint,fade*.35,1,true);
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=e.x+Math.cos(a)*r,z=e.z+Math.sin(a)*r,ground=s.world?.heightAt?.(x,z)??e.y??0;add(x,ground+.24,z,.18,tint,fade*.55);}
   }else if(e.fx==='mark'){
    for(let i=0;i<8;i++){const t=Math.max(0,u-i*.035);add(e.x+(e.tx-e.x)*t,y+((e.ty??0)-(e.y??0))*t+Math.sin(t*Math.PI)*1.2,e.z+(e.tz-e.z)*t,.18,tint,fade*(1-i/9));}
   }else{
    add(e.x,y,e.z,.6+u*.45,tint,fade,3);
    add(e.x,y,e.z,.3+u*.9,tint,fade*.65,1);
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=u*.85;add(e.x+Math.cos(a)*r,y+Math.sin(i*2)*r,e.z+Math.sin(a)*r,.12*fade,tint,fade);}
   }
  }
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;style.needsUpdate=true;
 }
 function reset(){events.length=0;shieldActive=shieldHit=false;mesh.count=count=sleepers=0;}
 return{event,update,reset,info:()=>({consumableFxInstances:count,sleepIndicators:sleepers}),dispose(){reset();scene.remove(mesh);mesh.dispose();geometry.dispose();material.dispose();}};
}
