import * as T from 'three';
/** Reusable local-space affordance. Owns its FX/material copies, never game state or model geometry. */
export function createInteractionHighlight(parent,{radius=2.4,height=3,color=0xf1c66e,particleCount=24,marker=true}={}){
 const root=new T.Group();root.name='interaction-highlight';root.visible=false;parent.add(root);
 const tint=new T.Color(color),emission=new T.Color(),owned=[];let bindings=[],disposed=false;
 const uniforms={tint:{value:tint},strength:{value:0}};
 const haloMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float strength;void main(){float d=length(vUv-.5)*2.;float glow=pow(max(0.,1.-d),2.)*.32;float rim=exp(-pow((d-.70)*22.,2.))*.24;gl_FragColor=vec4(tint,(glow+rim)*strength);}'
 });
 const haloGeometry=new T.PlaneGeometry(radius*2.8,radius*2.8),halo=new T.Mesh(haloGeometry,haloMaterial);halo.rotation.x=-Math.PI/2;halo.position.y=.065;root.add(halo);
 const count=Math.max(0,Math.min(48,Math.floor(particleCount))),positions=new Float32Array(count*3),sizes=new Float32Array(count),alphas=new Float32Array(count);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('sparkSize',new T.BufferAttribute(sizes,1));geometry.setAttribute('sparkAlpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));
 for(let i=0;i<count;i++)sizes[i]=4+(i%4)*1.3;
 const particleMaterial=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'attribute float sparkSize;attribute float sparkAlpha;varying float alpha;void main(){alpha=sparkAlpha;gl_PointSize=sparkSize;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 tint;uniform float strength;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float soft=pow(1.-d,1.5);gl_FragColor=vec4(mix(tint,vec3(1.),.25),soft*alpha*strength);}'
 });
 const particles=new T.Points(geometry,particleMaterial);particles.frustumCulled=false;root.add(particles);
 const markerGeometry=new T.ConeGeometry(.72,1.2,3),markerMaterial=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,roughness:.35,metalness:.25,transparent:true});
 markerGeometry.rotateX(Math.PI);
 const pointer=new T.Mesh(markerGeometry,markerMaterial);pointer.name='interaction-pointer';pointer.position.y=height+1;pointer.visible=marker;root.add(pointer);
 function restore(){for(const b of bindings)b.mesh.material=b.original;for(const m of owned)m.dispose();owned.length=0;bindings=[];}
 function setModel(model){if(disposed)return;restore();model.traverse(mesh=>{if(!mesh.isMesh)return;const original=mesh.material;
  const copy=m=>{const c=m.clone();c.onBeforeCompile=m.onBeforeCompile;c.customProgramCacheKey=m.customProgramCacheKey;owned.push(c);if(c.emissive)c.userData.highlightBase=c.emissive.clone();return c;};
  mesh.material=Array.isArray(original)?original.map(copy):copy(original);bindings.push({mesh,original});
 });}
 function update({visible=true,time=0,intensity=1,reducedMotion=false}={}){
  if(disposed)return;root.visible=visible&&intensity>0;const amount=root.visible?Math.max(0,Math.min(1.5,intensity)):0;
  uniforms.strength.value=amount*(reducedMotion?1:.92+Math.sin(time*.9)*.08);
  particles.visible=root.visible&&!reducedMotion;
  pointer.visible=marker;pointer.rotation.y=reducedMotion?0:time*.9;
  pointer.position.y=height+1+(reducedMotion?0:Math.sin(time*1.4)*.12);
  markerMaterial.opacity=Math.min(1,amount);
  for(const material of owned)if(material.emissive){material.emissive.copy(material.userData.highlightBase);if(amount)material.emissive.add(emission.copy(tint).multiplyScalar(.18*amount));}
  if(!particles.visible)return;
  for(let i=0;i<count;i++){
   const phase=(time*.12+i*.61803398875)%1,angle=i*2.39996+time*.12;
   const r=radius*(.55+(i%5)*.09);
   positions[i*3]=Math.cos(angle)*r;positions[i*3+1]=.15+phase*height;positions[i*3+2]=Math.sin(angle)*r;
   alphas[i]=Math.sin(phase*Math.PI)*(.6+(i%3)*.18);
  }
  geometry.attributes.position.needsUpdate=true;geometry.attributes.sparkAlpha.needsUpdate=true;
 }
 function dispose(){if(disposed)return;disposed=true;restore();root.removeFromParent();haloGeometry.dispose();haloMaterial.dispose();geometry.dispose();particleMaterial.dispose();markerGeometry.dispose();markerMaterial.dispose();}
 return {root,update,setModel,dispose};
}
