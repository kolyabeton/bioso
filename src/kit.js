import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Batch each rigid assembly independently so sockets and leg pivots stay editable.
function batchRigid(group){
  const batches=new Map();
  for(const child of [...group.children]){
    if(!child.isMesh)continue;
    child.updateMatrix();const source=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();source.applyMatrix4(child.matrix);
    if(!batches.has(child.material))batches.set(child.material,[]);
    batches.get(child.material).push(source);group.remove(child);
  }
  for(const [material,parts] of batches){
    const mesh=new T.Mesh(mergeGeometries(parts),material);mesh.name='rigid-'+material.color.getHexString();mesh.castShadow=material!==materials.cyan;mesh.receiveShadow=true;group.add(mesh);parts.forEach(g=>g.dispose());
  }
  return group;
}

// Shared geometry/materials: the visual kit has no downloaded model dependencies.
export const geo = {
  shell: new T.SphereGeometry(1, 16, 10),
  box: new RoundedBoxGeometry(1, 1, 1, 2, .12),
  cylinder: new T.CylinderGeometry(1, 1, 1, 16),
  cone: new T.CylinderGeometry(.16, 1, 1, 12),
  joint: new T.IcosahedronGeometry(1, 1),
  leaf: new T.OctahedronGeometry(1, 0),
  ring: new T.TorusGeometry(1, .085, 6, 32),
  disk: new T.CircleGeometry(1, 32),
};
const mat = (color, roughness=.75, metalness=.08) => new T.MeshStandardMaterial({color, roughness, metalness});
export const materials = {
  ceramic:mat('#e9e6cb'), porcelain:mat('#fff4d8'), dark:mat('#284548',.48,.6),
  amber:mat('#ab8642',.52,.45), earth:mat('#858977'), floor:mat('#c1c7b3'),
  green:mat('#688d35'), deepGreen:mat('#325d38'), lime:mat('#a5b548'),
  cyan:new T.MeshStandardMaterial({color:'#74d5c4',emissive:'#219b87',emissiveIntensity:.65,roughness:.3}),
  seed:new T.MeshStandardMaterial({color:'#9cf0d6',emissive:'#409f89',emissiveIntensity:.5}),
  shadow:new T.MeshBasicMaterial({color:'#193b33',transparent:true,opacity:.17,depthWrite:false}),
};
export function piece(parent,name,g,m,p=[0,0,0],s=[1,1,1],r=[0,0,0]){
  const mesh=new T.Mesh(geo[g],materials[m]);mesh.name=name;
  mesh.position.set(...p);mesh.scale.set(...s);mesh.rotation.set(...r);
  mesh.castShadow=m!=='cyan';mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
export function link(parent,name,a,b,width=.08,m='dark'){
  const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);
  const mesh=piece(parent,name,'cylinder',m,start.clone().add(end).multiplyScalar(.5).toArray(),[width,d.length(),width]);
  mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return mesh;
}
export function makeArm(type='seed'){
  const g=new T.Group();g.name=`arm-${type}`;
  piece(g,'socket','joint','dark',[0,0,0],[.19,.19,.19]);
  link(g,'upper',[0,0,0],[.45,-.06,0],.12);
  piece(g,'sleeve','shell','ceramic',[.42,-.04,0],[.31,.22,.24]);
  if(type==='seed'){
    piece(g,'seed-barrel','box','ceramic',[.52,-.03,-.37],[.5,.46,1.1]);
    for(let i=0;i<3;i++)piece(g,'barrel-rib','box','dark',[.52,.205,-.18-i*.15],[.42,.045,.045]);
    piece(g,'gold-ridge','box','amber',[.52,.18,-.39],[.14,.1,.57]);
    piece(g,'muzzle','cylinder','dark',[.52,-.03,-.92],[.2,.15,.2],[Math.PI/2,0,0]);
    piece(g,'seed-core','shell','seed',[.52,-.03,-1.01],[.13,.13,.09]);
  }else if(type==='arc'){
    link(g,'coil-neck',[.43,0,0],[.63,0,-.6],.13);
    for(let i=0;i<4;i++)piece(g,`coil-${i}`,'ring',i%2?'cyan':'amber',[.52+i*.025,0,-.15-i*.15],[.24,.24,.24]);
    for(const x of [-.16,.16])link(g,'fork',[.62+x,0,-.65],[.62+x,.12,-1.02],.06,'ceramic');
  }else{
    piece(g,'resonator','shell','dark',[.52,0,-.35],[.42,.31,.52]);
    piece(g,'resonator-shell','shell','ceramic',[.52,.11,-.32],[.4,.28,.4]);
    piece(g,'pulse-lens','ring','cyan',[.52,.38,-.35],[.28,.28,.28],[Math.PI/2,0,0]);
    piece(g,'pulse-heart','shell','cyan',[.52,.36,-.35],[.12,.12,.12]);
  }
  return g;
}
export function makeCreature(kind='hero',arm='seed'){
  const g=new T.Group();g.name=`bioso-${kind}`;const legs=[];
  const hero=kind==='hero',beetle=kind==='beetle';
  piece(g,'body-chassis','shell','dark',[0,.66,0],[.56,.31,.59]);
  piece(g,'body-shell',hero?'box':'shell',hero?'ceramic':'amber',[0,.85,0],hero?[1.02,.58,1.38]:[.58,.28,.56]);
  if(hero){
    for(const z of [-.43,.43])piece(g,'shell-band','box','amber',[0,1.145,z],[.88,.045,.07]);
    for(const x of [-.37,.37])for(const z of [-.43,.43])piece(g,'shell-rivet','joint','dark',[x,1.18,z],[.04,.04,.04]);
    for(let i=0;i<3;i++)piece(g,'rear-vent','box','dark',[-.2+i*.2,1.155,.56],[.075,.035,.15]);
    piece(g,'core-rim','cylinder','amber',[0,1.16,0],[.28,.09,.28]);
    piece(g,'core-glass','shell','cyan',[0,1.22,0],[.22,.12,.22]);
    piece(g,'sensor','box','dark',[0,.93,-.47],[.37,.16,.19]);
    piece(g,'eye','box','cyan',[0,.94,-.57],[.23,.055,.04]);
    const socket=new T.Group();socket.name='RightArmSocket';socket.position.set(.45,.78,-.05);g.add(socket);socket.add(makeArm(arm));
    g.userData.armSocket=socket;
    link(g,'left-arm',[-.45,.83,0],[-.94,.75,-.2],.1);
    piece(g,'left-shell','shell','ceramic',[-.88,.82,-.1],[.26,.19,.34]);
    for(const x of [-1.13,-.78])link(g,'claw',[x,.7,-.27],[x-.03,.64,-.62],.055,'amber');
  }else{
    piece(g,'head','shell','dark',[0,.58,-.57],[.27,.16,.24]);
    for(const x of [-.13,.13])piece(g,'eye','shell','amber',[x,.62,-.77],[.065,.065,.05]);
    if(beetle){
      for(const x of [-.24,.24])piece(g,'wing-shell','shell','amber',[x,.97,.08],[.26,.3,.55],[0,0,x*.4]);
      piece(g,'wing-stripe','box','amber',[0,1.1,.06],[.13,.12,.61]);
    }else{
      piece(g,'seed-shell','cone','green',[0,1.21,.16],[.48,1.2,.48],[.1,0,0]);
      piece(g,'seed-tip','shell','amber',[0,1.69,.21],[.11,.12,.11]);
    }
  }
  const count=hero?4:6;
  for(let i=0;i<count;i++){
    const side=i%2===0?-1:1,z=(Math.floor(i/2)-(count/2-1)/2)*.55;
    const leg=new T.Group();leg.name=`leg-${i}`;leg.position.set(side*.38,.62,z);g.add(leg);
    link(leg,'upper',[0,0,0],[side*.35,-.06,side*.03],.085);
    piece(leg,'joint','joint','amber',[side*.35,-.06,side*.03],[.12,.12,.12]);
    link(leg,'shin',[side*.35,-.06,side*.03],[side*.51,-.51,-.09],.065);
    piece(leg,'foot','shell','dark',[side*.51,-.53,-.09],[.115,.065,.16]);legs.push(leg);
  }
  g.userData.legs=legs;legs.forEach(batchRigid);batchRigid(g);return g;
}
export function animateCreature(g,time,moving=true){
  g.userData.legs?.forEach((leg,i)=>{leg.rotation.x=moving?Math.sin(time*11+i*2.2)*.25:0;});
}
export function makePlanter(){
  const g=new T.Group();g.name='ceramic-planter';
  piece(g,'base','cylinder','dark',[0,.12,0],[.78,.24,.78]);
  piece(g,'body','cone','ceramic',[0,.68,0],[.78,1.16,.78]);
  piece(g,'rim','ring','amber',[0,1.26,0],[.49,.49,.49],[Math.PI/2,0,0]);
  piece(g,'soil','cylinder','earth',[0,1.18,0],[.45,.08,.45]);return g;
}
export function makePylon(){
  const g=new T.Group();g.name='solar-pylon';
  piece(g,'base','cylinder','dark',[0,.14,0],[.67,.28,.67]);
  piece(g,'shell','box','ceramic',[0,1.2,0],[1.1,2.4,.82]);
  piece(g,'panel','box','amber',[0,1.32,-.425],[.58,1.62,.05]);
  for(let i=0;i<4;i++)piece(g,'vent','box','dark',[0,.78+i*.27,-.46],[.4,.045,.03]);
  piece(g,'cap','shell','porcelain',[0,2.42,0],[.55,.15,.41]);
  piece(g,'lamp','box','cyan',[0,2.07,-.46],[.3,.07,.04]);return g;
}
export function makeWall(){
  const g=new T.Group();g.name='garden-wall';
  piece(g,'wall-base','box','dark',[0,.14,0],[2.52,.28,.67]);
  piece(g,'wall','box','ceramic',[0,.66,0],[2.5,1.2,.57]);
  piece(g,'wall-cap','box','porcelain',[0,1.28,0],[2.6,.16,.69]);return g;
}
export const assetFactories={hero:()=>makeCreature('hero'),beetle:()=>makeCreature('beetle'),sentinel:()=>makeCreature('sentinel'),'arm-seed':()=>makeArm('seed'),'arm-arc':()=>makeArm('arc'),'arm-pulse':()=>makeArm('pulse'),planter:makePlanter,pylon:makePylon,wall:makeWall};
