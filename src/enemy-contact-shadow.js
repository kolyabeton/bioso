import * as T from 'three';

export const ENEMY_CONTACT_SHADOW_CAPACITY=240;

/** Batched ground contact for living enemies. Enabled by the high quality preset. */
export function createEnemyContactShadows(scene,{capacity=ENEMY_CONTACT_SHADOW_CAPACITY}={}){
 const geometry=new T.PlaneGeometry(1,1).rotateX(-Math.PI/2);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  vertexShader:`varying vec2 contactUV;varying float contactOpacity;
   void main(){contactUV=uv*2.0-1.0;contactOpacity=length(instanceMatrix[1].xyz);gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}`,
  fragmentShader:`varying vec2 contactUV;varying float contactOpacity;
   void main(){float r=dot(contactUV,contactUV);float halo=.34*pow(max(0.0,1.0-r),1.8);float core=.3*(1.0-smoothstep(.05,.48,r));gl_FragColor=vec4(.014,.02,.024,(halo+core)*contactOpacity);}`});
 const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.name='environment-enemy-contacts';mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);
 const pose=new T.Object3D();let enabled=false;
 function update(enemies,world,nextEnabled,scale=1){
  enabled=Boolean(nextEnabled);mesh.count=0;mesh.visible=false;
  if(!enabled||typeof world?.heightAt!=='function')return;
  for(const enemy of enemies){
   if(mesh.count>=capacity||enemy.hp<=0||!Number.isFinite(enemy.x)||!Number.isFinite(enemy.z))continue;
   const ground=world.heightAt(enemy.x,enemy.z);if(ground===null||ground===undefined)continue;
   const radius=Math.max(['elite','boss','final'].includes(enemy.kind)?.65:.8,enemy.radius??.55)*scale*(enemy.visualScale??1),displayY=(enemy.y??ground)+(enemy.flying?1.1*scale:0),altitude=Math.max(0,displayY-ground),spread=1+Math.min(altitude,7)*.1,opacity=.9/(1+altitude*.34);
   pose.position.set(enemy.x+.12*radius,ground+.035,enemy.z+.16*radius);pose.rotation.set(0,enemy.specialFacing??0,0);pose.scale.set(radius*2.25*spread,opacity,radius*1.85*spread);pose.updateMatrix();mesh.setMatrixAt(mesh.count++,pose.matrix);
  }
  mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;
 }
 function reset(){enabled=false;mesh.count=0;mesh.visible=false;}
 return{update,reset,info:()=>({enemyContactShadows:mesh.count,enemyShadowsEnabled:enabled}),dispose(){scene.remove(mesh);mesh.dispose();geometry.dispose();material.dispose();}};
}
