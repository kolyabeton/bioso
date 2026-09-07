import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {geo,materials,piece,makeWall,makePylon,makePlanter,link} from './kit.js';
import {seededRandom} from './simulation.js';

export function buildWorld(scene){
  const rand=seededRandom(9206),staticRoot=new T.Group(),leaves=[];
  const rnd=(a,b)=>a+(b-a)*rand();
  function foliage(x,y,z,r=1,count=55,edge=false){
    piece(staticRoot,'moss-bed','shell','deepGreen',[x,y,z],[r,.13,r*.7]);
    for(let j=0;j<count;j++){
      const a=rand()*Math.PI*2,d=(edge?.8+rand()*.2:Math.sqrt(rand()))*r;
      leaves.push({x:x+Math.cos(a)*d,y:y+rnd(.07,.42)*(1-d/r*.5),z:z+Math.sin(a)*d*.7,s:rnd(.09,.23),a:rand()*Math.PI,c:rand()});
    }
  }
  // Rounded floating terrace, with an exposed graphite underside.
  piece(staticRoot,'terrace-underbody','box','dark',[0,-.73,0],[17.6,1.55,24]);
  piece(staticRoot,'terrace-lip','box','ceramic',[0,-.17,0],[18,.46,24.2]);
  for(let x=-4;x<=4;x++)for(let z=-6;z<=5;z++){
    const m=materials.floor.clone();m.color.offsetHSL(0,0,rnd(-.035,.035));
    const tile=piece(staticRoot,'floor-tile','box','floor',[x*1.94,.02,z*1.94+.5],[1.91,.13,1.91]);
    // Three shared shades rather than a material per tile.
    const shade=Math.floor(rand()*3);if(!materials['tile'+shade]){materials['tile'+shade]=m;}else m.dispose();tile.material=materials['tile'+shade];
  }
  // Inlaid circles and fine ceramic seams make the floor feel manufactured.
  for(const [x,z,r] of [[0,0,5.7],[0,0,5.9],[-4,-5,1.6],[4,6,1.3]]){
    const ring=new T.Mesh(new T.TorusGeometry(r,.018,4,80),materials.amber);ring.position.set(x,.096,z);ring.rotation.x=Math.PI/2;staticRoot.add(ring);
  }
  for(let x=-7.5;x<=7.5;x+=2.5){const wall=makeWall();wall.position.set(x,0,-11.3);staticRoot.add(wall);foliage(x,1.4,-11.3,1.35,95);}
  for(let z=-9;z<=9;z+=3){
    for(const side of [-1,1]){
      if(side===1&&z===0)continue;
      const wall=makeWall();wall.position.set(side*8.4,0,z);wall.rotation.y=Math.PI/2;staticRoot.add(wall);
      foliage(side*8.2,1.38,z,1.55,95);
      foliage(side*7.7,.16,z+.5,.65,40);
      for(let j=0;j<4;j++)foliage(side*8.65,.4-j*.55,z+rnd(-.8,.8),.34,15);
    }
  }
  // Tall recognisable pieces clustered on the upper edge; open combat space.
  for(const [x,z,s] of [[-6.5,-9.7,1.5],[6.5,-9.3,1.8],[8.2,3.1,1.3]]){
    const p=makePylon();p.position.set(x,0,z);p.scale.setScalar(s);staticRoot.add(p);
    foliage(x,2.5*s,z,.6*s,90);
  }
  for(const [x,z] of [[-6.8,-5.8],[6.6,6.7],[-6.6,7.8],[4.3,-9.6]]){
    const p=makePlanter();p.position.set(x,0,z);staticRoot.add(p);foliage(x,1.35,z,.7,100);
    for(let j=0;j<5;j++){
      const angle=j*1.256,a=[x,1.27,z],b=[x+Math.cos(angle)*.38,2.1+rand()*.6,z+Math.sin(angle)*.38];
      link(staticRoot,'plant-stem',a,b,.025,'deepGreen');
      piece(staticRoot,'plant-frond','shell','green',b,[.13,.5,.055],[.2,angle,.4]);
    }
  }
  // Arched ribs: one parametric architectural silhouette reused in the skyline.
  const archGeo=new T.TorusGeometry(3.25,.26,8,32,Math.PI);
  for(const x of [-5.5,5.5]){
    const arch=new T.Mesh(archGeo,materials.ceramic);arch.position.set(x,2,-12.2);arch.castShadow=true;staticRoot.add(arch);
    link(staticRoot,'arch-support',[x-3.25,0,-12.2],[x-3.25,2,-12.2],.26,'ceramic');
    link(staticRoot,'arch-support',[x+3.25,0,-12.2],[x+3.25,2,-12.2],.26,'ceramic');
  }
  foliage(-5.5,4.8,-12.2,1.3,160);foliage(5.5,4.8,-12.2,1.3,160);
  // A bridge on the right drops into the haze; distant city is real low-detail 3D.
  piece(staticRoot,'bridge','box','ceramic',[14,-.1,-4],[12,.3,2]);
  for(const z of [-5,-3])link(staticRoot,'bridge-rail',[8,.6,z],[20,.6,z],.045,'amber');
  for(let i=0;i<27;i++){
    let x=rnd(-50,50),z=rnd(-65,-21);if(i>19){x=(i%2?-1:1)*rnd(17,33);z=rnd(-8,25);}
    const r=rnd(2,4.5),h=rnd(10,23),base=-rnd(7,18);
    piece(staticRoot,'city-trunk','cone','dark',[x,base-h*.5,z],[r,h,r]);
    const floors=5;
    for(let j=0;j<floors;j++){
      const y=base+j*1.65,rr=r*(1-j*.1);
      piece(staticRoot,'city-terrace','cylinder','ceramic',[x,y,z],[rr,.32,rr]);
      piece(staticRoot,'city-core','cylinder','dark',[x,y+.65,z],[rr*.73,1.3,rr*.73]);
      foliage(x,y+.3,z,rr*.98,40,true);
    }
    foliage(x,base+7,z,r*.55,40);
  }
  for(const [x,y,z] of [[-6,3,-23],[6,4,-19]]){
    piece(staticRoot,'garden-shuttle','shell','porcelain',[x,y,z],[.7,1.7,.6]);
    piece(staticRoot,'shuttle-spine','shell','amber',[x,y,z+.4],[.24,1.6,.3]);
    for(const side of [-1,1])piece(staticRoot,'shuttle-pod','cylinder','dark',[x+side*.72,y-.2,z],[.21,.45,.21],[Math.PI/2,0,0]);
  }
  // Moss and leaf clumps use one instanced draw call for the entire garden.
  const leafMesh=new T.InstancedMesh(geo.leaf,materials.green,leaves.length),dummy=new T.Object3D(),color=new T.Color();
  leaves.forEach((p,i)=>{
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(.3,p.a,p.a*.4);dummy.scale.set(p.s*1.7,p.s*.65,p.s);dummy.updateMatrix();leafMesh.setMatrixAt(i,dummy.matrix);
    color.setHSL(.19+p.c*.085,.38+p.c*.2,.23+p.c*.22);leafMesh.setColorAt(i,color);
  });leafMesh.receiveShadow=true;leafMesh.name='instanced-garden';scene.add(leafMesh);
  // Merge static pieces by material; keep only one batch per surface.
  staticRoot.updateMatrixWorld(true);const groups=new Map();
  staticRoot.traverse(o=>{if(o.isMesh){const key=o.material.uuid;if(!groups.has(key))groups.set(key,{material:o.material,geometries:[]});groups.get(key).geometries.push(o.geometry.clone().applyMatrix4(o.matrixWorld));}});
  for(const {material,geometries} of groups.values()){
    const parts=geometries.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(parts);
    const batch=new T.Mesh(merged,material);batch.castShadow=true;batch.receiveShadow=true;batch.name='static-'+material.color.getHexString();scene.add(batch);new Set([...parts,...geometries]).forEach(g=>g.dispose());
  }
  // Sparse pollen, not expensive transparent foliage layers.
  const positions=new Float32Array(180*3);
  for(let i=0;i<180;i++){positions[i*3]=rnd(-10,10);positions[i*3+1]=rnd(.5,5);positions[i*3+2]=rnd(-12,10);}
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(positions,3));
  const pollen=new T.Points(pg,new T.PointsMaterial({color:'#f4edb4',size:.045,transparent:true,opacity:.7,depthWrite:false}));scene.add(pollen);
  return {leafCount:leaves.length,pollen};
}
