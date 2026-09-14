import * as T from 'three';

export const ENEMY_DEATH_DURATION=1.2;
export const ENEMY_DEATH_CAPACITY=48;
export const ENEMY_DEBRIS_PER_DEATH=7;

const clamp=value=>Math.max(0,Math.min(1,value));
const hash=value=>{let n=(Number(value)||1)|0;n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return(n^(n>>>16))>>>0;};
const unit=value=>(value>>>0)/4294967295;
const visualRadius=e=>['elite','boss','final'].includes(e.kind)?Math.max(.2,e.radius??.8):Math.max(.8,e.radius??.55);
const CERAMIC_TEXTURE_URL='/assets/ui/materials/ceramic-worn-v1.jpg';

function ceramicTexture(loadTexture){
 const texture=loadTexture?loadTexture(CERAMIC_TEXTURE_URL):typeof document==='undefined'?new T.Texture():new T.TextureLoader().load(CERAMIC_TEXTURE_URL);
 texture.name='enemy-death-ceramic-worn';texture.userData.source=CERAMIC_TEXTURE_URL;texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(1.7,1.7);return texture;
}

/** Fixed-capacity visual disassembly. Combat, loot and enemy removal stay immediate. */
export function createEnemyDeathView(scene,{scale=1,capacity=ENEMY_DEATH_CAPACITY,loadTexture}={}){
 const root=new T.Group();root.name='enemy-death-effects';scene.add(root);
 const chunkGeometry=new T.DodecahedronGeometry(1,0),headGeometry=new T.ConeGeometry(1,.9,7),limbGeometry=new T.CylinderGeometry(.18,.24,1,6);
 const ceramicMap=ceramicTexture(loadTexture);
 const debrisMaterial=()=>{const material=new T.MeshStandardMaterial({color:'#fffaf0',map:ceramicMap,roughness:.84,metalness:.04});material.name='enemy-death-ceramic';return material;};
 const chunkMaterial=debrisMaterial(),headMaterial=debrisMaterial(),limbMaterial=debrisMaterial();
 const chunks=new T.InstancedMesh(chunkGeometry,chunkMaterial,capacity*2),heads=new T.InstancedMesh(headGeometry,headMaterial,capacity),limbs=new T.InstancedMesh(limbGeometry,limbMaterial,capacity*4);
 const dummy=new T.Object3D(),color=new T.Color(),size=new T.Vector3();let entries=[];
 for(const mesh of [chunks,heads,limbs]){mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);root.add(mesh);}
 chunks.name='enemy-body-debris';heads.name='enemy-head-debris';limbs.name='enemy-limb-debris';

 function event(e){
  if(e.type!=='death'||!Number.isFinite(e.x)||!Number.isFinite(e.z))return;
  const seed=hash(e.target??entries.length+1);
  entries.push({age:0,x:e.x,y:e.y??0,z:e.z,radius:visualRadius(e)*scale,role:e.role||'mass',kind:e.kind||'normal',flying:!!e.flying,yaw:unit(seed)*Math.PI*2,seed});
  if(entries.length>capacity)entries=entries.slice(-capacity);
 }
 function pose(entry,index,localX,localY,localZ,sx,sy,sz,shape,reducedMotion){
  const t=reducedMotion?.34:entry.age,angle=entry.yaw+index*2.399963,seed=hash(entry.seed+index*7919),speed=entry.radius*(.24+unit(seed)*.28),vertical=entry.radius*(.58+unit(hash(seed))*.48);
  const cos=Math.cos(entry.yaw),sin=Math.sin(entry.yaw),startX=localX*cos+localZ*sin,startZ=localZ*cos-localX*sin;
  dummy.position.set(entry.x+startX+Math.sin(angle)*speed*Math.min(t,.62),entry.y+localY+(entry.flying?entry.radius*.65:0)+vertical*t-5.2*t*t,entry.z+startZ+Math.cos(angle)*speed*Math.min(t,.62));
  dummy.position.y=Math.max(entry.y+.035,dummy.position.y);dummy.rotation.set(t*(index%2?2.8:-2.3),entry.yaw+t*(1.5+index*.31),t*(index%3-1)*2.1);
  const vanish=clamp((ENEMY_DEATH_DURATION-entry.age)/.22);dummy.scale.copy(size.set(sx,sy,sz)).multiplyScalar(vanish);dummy.updateMatrix();shape.setMatrixAt(shape.count,dummy.matrix);shape.count++;
 }
 function update(dt,{reducedMotion=false}={}){
  const step=Math.max(0,dt);for(const entry of entries)entry.age+=step;entries=entries.filter(entry=>entry.age<ENEMY_DEATH_DURATION);
  chunks.count=heads.count=limbs.count=0;
  for(const entry of entries){
   const r=entry.radius,wide=entry.role==='armored'?1.18:entry.role==='fast'?.72:1,tall=entry.role==='ranged'?1.35:entry.role==='fast'?.72:1;
   pose(entry,0,-.12*r,.48*r,0,.27*r*wide,.22*r*tall,.3*r,chunks,reducedMotion);
   pose(entry,1,.14*r,.54*r,.03*r,.25*r*wide,.2*r*tall,.27*r,chunks,reducedMotion);
   pose(entry,2,0,.72*r,.09*r,.18*r,.22*r,.18*r,heads,reducedMotion);
   for(let i=0;i<4;i++){const side=i%2?1:-1,row=i<2?1:-1;pose(entry,3+i,side*.3*r,.34*r,row*.2*r,.12*r,.34*r,.12*r,limbs,reducedMotion);}
   color.set('#f4eedb');chunks.setColorAt(chunks.count-2,color);chunks.setColorAt(chunks.count-1,color);heads.setColorAt(heads.count-1,color);
   for(let i=1;i<=4;i++)limbs.setColorAt(limbs.count-i,color);
  }
  for(const mesh of [chunks,heads,limbs]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
 function reset(){entries=[];chunks.count=heads.count=limbs.count=0;}
 return{event,update,reset,info:()=>({enemyDeaths:entries.length,enemyDebris:entries.length*ENEMY_DEBRIS_PER_DEATH}),dispose(){reset();scene.remove(root);for(const mesh of [chunks,heads,limbs])mesh.dispose();for(const geometry of [chunkGeometry,headGeometry,limbGeometry])geometry.dispose();for(const material of [chunkMaterial,headMaterial,limbMaterial])material.dispose();ceramicMap.dispose();}};
}
