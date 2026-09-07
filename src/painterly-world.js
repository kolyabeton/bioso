import * as T from 'three';
import {seededRandom} from './simulation.js';

// The painted plate uses the same fixed projection/crop as the 3D actors.
// Only the environment is baked. Actors, collision, shadows and effects stay live.
export const PLATE_VIEW_HEIGHT=320/9;
export function buildPainterlyWorld(scene){
  const ground=new T.Mesh(new T.PlaneGeometry(30,50),new T.ShadowMaterial({color:'#263127',opacity:.35}));
  ground.rotation.x=-Math.PI/2;ground.position.y=.08;ground.receiveShadow=true;scene.add(ground);
  const random=seededRandom(72),positions=new Float32Array(48*3);
  for(let i=0;i<48;i++){positions[i*3]=(random()-.5)*14;positions[i*3+1]=.3+random()*3;positions[i*3+2]=-9+random()*25;}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));
  const pollen=new T.Points(geometry,new T.PointsMaterial({color:'#ffe4a2',size:.035,transparent:true,opacity:.6,depthWrite:false}));scene.add(pollen);
  return{pollen,leafCount:0};
}
