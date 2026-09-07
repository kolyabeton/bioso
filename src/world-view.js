import {decorateLandmark} from './asset-models.js';
import * as T from 'three';
import {piece,link,geo} from './kit.js';
import {LANDMARKS,ROADS,DEPOT} from './world-layout.js';
export function createWorldView(scene){
 const root=new T.Group();root.name='upper-gardens-landmarks';scene.add(root);
 const pathMat=new T.MeshStandardMaterial({color:'#d6cbae',roughness:1});
 for(const road of ROADS)for(let i=1;i<road.length;i++){const a=road[i-1],b=road[i],d=Math.hypot(a[0]-b[0],a[1]-b[1]),m=new T.Mesh(geo.box,pathMat);m.position.set((a[0]+b[0])/2,.015,(a[1]+b[1])/2);m.scale.set(8,.04,d);m.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);root.add(m);}
 for(const p of LANDMARKS){const g=new T.Group();g.position.set(p.x,0,p.z);g.name=p.name;root.add(g);decorateLandmark(g,p.shape);
  if(p.shape==='greenhouse'){for(const z of [-18,-9,9,18]){for(const x of [-15,15]){link(g,'broken-column',[x,0,z],[x,8,z],.35,'ceramic');if(z<10)link(g,'roof-rib',[x,8,z],[0,14,z],.22,'amber');}}for(const x of [-12,12])for(const z of [-12,0,12])piece(g,'raised-bed','box','green',[x,.6,z],[4,1.2,6]);}
  if(p.shape==='collector'){piece(g,'reservoir','cylinder','dark',[-14,1,0],[9,2,9]);piece(g,'water','cylinder','cyan',[-14,2.05,0],[8,.1,8]);piece(g,'water-rim','ring','ceramic',[-14,2,0],[9,9,9],[Math.PI/2,0,0]);for(const x of [-18,-5])link(g,'pipe',[x,2,0],[x,7,0],.7,'amber');}
  if(p.shape==='nursery'){for(const x of [-14,14])for(const z of [-14,-7,0,7,14]){piece(g,'bed','box','ceramic',[x,.7,z],[6,1.4,4]);for(let i=0;i<3;i++)piece(g,'overgrowth','leaf','deepGreen',[x+i-1,2,z],[1.7,3,1.2],[0,i,.3]);}}
  if(p.shape==='depot'){piece(g,'core-pedestal','cylinder','ceramic',[0,.7,0],[3,1.4,3]);for(const x of [-20,20]){piece(g,'depot-tower','box','ceramic',[x,5,-10],[5,10,5]);piece(g,'tower-cap','cone','amber',[x,11,-10],[4,3,4]);}}
  if(p.shape==='exit'){if(p.id==='near-exit')g.rotation.y=Math.PI/2;for(const x of [-6,6])piece(g,'exit-pylon','box','ceramic',[x,3,0],[1.5,6,1.5]);link(g,'exit-arch',[-6,6,0],[6,6,0],.3,'amber');piece(g,'extraction-ring','ring','cyan',[0,.12,0],[4,4,4],[Math.PI/2,0,0]);}
  if(p.shape==='stash'){piece(g,'sealed-chest','box','amber',[0,1,0],[3,2,2]);piece(g,'chest-mark','ring','cyan',[0,2.1,0],[.6,.6,.6],[Math.PI/2,0,0]);}
 }
 const gates=new T.Group();root.add(gates);piece(gates,'south-gate','box','amber',[0,3,DEPOT.z+32],[22,6,6]);piece(gates,'east-gate','box','amber',[32,3,DEPOT.z],[6,6,22]);
 piece(gates,'north-gate','box','amber',[0,3,DEPOT.z-32],[22,6,6]);
 const core=piece(root,'live-core','joint','cyan',[0,3,DEPOT.z],[1,1.4,1]);
 // Local clones allow occlusion fading without touching the shared kit materials.
 const fade=[],knownFade=new WeakSet();root.traverse(o=>{if(o.isMesh&&o!==core&&o.material!==pathMat){o.material=o.material.clone();o.material.transparent=true;fade.push(o);knownFade.add(o);}});
 const wp=new T.Vector3(),hp=new T.Vector3();
 function update(s,camera){root.traverse(o=>{if(o.isMesh&&o!==core&&o.material!==pathMat&&!knownFade.has(o)){o.material=o.material.clone();o.material.transparent=true;fade.push(o);knownFade.add(o);}});gates.visible=s.mode==='core'&&!s.mission.open;core.visible=s.mode==='core';core.position.set(s.mission?.carrying?s.player.x:0,s.mission?.carrying?2.1:3+Math.sin(s.time*2)*.3,s.mission?.carrying?s.player.z+.5:DEPOT.z);core.scale.setScalar(s.mission?.carrying?.65:1);core.rotation.y=s.time;
  hp.set(s.player.x,1,s.player.z).project(camera);for(const o of fade){o.getWorldPosition(wp);const distance=wp.distanceTo(new T.Vector3(s.player.x,0,s.player.z));wp.project(camera);const covers=distance<22&&Math.abs(wp.x-hp.x)<.25&&Math.abs(wp.y-hp.y)<.22;o.material.opacity=covers?.25:1;o.material.depthWrite=!covers;}
 }
 return{update,setVisible:value=>{root.visible=value;}};
}
