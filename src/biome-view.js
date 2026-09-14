import {createBiomeAtlasViews} from './biome-atlas.js';
import {prepareTextures,materialTextures} from './gpu-preparation.js';
import {environmentSurfaceKey} from './environment-surfaces.js';
import {frameWork,limitedLoad} from './frame-work.js';
import {createRockGeometry,ROCK_TILT} from './rock-shape.js';
import * as T from 'three';
import {BIOMES,TERRAIN_ASSETS,localHeight} from './biome-world.js';
import {loadModel,fittedModel} from './asset-models.js';
import {seededRandom} from './simulation.js';
import {BiomeStream} from './biome-stream.js';
import {forestBorder} from './biome-border.js';
import {createForestUniforms,forestGroundShader,forestPlantMaterial} from './forest-light.js';
import {addForestSculpture} from './forest-sculpt-view.js';
import {forestFoliageGeometry,forestFoliageMaterial} from './forest-foliage.js';
import {toCreasedNormals,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {addEnvironmentBorder,environmentBorderHeight} from './environment-border.js';
import {environmentProfile,environmentId} from './environment-profiles.js';
import {addEnvironmentDressing,environmentPlantMaterial} from './environment-dressing-view.js';
import {environmentGroundShader} from './environment-ground.js';
import {forestSurfaceMaterial} from './forest-surface.js';
import {bakeEnvironmentLightAsync} from './environment-static-light.js';
import {isScrapVista} from './scrapyard-dressing.js';

// Technical mesh and painted materials share the same authored height sampler.
export function terrainBuffers(tile){const steps=terrainSteps(tile);let step;do{step=steps.next();}while(!step.done);return step.value;}
async function terrainBuffersAsync(tile,work){const steps=terrainSteps(tile);while(true){const step=await work(Object.assign(()=>steps.next(),{workLabel:'terrain-row'}));if(step.done)return step.value;}}
function* terrainSteps(tile){
 const ground={positions:[],uvs:[]},cliff={positions:[],uvs:[]};
 const emit=(out,points,uv)=>{for(const i of [0,2,1,0,3,2]){out.positions.push(...points[i]);out.uvs.push(...uv[i]);}};
 for(let z=-32;z<32;z+=2){for(let x=-32;x<32;x+=2){
  if(localHeight(tile,x+1,z+1)===null)continue;
  const corners=[[x,z],[x+2,z],[x+2,z+2],[x,z+2]],ys=corners.map(([a,b])=>localHeight(tile,a+(a===x?.001:-.001),b+(b===z?.001:-.001))??0);
  emit(ground,corners.map(([a,b],i)=>[tile.x+a,ys[i],tile.z+b]),corners.map(([a,b])=>[(a+32)/64,1-(b+32)/64]));

 }yield;}
 return{ground,cliff};
}
function geometry(data){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(data.uvs,2));g.computeVertexNormals();return g;}
export function createBiomeView(scene,forestUniforms=createForestUniforms(),renderer=null){
 const root=new T.Group();root.name='painted-biomes';scene.add(root);let world=null,textures=null,pending=null,epoch=0,currentTile=null;
 const loader=new T.TextureLoader(),groundAtlases=[],decorAtlases=[],sharedTextures=new Set(),forestLightmaps=new Map();
 async function bakedLight(tile){
  if(!forestLightmaps.has(tile.index)){const token=epoch;forestLightmaps.set(tile.index,limitedLoad(()=>loader.loadAsync(`/assets/biomes/forest-living/light-tile-${tile.index}-v4.webp`)).then(t=>{if(token!==epoch){t.dispose();throw Error('Superseded forest light');}t.colorSpace=T.NoColorSpace;return t;}).catch(e=>{forestLightmaps.delete(tile.index);throw e;}));}
  return forestLightmaps.get(tile.index);
 }
 async function assets(){if(textures)return textures;if(pending)return pending;const token=epoch;pending=Promise.allSettled([...Object.values(TERRAIN_ASSETS),'/assets/biomes/environment-materials-v2.webp','/assets/biomes/forest-living/ground-v1.webp','/assets/biomes/forest-living/foliage-v1.webp','/assets/biomes/forest-living/materials-v2.webp'].map(url=>limitedLoad(()=>loader.loadAsync(url)))).then(results=>{const values=results.filter(r=>r.status==='fulfilled').map(r=>r.value);if(results.some(r=>r.status==='rejected')){values.forEach(t=>t.dispose());throw Error('Environment image unavailable');}if(token!==epoch){values.forEach(t=>t.dispose());throw Error('Superseded world');}values.forEach(t=>{t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;});values.at(-1).flipY=false;values.at(-4).flipY=false;groundAtlases.push(...createBiomeAtlasViews(values[0]));decorAtlases.push(...createBiomeAtlasViews(values[1]));for(const texture of [...values,...groundAtlases,...decorAtlases])sharedTextures.add(texture);textures=values;return values;}).catch(e=>{pending=null;throw e;});return pending;}
 const release=group=>{group.userData.scrapLight?.dispose();root.remove(group);group.traverse(o=>{if(!o.isMesh)return;if(o.userData.sharedPlant){if(o.isInstancedMesh)o.dispose();if(o.userData.ownedGeometry)o.geometry.dispose();if(o.userData.borderMaterial)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();return;}if(o.userData.sharedArchitecture){for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();return;}if(o.isInstancedMesh)o.dispose();o.geometry.dispose();if(o.material.map&&!sharedTextures.has(o.material.map))o.material.map.dispose();o.material.dispose();});};
 let currentCamera=null;
 const stream=new BiomeStream(async (id,{valid})=>{
  const buildWorld=world,work=fn=>frameWork.run(fn,{valid,priority:id===currentTile?.id?-1:0});
  const tile=buildWorld.tiles.find(t=>t.id===id),maps=await assets(),group=new T.Group();group.name=id;
  try{
  const data=await terrainBuffersAsync(tile,work),atlas=BIOMES.find(b=>b.id===tile.biome).atlas;
  const tex=groundAtlases[atlas];
  const authoredForest=tile.biome==='forest'&&!tile.environmentId,adjacent=authoredForest?buildWorld.neighbors(tile):[],forestNeighbors=adjacent.filter(t=>t.biome==='forest'&&!t.environmentId);
  const lightmaps=authoredForest?await Promise.all([tile,...forestNeighbors].map(bakedLight)):[],lightmap=lightmaps[0]||null;
  const lightmapNeighbors=Object.fromEntries(forestNeighbors.map((neighbor,i)=>[
   neighbor.x<tile.x?'west':neighbor.x>tile.x?'east':neighbor.z<tile.z?'north':'south',lightmaps[i+1],
  ]));
  lightmapNeighbors.fade=Object.fromEntries(adjacent.filter(neighbor=>!forestNeighbors.includes(neighbor)).map(neighbor=>[
   neighbor.x<tile.x?'west':neighbor.x>tile.x?'east':neighbor.z<tile.z?'north':'south',true,
  ]));
  if(authoredForest){maps.at(-3).wrapS=maps.at(-3).wrapT=T.RepeatWrapping;}
  const profile=environmentProfile(tile);
  const gm=authoredForest?new T.MeshStandardMaterial({map:tex,bumpMap:maps.at(-3),bumpScale:.032,roughness:.93,metalness:0,side:T.DoubleSide}):new T.MeshStandardMaterial({map:tex,color:profile?.tint||'#c6c8bd',roughness:profile?.roughness??.94,metalness:0,side:T.DoubleSide});
  const next=BIOMES.find(b=>b.id===(tile.nextBiome||tile.biome)).atlas,groundTransition=tile.groundStyle==='brood'
   ?'smoothstep(.18,.82,.5+sin(tileUV.x*12.0+sin(tileUV.y*9.0)*1.7)*.22+sin(tileUV.y*17.0)*.11)'
   :'smoothstep(.15,.85,dot(tileUV-.5,blendDirection)+.5)';
  gm.onBeforeCompile=shader=>{
   shader.uniforms.nextOffset={value:new T.Vector2(next%2*.5,next<2?.5:0)};shader.uniforms.oldOffset={value:tex.offset.clone()};shader.uniforms.blendDirection={value:new T.Vector2(...(tile.groundBlendDirection||[tile.ports[1].dx,-tile.ports[1].dz]))};
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
    float transition=${groundTransition};
    vec4 painted=mix(a,b,transition);
    float edge=min(min(tileUV.x,1.0-tileUV.x),min(tileUV.y,1.0-tileUV.y));
    vec4 soil=samplePaint(tileUV*3.0,vec2(.5,.5));
    diffuseColor *= mix(soil,painted,smoothstep(0.0,.075,edge));
   #endif`);
   if(profile)environmentGroundShader(shader,profile,maps.at(-3),maps.at(-1),tile,buildWorld,lightmap,maps.at(-4),null,!authoredForest,lightmapNeighbors);
  };gm.customProgramCacheKey=()=> `biome-ground-v8-${environmentSurfaceKey(profile,tile,buildWorld)}-${tile.groundStyle||'default'}${authoredForest?'-living-volume':''}`;
  const groundMesh=await work(()=>new T.Mesh(geometry(data.ground),gm));group.add(groundMesh);
  for(const d of tile.decorations){
   if(d.environmentSignature||d.model?.startsWith('environment-')||d.model?.startsWith('forest-'))continue;
   if(d.feature)continue;
   if(d.model){
    const template=await loadModel(d.model);if(!template)throw Error('Architecture unavailable: '+d.model);
    await work(()=>{const model=fittedModel(template,{size:d.size,anchor:'bottom',rotation:[0,d.rotation,0]});
    model.name=d.model;model.position.set(d.x,buildWorld.heightAt(d.x,d.z)??0,d.z);model.userData.architecture=true;
    model.traverse(o=>{if(!o.isMesh)return;o.userData.sharedArchitecture=true;const tune=m=>{const copy=m.clone();if(tile.biome==='forest'){copy.roughness=.96;copy.color?.multiply(new T.Color('#b1b7b7'));copy.emissiveIntensity=.12;}return copy;};o.material=Array.isArray(o.material)?o.material.map(tune):tune(o.material);o.castShadow=o.receiveShadow=false;});
    if(d.model.startsWith('environment-'))model.traverse(o=>{if(o.isMesh&&!o.material.name.includes('mint')){const previous=o.material;o.material=forestSurfaceMaterial(previous,maps.at(-1));previous.dispose();}});
    group.add(model);});continue;
   }
   const i=BIOMES.find(b=>b.id===d.biome).atlas,dt=decorAtlases[i];
   const g=new T.PlaneGeometry(d.height*1.5,d.height);g.translate(0,d.height/2,0);const m=new T.Mesh(g,new T.MeshBasicMaterial({map:dt,transparent:true,alphaTest:.12,side:T.DoubleSide,toneMapped:false}));m.rotation.x=-Math.atan2(42,32);m.position.set(d.x,buildWorld.heightAt(d.x,d.z)??0,d.z);m.userData.decor=true;group.add(m);
  }
  if(tile.flat&&!tile.environmentId&&(tile.ambientVegetation||tile.biome!=='forest')){
   const rng=seededRandom(buildWorld.seed+tile.index*7919);
   const ambient=profile?.plants??tile.ambientVegetation??['veg-grass','veg-fern'];
   for(const id of ambient){
    const template=await loadModel(id);if(!template)continue;
    await work(()=>{const plant=fittedModel(template,{size:1,anchor:'bottom'});plant.updateMatrixWorld(true);
    const count=tile.ambientDensity??(tile.biome==='scrapyard'?10:20),transforms=[],baseScale={
     'veg-moss':1.45,'veg-grass':1.8,'veg-fern':2.7,'veg-vine':2.15,'veg-seedpod':2.35,
    }[id]||2;
    for(let i=0;i<count;i++){
     const x=tile.x+(rng()-.5)*60,z=tile.z+(rng()-.5)*60;
     if(Math.abs(x-tile.x)<4||Math.abs(z-tile.z)<4||tile.safe.some(p=>Math.hypot(x-p.x,z-p.z)<5)||tile.decorations.some(p=>Math.hypot(x-p.x,z-p.z)<5))continue;
     const pose=new T.Object3D();pose.position.set(x,buildWorld.heightAt(x,z)??0,z);pose.rotation.y=rng()*Math.PI*2;pose.scale.setScalar(baseScale*(.8+rng()*.75));pose.updateMatrix();transforms.push(pose.matrix.clone());
    }
    // Low, non-solid undergrowth gathers around the authored banks. Irregular
    // pockets leave long gaps and the central fighting lane unobstructed.
    if(tile.environmentId){
     const pocketCount=tile.environmentId==='quiet-scrapyard'?6:id==='forest-shrub-v3'?12:24;
     for(let i=0;i<pocketCount;i++){
      const side=i%2?1:-1,band=Math.floor(i/2)%4;
      const x=tile.x+side*(6.5+rng()*2.2),z=tile.z+[-22,-9,8,21][band]+(rng()-.5)*6;
      const pose=new T.Object3D();pose.position.set(x,buildWorld.heightAt(x,z)??0,z);pose.rotation.y=rng()*Math.PI*2;
      pose.scale.setScalar((id==='veg-seedpod'?1.15:1.65)+rng()*.8);pose.updateMatrix();transforms.push(pose.matrix.clone());
     }
    }
    if(tile.biome==='forest'&&id==='veg-fern')for(const anchor of tile.decorations.filter(d=>d.model||d.feature==='rock'))for(let i=0;i<3;i++){
     const angle=i*2.4+anchor.rotation,r=anchor.feature==='rock'?anchor.radius*.55:1.1,pose=new T.Object3D();
     pose.position.set(anchor.x+Math.cos(angle)*r,.02,anchor.z+Math.sin(angle)*r);pose.rotation.y=angle;pose.scale.setScalar(1.8+i*.25);pose.updateMatrix();transforms.push(pose.matrix.clone());
    }
    plant.traverse(o=>{if(!o.isMesh||!transforms.length)return;
     const mat=tile.biome==='forest'?forestPlantMaterial(o.material,forestUniforms):environmentPlantMaterial(o.material,forestUniforms);
     if(o.material.name.includes('geometric-leaves')){mat.color.set('#e4e5ce');mat.side=T.DoubleSide;}
     const mesh=new T.InstancedMesh(o.geometry,mat,transforms.length);mesh.userData.sharedPlant=true;mesh.userData.borderMaterial=true;mesh.castShadow=mesh.receiveShadow=false;
     transforms.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix.clone().multiply(o.matrixWorld)));mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
    });
    });
   }
  }
  const features=tile.decorations.filter(d=>d.feature),pose=new T.Object3D();
  const rocks=features.filter(d=>d.feature==='rock'&&!d.forestRole);
  if(rocks.length){await work(()=>{
   let rockGeo=createRockGeometry();if(tile.biome==='forest'){const smooth=toCreasedNormals(rockGeo,Math.PI);rockGeo.dispose();rockGeo=smooth;}
   const rockMat=isScrapVista(tile)?forestSurfaceMaterial(new T.MeshStandardMaterial(),maps.at(-1)):new T.MeshStandardMaterial({map:tex,color:tile.biome==='forest'?'#d2d5d2':'#c3c7bd',emissive:tile.biome==='forest'?'#b5bfca':'#7a7e72',emissiveMap:tex,emissiveIntensity:tile.biome==='forest'?.4:.6,roughness:1});
   if(isScrapVista(tile)){const uv=rockGeo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.015+uv.getX(i)*.47,.515+uv.getY(i)*.47);rockMat.color.set('#d1d5d5');}
   if(tile.biome==='forest'){
    rockMat.emissiveMap=null;rockMat.emissiveIntensity=.08;
    rockMat.onBeforeCompile=shader=>{
     shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 stonePoint;varying vec3 stoneNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nstonePoint=(instanceMatrix*vec4(position,1.0)).xyz;stoneNormal=normal;');
     shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 stonePoint;varying vec3 stoneNormal;').replace('#include <map_fragment>',`
      vec3 w=pow(abs(stoneNormal),vec3(4.0));w/=max(.001,w.x+w.y+w.z);
      vec3 stone=texture2D(map,fract(stonePoint.yz*.09)*.45+vec2(.02,.52)).rgb*w.x+texture2D(map,fract(stonePoint.xz*.09)*.45+vec2(.02,.52)).rgb*w.y+texture2D(map,fract(stonePoint.xy*.09)*.45+vec2(.02,.52)).rgb*w.z;
      float luminance=dot(stone,vec3(.2126,.7152,.0722));diffuseColor.rgb*=mix(vec3(luminance),stone,.22)*1.25;
     `);};rockMat.customProgramCacheKey=()=> 'forest-triplanar-stone';
   }

   const mesh=new T.InstancedMesh(rockGeo,rockMat,rocks.length);mesh.name='stone-recesses';mesh.userData.sharedPlant=true;mesh.userData.borderMaterial=true;mesh.userData.ownedGeometry=true;
   rocks.forEach((d,i)=>{pose.position.set(d.x,(buildWorld.heightAt(d.x,d.z)??0)+d.height*.32,d.z);pose.rotation.set(ROCK_TILT[0],d.rotation,ROCK_TILT[2],'YXZ');pose.scale.set(d.radius,d.height*.7,d.radius);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix);});
   mesh.castShadow=mesh.receiveShadow=false;mesh.computeBoundingSphere();group.add(mesh);
  });}
  const bushes=features.filter(d=>d.feature==='thicket'&&!d.coverModel);
  if(bushes.length&&tile.biome!=='forest'){
   const template=await loadModel('forest-shrub-v3');if(!template)throw Error('Thicket unavailable');
   await work(()=>{const bush=fittedModel(template,{size:1,anchor:'bottom'});bush.updateMatrixWorld(true);
   bush.traverse(o=>{if(!o.isMesh)return;const tint=m=>{const copy=m.name.includes('geometric-leaves')?environmentPlantMaterial(m,forestUniforms):forestSurfaceMaterial(m,maps.at(-1));if(m.name.includes('geometric-leaves')){copy.color.set('#e4e5ce');copy.side=T.DoubleSide;}return copy;};
    const mesh=new T.InstancedMesh(o.geometry,Array.isArray(o.material)?o.material.map(tint):tint(o.material),bushes.length);mesh.name='solid-thickets';mesh.userData.sharedPlant=true;mesh.userData.borderMaterial=true;
    bushes.forEach((d,i)=>{pose.position.set(d.x,buildWorld.heightAt(d.x,d.z)??0,d.z);pose.rotation.set(0,d.rotation,0);pose.scale.set(d.size,d.height,d.size);pose.updateMatrix();mesh.setMatrixAt(i,pose.matrix.clone().multiply(o.matrixWorld));});
    mesh.castShadow=mesh.receiveShadow=false;mesh.computeBoundingSphere();group.add(mesh);
   });
   });
  }
  // The shared 3D pocket layer replaces the old duplicated mission foliage.
  if(!authoredForest)await addEnvironmentDressing(group,tile,buildWorld,maps.at(-1),forestUniforms,maps.at(-2),work);
  const border=forestBorder(tile,buildWorld);
  for(const patch of border.patches){await work(()=>{
   const floor=new T.Mesh(new T.PlaneGeometry(patch.width,patch.depth,authoredForest?1:Math.ceil(patch.width/2),authoredForest?1:Math.ceil(patch.depth/2)),gm.clone());
   const vertices=floor.geometry.attributes.position;
   for(let i=0;i<vertices.count;i++)vertices.setZ(i,environmentBorderHeight(tile,buildWorld,patch.x+vertices.getX(i),patch.z-vertices.getY(i)));
   floor.geometry.computeVertexNormals();
   // Reuse the authored ground shader and atlas, continuing soil beneath the forest.
   floor.material.onBeforeCompile=gm.onBeforeCompile;floor.material.customProgramCacheKey=gm.customProgramCacheKey;
   const uv=floor.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*patch.width/64,uv.getY(i)*patch.depth/64);
   floor.rotation.x=-Math.PI/2;floor.position.set(patch.x,-.015,patch.z);floor.name='forest-border-ground';
   if(tile.biome==='forest'){
    floor.updateMatrix();const patchGeometry=floor.geometry.toNonIndexed().applyMatrix4(floor.matrix),merged=mergeGeometries([groundMesh.geometry,patchGeometry]);groundMesh.geometry.dispose();patchGeometry.dispose();floor.geometry.dispose();floor.material.dispose();groundMesh.geometry=merged;
   }else group.add(floor);
  });}
  await addEnvironmentBorder(group,tile,buildWorld,maps.at(-1),forestUniforms,work);
  if(tile.biome==='forest'&&!tile.environmentId){await addForestSculpture(group,tile,maps.at(-1),forestUniforms,buildWorld,work);}
  {
   const meshes=[];group.traverse(mesh=>{if(mesh.isInstancedMesh&&!mesh.userData.forestFixedBatch)meshes.push(mesh);});
   for(const mesh of meshes)await work(()=>{
    mesh.geometry.computeBoundingSphere();const instances=[];
    for(let i=0;i<mesh.count;i++){const matrix=new T.Matrix4();mesh.getMatrixAt(i,matrix);const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);sphere.radius+=.5;instances.push({matrix,sphere});}
    mesh.userData.forestInstances=instances;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   });
  }
  if(renderer){const texturesToPrepare=[...maps,...lightmaps];group.traverse(mesh=>{if(mesh.isMesh)texturesToPrepare.push(...materialTextures(mesh.material));});await prepareTextures(renderer,texturesToPrepare,work);group.userData.scrapLight=await bakeEnvironmentLightAsync(renderer,group,tile,authoredForest?{sun:{x:-45,y:75,z:-45},skipReceiver:groundMesh}:{},work);
   if(currentCamera){const meshes=[];group.traverse(m=>{if(m.isMesh)meshes.push(m);});for(const mesh of meshes)await work(()=>renderer.compileAsync(mesh,currentCamera,scene));}
  }
  await work(()=>root.add(group));return group;
  }catch(error){release(group);throw error;}
 },release);
 function reset(){stream.reset();root.clear();world=null;currentTile=null;}
 const frustum=new T.Frustum(),projection=new T.Matrix4();
 function update(s,camera){currentCamera=camera;if(world!==s.world){reset();world=s.world;}
  const tile=world.tileAt(s.player.x,s.player.z)||world.tiles[0];if(world.dungeonVoid){root.visible=false;stream.update([]);currentTile=tile;/* Dungeon geometry is built synchronously by dungeonView; no biome tiles are requested. */s.streaming={ready:new Set(world.tiles.map(t=>t.id)),errors:[]};return;}root.visible=true;
  const ids=world.flat?world.tiles.filter(t=>Math.abs(t.cx-tile.cx)<=1&&Math.abs(t.cz-tile.cz)<=1).map(t=>t.id):[-2,-1,0,1,2].map(n=>world.tiles[(tile.index+n+16)%16].id);ids.sort((a,b)=>{const x=world.tiles.find(t=>t.id===a),y=world.tiles.find(t=>t.id===b),score=t=>t===tile?-1e6:Math.hypot(t.x-s.player.x,t.z-s.player.z)-((t.x-tile.x)*(s.motion?.x||0)+(t.z-tile.z)*(s.motion?.z||0))*.25;return score(x)-score(y);});currentTile=tile;stream.update(ids);s.streaming={ready:stream.ready,errors:[...stream.entries].filter(([,e])=>e.status==='error').map(([id])=>id)};
  currentTile=tile;
  if(camera){frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));root.traverse(mesh=>{const instances=mesh.userData.forestInstances;if(!instances)return;let count=0,changed=false;const previous=mesh.userData.visibleInstanceIds??=[];for(let i=0;i<instances.length;i++){const entry=instances[i];if(!frustum.intersectsSphere(entry.sphere))continue;if(previous[count]!==i){mesh.setMatrixAt(count,entry.matrix);previous[count]=i;changed=true;}count++;}changed||=mesh.count!==count;previous.length=count;mesh.count=count;mesh.visible=count>0;if(changed&&count){mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.addUpdateRange(0,count*16);mesh.instanceMatrix.needsUpdate=true;}});}
 }
 return{update,reset,retry:()=>stream.retry(),info:()=>({environmentShadowMode:'static-depth',staticShadowCells:root.children.filter(g=>g.userData.scrapLight).length,environmentId:environmentId(currentTile),environmentRelief:environmentProfile(currentTile)?.relief,visualModuleId:currentTile?.visualModuleId,environmentFamilies:new Set(world?.tiles.map(environmentId)||[]).size,environmentMaterialAtlas:!!textures?.at(-4),residentTiles:stream.ready.size,loadingTiles:[...stream.entries.values()].filter(e=>['queued','loading'].includes(e.status)).length,assetErrors:[...stream.entries.values()].filter(e=>e.status==='error').length,forestBakedLightmaps:forestLightmaps.size}),dispose(){reset();epoch++;sharedTextures.forEach(t=>t.dispose());sharedTextures.clear();groundAtlases.length=decorAtlases.length=0;forestLightmaps.forEach(p=>p.then(t=>t.dispose()).catch(()=>{}));forestLightmaps.clear();textures=null;pending=null;scene.remove(root);}};
}
