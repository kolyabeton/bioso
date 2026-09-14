import * as T from 'three';
import {loadModel,fittedModel} from './asset-models.js';
import {dungeonDressing} from './dungeon-dressing.js';
import {dungeonSurface} from './dungeon-surface.js';
import {skyDeckMaterial,createLairClouds} from './dungeon-sky-materials.js';
import {forestSurfaceMaterial} from './forest-surface.js';
import {environmentMetalMaterial} from './environment-metal.js';
import {forestPlantMaterial,createForestUniforms} from './forest-light.js';

const DUNGEON_TEXTURES={
  materials:'/assets/biomes/forest-living/materials-v2.webp',
};

function loadDungeonTextures(){
  if(typeof document==='undefined')return null;
  const loader=new T.TextureLoader(),textures={};
  for(const [key,url] of Object.entries(DUNGEON_TEXTURES)){
    const texture=loader.load(url);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=2;textures[key]=texture;
  }
  textures.materials.flipY=false;
  return textures;
}

function palette(){
  return {
    floor:skyDeckMaterial(),
    side:new T.MeshStandardMaterial({color:'#3c5059',roughness:.7,metalness:.55}),
    trim:new T.MeshStandardMaterial({color:'#8ca6a5',roughness:.55,metalness:.5}),
  };
}

const sampledHeight=(heightAt,a,b,t,x,z)=>heightAt?.(x,z)??((a.y??0)+((b.y??0)-(a.y??0))*t);

function corridorGeometry(a,b,width,heightAt){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),along=Math.max(2,Math.ceil(length/1.6)),across=6,nx=dz/length,nz=-dx/length;
  const positions=[],uvs=[],indices=[];
  for(let i=0;i<=along;i++){
    const t=i/along,cx=a.x+dx*t,cz=a.z+dz*t;
    for(let j=0;j<=across;j++){
      const side=(j/across-.5)*width,x=cx+nx*side,z=cz+nz*side,y=sampledHeight(heightAt,a,b,t,x,z)+.025;
      positions.push(x,y,z);uvs.push(side/4,t*length/4);
    }
  }
  for(let i=0;i<along;i++)for(let j=0;j<across;j++){
    const q=i*(across+1)+j;indices.push(q,q+across+1,q+1,q+1,q+across+1,q+across+2);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}

function sideGeometry(a,b,width,side,heightAt){
  const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),steps=Math.max(2,Math.ceil(length/1.6)),nx=dz/length,nz=-dx/length,positions=[],uvs=[],indices=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=a.x+dx*t+nx*side*width*.5,z=a.z+dz*t+nz*side*width*.5,y=sampledHeight(heightAt,a,b,t,x,z);
    positions.push(x,y,z,x,y-4,z);uvs.push(t*length/4,1,t*length/4,0);
  }
  for(let i=0;i<steps;i++){const q=i*2;indices.push(q,q+2,q+1,q+1,q+2,q+3);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function radialGeometry(point,radius,heightAt,lift=.045){
  const steps=28,positions=[point.x,(heightAt?.(point.x,point.z)??point.y??0)+lift,point.z],uvs=[.5,.5],indices=[];
  for(let i=0;i<=steps;i++){
    const angle=i/steps*Math.PI*2,x=point.x+Math.cos(angle)*radius,z=point.z+Math.sin(angle)*radius;
    positions.push(x,(heightAt?.(x,z)??point.y??0)+lift,z);uvs.push(.5+Math.cos(angle)*.5,.5+Math.sin(angle)*.5);
  }
  for(let i=1;i<=steps;i++)indices.push(0,i,i+1);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function segment(parent,a,b,width,materials,index,heightAt){
  const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.25)return;
  const floor=new T.Mesh(corridorGeometry(a,b,width,heightAt),materials.floor);floor.name='dungeon-corridor-floor';floor.receiveShadow=true;parent.add(floor);
  for(const side of [-1,1]){
    const drop=new T.Mesh(sideGeometry(a,b,width,side,heightAt),materials.side);drop.name='dungeon-void-drop';drop.receiveShadow=true;parent.add(drop);
  }
}

function deadEnd(parent,point,previous,width,materials,index,heightAt){
  // End caps match the same capsule used by movement; no decorative fake branch.
  const cap=new T.Mesh(radialGeometry(point,width*.5,heightAt),materials.floor);
  cap.name='dungeon-dead-end';cap.receiveShadow=true;parent.add(cap);
}

function roundedFloor(parent,graph,materials,heightAt){
  const surface=dungeonSurface(graph),positions=[],uvs=[];
  for(const p of surface.vertices){positions.push(p.x,(heightAt?.(p.x,p.z)??0)+.025,p.z);uvs.push(p.x/4,p.z/4);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(surface.indices);geometry.computeVertexNormals();
  const floor=new T.Mesh(geometry,materials.floor);floor.name='dungeon-corridor-floor';floor.receiveShadow=true;parent.add(floor);
  const wallPositions=[],wallUvs=[],wallIndices=[],wallVertices=new Map();
  const wallVertex=id=>{
    if(!wallVertices.has(id)){const p=surface.vertices[id],y=(heightAt?.(p.x,p.z)??0)+.025;wallVertices.set(id,wallPositions.length/3);wallPositions.push(p.x,y,p.z,p.x,y-1.6,p.z);wallUvs.push(p.x/4+p.z/4,1,p.x/4+p.z/4,0);}
    return wallVertices.get(id);
  };
  for(const [from,to] of surface.boundary){const a=wallVertex(from),b=wallVertex(to);wallIndices.push(a,b,a+1,b,b+1,a+1);}
  const walls=new T.BufferGeometry();walls.setAttribute('position',new T.Float32BufferAttribute(wallPositions,3));walls.setAttribute('uv',new T.Float32BufferAttribute(wallUvs,2));walls.setIndex(wallIndices);walls.computeVertexNormals();
  const drop=new T.Mesh(walls,materials.side);drop.name='dungeon-void-drop';drop.receiveShadow=true;parent.add(drop);
  const rimMaterial=new T.LineBasicMaterial({color:'#a4b9b8'});
  for(const contour of surface.contours){
    const rim=new T.LineLoop(new T.BufferGeometry().setFromPoints(contour.map(p=>new T.Vector3(p.x,(heightAt?.(p.x,p.z)??0)+.045,p.z))),rimMaterial);
    rim.name='lair-deck-edge';parent.add(rim);
  }
}

function dungeonAssetMaterial(source,textures,uniforms){
  const plant=source.name.includes('geometric-leaves'),metal=source.name==='environment-aged-metal',mint=source.name.includes('mint');
  const material=metal?environmentMetalMaterial(source):plant?forestPlantMaterial(source,uniforms):mint||!textures?source.clone():forestSurfaceMaterial(source,textures.materials);
  if(plant){material.side=T.DoubleSide;material.color.set('#d0d8ba');}
  if(mint)material.emissiveIntensity=.4;
  return material;
}

async function addMissionDressing(group,graph,type,heightAt,textures){
  const props=dungeonDressing(graph,type),ids=[...new Set(props.map(p=>p.model))],uniforms=createForestUniforms();
  const sources=await Promise.all(ids.map(loadModel));if(!group.parent)return;
  group.userData.dressingCount=props.length;
  for(const [index,id] of ids.entries()){
    if(!sources[index])continue;
    const template=fittedModel(sources[index],{size:1,anchor:'bottom'}),placements=props.filter(p=>p.model===id),pose=new T.Object3D();template.updateMatrixWorld(true);
    template.traverse(o=>{
      if(!o.isMesh)return;
      const materials=Array.isArray(o.material)?o.material.map(m=>dungeonAssetMaterial(m,textures,uniforms)):dungeonAssetMaterial(o.material,textures,uniforms);
      const batch=new T.InstancedMesh(o.geometry,materials,placements.length);batch.name=`dungeon-environment:${id}`;batch.userData.dungeonSharedGeometry=true;
      placements.forEach((p,i)=>{pose.position.set(p.x,(heightAt?.(p.x,p.z)??heightAt?.(p.groundX,p.groundZ)??0)+.03,p.z);pose.rotation.set(0,p.rotation,0);pose.scale.setScalar(p.size);pose.updateMatrix();batch.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));});
      batch.computeBoundingSphere();group.add(batch);
    });
  }

}

