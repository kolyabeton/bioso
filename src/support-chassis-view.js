import * as T from 'three';
import {CHASSIS_MATERIALS as M} from './creature-materials.js';
import {loadModel,fittedModel} from './asset-models.js';
import {chassisTuning,sentinelCircles} from './systems/support-chassis.js';
import {equipmentSurfaceUV} from './equipment-surface.js';
import {combatTime} from './systems/mutations.js';

/** Ability presentation only; body assets and all collision decisions stay elsewhere. */
export function createSupportChassisView(scene){
 const root=new T.Group();root.name='support-chassis-effects';scene.add(root);
 const auraMaterial=new T.MeshBasicMaterial({color:0x8dcbb8,transparent:true,opacity:.24,depthWrite:false,side:T.DoubleSide});
 const aura=new T.Mesh(new T.RingGeometry(.98,1,96),auraMaterial);aura.rotation.x=-Math.PI/2;root.add(aura);
 const pulse=new T.Mesh(aura.geometry,new T.MeshBasicMaterial({color:0xc6f5f1,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));pulse.rotation.x=-Math.PI/2;root.add(pulse);
 const discs=Array.from({length:3},()=>{const g=new T.Group(),plate=new T.Mesh(equipmentSurfaceUV(new T.CylinderGeometry(.5,.5,.07,32),'steel'),M.steel),rim=new T.Mesh(new T.TorusGeometry(.47,.018,8,32),M.light);rim.rotation.x=Math.PI/2;rim.position.y=.055;g.add(plate,rim);root.add(g);return g;});
 const towers=new Map();let welder=null;
 loadModel('arm-arc-icon-v1').then(model=>{welder=model;});
 function towerModel(){const g=new T.Group(),foot=new T.Mesh(equipmentSurfaceUV(new T.CylinderGeometry(.45,.6,.18,24),'steel'),M.steel),body=new T.Mesh(equipmentSurfaceUV(new T.CylinderGeometry(.32,.4,.9,24),'ceramic'),M.ceramic),coil=new T.Mesh(equipmentSurfaceUV(new T.TorusGeometry(.34,.045,8,24),'brass'),M.brass);foot.position.y=.09;body.position.y=.65;coil.rotation.x=Math.PI/2;coil.position.y=.95;g.add(foot,body,coil);return g;}
 function reset(){for(const g of towers.values()){root.remove(g);g.traverse(o=>{if(o.isMesh&&!o.userData.welderAsset)o.geometry?.dispose();});}towers.clear();aura.visible=pulse.visible=false;discs.forEach(g=>g.visible=false);}
 return{update(s){const t=chassisTuning(s),now=combatTime(s);aura.visible=t.key==='demolition'&&t.active;aura.position.set(s.player.x,(s.player.y??0)+.035,s.player.z);aura.scale.setScalar(t.radius);
  const remaining=(s.supportChassis?.pulseUntil||0)-now;pulse.visible=remaining>0;pulse.position.set(s.player.x,(s.player.y??0)+.045,s.player.z);pulse.scale.setScalar(t.radius*Math.max(.1,1-remaining/.55));pulse.material.opacity=Math.max(0,remaining/.55)*.6;
  const circles=sentinelCircles(s);discs.forEach((g,i)=>{g.visible=!!circles[i];if(circles[i])g.position.set(circles[i].x,circles[i].y,circles[i].z);});
  const alive=new Set();for(const tower of s.supportChassis?.towers||[]){if(tower.hp<=0)continue;alive.add(tower.id);let g=towers.get(tower.id);if(!g){g=towerModel();towers.set(tower.id,g);root.add(g);}g.position.set(tower.x,tower.y??0,tower.z);
   if(welder&&!g.userData.welder){const asset=fittedModel(welder,{size:.75,rotation:[-Math.PI/2,0,0]});asset.position.y=1.1;asset.traverse(o=>o.userData.welderAsset=true);g.add(asset);g.userData.welder=asset;}
   const target=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-tower.x,a.z-tower.z)-Math.hypot(b.x-tower.x,b.z-tower.z))[0];if(target)g.rotation.y=Math.atan2(target.x-tower.x,target.z-tower.z);
  }for(const [id,g]of towers)if(!alive.has(id)){root.remove(g);g.traverse(o=>{if(o.isMesh&&!o.userData.welderAsset)o.geometry?.dispose();});towers.delete(id);}
 },reset};
}
