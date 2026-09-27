import * as T from 'three';
import {loadModel,fittedModel} from './asset-models.js';
import {makeWall} from './kit.js';
import {prepareFinishedGateModel,gateMaterialsReady} from './finished-gate-model.js';
import {MISSION_GATE,missionGateZ,missionGateClosed} from './mission-environment.js';

const ASSETS=['arch-gate','arch-wall-straight','arch-pillar'];
export function createMissionEnvironmentView(scene,{load=loadModel}={}){
 const root=new T.Group();root.name='mission-fences';scene.add(root);
 const corridor=new T.Group();corridor.name='mission-offroad-blackout';root.add(corridor);
 const vergeGeometry=new T.PlaneGeometry(1,1),vergeMaterial=new T.MeshBasicMaterial({color:'#000000',depthTest:false,depthWrite:false});
 const verges=[-1,1].map(side=>{const mesh=new T.Mesh(vergeGeometry,vergeMaterial);mesh.name=side<0?'mission-blackout-left':'mission-blackout-right';mesh.rotation.x=-Math.PI/2;mesh.renderOrder=900;corridor.add(mesh);return{mesh,side};});
 const sideFence=new T.Group();sideFence.name='mission-side-fences';root.add(sideFence);
 let world=null,models=null,pending=null,prepared=null,disposed=false,errors=[],fenceCenter=Infinity;const gates=new Map();
 function layoutCorridor(next){
  if(!next?.missionLine||next.dungeonVoid||!next.bounds){corridor.visible=false;return;}
  const length=Math.max(64,next.bounds.maxZ-next.bounds.minZ),center=(next.bounds.minZ+next.bounds.maxZ)/2,halfWidth=Math.max(Math.abs(next.playBounds?.minX??-9),Math.abs(next.playBounds?.maxX??9)),fogWidth=Math.max(1,next.bounds.maxX-halfWidth);
  for(const {mesh,side} of verges){mesh.position.set(side*(halfWidth+fogWidth/2),.02,center+32);mesh.scale.set(fogWidth,length-64,1);}
  corridor.visible=!!next.missionLine;
 }
 function layoutSideFence(playerZ){
  if(!world?.missionLine)return;
  const step=2.48,anchor=Math.round(playerZ/step)*step;if(Math.abs(anchor-fenceCenter)<step*8)return;
  sideFence.clear();fenceCenter=anchor;
  const halfWidth=Math.max(Math.abs(world.playBounds?.minX??-9),Math.abs(world.playBounds?.maxX??9));
  for(const side of [-1,1])for(let n=-24;n<=24;n++){
   const z=anchor+n*step,width=world.halfWidthAt?.(z)??halfWidth;
   if(width>halfWidth)continue;
   const wall=makeWall();wall.name='mission-side-wall';wall.userData.assetId='wall';wall.position.set(side*(width-.38),0,z);wall.rotation.y=Math.PI/2;sideFence.add(wall);
  }
 }
 function preload(){
  if(models||pending||disposed)return;
  pending=Promise.all([...ASSETS.map(async id=>{const model=await load(id);if(!model)throw Error(id);return model;}),gateMaterialsReady]).then(values=>{
   if(disposed)return;models=Object.fromEntries(ASSETS.map((id,i)=>[id,values[i]]));prepared=prepareFinishedGateModel(models['arch-gate'],MISSION_GATE.modelWidth);errors=[];
  }).catch(error=>{errors=[String(error.message)];});
 }
 function build(index,closed){
  const group=new T.Group();group.name=`mission-gate-${index+1}`;group.position.z=missionGateZ(index);root.add(group);
  const boundary=new T.Group();boundary.name='authored-architecture-barricade';group.add(boundary);
  for(const side of [-1,1])for(let n=0;n<8;n++){
   const wall=fittedModel(models['arch-wall-straight'],{size:4,anchor:'bottom',rotation:[0,(index+n)%2*Math.PI,0]});
   wall.name='arch-wall-straight';wall.userData.assetId=wall.name;wall.position.set(side*(8+n*3.6),0,0);boundary.add(wall);
   if(n%2===1){
    const pillar=fittedModel(models['arch-pillar'],{size:4.2,anchor:'bottom'});
    pillar.name='arch-pillar';pillar.userData.assetId=pillar.name;pillar.position.set(side*(6.2+n*3.6),0,-.25);boundary.add(pillar);
   }
  }
  const leaves=prepared.halves.map((template,i)=>{const leaf=template.clone(true);leaf.name=i?'gate-right-leaf':'gate-left-leaf';group.add(leaf);return{leaf,side:i?1:-1};});
  return{group,leaves,progress:closed?0:1};
 }
 function reset(){for(const {group} of gates.values())root.remove(group);gates.clear();sideFence.clear();fenceCenter=Infinity;corridor.visible=false;world=null;}
 function update(s,dt=0,reducedMotion=false){
  if(disposed)return;
  if(world!==s.world){reset();world=s.world;layoutCorridor(world);}root.visible=!!world.missionLine&&!world.dungeonVoid;if(!root.visible)return;
  preload();layoutSideFence(s.player.z);if(!models)return;
  const wanted=new Set();
  for(let i=0;i<world.tiles.length-1;i++)if(Math.abs(missionGateZ(i)-s.player.z)<100){
   wanted.add(i);const closed=missionGateClosed(s.mission,i);let g=gates.get(i);
   if(!g){g=build(i,closed);gates.set(i,g);}
   const target=closed?0:1;g.progress=reducedMotion?target:g.progress+Math.sign(target-g.progress)*Math.min(Math.abs(target-g.progress),Math.max(0,Math.min(dt,.1))*2);
   const shift=g.progress*g.progress*(3-2*g.progress)*(MISSION_GATE.halfOpening+.1);
   for(const {leaf,side} of g.leaves)leaf.position.x=shift?side*shift:0;
   g.group.userData.closed=closed;
  }
  for(const [index,g] of gates)if(!wanted.has(index)){root.remove(g.group);gates.delete(index);}
 }
 return{update,reset,ready:()=>pending??Promise.resolve(),info:()=>({missionGates:gates.size,missionGateModels:models?ASSETS:[],missionGateLoading:!!pending&&!models&&!errors.length,missionGateErrors:errors}),dispose(){disposed=true;reset();prepared?.dispose();vergeGeometry.dispose();vergeMaterial.dispose();scene.remove(root);}};
}
