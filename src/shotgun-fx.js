import * as T from 'three';

// Presentation-only pools. A discharge is one flash, not five glowing projectiles.
export function createShotgunParticles(capacity=96){
 const particles=Array.from({length:capacity},()=>({life:0}));let cursor=0,serial=0,quality='medium',reduced=false;
 const emit=p=>Object.assign(particles[cursor++%capacity],p);
 function event(e){
  if(reduced||e.key!=='shotgun'||!['attack','hit'].includes(e.type)||![e.x,e.z].every(Number.isFinite))return;
  const hit=e.type==='hit',aim=Math.atan2(e.dx??((e.tx??e.x)-(e.originX??e.x)),e.dz??((e.tz??e.z+1)-(e.originZ??e.z))),count=quality==='low'?3:6,id=serial++;
  const base={x:e.x,y:e.y??1,z:e.z,seed:id*.73,age:0,vx:0,vy:0,vz:0};
  if(!hit){
   emit({...base,kind:'flash',life:.075,duration:.075,size:.72});
   for(let i=0;i<3;i++){const d=.16+i*.21;emit({...base,kind:'flash',x:e.x+Math.sin(aim)*d,z:e.z+Math.cos(aim)*d,life:.055-i*.008,duration:.055-i*.008,size:.44-i*.09,seed:id+i});}
  }
  for(let i=0;i<count;i++){
   const lane=i/Math.max(1,count-1)-.5,angle=aim+lane*(hit?1.8:.7),speed=hit?1+i*.3:3.5+i*.35;
   emit({...base,kind:'smoke',life:hit?.28:.38+i*.035,duration:hit?.28:.38+i*.035,size:hit?.16:.19+i*.015,vx:Math.sin(angle)*speed*.24,vz:Math.cos(angle)*speed*.24,vy:.25+i*.055,seed:id+i*.67});
   if(i%2===0)emit({...base,kind:'spark',life:hit?.09:.065+i*.012,duration:hit?.09:.065+i*.012,size:.015,angle,vx:Math.sin(angle)*speed,vz:Math.cos(angle)*speed,vy:(i-2)*.17,seed:id+i});
  }
 }
 return{particles,event,step(dt){for(const p of particles)if(p.life>0){p.life=Math.max(0,p.life-dt);p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;}},configure(q=quality,r=reduced){quality=q;reduced=r;if(reduced)this.reset();},reset(){cursor=0;for(const p of particles)p.life=0;},count:()=>particles.filter(p=>p.life>0).length};
}

const vertexShader=`attribute float opacity; attribute float seed;
 varying vec2 vUv; varying float vOpacity; varying float vSeed;
 void main(){vUv=uv;vOpacity=opacity;vSeed=seed;
  vec4 center=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
  center.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));
  gl_Position=projectionMatrix*center;
 }`;
const noiseShader=`float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}`;

export function createShotgunFxView(scene){
 const model=createShotgunParticles(),dummy=new T.Object3D(),pools={};
 for(const kind of ['flash','smoke']){
  const geometry=new T.PlaneGeometry(2,2),opacity=new T.InstancedBufferAttribute(new Float32Array(96),1),seed=new T.InstancedBufferAttribute(new Float32Array(96),1);
  geometry.setAttribute('opacity',opacity);geometry.setAttribute('seed',seed);
  const smoke=kind==='smoke',material=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,blending:smoke?T.NormalBlending:T.AdditiveBlending,vertexShader,fragmentShader:`varying vec2 vUv;varying float vOpacity;varying float vSeed;${noiseShader}
   void main(){vec2 p=(vUv-.5)*2.;float r=length(p);float n=noise(p*6.+vSeed);
    ${smoke?'float alpha=(1.-smoothstep(.22,1.,r))*(.45+.55*n)*vOpacity;vec3 color=mix(vec3(.29,.28,.25),vec3(.57,.55,.49),n);':'float rays=pow(abs(sin(atan(p.y,p.x)*3.+vSeed)),9.)*.28;float alpha=(1.-smoothstep(.02,.72+rays,r))*vOpacity;vec3 color=mix(vec3(1.,.39,.075),vec3(1.,.94,.73),1.-smoothstep(.06,.46,r));'}
    gl_FragColor=vec4(color,alpha);if(alpha<.003)discard;
   }`});
  const mesh=new T.InstancedMesh(geometry,material,96);mesh.name='shotgun-'+kind;mesh.frustumCulled=false;mesh.count=0;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(mesh);pools[kind]={mesh,opacity,seed};
 }
 const geometry=new T.SphereGeometry(1,6,4),material=new T.MeshBasicMaterial({color:0xffd09a,transparent:true,opacity:.6,depthWrite:false,toneMapped:false}),sparks=new T.InstancedMesh(geometry,material,96);sparks.name='shotgun-sparks';sparks.frustumCulled=false;sparks.count=0;scene.add(sparks);
 function reset(){model.reset();for(const p of Object.values(pools))p.mesh.count=0;sparks.count=0;}
 return{event:model.event,reset,configure(q,r){model.configure(q,r);if(r)reset();},count:model.count,update(dt){
  model.step(dt);for(const p of Object.values(pools))p.mesh.count=0;sparks.count=0;
  for(const p of model.particles)if(p.life>0){
   const fade=p.life/p.duration;dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);
   if(p.kind==='spark'){dummy.rotation.y=p.angle;dummy.scale.set(p.size,p.size,.12*fade);dummy.updateMatrix();sparks.setMatrixAt(sparks.count++,dummy.matrix);continue;}
   const pool=pools[p.kind],i=pool.mesh.count++,smoke=p.kind==='smoke',size=p.size*(smoke?1+p.age*3:1);dummy.scale.setScalar(size);dummy.updateMatrix();pool.mesh.setMatrixAt(i,dummy.matrix);pool.opacity.setX(i,smoke?Math.min(1,p.age/.025)*fade*.28:fade);pool.seed.setX(i,p.seed);
  }
  for(const p of Object.values(pools)){p.mesh.instanceMatrix.needsUpdate=true;p.opacity.needsUpdate=p.seed.needsUpdate=true;}sparks.instanceMatrix.needsUpdate=true;
 },dispose(){for(const mesh of [...Object.values(pools).map(p=>p.mesh),sparks]){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh.dispose();}}};
}
