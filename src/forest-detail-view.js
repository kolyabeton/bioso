import * as T from 'three';

/** Photographic detail shells supplement the solid 3D forms at the fixed game angle. */
export function addForestDetails(group,tile,map,uniforms){
 const bushes=tile.decorations.filter(d=>d.feature==='thicket'),items=[];
 const arch=bushes.find(d=>d.x>tile.x&&d.z<tile.z);
 for(const [i,d] of bushes.entries()){
  if(d===arch){items.push({d,cell:1,width:6.9,height:6.9});continue;}
  if(Math.abs(d.x-tile.x)>15)continue;
  if(d.x<tile.x&&d.z>tile.z&&i%2===0)items.push({d,cell:2,width:6.5,height:4.9});
  else if(i%2)items.push({d,cell:3,width:5.6,height:d.z<tile.z?4.5:4.2});
  else items.push({d,cell:d.z<tile.z?0:3,width:6.4,height:d.z<tile.z?8.1:7.0});
 }
 const g=new T.PlaneGeometry(1,1,2,5);g.translate(0,.5,0);
 const cells=new Float32Array(items.length);items.forEach((item,i)=>cells[i]=item.cell);g.setAttribute('forestDetailCell',new T.InstancedBufferAttribute(cells,1));
 const bounds=[[.07177,.50080,.37081,.47209],[.55423,.50080,.38676,.38756],[.05343,.08612,.42026,.31659],[.53270,.06220,.40032,.43780]];
 g.setAttribute('forestDetailRect',new T.InstancedBufferAttribute(new Float32Array(items.flatMap(item=>bounds[item.cell])),4));
 const m=new T.MeshBasicMaterial({map,alphaTest:.35,side:T.DoubleSide,toneMapped:false});
 m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
   attribute float forestDetailCell;attribute vec4 forestDetailRect;varying vec2 forestDetailUv;varying float forestDetailType;uniform float forestTime;uniform float forestWind;uniform float forestMotion;`)
   .replace('#include <uv_vertex>',`#include <uv_vertex>
    forestDetailUv=uv;forestDetailType=forestDetailCell;
    vMapUv=uv*forestDetailRect.zw+forestDetailRect.xy;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    // Only upper foliage flexes; ceramic and rock silhouettes remain rigid.
    float leafLayer=(forestDetailCell==0.0||forestDetailCell==3.0)?smoothstep(.45,1.0,uv.y):0.0;
    transformed.x+=sin(forestTime*1.3+instanceMatrix[3].x*.7)*forestWind*forestMotion*.008*leafLayer;
   `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 forestDetailUv;varying float forestDetailType;')
   .replace('#include <map_fragment>',`#include <map_fragment>
    float detailAlpha=smoothstep(.001,.009,max(sampledDiffuseColor.r,max(sampledDiffuseColor.g,sampledDiffuseColor.b)));
    diffuseColor.a*=detailAlpha;
   `);
 };m.customProgramCacheKey=()=> 'forest-photographic-detail-v4';
 const mesh=new T.InstancedMesh(g,m,items.length),pose=new T.Object3D();mesh.name='forest-authored-detail-shells';
 items.forEach(({d,width,height},i)=>{pose.position.set(d.x,.12,d.z+1.05);pose.rotation.set(-Math.atan2(38,35),0,0);pose.scale.set(width,height,1);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});
 // Retained rejected experiment, not imported by the runtime renderer.
 mesh.userData.sharedPlant=mesh.userData.borderMaterial=mesh.userData.ownedGeometry=true;mesh.userData.forestFixedBatch=true;
 mesh.computeBoundingSphere();group.add(mesh);return mesh;
}
