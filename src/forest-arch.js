import * as T from 'three';
import {mergeGeometries,toCreasedNormals} from 'three/addons/utils/BufferGeometryUtils.js';
/** Bend retained pillar geometry into a broken span; keep its authored UV/material. */
export function forestArchGeometry(mesh){
 const base=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld),parts=[];
 base.computeBoundingBox();const bounds=base.boundingBox,height=bounds.max.y-bounds.min.y;
 for(const side of [-1,1]){const g=base.clone();g.scale(.38,.84,.5);g.translate(side*1.9,0,0);parts.push(g);}
 const span=base.clone(),p=span.attributes.position;
 for(let i=0;i<p.count;i++){const theta=(p.getY(i)-bounds.min.y)/height*Math.PI,radial=p.getX(i)*.38;p.setXYZ(i,Math.cos(theta)*(1.9+radial),5.1+Math.sin(theta)*(1.55+radial),p.getZ(i)*.5);}
 // A snapped end is visible above the right-hand stump.
 parts.push(span);const merged=mergeGeometries(parts);merged.computeVertexNormals();
 const result=toCreasedNormals(merged,Math.PI*.45);base.dispose();merged.dispose();parts.forEach(g=>g.dispose());return result;
}
