import * as T from 'three';
const q=new URLSearchParams(location.search);
const mode=q.get('review')==='trailer'?q.get('camera'):null;
export function trailerCamera(fallback){return ['orbit','cockpit'].includes(mode)?new T.PerspectiveCamera(mode==='cockpit'?70:48,16/9,.1,600):fallback;}
export function poseTrailerCamera(camera,s,w,h){
 if(!['orbit','cockpit'].includes(mode))return;
 const p=s.player,t=s.time-742;camera.aspect=w/h;
 if(mode==='orbit'){
  const a=.6+t*.075;camera.position.set(p.x+Math.cos(a)*17,(p.y||0)+11,p.z+Math.sin(a)*17);
  camera.lookAt(p.x,(p.y||0)+1.1,p.z);
 }else{
  const a=Math.PI+.3*Math.sin(t*.3);camera.position.set(p.x,(p.y||0)+2.2,p.z);
  camera.lookAt(p.x+Math.sin(a)*15,(p.y||0)+1.8,p.z+Math.cos(a)*15);
 }
 camera.updateProjectionMatrix();
}
export function renderTrailerView(renderer,scene,camera,hero){
 const hidden=mode==='cockpit'?hero.children.filter(child=>child.visible&&![...hero.userData.arms.values()].includes(child)):[];
 for(const child of hidden)child.visible=false;
 renderer.render(scene,camera);
 for(const child of hidden)child.visible=true;
}
