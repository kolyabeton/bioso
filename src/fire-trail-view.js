import * as T from 'three';

const CAPACITY=120;
const vertexShader=`
 attribute float life;
 attribute float across;
 varying vec2 vWorld;
 varying float vLife;
 varying float vAcross;
 void main(){
  vWorld=position.xz;vLife=life;vAcross=across;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
 }`;
const fragmentShader=`
 precision highp float;
 varying vec2 vWorld;
 varying float vLife;
 varying float vAcross;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
 void main(){
  vec2 p=vWorld;float life=clamp(vLife,0.,1.);
  float warp=noise(p*3.2),grain=noise(p*12.1),stone=noise(p*5.8);
  float edge=.75+.38*(noise(p*6.4)-.5)+.22*(noise(p*19.)-.5);
  float mask=1.-smoothstep(edge-.09,edge+.05,abs(vAcross));
  if(mask<.008)discard;
  vec2 river=p*4.3+vec2(warp*.58,noise(p*2.7)*.35);
  float fissure=1.-smoothstep(.022,.14,abs(noise(river)-.49));
  float hairline=1.-smoothstep(.01,.055,abs(noise(p*9.1)-.51));
  float hot=clamp(fissure*.95+hairline*.28,0.,1.)*(.25+.75*pow(life,1.35));
  hot*=1.-.25*smoothstep(.54,.88,abs(vAcross));
  vec3 basalt=mix(vec3(.045,.038,.036),vec3(.12,.073,.052),stone*.76+grain*.12);
  vec3 lava=mix(vec3(.48,.065,.018),vec3(1.,.38,.055),hot);
  vec3 color=mix(basalt,lava,pow(hot,.6)*.96);
  float alpha=mask*(.85+.12*grain)*(.35+.65*sqrt(life));
  gl_FragColor=vec4(color,alpha);
 }`;

/** The running path vitrifies into cracked molten ground and cools to basalt. */
export function createFireTrailView(scene){
 const geometry=new T.BufferGeometry(),positions=new Float32Array(CAPACITY*9*3),ages=new Float32Array(CAPACITY*9),sides=new Float32Array(CAPACITY*9);
 const positionAttribute=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage),lifeAttribute=new T.BufferAttribute(ages,1).setUsage(T.DynamicDrawUsage),sideAttribute=new T.BufferAttribute(sides,1).setUsage(T.DynamicDrawUsage);
 geometry.setAttribute('position',positionAttribute);geometry.setAttribute('life',lifeAttribute);geometry.setAttribute('across',sideAttribute);geometry.setDrawRange(0,0);
 const material=new T.ShaderMaterial({vertexShader,fragmentShader,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,toneMapped:false,blending:T.NormalBlending});
 const ground=new T.Mesh(geometry,material);ground.name='runner-fire-trail';ground.renderOrder=4;ground.frustumCulled=false;scene.add(ground);
 const flameGeometry=new T.ConeGeometry(.12,.38,6,1),flameMaterial=new T.MeshBasicMaterial({name:'runner-fire-flames',color:0xe76c21,transparent:true,opacity:.58,depthWrite:false,blending:T.NormalBlending,toneMapped:false});
 const flames=new T.InstancedMesh(flameGeometry,flameMaterial,CAPACITY);flames.name='runner-fire-flames';flames.frustumCulled=false;flames.instanceMatrix.setUsage(T.DynamicDrawUsage);flames.count=0;scene.add(flames);
 const dummy=new T.Object3D(),color=new T.Color();let clock=0,patchCount=0;
 const width=(p,side)=>Math.max(.49,Math.min(1.52,.95+.38*Math.sin((p.id||0)*1.73+side*1.9)+.21*Math.sin((p.id||0)*.57+side*3.1)));
 function update(trails,dt=0,reducedMotion=false){
  if(!reducedMotion)clock+=Math.max(0,dt);
  const visible=(trails||[]).slice(-CAPACITY);patchCount=visible.length;flames.count=0;
  let vertex=0;
  const emit=(x,y,z,age,side)=>{const j=vertex++;positions[j*3]=x;positions[j*3+1]=y;positions[j*3+2]=z;ages[j]=age;sides[j]=side;};
  for(let i=1;i<visible.length;i++){
   const a=visible[i-1],b=visible[i],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);
   if(d<.01||d>1.3||Math.abs((b.y??0)-(a.y??0))>.7)continue;
   const nx=-dz/d,nz=dx/d,ay=(a.y??0)+.032,by=(b.y??0)+.032,al=Math.max(0,Math.min(1,a.life/(a.duration||3))),bl=Math.max(0,Math.min(1,b.life/(b.duration||3))),aw=width(a,1),bw=width(b,1),cw=width(a,-1),dw=width(b,-1);
   emit(a.x+nx*aw,ay,a.z+nz*aw,al,1);emit(a.x-nx*cw,ay,a.z-nz*cw,al,-1);emit(b.x+nx*bw,by,b.z+nz*bw,bl,1);
   emit(b.x+nx*bw,by,b.z+nz*bw,bl,1);emit(a.x-nx*cw,ay,a.z-nz*cw,al,-1);emit(b.x-nx*dw,by,b.z-nz*dw,bl,-1);
   if(i%4===0){
    const side=i%8===0?1:-1,r=(side>0?aw+bw:cw+dw)*.5,mx=(a.x+b.x)*.5+nx*side*r*.5,mz=(a.z+b.z)*.5+nz*side*r*.5,y=(ay+by)*.5,age=Math.min(al,bl)*.8;
    emit(mx-dx/d*.17,y,mz-dz/d*.17,age,side*.5);emit(mx+dx/d*.17,y,mz+dz/d*.17,age,side*.5);
    emit(mx+nx*side*(.37+.18*Math.sin(i*2.3)),y,mz+nz*side*(.37+.18*Math.sin(i*2.3)),age,side*.67);
   }
  }
  geometry.setDrawRange(0,vertex);positionAttribute.needsUpdate=lifeAttribute.needsUpdate=sideAttribute.needsUpdate=true;
  visible.forEach((p,i)=>{
   const life=Math.max(0,Math.min(1,p.life/(p.duration||3)));if(life<.76||i%3!==0)return;
   const seed=(Number(p.id)||i+1)*.731,size=(reducedMotion?.55:.48+.08*Math.sin(clock*5+seed))*life;
   dummy.position.set(p.x+Math.sin(seed*7)*.17,(p.y??0)+.09+.08*size,p.z+Math.cos(seed*9)*.17);
   dummy.rotation.set(0,seed*3,0);dummy.scale.set(size,size,size);dummy.updateMatrix();
   flames.setMatrixAt(flames.count,dummy.matrix);
   flames.setColorAt(flames.count,color.set(0xff802e).multiplyScalar(.5+.5*life));flames.count++;
  });
  flames.instanceMatrix.needsUpdate=true;if(flames.instanceColor)flames.instanceColor.needsUpdate=true;
 }
 return{update,info:()=>({fireTrailPatches:patchCount,fireTrailFlames:flames.count}),reset(){patchCount=flames.count=0;geometry.setDrawRange(0,0);clock=0;},dispose(){ground.removeFromParent();flames.removeFromParent();geometry.dispose();material.dispose();flames.dispose();flameGeometry.dispose();flameMaterial.dispose();}};
}
