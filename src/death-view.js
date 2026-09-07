import * as T from 'three';

export const DEATH_DURATION = 2.6;
export const needsDeathAnimation = s => Boolean(s.dead && s.hp <= 0);

/** A visual snapshot of the equipped parts. Geometry/materials stay owned by the model. */
export function createDeathView(scene) {
 const debris = new T.Group();debris.name='player-death';scene.add(debris);
 const soulMaterial=new T.MeshBasicMaterial({color:'#bcf5dc',transparent:true,depthWrite:false});
 const soul=new T.Mesh(new T.OctahedronGeometry(.23),soulMaterial);soul.name='departing-soul';
 let hero=null,parts=[],elapsed=0,started=false,origin=new T.Vector3(),floor=0;
 const box=new T.Box3(),inverse=new T.Matrix4(),relative=new T.Matrix4();
 function start(model,s) {
  if(started)return;
  started=true;hero=model;model.updateWorldMatrix(true,true);origin.copy(model.position);floor=s.player.y??0;
  // Each direct child is a real body, head, limb or attachment, including loaded GLBs.
  for(const child of model.children) {
   if(!child.visible)continue;
   const group=new T.Group();group.name=child.name;inverse.copy(child.matrixWorld).invert();
   child.traverseVisible(o=>{
    if(!o.isMesh||o.name.includes('sweep'))return;
    let parent=o;while(parent!==child){if(parent.name.includes('sweep'))return;parent=parent.parent;}
    const mesh=new T.Mesh(o.geometry,o.material);mesh.name=o.name;mesh.castShadow=o.castShadow;mesh.receiveShadow=o.receiveShadow;
    relative.multiplyMatrices(inverse,o.matrixWorld);relative.decompose(mesh.position,mesh.quaternion,mesh.scale);group.add(mesh);
   });
   if(!group.children.length)continue;
   child.matrixWorld.decompose(group.position,group.quaternion,group.scale);debris.add(group);
   const index=parts.length,offset=group.position.clone().sub(origin),angle=Math.hypot(offset.x,offset.z)>.1?Math.atan2(offset.z,offset.x):index*2.39996;
   const body=child.name.startsWith('asset:body-')||child.name.startsWith('body-')||child.name==='chassis';
   const speed=body?.6:2.1+(index%3)*.35;
   parts.push({group,start:group.position.clone(),rotation:group.quaternion.clone(),velocity:new T.Vector3(Math.cos(angle)*speed,body?.8:1.5+(index%3)*.2,Math.sin(angle)*speed),spin:new T.Euler((index%2?1:-1)*1.6,.45,(index%3-1)*1.5)});
  }
  soul.position.copy(origin).add(new T.Vector3(0,1.5,0));debris.add(soul);hero.visible=false;
 }
 function update(s,model,dt,{paused=false,reducedMotion=false}={}) {
  if(!needsDeathAnimation(s))return;
  start(model,s);hero.visible=false;
  if(!paused)elapsed=Math.min(DEATH_DURATION,elapsed+Math.max(0,dt));
  const t=Math.max(0,Math.min(1.1,elapsed-.12)),motion=reducedMotion?Math.min(.32,t):t;
  for(const part of parts) {
   const {group}=part;group.position.copy(part.start).addScaledVector(part.velocity,motion);
   group.position.y-=5*(reducedMotion?Math.min(1.1,t):t)**2;
   group.quaternion.copy(part.rotation).multiply(new T.Quaternion().setFromEuler(new T.Euler(part.spin.x*motion,part.spin.y*motion,part.spin.z*motion)));
   group.updateWorldMatrix(true,true);box.setFromObject(group);
   group.position.y+=Math.max(0,floor+.03-box.min.y);
  }
  soul.position.copy(origin).add(new T.Vector3(0,1.5+(reducedMotion?.3:2.5)*Math.min(1,elapsed/2),0));
  soulMaterial.opacity=Math.max(0,1-Math.max(0,elapsed-1.3)/.9);
  soul.rotation.y=reducedMotion?0:elapsed*1.3;
 }
 function reset(){if(hero)hero.visible=true;debris.clear();parts=[];hero=null;elapsed=0;started=false;soulMaterial.opacity=1;}
 return {update,reset,pending:s=>needsDeathAnimation(s)&&elapsed<DEATH_DURATION,
  zoom:()=>started?1+.55*Math.min(1,elapsed/.45):1,
  info:()=>({active:started,elapsed,complete:started&&elapsed>=DEATH_DURATION,parts:parts.length}),
  dispose(){reset();scene.remove(debris);soul.geometry.dispose();soulMaterial.dispose();}};
}
