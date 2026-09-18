import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {equipmentSurfaceUV} from './equipment-surface.js';

// Reuse the original orb's segmented lathed shell, with the creature atlas.
// A smaller recessed opening keeps the spherical ceramic silhouette dominant.
export function consumableCapsuleGeometry(){
 const radius=.78,opening=.80,profile=[];
 for(let i=0;i<=20;i++){
  const t=opening+(Math.PI-opening)*i/20;
  profile.push(new T.Vector2(radius*Math.sin(t),radius*Math.cos(t)));
 }
 for(let i=20;i>=0;i--){
  const t=opening+(Math.PI-opening)*i/20;
  profile.push(new T.Vector2((radius-.045)*Math.sin(t),(radius-.045)*Math.cos(t)));
 }
 profile.push(profile[0].clone());
 const panels=Array.from({length:6},(_,i)=>equipmentSurfaceUV(
  new T.LatheGeometry(profile,10,i*Math.PI/3+.008,Math.PI/3-.016),'ceramic',i%3));
 // Local vertex wear preserves the shared atlas and its PBR maps.
 const rust=new T.Color('#915c38'),clean=new T.Color(1,1,1),tint=new T.Color();
 function corrosion(g,metal=false){
  const pos=g.attributes.position,colors=new Float32Array(pos.count*3);
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),angle=Math.atan2(z,x);
   const seam=1-T.MathUtils.smoothstep(Math.abs(Math.sin(angle*3)),.02,.16);
   const lip=T.MathUtils.smoothstep(y,.43,.54);
   const patch=T.MathUtils.smoothstep(Math.sin(angle*5+.7)+.45*Math.sin(angle*13+y*17),-.25,.65);
   const amount=metal?.45+.45*patch:Math.max(seam*.72,lip*.8)*patch;
   tint.copy(clean).lerp(rust,amount);tint.toArray(colors,i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));return g;
 }
 panels.forEach(g=>corrosion(g));
 const shellGeometry=mergeGeometries(panels);panels.forEach(g=>g.dispose());shellGeometry.rotateX(Math.PI/2);
 const rimGeometry=equipmentSurfaceUV(new T.TorusGeometry(radius*Math.sin(opening)-.014,.032,10,48),'steel');
 corrosion(rimGeometry,true);rimGeometry.translate(0,0,radius*Math.cos(opening)-.012);
 const coreGeometry=new T.SphereGeometry(.55,40,28);coreGeometry.translate(0,0,.16);
 return{shellGeometry,rimGeometry,coreGeometry};
}
