import * as T from 'three';
// Shared by rendering and the offline collision-outline generator.
export function createRockGeometry(){
 const geometry=new T.DodecahedronGeometry(1,1),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),scale=.83+.15*Math.sin(x*13+y*7+z*17);
  p.setXYZ(i,x*scale,y*(.9+.12*Math.sin(z*8+x*4)),z*scale);
 }
 geometry.computeVertexNormals();return geometry;
}
export const ROCK_TILT=[.12,0,.08];
