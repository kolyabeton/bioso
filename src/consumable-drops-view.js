import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CONSUMABLE_BY_KIND,CONSUMABLE_RULES} from './systems/consumable-drops.js';

/** Approved Blender v2 family rebuilt with shared mid-poly meshes and instancing.
 * The energy shader integrates a bright center into the curved interior; the
 * ceramic and metal are opaque, non-emissive geometry. No per-drop point lights.
 */
export function createConsumableDropsView(scene){
 const capacity=CONSUMABLE_RULES.capacity+4,dummy=new T.Object3D(),color=new T.Color();
 const profile=[];
 for(let i=0;i<=20;i++){const t=.9+(Math.PI-.92)*i/20;profile.push(new T.Vector2(Math.sin(t),Math.cos(t)));}
 for(let i=20;i>=0;i--){const t=.9+(Math.PI-.92)*i/20;profile.push(new T.Vector2(.94*Math.sin(t),.94*Math.cos(t)));}
 profile.push(profile[0].clone());
 const panels=Array.from({length:6},(_,i)=>new T.LatheGeometry(profile,10,i*Math.PI/3+.01,Math.PI/3-.02));
 const shellGeometry=mergeGeometries(panels);panels.forEach(g=>g.dispose());shellGeometry.rotateX(Math.PI/2);
 const shellMaterial=new T.MeshStandardMaterial({color:'#d5cebb',roughness:.58,metalness:.08});
 const rimGeometry=new T.TorusGeometry(.777,.035,12,64);rimGeometry.translate(0,0,.625);
 const metalMaterial=new T.MeshStandardMaterial({color:'#253430',metalness:.72,roughness:.3});
 const coreGeometry=new T.SphereGeometry(.775,40,28);coreGeometry.translate(0,0,.20);
 const coreMaterial=new T.ShaderMaterial({toneMapped:false,uniforms:{time:{value:0}},
  vertexShader:`varying vec3 hue;varying vec3 viewNormal;varying vec3 localPosition;
  void main(){hue=instanceColor;localPosition=position;viewNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);
   gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec3 hue;varying vec3 viewNormal;varying vec3 localPosition;uniform float time;
  void main(){vec3 n=normalize(viewNormal);float face=max(n.z,0.0);
   float inner=pow(face,12.0);float pulse=0.96+0.04*sin(time*2.4);
   float haze=1.0+0.035*sin(localPosition.x*19.0+time)*sin(localPosition.y*15.0-time*.6);
   vec3 light=hue*(.14+.60*pow(face,1.7)+1.65*inner*pulse)*haze;
   light+=mix(hue,vec3(1.0),.65)*.35*pow(face,38.0);
   float reflection=pow(max(dot(n,normalize(vec3(-.38,.48,.85))),0.0),100.0);
   light+=vec3(.5,.6,.63)*reflection*.48;
   gl_FragColor=vec4(light,1.0);
   #include <colorspace_fragment>
  }`});
 const haloGeometry=new T.PlaneGeometry(2.25,2.25);haloGeometry.translate(0,0,.24);
 const haloMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:`varying vec2 coord;varying vec3 hue;void main(){coord=uv;hue=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 coord;varying vec3 hue;void main(){float r=length(coord-.5)*2.0;float glow=exp(-r*r*7.0)*.12*(1.0-smoothstep(.75,1.0,r));gl_FragColor=vec4(hue,glow);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const shadowGeometry=new T.CircleGeometry(.62,32);shadowGeometry.rotateX(-Math.PI/2);
 const shadowMaterial=new T.MeshBasicMaterial({color:'#081810',transparent:true,opacity:.22,depthWrite:false});
 const makeBatch=(name,geometry,material)=>{const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name=name;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;mesh.count=0;scene.add(mesh);return mesh;};
 const shell=makeBatch('pickup-orbs:ceramic',shellGeometry,shellMaterial),rim=makeBatch('pickup-orbs:metal',rimGeometry,metalMaterial),core=makeBatch('pickup-orbs:internal-energy',coreGeometry,coreMaterial),halo=makeBatch('pickup-orbs:inner-glow',haloGeometry,haloMaterial),shadows=makeBatch('pickup-orbs:contact-shadows',shadowGeometry,shadowMaterial);
 // Allocate instance colors before shader compilation, including empty scenes.
 for(const batch of [core,halo])batch.setColorAt(0,new T.Color(1,1,1));
 const auraGeometry=new T.SphereGeometry(1.65,32,20),auraMaterial=new T.MeshBasicMaterial({color:'#18caff',transparent:true,opacity:.10,depthWrite:false});
 const aura=new T.Mesh(auraGeometry,auraMaterial);aura.name='consumable-protection';aura.visible=false;scene.add(aura);
 const markGeometry=new T.TorusGeometry(.8,.045,8,40),markMaterial=new T.MeshBasicMaterial({color:'#ff2410',toneMapped:false});
 const mark=new T.Mesh(markGeometry,markMaterial);mark.name='consumable-hunter-mark';mark.visible=false;scene.add(mark);
 let visibleCount=0;
 function update(s,camera,time=0,reduced=false,onScreen=()=>true){
  const items=(s.consumableDrops??[]).filter(onScreen).slice(0,CONSUMABLE_RULES.capacity).map(q=>({...q,scale:.65})),a=s.consumables;
  visibleCount=items.length;
  if(a?.beacon?.until>time&&onScreen(a.beacon))items.push({...a.beacon,kind:'beacon',id:-1,scale:.85});
  if(a?.parasitesUntil>time)for(let i=0;i<3;i++){const angle=(reduced?0:time*1.7)+i*Math.PI*2/3;items.push({id:-2-i,kind:'parasite',x:s.player.x+Math.cos(angle)*1.7,y:(s.player.y??0)+1,z:s.player.z+Math.sin(angle)*1.7,scale:.21});}
  coreMaterial.uniforms.time.value=reduced?0:time;
  for(const batch of [shell,rim,core,halo,shadows])batch.count=items.length;
  for(let i=0;i<items.length;i++){
   const q=items[i];dummy.position.set(q.x,(q.y??0)+q.scale+.06+(reduced?0:Math.sin(time*2+q.id)*.05),q.z);
   dummy.quaternion.copy(camera.quaternion);dummy.scale.setScalar(q.scale);dummy.updateMatrix();
   for(const batch of [shell,rim,core,halo])batch.setMatrixAt(i,dummy.matrix);
   color.set(CONSUMABLE_BY_KIND[q.kind]?.color??'#44f5a1');core.setColorAt(i,color);halo.setColorAt(i,color);
   dummy.position.set(q.x,(q.y??0)+.035,q.z);dummy.quaternion.identity();dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);
  }
  for(const batch of [shell,rim,core,halo,shadows])batch.instanceMatrix.needsUpdate=true;
  core.instanceColor.needsUpdate=true;halo.instanceColor.needsUpdate=true;
  aura.visible=!s.dead&&!!(a?.phaseUntil>time||a?.shieldCharges&&a.shieldUntil>time||a?.revivalCharges>0);
  if(aura.visible){aura.position.set(s.player.x,(s.player.y??0)+1,s.player.z);auraMaterial.color.set(a.phaseUntil>time?'#c37bff':a.shieldCharges&&a.shieldUntil>time?'#18caff':'#ffc324');auraMaterial.opacity=a.phaseUntil>time?.17:.07;}
  const target=s.enemies.find(e=>e.hp>0&&e.pickupMarkUntil>time&&onScreen(e));mark.visible=!!target;
  if(target){mark.position.set(target.x,(target.y??0)+(target.radius??.6)*2+1,target.z);mark.quaternion.copy(camera.quaternion);}
 }
 function reset(){visibleCount=0;for(const batch of [shell,rim,core,halo,shadows])batch.count=0;aura.visible=mark.visible=false;}
 function dispose(){reset();for(const obj of [shell,rim,core,halo,shadows,aura,mark]){scene.remove(obj);obj.geometry.dispose();obj.material.dispose();obj.dispose?.();}}
 return{update,reset,dispose,info:()=>({consumableOrbs:visibleCount,consumableDrawBatches:5})};
}
