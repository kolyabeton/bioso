import * as T from 'three';

/** Static ground visibility, generated once when a cell's meshes load. No
 * per-frame shadow map, added light or downloaded texture. */
export function bakeScrapyardLight(renderer,group,tile){
 const target=new T.WebGLRenderTarget(1024,1024,{depthBuffer:false,stencilBuffer:false,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
 target.texture.colorSpace=T.NoColorSpace;
 const scene=new T.Scene(),camera=new T.OrthographicCamera(-40,40,40,-40,.1,200);
 camera.position.set(tile.x,100,tile.z);camera.up.set(0,0,-1);camera.lookAt(tile.x,0,tile.z);camera.updateMatrixWorld();
 const material=new T.ShaderMaterial({side:T.DoubleSide,depthTest:false,depthWrite:false,
  vertexShader:`void main(){vec4 p=modelMatrix*instanceMatrix*vec4(position,1.0);float h=max(0.0,p.y-instanceMatrix[3].y);p.xz+=vec2(.865,.673)*h;p.y=0.0;gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader:'void main(){gl_FragColor=vec4(0.0,0.0,0.0,1.0);}'});
 const maskedMaterials=[];group.updateMatrixWorld(true);
 group.traverse(o=>{if(!o.isInstancedMesh||o.name.includes('shadow')||o.name.includes('edge-'))return;
  let shadowMaterial=material;
  if(o.name==='scrap-reclaimed-shrubs'&&o.material.map){
   shadowMaterial=material.clone();shadowMaterial.uniforms={leafMap:{value:o.material.map}};
   shadowMaterial.vertexShader='varying vec2 leafUV;'+material.vertexShader.replace('void main(){','void main(){leafUV=uv;');
   shadowMaterial.fragmentShader='uniform sampler2D leafMap;varying vec2 leafUV;void main(){vec3 leaf=texture2D(leafMap,leafUV).rgb;if(max(leaf.r,max(leaf.g,leaf.b))<.045)discard;gl_FragColor=vec4(0.0,0.0,0.0,1.0);}';
   maskedMaterials.push(shadowMaterial);
  }
  const mesh=new T.InstancedMesh(o.geometry,shadowMaterial,o.count);mesh.instanceMatrix=o.instanceMatrix.clone();mesh.matrix.copy(o.matrixWorld);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;scene.add(mesh);
 });
 const previous=renderer.getRenderTarget(),color=renderer.getClearColor(new T.Color()),alpha=renderer.getClearAlpha(),auto=renderer.autoClear;
 try{renderer.setRenderTarget(target);renderer.setClearColor(0xffffff,1);renderer.autoClear=true;renderer.render(scene,camera);}
 catch(error){target.dispose();throw error;}
 finally{renderer.setRenderTarget(previous);renderer.setClearColor(color,alpha);renderer.autoClear=auto;scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});material.dispose();maskedMaterials.forEach(m=>m.dispose());}
 return target;
}
