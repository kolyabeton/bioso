import * as T from 'three';
import {AMBIENT_TIERS,createForestAmbientState} from './forest-ambient-state.js';
import {createForestUniforms} from './forest-light.js';

export function createForestAmbientView(scene){
 const root=new T.Group();root.name='forest-life';scene.add(root);
 const state=createForestAmbientState(),uniforms=createForestUniforms(),pose=new T.Object3D();
 let frame={active:false,combat:false,time:0,strength:0},tier='medium',reduced=false,world=null,perches=[],previousCombat=false;
 const birds=Array.from({length:6},(_,i)=>({i,flying:false,age:0,cooldown:0,x:0,z:0,reacted:false}));
 const birdGeometry=new T.BufferGeometry();
 birdGeometry.setAttribute('position',new T.Float32BufferAttribute([
  -.07,0,-.25,.07,0,-.25,0,0,.28,
  -.04,0,.12,-.66,0,-.12,-.25,0,-.2,
  .04,0,.12,.25,0,-.2,.66,0,-.12,
  0,0,-.18,-.16,0,-.38,.16,0,-.38],3));
 const birdMaterial=new T.MeshBasicMaterial({color:'#313c3b',side:T.DoubleSide});
 birdMaterial.onBeforeCompile=shader=>{shader.uniforms.forestTime=uniforms.forestTime;shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float forestTime;').replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.y+=abs(position.x)*sin(forestTime*11.0+instanceMatrix[3].x*.4)*.8;`);};
 const flock=new T.InstancedMesh(birdGeometry,birdMaterial,6);flock.name='forest-birds';flock.instanceMatrix.setUsage(T.DynamicDrawUsage);flock.frustumCulled=false;root.add(flock);
 const particleMaterial=new T.MeshBasicMaterial({color:'#c7bd87',transparent:true,opacity:.48,depthWrite:false,side:T.DoubleSide});
 const dust=new T.InstancedMesh(new T.PlaneGeometry(1,1),particleMaterial,40);dust.name='forest-pollen-leaves';dust.frustumCulled=false;dust.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(dust);
 const shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:`varying vec2 p; void main(){p=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 p;void main(){float a=pow(max(0.0,1.0-dot(p,p)),2.0)*.34;gl_FragColor=vec4(.09,.12,.13,a);}`});
 const shadows=new T.InstancedMesh(new T.PlaneGeometry(1,1),shadowMaterial,160);shadows.name='forest-contact-shadows';shadows.frustumCulled=false;shadows.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(shadows);
 function put(mesh,i,x,y,z,sx,sy,sz,rx=0,ry=0){pose.position.set(x,y,z);pose.rotation.set(rx,ry,0);pose.scale.set(sx,sy,sz);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);}
 function update(s,dt,quality,motion){
  tier=quality;reduced=motion;frame=state.update(s,dt);root.visible=frame.active;
  uniforms.forestTime.value=frame.time;uniforms.forestWind.value=!reduced?frame.strength:0;uniforms.forestHero.value.set(s.player.x,s.player.z);uniforms.forestMotion.value=reduced?0:1;
  if(!frame.active){flock.count=dust.count=shadows.count=0;return frame;}
  if(world!==s.world){world=s.world;perches=world.tiles.filter(t=>t.biome==='forest').flatMap(t=>t.decorations.filter(d=>d.feature==='thicket'));}
  const p=s.player,limits=AMBIENT_TIERS[tier],t=frame.time;
  const nearPerches=perches.filter(d=>Math.abs(d.x-p.x)<25&&Math.abs(d.z-p.z)<32).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
  // Projected canopy silhouettes share the ground pass, not shadow maps/lights.
  const casters=nearPerches.filter(d=>Math.abs(d.x-p.x)<15&&Math.abs(d.z-p.z)<25).slice(0,8);
  uniforms.forestCanopies.value.forEach((v,i)=>{const d=casters[i];if(d)v.set(d.x,d.z,d.size*.43,2.8);else v.set(0,0,0,0);});
  let count=0;
  for(const b of birds){
   const roost=nearPerches[b.i%Math.max(1,nearPerches.length)];
   if(!b.flying&&roost){b.x=roost.x;b.z=roost.z;}
   b.cooldown=Math.max(0,b.cooldown-dt);
   const near=roost&&Math.hypot(b.x-p.x,b.z-p.z)<6;
   if(!near)b.reacted=false;
   const scatter=frame.combat&&!previousCombat;
   const flyby=!frame.combat&&Math.sin(t*.18+b.i*1.7)>.985;
   if(dt>0&&!reduced&&!b.flying&&b.cooldown===0&&(scatter||near&&!b.reacted||flyby)){
    b.flying=true;b.age=0;b.reacted=!!near;b.cooldown=18+b.i*2;
    if(!near){b.x=p.x-16-b.i;b.z=p.z-9+b.i*2;}
   }
   if(b.flying){b.age+=dt;if(b.age>8)b.flying=false;}
   if(reduced||b.i>=limits.birds||!b.flying)continue;
   put(flock,count++,b.x+b.age*(3.6+frame.strength),1.3+Math.min(5,b.age*2)+Math.sin(b.age*1.5)*.35,b.z+b.age*.8,.65,.65,.65,0,1.35);
  }
  previousCombat=frame.combat;flock.count=count;flock.instanceMatrix.needsUpdate=true;
  dust.count=reduced?0:Math.floor(limits.particles*(frame.combat?.5:1));
  for(let i=0;i<dust.count;i++){
   const age=(t*(.13+frame.strength*.07)+i*.618)%1,trail=i%5===0&&Math.hypot(s.motion?.x||0,s.motion?.z||0)>.1;
   const x=trail?p.x+(i%3-1)*.45:p.x+((i*7.13+t*frame.strength*.9)%26)-13;
   const z=trail?p.z+age*2:p.z+((i*11.19+t*.24)%42)-24;
   const scale=trail?.07:(i%4===0?.13:.035)*(Math.sin(age*Math.PI));
   put(dust,i,x,trail?.15+age*.5:.5+age*4,z,scale,scale*(i%4===0?.45:1),scale,-.85,t*.5+i);
  }
  dust.instanceMatrix.needsUpdate=true;
  // The player has one shared contact patch in every environment.
  let n=0;
  for(const tile of world.tiles){if(tile.biome!=='forest'||Math.abs(tile.x-p.x)>65||Math.abs(tile.z-p.z)>65)continue;
   for(const d of tile.decorations){if(n>=160||Math.abs(d.x-p.x)>18||Math.abs(d.z-p.z)>32)continue;
    const radius=d.feature==='rock'?d.radius:d.feature==='thicket'?d.size*.4:d.size*.3;
    if(!radius)continue;put(shadows,n++,d.x+.35,.04,d.z+.5,radius*2.2,radius*2.8,1,-Math.PI/2);}
  }
  shadows.count=n;shadows.instanceMatrix.needsUpdate=true;return frame;
 }
 return{uniforms,update,event:state.event,info:()=>({ambientTier:tier,ambientActive:frame.active,ambientCombat:frame.combat,birds:flock.count,particles:dust.count,contactShadows:shadows.count,windStrength:reduced?0:frame.strength,ambientTime:frame.time}),reset(){state.reset();world=null;perches=[];previousCombat=false;for(const b of birds){b.flying=false;b.cooldown=0;b.reacted=false;}flock.count=dust.count=shadows.count=0;root.visible=false;},dispose(){scene.remove(root);for(const m of [flock,dust,shadows]){m.dispose();m.geometry.dispose();m.material.dispose();}}};
}
