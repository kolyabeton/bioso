import {createRockGeometry,ROCK_TILT} from './rock-shape.js';
import * as T from 'three';
import {BIOMES,TERRAIN_ASSETS,localHeight} from './biome-world.js';
import {loadModel,fittedModel} from './asset-models.js';
import {seededRandom} from './simulation.js';
import {BiomeStream} from './biome-stream.js';
import {forestBorder} from './biome-border.js';
import {FOREST_ASSETS,FOREST_PIECES,forestPerimeterPieces,forestCornerUV} from './forest-perimeter.js';

// Technical mesh and painted materials share the same authored height sampler.
export function terrainBuffers(tile){
 const ground={positions:[],uvs:[]},cliff={positions:[],uvs:[]};
 const emit=(out,points,uv)=>{for(const i of [0,2,1,0,3,2]){out.positions.push(...points[i]);out.uvs.push(...uv[i]);}};
 for(let z=-32;z<32;z+=2)for(let x=-32;x<32;x+=2){
  if(localHeight(tile,x+1,z+1)===null)continue;
  const corners=[[x,z],[x+2,z],[x+2,z+2],[x,z+2]],ys=corners.map(([a,b])=>localHeight(tile,a+(a===x?.001:-.001),b+(b===z?.001:-.001))??0);
  emit(ground,corners.map(([a,b],i)=>[tile.x+a,ys[i],tile.z+b]),corners.map(([a,b])=>[(a+32)/64,1-(b+32)/64]));

 }
 return{ground,cliff};
}
function geometry(data){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uvs,2));g.computeVertexNormals();return g;}
export function createBiomeView(scene){
 const root=new T.Group();root.name='painted-biomes';scene.add(root);let world=null,textures=null,pending=null,epoch=0;
 const loader=new T.TextureLoader();
 async function assets(){if(textures)return textures;if(pending)return pending;const token=epoch;pending=Promise.allSettled([...Object.values(TERRAIN_ASSETS),...FOREST_ASSETS].map(url=>loader.loadAsync(url))).then(results=>{const values=results.filter(r=>r.status==='fulfilled').map(r=>r.value);if(results.some(r=>r.status==='rejected')){values.forEach(t=>t.dispose());throw Error('Environment image unavailable');}if(token!==epoch){values.forEach(t=>t.dispose());throw Error('Superseded world');}values.forEach(t=>{t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;});textures=values;return values;}).catch(e=>{pending=null;throw e;});return pending;}
 const stream=new BiomeStream(async id=>{
  const tile=world.tiles.find(t=>t.id===id),maps=await assets(),group=new T.Group();group.name=id;
  const data=terrainBuffers(tile),atlas=BIOMES.find(b=>b.id===tile.biome).atlas;
  const tex=maps[0].clone();tex.needsUpdate=true;tex.repeat.set(.5,.5);tex.offset.set(atlas%2*.5,atlas<2?.5:0);
  const gm=new T.MeshBasicMaterial({map:tex,side:T.DoubleSide,toneMapped:false});
  const next=BIOMES.find(b=>b.id===(tile.nextBiome||tile.biome)).atlas;
  gm.onBeforeCompile=shader=>{
   shader.uniforms.nextOffset={value:new T.Vector2(next%2*.5,next<2?.5:0)};shader.uniforms.oldOffset={value:tex.offset.clone()};shader.uniforms.blendDirection={value:new T.Vector2(tile.ports[1].dx,-tile.ports[1].dz)};
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 tileUV;').replace('#include <uv_vertex>','#include <uv_vertex>\ntileUV=uv;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 tileUV; uniform vec2 nextOffset; uniform vec2 oldOffset; uniform vec2 blendDirection;').replace('#include <map_pars_fragment>', `#include <map_pars_fragment>
   #ifdef USE_MAP
   vec4 samplePaint(vec2 uv,vec2 offset){
    vec2 f=fract(uv), shifted=fract(uv+.5);
    float edge=min(min(f.x,1.0-f.x),min(f.y,1.0-f.y));
    return mix(texture2D(map,shifted*.49+.005+offset),texture2D(map,f*.49+.005+offset),smoothstep(0.0,.16,edge));
   }
   #endif`).replace('#include <map_fragment>', `#ifdef USE_MAP
    vec4 a=samplePaint(tileUV*3.0,oldOffset), b=samplePaint(tileUV*3.0,nextOffset);
    float transition=smoothstep(.15,.85,dot(tileUV-.5,blendDirection)+.5);
    vec4 painted=mix(a,b,transition);
    float edge=min(min(tileUV.x,1.0-tileUV.x),min(tileUV.y,1.0-tileUV.y));
    vec4 soil=samplePaint(tileUV*3.0,vec2(.5,.5));
    diffuseColor *= mix(soil,painted,smoothstep(0.0,.075,edge));
   #endif`);
  };gm.customProgramCacheKey=()=> 'biome-ground-v3';
  group.add(new T.Mesh(geometry(data.ground),gm));
  // A second lightweight surface receives only the moving actors' shadows.
  const shadow=new T.Mesh(geometry(data.ground),new T.ShadowMaterial({opacity:.28,color:'#24241b',side:T.DoubleSide}));shadow.position.y=.025;shadow.receiveShadow=true;group.add(shadow);
  for(const d of tile.decorations){
   if(d.feature)continue;
   if(d.model){
    const template=await loadModel(d.model);if(!template)throw Error('Architecture unavailable: '+d.model);
    const model=fittedModel(template,{size:d.size,anchor:'bottom',rotation:[0,d.rotation,0]});
    model.name=d.model;model.position.set(d.x,0,d.z);model.userData.architecture=true;
    model.traverse(o=>{if(!o.isMesh)return;o.userData.sharedArchitecture=true;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;});
    group.add(model);continue;
   }
   const i=BIOMES.find(b=>b.id===d.biome).atlas,dt=maps[1].clone();dt.needsUpdate=true;dt.repeat.set(.5,.5);dt.offset.set(i%2*.5,i<2?.5:0);
   const g=new T.PlaneGeometry(d.height*1.5,d.height);g.translate(0,d.height/2,0);const m=new T.Mesh(g,new T.MeshBasicMaterial({map:dt,transparent:true,alphaTest:.12,side:T.DoubleSide,toneMapped:false}));m.rotation.x=-Math.atan2(42,32);m.position.set(d.x,world.heightAt(d.x,d.z)??0,d.z);m.userData.decor=true;group.add(m);
  }
  if(tile.flat){
   const rng=seededRandom(world.seed+tile.index*7919);
   for(const id of ['veg-grass','veg-fern']){
    const template=await loadModel(id);if(!template)continue;
    const plant=fittedModel(template,{size:1,anchor:'bottom'});plant.updateMatrixWorld(true);
    const count=tile.biome==='forest'?28:tile.biome==='scrapyard'?10:20,transforms=[];
    for(let i=0;i<count;i++){
     const x=tile.x+(rng()-.5)*60,z=tile.z+(rng()-.5)*60;
     if(Math.abs(x-tile.x)<4||Math.abs(z-tile.z)<4||tile.safe.some(p=>Math.hypot(x-p.x,z-p.z)<5)||tile.decorations.some(p=>Math.hypot(x-p.x,z-p.z)<5))continue;
     const pose=new T.Object3D();pose.position.set(x,0,z);pose.rotation.y=rng()*Math.PI*2;pose.scale.setScalar((id==='veg-fern'?3:2)*(1+rng()));pose.updateMatrix();transforms.push(pose.matrix.clone());
    }
    plant.traverse(o=>{if(!o.isMesh||!transforms.length)return;
     const mesh=new T.InstancedMesh(o.geometry,o.material,transforms.length);mesh.userData.sharedPlant=true;
     transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix.clone().multiply(o.matrixWorld)));mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
    });
   }
  }
  const features=tile.decorations.filter(d=>d.feature),pose=new T.Object3D();
  const rocks=features.filter(d=>d.feature==='rock');
  if(rocks.length){
   const rockGeo=createRockGeometry(),rockMat=new T.MeshStandardMaterial({map:tex,color:'#c3c7bd',emissive:'#7a7e72',emissiveMap:tex,emissiveIntensity:.6,roughness:1});

   const mesh=new T.InstancedMesh(rockGeo,rockMat,rocks.length);mesh.name='stone-recesses';mesh.userData.sharedPlant=true;mesh.userData.borderMaterial=true;mesh.userData.ownedGeometry=true;
   rocks.forEach((d,i)=>{pose.position.set(d.x,d.height*.32,d.z);pose.rotation.set(ROCK_TILT[0],d.rotation,ROCK_TILT[2],'YXZ');pose.scale.set(d.radius,d.height*.7,d.radius);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});
   mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  const bushes=features.filter(d=>d.feature==='thicket');
  if(bushes.length){
   const template=await loadModel('veg-shrub');if(!template)throw Error('Thicket unavailable');
   const bush=fittedModel(template,{size:1,anchor:'bottom'});bush.updateMatrixWorld(true);
   bush.traverse(o=>{if(!o.isMesh)return;const tint=m=>{const copy=m.clone();copy.color?.multiply(new T.Color('#819175'));copy.roughness=1;return copy;};
    const mesh=new T.InstancedMesh(o.geometry,Array.isArray(o.material)?o.material.map(tint):tint(o.material),bushes.length);mesh.name='solid-thickets';mesh.userData.sharedPlant=true;mesh.userData.borderMaterial=true;
    bushes.forEach((d,i)=>{pose.position.set(d.x,0,d.z);pose.rotation.set(0,d.rotation,0);pose.scale.set(d.size,d.height,d.size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));});
    mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
   });
  }
  const border=forestBorder(tile,world);
  for(const patch of border.patches){
   const floor=new T.Mesh(new T.PlaneGeometry(patch.width,patch.depth),gm.clone());
   // Reuse the authored ground shader and atlas, continuing soil beneath the forest.
   floor.material.onBeforeCompile=gm.onBeforeCompile;floor.material.customProgramCacheKey=gm.customProgramCacheKey;
   const uv=floor.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*patch.width/64,uv.getY(i)*patch.depth/64);
   floor.rotation.x=-Math.PI/2;floor.position.set(patch.x,-.015,patch.z);floor.name='forest-border-ground';group.add(floor);
  }
  const perimeter=forestPerimeterPieces(tile,world);
  for(const piece of perimeter){
   const map=maps[2+FOREST_PIECES.indexOf(piece.projection?'continuous':piece.name)];
   if(piece.projection){map.wrapS=map.wrapT=T.ClampToEdgeWrapping;}
   const horizontal=['north','south'].includes(piece.name),vertical=/^(west|east)-/.test(piece.name);
   const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});
   if(horizontal||vertical){
    const axis=horizontal?'x':'y';
    material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
 diffuseColor.a*=smoothstep(0.0,.07,min(vMapUv.${axis},1.0-vMapUv.${axis}));`);};
    material.customProgramCacheKey=()=> 'forest-strip-blend-'+axis;
   }
   if(piece.projection){
    const p=piece.projection,sx=piece.name.endsWith('w')?-1:1,sz=piece.name.startsWith('n')?-1:1;
    material.onBeforeCompile=shader=>{
     shader.uniforms.canopyYOffset={value:sz<0?-.5:.23};
     shader.uniforms.outerCanopy={value:maps[2+FOREST_PIECES.indexOf('canopy')]};
     shader.uniforms.cornerOrigin={value:new T.Vector2(p.u,p.v)};shader.uniforms.cornerSigns={value:new T.Vector2(sx,sz)};
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform vec2 cornerOrigin; uniform vec2 cornerSigns; uniform sampler2D outerCanopy; uniform float canopyYOffset;').replace('#include <map_fragment>',`#include <map_fragment>
      float sourceEdge=min(min(vMapUv.x,1.0-vMapUv.x),min(vMapUv.y,1.0-vMapUv.y));
      vec4 canopy=texture2D(outerCanopy,vec2((vMapUv.x+.5)*.5,(vMapUv.y+canopyYOffset)*1.3+.025));
      diffuseColor=mix(canopy,diffuseColor,smoothstep(0.0,.075,sourceEdge));
     `).replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
      vec2 outside=(vec2(vMapUv.x,1.0-vMapUv.y)-cornerOrigin)*vec2(32.0,56.0)*cornerSigns;
      diffuseColor.a*=smoothstep(0.0,1.5,max(outside.x,outside.y));
     `);
    };material.customProgramCacheKey=()=> 'forest-continuous-corner-v2';
   }
   const mesh=new T.Mesh(new T.PlaneGeometry(piece.width+(horizontal?4:0),piece.depth+(vertical?4:0)),material);
   if(piece.projection){
    const positions=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,...forestCornerUV(piece.x+positions.getX(i),piece.z-positions.getY(i),piece.projection));
   }
   mesh.rotation.x=-Math.PI/2;mesh.position.set(piece.x,.035,piece.z);mesh.name='forest-composition-'+piece.name;group.add(mesh);
  }
  if(perimeter.length){
   const dummy=new T.Object3D();
   // A sparse foreground row gives the image skirt volume without blocking walkable ground.
   const edges=[],b=world.bounds;
   if(tile.x-32===b.minX)edges.push([-1,0]);if(tile.x+32===b.maxX)edges.push([1,0]);
   if(tile.z-32===b.minZ)edges.push([0,-1]);if(tile.z+32===b.maxZ)edges.push([0,1]);
   const shrubs=[];
   for(const [dx,dz] of edges)for(const along of [-24,-8,8,24]){
    dummy.position.set(tile.x+(dx?dx*34:along),0,tile.z+(dz?dz*34:along));
    dummy.rotation.set(0,(along+32)*.7,0);dummy.scale.setScalar(3.2);dummy.updateMatrix();shrubs.push(dummy.matrix.clone());
   }
   const template=await loadModel('veg-shrub');if(!template)throw Error('Forest edge shrub unavailable');
   const shrub=fittedModel(template,{size:1,anchor:'bottom'});shrub.updateMatrixWorld(true);
   shrub.traverse(o=>{if(!o.isMesh)return;
    const tint=m=>{const copy=m.clone();copy.color?.multiply(new T.Color('#89b96a'));copy.roughness=1;return copy;};
    const mesh=new T.InstancedMesh(o.geometry,Array.isArray(o.material)?o.material.map(tint):tint(o.material),shrubs.length);
    mesh.name='forest-edge-shrubs';mesh.userData.sharedPlant=true;mesh.userData.borderMaterial=true;
    shrubs.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix.clone().multiply(o.matrixWorld)));
    mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
   });

  }
  root.add(group);return group;
 },group=>{root.remove(group);group.traverse(o=>{if(!o.isMesh)return;if(o.userData.sharedPlant){o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.borderMaterial)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();return;}if(o.userData.sharedArchitecture){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();return;}if(o.isInstancedMesh)o.dispose();o.geometry.dispose();if(o.material.map&&!textures?.includes(o.material.map))o.material.map.dispose();o.material.dispose();});});
 function reset(){stream.reset();root.clear();world=null;}
 function update(s){if(world!==s.world){reset();world=s.world;}
  const tile=world.tileAt(s.player.x,s.player.z)||world.tiles[0],ids=world.flat?world.tiles.filter(t=>Math.abs(t.cx-tile.cx)<=1&&Math.abs(t.cz-tile.cz)<=1).map(t=>t.id):[-2,-1,0,1,2].map(n=>world.tiles[(tile.index+n+16)%16].id);stream.update(ids);s.streaming={ready:stream.ready,errors:[...stream.entries].filter(([,e])=>e.status==='error').map(([id])=>id)};

 }
 return{update,reset,retry:()=>stream.retry(),info:()=>({residentTiles:stream.ready.size,loadingTiles:[...stream.entries.values()].filter(e=>e.status==='loading').length,assetErrors:[...stream.entries.values()].filter(e=>e.status==='error').length}),dispose(){reset();epoch++;textures?.forEach(t=>t.dispose());textures=null;pending=null;scene.remove(root);}};
}
