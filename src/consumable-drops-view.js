import * as T from 'three';
import {createConsumablePhaseView} from './consumable-phase-view.js';
import {createConsumableFxView} from './consumable-fx-view.js';
import {CHASSIS_BODY_MATERIALS} from './creature-materials.js';
import {consumableCapsuleGeometry} from './consumable-capsule.js';
import {CONSUMABLE_BY_KIND,CONSUMABLE_RULES,consumableSatellite} from './systems/consumable-drops.js';

const CORE_TINTS=Object.freeze({biomass_5:'#658271',shield:'#607e89',phase:'#81718a',attraction:'#5e817c',recharge:'#94774e',sleep:'#706684',impulse:'#596d88',parasite:'#936e7b',hunter:'#986c60',beacon:'#7b875b',revival:'#9a885d'});

/** Small world-space ceramic energy orbs. Shared PBR surfaces, no billboard
 * outline, point lights or outer halo. Only the recessed cell emits light.
 */
export function createConsumableDropsView(scene){
 const effects=createConsumableFxView(scene),phaseShell=createConsumablePhaseView(scene);
 const capacity=CONSUMABLE_RULES.capacity+4,dummy=new T.Object3D(),color=new T.Color(),groundNormal=new T.Vector3(),up=new T.Vector3(0,1,0);
 const {shellGeometry,rimGeometry,coreGeometry}=consumableCapsuleGeometry();
 // Keep the canonical material references: their async atlas load updates these too.
 const shellMaterial=CHASSIS_BODY_MATERIALS.ceramic,metalMaterial=CHASSIS_BODY_MATERIALS.steel;
 // Rusted shell encloses animated plasma: a hot center, turbulent wisps and a luminous rim.
 const coreMaterial=new T.MeshStandardMaterial({color:'#ffffff',roughness:.67,metalness:.08,
  emissive:'#ffffff',emissiveIntensity:.95});
 const coreClock={value:0};let effectTime=0;
 coreMaterial.onBeforeCompile=shader=>{
  shader.uniforms.orbTime=coreClock;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 orbCoreXY;varying float orbSeed;')
   .replace('#include <begin_vertex>','#include <begin_vertex>\norbCoreXY=position.xy;orbSeed=dot(instanceMatrix[3].xz,vec2(2.13,1.71));');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform float orbTime;varying vec2 orbCoreXY;varying float orbSeed;
   float orbHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float orbNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
    return mix(mix(orbHash(i),orbHash(i+vec2(1,0)),f.x),mix(orbHash(i+vec2(0,1)),orbHash(i+vec2(1,1)),f.x),f.y);}
   float orbCloud(vec2 p){return orbNoise(p)*.57+orbNoise(p*2.03+3.7)*.29+orbNoise(p*4.11-5.3)*.14;}`)
   .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.16;')
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float t=orbTime+orbSeed;
    vec2 p=orbCoreXY/.53;
    float radius=length(p),angle=atan(p.y,p.x);
    vec2 drift=vec2(t*.10,-t*.13);
    vec2 warp=vec2(orbCloud(p*2.2+drift),orbCloud(p*2.2-drift+7.1))-.5;
    float cloud=orbCloud(p*3.4+warp*1.8+drift);
    float threads=pow(1.0-abs(cloud*2.0-1.0),6.0);
    float rimRadius=.87+.018*sin(angle*7.0+t*.9)+.018*(cloud-.5);
    float rimWidth=max(.026,fwidth(radius)*.6);
    float ring=exp(-pow((radius-rimRadius)/rimWidth,2.0));
    float corona=exp(-pow((radius-.85)/.14,2.0))*(.20+cloud*.65);
    float aperture=1.0-smoothstep(.92,1.02,radius);
    float mist=(smoothstep(.31,.70,cloud)*.32+threads*.15)*aperture;
    float motes=0.0;
    for(int i=0;i<6;i++){
     float f=float(i),phase=t*(.40+f*.047)+f*2.39996;
     float orbit=.27+f*.093,depth=.5+.5*sin(phase*.77+f);
     vec2 particle=vec2(cos(phase),sin(phase*.87+f*.30))*orbit;
     float d=length(p-particle),size=.017+.018*depth;
     float edge=max(fwidth(d),.012);
     motes+=(1.0-smoothstep(size,size+edge,d))*(.40+.35*depth);
    }
    // Hot central point and short horizontal flare echo the supplied plasma reference.
    vec2 center=p-vec2(sin(t*.31),cos(t*.27))*.025;
    float star=exp(-dot(center,center)*170.0)*(2.6+.3*sin(t*1.35));
    float flare=exp(-abs(center.y)*100.0-abs(center.x)*5.0)*.65;
    vec3 energyHue=mix(vColor*2.4,vec3(.75,.48,.16),.12);
    vec3 hotHue=mix(energyHue,vec3(1.0,.84,.52),.60);
    totalEmissiveRadiance*=energyHue*(mist+ring*1.35+corona*.44+motes*aperture)+hotHue*(star+flare)*aperture;`);
 };
 coreMaterial.customProgramCacheKey=()=> 'bioso-orb-plasma-reference-v3';
 const shadowGeometry=new T.PlaneGeometry(2.5,2.05);shadowGeometry.rotateX(-Math.PI/2);
 const shadowMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  vertexShader:`varying vec2 coord;void main(){coord=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 coord;void main(){float r=dot((coord-.5)*2.0,(coord-.5)*2.0);
   float penumbra=.38*pow(max(0.0,1.0-r),1.7),contact=.29*(1.0-smoothstep(.03,.38,r));
   gl_FragColor=vec4(.018,.025,.03,penumbra+contact);}`});
 const makeBatch=(name,geometry,material)=>{const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);return mesh;};
 const shell=makeBatch('pickup-orbs:ceramic',shellGeometry,shellMaterial),rim=makeBatch('pickup-orbs:metal',rimGeometry,metalMaterial),core=makeBatch('pickup-orbs:internal-energy',coreGeometry,coreMaterial),shadows=makeBatch('pickup-orbs:contact-shadows',shadowGeometry,shadowMaterial);
 // Allocate instance colors before shader compilation, including empty scenes.
 core.setColorAt(0,new T.Color(1,1,1));
 const auraGeometry=new T.SphereGeometry(1.65,32,20),auraMaterial=new T.MeshBasicMaterial({color:'#18caff',transparent:true,opacity:.10,depthWrite:false});
 const aura=new T.Mesh(auraGeometry,auraMaterial);aura.name='consumable-protection';aura.visible=false;scene.add(aura);
 const markGeometry=new T.TorusGeometry(.8,.045,8,40),markMaterial=new T.MeshBasicMaterial({color:'#cf9a7a',transparent:true,depthWrite:false,toneMapped:false});
 const mark=new T.Mesh(markGeometry,markMaterial);mark.name='consumable-hunter-mark';mark.visible=false;scene.add(mark);
 let visibleCount=0,lastMark=null;
 function update(s,camera,time=0,reduced=false,onScreen=()=>true,visualDt=0,combatDt=visualDt,hero=null){
  effects.update(s,camera,time,combatDt,reduced,onScreen,hero);phaseShell.update(s,hero,time,combatDt,reduced);
  const items=(s.consumableDrops??[]).filter(onScreen).slice(0,CONSUMABLE_RULES.capacity).map(q=>({...q,scale:.65})),a=s.consumables;
  visibleCount=items.length;
  if(!s.dead&&a?.beacon?.until>time&&onScreen(a.beacon)){const fade=Math.min(1,(a.beacon.until-time)/.8);items.push({...a.beacon,kind:'beacon',id:-1,scale:.85*fade,fade});}
  if(!s.dead&&a?.parasitesUntil>time)for(let i=0;i<3;i++){const fade=Math.min(1,(a.parasitesUntil-time)/.8),p=consumableSatellite(s.player,i,reduced?0:time);items.push({...p,id:-2-i,kind:'parasite',y:p.y-.27,scale:.21*fade,fade,satellite:true});}
  // Decorative motion continues in the paused art fixture, like the preview.
  // Reduced-motion freezes both the moving light and all six internal motes.
  if(!reduced)effectTime+=Math.min(.05,Math.max(0,visualDt));
  coreClock.value=reduced?0:effectTime;
  for(const batch of [shell,rim,core,shadows])batch.count=items.length;
  for(let i=0;i<items.length;i++){
   const q=items[i];dummy.position.set(q.x,(q.y??0)+q.scale+.06+(reduced||q.satellite?0:Math.sin(time*2+q.id)*.05),q.z);
   dummy.rotation.set(-.78,.12+Math.sin(q.id*2.4)*.12,-.10);dummy.scale.setScalar(q.scale);dummy.updateMatrix();
   for(const batch of [shell,rim,core])batch.setMatrixAt(i,dummy.matrix);
   color.set(CORE_TINTS[q.kind]??CONSUMABLE_BY_KIND[q.kind]?.color??'#658271');color.multiplyScalar(q.fade??1);core.setColorAt(i,color);
   // Match the local ground slope so the contact patch stays on hills.
   const sx=q.x+.16*q.scale,sz=q.z+.20*q.scale;
   const ground=s.world?.heightAt?.(sx,sz)??q.y??0,delta=.35;
   const height=(x,z)=>{const h=s.world?.heightAt?.(x,z);return Number.isFinite(h)&&Math.abs(h-ground)<1?h:ground;};
   groundNormal.set(-(height(sx+delta,sz)-height(sx-delta,sz))/(2*delta),1,-(height(sx,sz+delta)-height(sx,sz-delta))/(2*delta)).normalize();
   dummy.position.set(sx,ground+.065,sz);dummy.quaternion.setFromUnitVectors(up,groundNormal);dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);
  }
  for(const batch of [shell,rim,core,shadows])batch.instanceMatrix.needsUpdate=true;
  core.instanceColor.needsUpdate=true;
  aura.visible=!s.dead&&!!(a?.phaseUntil>time||a?.shieldCharges&&a.shieldUntil>time||a?.revivalCharges>0);
  if(aura.visible){aura.position.set(s.player.x,(s.player.y??0)+1,s.player.z);auraMaterial.color.set(a.phaseUntil>time?'#c37bff':a.shieldCharges&&a.shieldUntil>time?'#18caff':'#ffc324');const remaining=a.phaseUntil>time?a.phaseUntil-time:a.shieldCharges&&a.shieldUntil>time?a.shieldUntil-time:Infinity;auraMaterial.opacity=(a.phaseUntil>time?.12:.07)*Math.min(1,remaining/.5);}
  const target=!s.dead&&s.enemies.find(e=>e.hp>0&&e.pickupMarkUntil>time&&onScreen(e));
  if(target){lastMark={x:target.x,y:(target.y??0)+(target.radius??.6)*2+1,z:target.z,fade:Math.min(1,(target.pickupMarkUntil-time)/.7)};}
  else if(lastMark)lastMark.fade=Math.max(0,lastMark.fade-combatDt/.35);
  mark.visible=!s.dead&&!!lastMark?.fade;
  if(mark.visible){mark.position.set(lastMark.x,lastMark.y,lastMark.z);mark.quaternion.copy(camera.quaternion);markMaterial.opacity=lastMark.fade;}

 }
 function reset(){effects.reset();phaseShell.reset();lastMark=null;effectTime=0;coreClock.value=0;visibleCount=0;for(const batch of [shell,rim,core,shadows])batch.count=0;aura.visible=mark.visible=false;}
 function dispose(){effects.dispose();phaseShell.dispose();reset();for(const obj of [shell,rim,core,shadows,aura,mark]){scene.remove(obj);obj.geometry.dispose();if(obj.material!==shellMaterial&&obj.material!==metalMaterial)obj.material.dispose();obj.dispose?.();}}
 return{event(e,hero){effects.event(e);phaseShell.event(e,hero);},update,reset,dispose,info:()=>({...effects.info(),consumableOrbs:visibleCount,consumableDrawBatches:4})};
}
