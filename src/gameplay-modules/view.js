import {createInteractionHighlight} from '../vfx/interaction-highlight.js';
import * as T from 'three';
import {loadModel,fittedModel,retireModel} from '../asset-models.js';
import {SECRETS} from '../systems/secrets/definitions.js';
import {EVENT_PRESENTATION} from './event-presentation.js';
import {availableEncounter} from '../systems/encounters.js';
import {GAMEPLAY_MODULES,modulePresentation} from './definitions.js';
import {prepareFinishedGateModel,gateMaterialsReady} from '../finished-gate-model.js';

// Secrets now use authored volumetric GLB modules. Kept as an exported empty
// registry so older review tooling can feature-detect without loading PNG cards.
export const ENCOUNTER_SPRITES={};

/** Grounded, reusable environmental modules; never mutate encounter state. */
export function createGameplayModulesView(scene,{load=loadModel}={}){
 const root=new T.Group();root.name='gameplay-modules';scene.add(root);
 const box=new T.BoxGeometry(1,1,1),cylinder=new T.CylinderGeometry(1,1,1,12),sphere=new T.SphereGeometry(1,12,8),ring=new T.RingGeometry(.975,1,64);
 const materials=[];const material=(color,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness:.91,metalness:.18,...extra});materials.push(m);return m;};
 const ceramic=material(0xb0b0a1),metal=material(0x424b47),stone=material(0x747970),rust=material(0x7f5d48),foliage=material(0x667654);
 const instances=new Map(),textures=new Map();
 function spriteMaterial(type){
  if(!textures.has(type)){const texture=typeof document==='undefined'?new T.Texture():new T.TextureLoader().load(ENCOUNTER_SPRITES[type]);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;textures.set(type,texture);}
  // Authored RGBA coverage preserves pale ceramic and stone highlights.
  const m=new T.SpriteMaterial({map:textures.get(type),transparent:true,alphaTest:.12,toneMapped:false});
  materials.push(m);return m;
 }
 function release(v){v.highlight?.dispose();v.disposeAsset?.();retireModel(v.group);root.remove(v.group);for(const m of [v.light,v.zone.material,v.sprite?.material].filter(Boolean)){m.dispose();materials.splice(materials.indexOf(m),1);}}

 function part(parent,geometry,mat,x,y,z,sx,sy,sz){const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function create(node){
  const d=GAMEPLAY_MODULES[node.type];if(!d)return null;
  const group=new T.Group();group.name=`module-${node.type}`;root.add(group);
  const cap=new T.Group();group.add(cap);
  const light=material(d.color,{emissive:d.color,emissiveIntensity:.18});
  const signal=part(group,sphere,light,0,.35,0,.17,.17,.17);
  let sprite=null;
  if(ENCOUNTER_SPRITES[node.type]){sprite=new T.Sprite(spriteMaterial(node.type));sprite.name='image-'+node.type;sprite.scale.setScalar(node.type==='slab'?3.1:3.8);sprite.center.set(.5,node.type==='nursery'?.18:.15);cap.add(sprite);}
  else {
  part(group,cylinder,stone,0,.08,0,1.15,.16,1.15);
  switch(d.shape){
   case 'incubator':
    part(group,cylinder,metal,0,.35,0,.82,.5,.82);
    part(cap,sphere,foliage,0,.85,0,.76,.74,.76);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;part(group,box,ceramic,Math.cos(a)*.8,.75,Math.sin(a)*.8,.15,1.25,.15);}
    signal.position.set(0,1.58,0);break;
   case 'slab':
    for(let i=0;i<3;i++){const p=part(cap,box,stone,(i-1)*.68,.24,(i%2)*.09,.63,.3,1.55);p.rotation.y=(i-1)*.06;}
    part(group,box,metal,0,.15,0,1.8,.15,1.5);signal.position.set(.8,.38,.65);break;
   case 'rack':
    part(group,box,metal,0,.8,-.52,1.9,1.4,.2);
    for(let i=0;i<3;i++){part(group,box,ceramic,(i-1)*.65,.55,0,.5,.8,.8);part(cap,sphere,light,(i-1)*.65,.92,0,.18,.25,.18);}
    signal.position.set(0,1.62,-.52);break;
   case 'surgery':
    for(const x of [-.7,.7])part(group,box,metal,x,.55,0,.16,.9,1.2);
    part(group,box,ceramic,0,1.05,0,1.85,.22,1.2);
    part(group,box,metal,.9,1.5,-.5,.12,1.6,.12);
    part(cap,box,rust,.5,2.22,-.5,.9,.12,.16);signal.position.set(.18,2.1,-.5);break;
   case 'gate':
    for(const x of [-.9,.9]){part(group,box,ceramic,x,1,0,.35,1.9,.6);part(group,box,metal,x,1.85,0,.5,.15,.7);}
    part(cap,box,metal,0,1.9,0,1.7,.2,.4);signal.position.set(0,2.1,0);break;
   case 'well':
    part(group,cylinder,metal,0,.35,0,.88,.5,.88);
    part(cap,cylinder,foliage,0,.61,0,.73,.05,.73);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;part(group,cylinder,rust,Math.cos(a),.65,Math.sin(a),.13,1.1,.13);}
    signal.position.set(0,.77,0);break;
   case 'beacon':
    part(group,cylinder,metal,0,1,0,.18,1.85,.18);
    part(cap,box,ceramic,0,1.85,0,.85,.6,.4);
    part(group,box,rust,.55,1.45,0,.5,.12,.15);signal.position.set(0,2.26,0);break;
  }
  }
  const presentation=EVENT_PRESENTATION[node.type];
  if(presentation){
   const fallback=[...group.children];
   load(presentation.model).then(async template=>{
    if(!template||group.userData.retired)return;
    let asset;
    if(presentation.model==='arch-gate'){
     await gateMaterialsReady;if(group.userData.retired)return;
     const prepared=prepareFinishedGateModel(template,presentation.size);
     asset=new T.Group();asset.add(...prepared.halves);entry.disposeAsset=prepared.dispose;
    }else asset=fittedModel(template,{size:presentation.size,anchor:'bottom'});
    asset.name='event-asset:'+presentation.model;
    // The model is centred on the validated interaction point.
    for(const child of fallback)if(child!==signal)child.visible=false;
    group.add(asset);group.userData.eventModel=presentation.model;if(!SECRETS[node.type])entry.highlight?.setModel(asset);
   }).catch(error=>{if(!group.userData.retired)group.userData.eventModelError=error.message;});
   signal.position.set(0,presentation.height,0);
  }
  const zoneMaterial=new T.MeshBasicMaterial({color:d.color,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false});materials.push(zoneMaterial);
  const zone=part(group,ring,zoneMaterial,0,.04,0,node.radius||1.4,node.radius||1.4,1);zone.rotation.x=-Math.PI/2;zone.castShadow=false;
  const highlight=presentation&&!SECRETS[node.type]?createInteractionHighlight(group,{radius:presentation.size*.7,height:presentation.height+.8}):null;
  const entry={group,cap,signal,light,zone,sprite,highlight};instances.set(node,entry);return entry;
 }
 function update(s,{time=s.time||0,reducedMotion=false}={}){
  const nodes=s.encounters?.active?.dungeon?[s.encounters.active]:s.encounters?.nodes||[];const present=new Set(nodes);
  for(const [node,v] of instances)if(!present.has(node)){release(v);instances.delete(node);}
  for(const node of nodes){const state=modulePresentation(node,availableEncounter(s,node));if(!state)continue;const v=instances.get(node)||create(node);v.group.visible=state.visible;v.group.position.set(node.x,node.y||0,node.z);
   const distance=s.player?Math.hypot(node.x-s.player.x,node.z-s.player.z):0;
   v.highlight?.update({visible:state.visible&&['ready','reward'].includes(node.state)&&!s.dead,time,reducedMotion,intensity:Math.max(0,Math.min(1,(28-distance)/12))*(node.state==='reward'?1.3:1)});
   v.cap.position.y=state.opened ? .32 : 0;v.cap.rotation.z=state.opened&&node.type==='slab' ? .13 : 0;
   v.signal.visible=!SECRETS[node.type]&&!v.sprite&&state.signal!=='off';if(v.sprite){v.sprite.material.opacity=node.state==='complete'?.65:1;v.sprite.material.color.set(state.signal==='reward'?0xc8ffdb:0xffffff);}v.light.emissiveIntensity=state.signal==='reward'?1:state.signal==='active' ? .65 : .18;
   v.zone.visible=!SECRETS[node.type]&&(state.zone||!!EVENT_PRESENTATION[node.type]&&['ready','reward'].includes(node.state));v.zone.material.opacity=state.signal==='active' ? .52 : .3;v.zone.material.color.set(state.signal==='reward'?0xa2dfbd:GAMEPLAY_MODULES[node.type].color);
  }
 }
 function reset(){for(const v of instances.values()){release(v);}instances.clear();}
 return {root,update,reset,dispose(){reset();scene.remove(root);for(const g of [box,cylinder,sphere,ring])g.dispose();for(const m of materials)m.dispose();for(const t of textures.values())t.dispose();textures.clear();}};
}
