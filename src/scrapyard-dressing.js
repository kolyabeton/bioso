import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {seededRandom} from './simulation.js';
import {createRockGeometry} from './rock-shape.js';
import {forestSurfaceMaterial} from './forest-surface.js';
import {forestPlantMaterial} from './forest-light.js';
import {forestFoliageGeometry,forestFoliageMaterial} from './forest-foliage.js';
import {environmentId} from './environment-profiles.js';

// Family-specific understorey joins existing solid masses in both game modes.
// No extra blocking cover is introduced by the low dressing.
export const isScrapVista=tile=>tile?.biome==='scrapyard'&&!tile.environmentId;
const DRESSING={
 'quiet-scrapyard':{stone:'#e1e4e3',leaves:'#d6dcc8',bark:'#858773',growth:28,gravel:1800,roots:3,fern:false},
 'upper-gardens':{stone:'#d9d3b7',leaves:'#b2ba7d',bark:'#8f8769',growth:42,gravel:1100,roots:1,fern:false},
 'overgrown-city':{stone:'#aebcba',leaves:'#a4bfa1',bark:'#79867c',growth:36,gravel:1600,roots:2,fern:true},
 'brood-nursery':{stone:'#c3bc9c',leaves:'#aab880',bark:'#94815f',growth:48,gravel:1500,roots:5,fern:true},
 'root-forest':{stone:'#bcc1ac',leaves:'#c2cbae',bark:'#85745b',growth:42,gravel:1300,roots:5,fern:false},
};
const owned=mesh=>{mesh.userData.sharedPlant=mesh.userData.borderMaterial=mesh.userData.ownedGeometry=true;return mesh;};
function atlasCell(geometry,x,y){
 const uv=geometry.getAttribute('uv');if(uv)for(let i=0;i<uv.count;i++)uv.setXY(i,x+.015+uv.getX(i)*.47,y+.015+uv.getY(i)*.47);
 return geometry;
}
function shrubGeometry(){
 const rng=seededRandom(8241),p=[],c=[];
 const tri=(a,b,d,color)=>{for(const v of [a,b,d]){p.push(...v);c.push(...color);}};
 for(let stem=0;stem<14;stem++){
  const angle=stem*2.39996,h=.42+rng()*.5,reach=.3+rng()*.55;
  for(let level=1;level<=5;level++){
   const t=level/5,base=new T.Vector3(Math.cos(angle)*reach*t*t,h*t,Math.sin(angle)*reach*t*t);
   const prev=new T.Vector3(Math.cos(angle)*reach*(t-.2)**2,h*(t-.2),Math.sin(angle)*reach*(t-.2)**2);
   tri(base.clone().add(new T.Vector3(.008,0,0)),prev,base.clone().add(new T.Vector3(-.008,0,0)),[.1,.085,.05]);
   for(const side of [-1,1]){
    const a=angle+side*(.8+rng()*.45),length=.095+rng()*.12,width=length*.24;
    const direction=new T.Vector3(Math.cos(a),.35,Math.sin(a)),cross=new T.Vector3(-Math.sin(a),.15,Math.cos(a));
    const mid=base.clone().addScaledVector(direction,length*.48),tip=base.clone().addScaledVector(direction,length);
    const left=mid.clone().addScaledVector(cross,width),right=mid.clone().addScaledVector(cross,-width);
    const color=[.095+rng()*.045,.12+rng()*.035,.065+rng()*.025];
    tri(base,left,tip,color);tri(base,tip,right,color);
   }
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeVertexNormals();return g;
}
function batch(group,name,geometry,material,placements,world){
 const pose=new T.Object3D(),mesh=owned(new T.InstancedMesh(geometry,material,placements.length));mesh.name=name;
 placements.forEach((p,i)=>{pose.position.set(p.x,(world.heightAt(p.x,p.z)??0)+(p.lift||0),p.z);pose.rotation.set(p.tilt||0,p.angle||0,p.roll||0);pose.scale.set(p.sx,p.sy,p.sz);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});
 mesh.computeBoundingSphere();group.add(mesh);return mesh;
}
export function addScrapyardDressing(group,tile,world,atlas,uniforms,foliage=null){
 const style=DRESSING[environmentId(tile)];if((tile.biome==='forest'&&!tile.environmentId)||!style)return;
 const rng=seededRandom(world.seed+tile.index*977+6521),pebbles=[],rubble=[],growth=[],roots=[];
 const anchors=[...tile.decorations.filter(d=>d.environmentSignature||d.feature==='thicket')];
 // Low roadside clusters bridge the empty gaps between the large landmarks.
 // Their height is decorative; existing cover remains the only solid footprint.
 for(const side of [-1,1])for(const z of [-20,-10,9,20])anchors.push({x:tile.x+side*(7+rng()*1.8),z:tile.z+z+(rng()-.5)*3,size:4});
 const clear=(x,z)=>Math.abs(x-tile.x)<3.1||(!tile.environmentId&&Math.abs(z-tile.z)<3.1)||Math.abs(x-tile.x)>29||Math.abs(z-tile.z)>29||tile.safe.some(p=>Math.hypot(p.x-x,p.z-z)<2.8);
 // Replace the repeated ceramic strip visuals with solid, layered rock banks.
 // Their long/short axes follow the existing rotated cover footprint.
 for(const d of tile.decorations.filter(d=>isScrapVista(tile)&&d.feature==='thicket')){
  const angle=d.rotation||0,cos=Math.cos(angle),sin=Math.sin(angle);
  for(let n=0;n<35;n++){
   const lx=(rng()-.5)*d.size*.27,lz=(rng()-.5)*d.size*.85;
   const x=d.x+cos*lx+sin*lz,z=d.z-sin*lx+cos*lz,size=.4+rng()*.42;
   const ridge=(1-Math.abs(lx)/(d.size*.22))*(1-Math.abs(lz)/(d.size*.58));
   rubble.push({x,z,sx:size*(.85+rng()*.6),sy:size*.7,sz:size,angle:rng()*6.28,roll:rng()*.4,lift:.1+Math.max(0,ridge)*.85});
  }
 }
 for(const [index,d] of anchors.entries()){
  const radius=(d.size||6)*.38;
  for(let n=0;n<125;n++){
   const a=rng()*Math.PI*2,r=radius*.35+Math.sqrt(rng())*(radius+2.3),x=d.x+Math.cos(a)*r,z=d.z+Math.sin(a)*r;
   if(clear(x,z))continue;
   const size=n%5===0?.4+rng()*.78:.08+rng()*.24;
   (n%5===0?rubble:pebbles).push({x,z,sx:size*(.8+rng()*.7),sy:size*(.36+rng()*.25),sz:size,angle:rng()*6.28,roll:rng()*.3,lift:size*.12});
  }
  for(let n=0;n<style.growth;n++){
   const a=rng()*Math.PI*2,r=radius*.5+rng()*(radius+1.5),x=d.x+Math.cos(a)*r,z=d.z+Math.sin(a)*r;
   if(clear(x,z))continue;
   const size=.75+rng()*1.15;growth.push({x,z,sx:size,sy:size*(.75+rng()*.5),sz:size,angle:rng()*6.28});
  }
  if(index%2===0)for(let root=0;root<style.roots;root++){
   const angle=rng()*Math.PI*2,length=2.8+rng()*4.1,points=[];
   for(let j=0;j<=7;j++){
    const t=j/7,a=angle+Math.sin(t*3+root)*.25,x=d.x+Math.cos(a)*(radius*.6+t*length),z=d.z+Math.sin(a)*(radius*.6+t*length);
    if(clear(x,z))break;
    points.push(new T.Vector3(x,(world.heightAt(x,z)??0)+.09+Math.sin(t*Math.PI)*.12,z));
   }
   if(points.length<3)continue;
   const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),14,.12+rng()*.13,7,false);
   const pos=g.attributes.position;
   const curve=new T.CatmullRomCurve3(points);
   for(let j=0;j<pos.count;j++){const ring=Math.floor(j/8),t=ring/14,center=curve.getPointAt(t);pos.setXYZ(j,center.x+(pos.getX(j)-center.x)*(1-t*.84),center.y+(pos.getY(j)-center.y)*(1-t*.84),center.z+(pos.getZ(j)-center.z)*(1-t*.84));}
   roots.push(atlasCell(g,.5,0));
  }
 }
 // The gardens' narrow evergreen silhouettes differ from the low fern beds in
 // the city and nursery. Trunks stay inside existing thicket cover envelopes.
 if(environmentId(tile)==='upper-gardens'){
  const trees=tile.decorations.filter(d=>d.feature==='thicket').filter((_,i)=>i%2===0).slice(0,4);
  for(const d of trees){
   const h=6+rng()*2,ground=world.heightAt(d.x,d.z)??0;
   const trunk=new T.CylinderGeometry(.06,.22,h,7,4);trunk.translate(d.x,ground+h/2,d.z);roots.push(atlasCell(trunk,.5,0));
   for(let level=0;level<12;level++)for(let side=0;side<5;side++){
    const t=level/12,a=side*1.257+level*2.4,width=(1-t*.87)*.8;
    growth.push({x:d.x+Math.cos(a)*width*.4,z:d.z+Math.sin(a)*width*.4,lift:.4+t*h,sx:width,sy:1.1,sz:width,angle:a});
   }
  }
 }
 // Scattered gravel reaches the worn trail, without tall geometry over the hero.
 for(const [zOffset,side] of [[-13,-1],[12,1],[-5,1]]){
  for(let branch=0;branch<2;branch++){
   const points=[];
   for(let j=0;j<8;j++){const t=j/7,x=tile.x+side*(6.1-t*(branch?2.8:4.4)),z=tile.z+zOffset+Math.sin(t*3+zOffset)*.45+t*(branch?2.1:.7);points.push(new T.Vector3(x,(world.heightAt(x,z)??0)+.045,z));}
   const curve=new T.CatmullRomCurve3(points),g=new T.TubeGeometry(curve,20,.14,6,false),pos=g.attributes.position;
   for(let j=0;j<pos.count;j++){const t=Math.floor(j/7)/20,center=curve.getPointAt(t),scale=1-t*.94;pos.setXYZ(j,center.x+(pos.getX(j)-center.x)*scale,center.y+(pos.getY(j)-center.y)*scale,center.z+(pos.getZ(j)-center.z)*scale);}
   g.computeVertexNormals();roots.push(atlasCell(g,.5,0));
  }
 }
 for(let n=0;n<style.gravel;n++){
  const x=tile.x+(rng()-.5)*55,z=tile.z+(rng()-.5)*55;
  if(tile.safe.some(p=>Math.hypot(p.x-x,p.z-z)<2.2))continue;
  const size=.07+rng()*.23;pebbles.push({x,z,sx:size*1.5,sy:size*.44,sz:size,angle:rng()*6.28,lift:size*.08});
 }
 const stone=forestSurfaceMaterial(new T.MeshStandardMaterial(),atlas);stone.color.set(style.stone);stone.roughness=.98;
 batch(group,'scrap-mineral-gravel',atlasCell(createRockGeometry(),0,.5),stone,pebbles,world);
 const rubbleMaterial=forestSurfaceMaterial(new T.MeshStandardMaterial(),atlas);rubbleMaterial.color.copy(stone.color);
 batch(group,'scrap-broken-rubble',atlasCell(createRockGeometry(),0,.5),rubbleMaterial,rubble,world);
 const leaves=foliage?forestFoliageMaterial(foliage,uniforms):forestPlantMaterial(new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.96}),uniforms);leaves.color.set(style.leaves);leaves.emissiveIntensity=.62;
 batch(group,'scrap-reclaimed-shrubs',foliage?forestFoliageGeometry(style.fern):shrubGeometry(),leaves,growth,world);
 if(roots.length){const geometry=mergeGeometries(roots);roots.forEach(g=>g.dispose());const bark=forestSurfaceMaterial(new T.MeshStandardMaterial(),atlas);bark.color.set(style.bark);const mesh=owned(new T.Mesh(geometry,bark));mesh.name='scrap-trailing-roots';group.add(mesh);}
}
