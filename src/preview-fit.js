import * as T from 'three';
const back=new T.Vector3(4,3,5.5).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),back).normalize(),up=new T.Vector3().crossVectors(back,right),point=new T.Vector3();
// Fit the actual silhouette, including perspective depth, rather than empty mesh-box corners.
export function fitPreview(camera,model,aspect){
 model.updateWorldMatrix(true,true);
 const vertical=Math.tan(T.MathUtils.degToRad(camera.fov/2)),horizontal=vertical*aspect;
 let ax=-Infinity,bx=Infinity,ay=-Infinity,by=Infinity,minZ=Infinity,maxZ=-Infinity;
 model.traverseVisible(o=>{if(!o.isMesh)return;const positions=o.geometry.getAttribute('position');if(!positions)return;
  for(let i=0;i<positions.count;i++){
   point.fromBufferAttribute(positions,i).applyMatrix4(o.matrixWorld);
   const x=point.dot(right),y=point.dot(up),z=point.dot(back);
   ax=Math.max(ax,x+z*horizontal);bx=Math.min(bx,x-z*horizontal);
   ay=Math.max(ay,y+z*vertical);by=Math.min(by,y-z*vertical);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
 });
 if(!Number.isFinite(ax))return;
 const distance=Math.max((ax-bx)/(2*horizontal),(ay-by)/(2*vertical),maxZ+.02)+.005;
 const center=right.clone().multiplyScalar((ax+bx)/2).addScaledVector(up,(ay+by)/2);
 camera.aspect=aspect;camera.zoom=1;camera.near=.01;camera.far=Math.max(1,distance-minZ+1);
 camera.position.copy(center).addScaledVector(back,distance);camera.lookAt(center);camera.updateProjectionMatrix();
}