/** A single connected corridor graph: bends, loops and dead ends, never rooms or spawn waves. */
export function createDungeonView(scene){
  const root=new T.Group();root.name='survival-dungeon-tunnels';scene.add(root);
  const textures=loadDungeonTextures();let signature='',clouds=null;
  function clear(){
    for(const child of [...root.children]){child.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(!o.userData.dungeonSharedGeometry)o.geometry?.dispose?.();for(const material of Array.isArray(o.material)?o.material||[]:o.material?[o.material]:[])material.dispose?.();});root.remove(child);}
    signature='';clouds=null;root.visible=false;root.userData={};
  }
  function update(s,reducedMotion=false){
    const active=s.encounters?.active;
    if(!active?.dungeon||!active.entrance||!active.tunnels?.length){root.visible=false;return;}
    root.visible=true;clouds?.update(reducedMotion?0:active.elapsed||0);
    const next=JSON.stringify([active.id,active.type,active.tunnelGraph||active.tunnels]);
    if(next===signature)return;
    clear();root.visible=true;signature=next;
    const group=new T.Group();group.name=active.type==='dungeon_roots'?'overgrown-root-tunnels':'dark-industrial-catacombs';root.add(group);
    const materials=palette(active.type,s.world,textures),graph=active.tunnelGraph,heightAt=s.world?.heightAt?.bind(s.world);
    if(graph){
      clouds=createLairClouds();group.add(clouds.mesh);
      root.userData={branches:graph.branches.length,loops:graph.edges.length-graph.nodes.length+1,deadEnds:graph.deadEnds.length};
      roundedFloor(group,graph,materials,heightAt);
      addMissionDressing(group,graph,active.type,heightAt,textures);
    }else{
      const width=active.type==='dungeon_roots'?4.8:5.2,points=[active.entrance,...active.tunnels];
      for(let i=1;i<points.length;i++){segment(group,points[i-1],points[i],width,materials,i,heightAt);if(i%3===1)deadEnd(group,points[i],points[i-1],width,materials,i,heightAt);}
    }
    const exitPoint=active.exit||active.entrance,exitY=heightAt?.(exitPoint.x,exitPoint.z)??exitPoint.y??0,exit=new T.Mesh(new T.TorusGeometry(1.35,.16,8,32),materials.trim);exit.name='dungeon-exit';exit.position.set(exitPoint.x,exitY+.12,exitPoint.z);exit.rotation.x=Math.PI/2;group.add(exit);
  }
  function reset(){clear();}
  return{update,reset,info:()=>({dungeonTheme:root.children[0]?.name||null,dungeonMeshes:root.children[0]?.children.length||0,
    dungeonSky:!!clouds,dungeonDressing:root.children[0]?.userData.dressingCount||0,dungeonBranches:root.userData.branches||0,dungeonLoops:root.userData.loops||0,dungeonDeadEnds:root.userData.deadEnds||0})};
}
