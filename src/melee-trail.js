import * as T from 'three';

// A tapered ribbon, with soft edges and a fine bright spine; shared geometry only.
const segments=64,positions=[],uvs=[],indices=[];
for(let i=0;i<=segments;i++){
 const u=i/segments,angle=-.88+u*1.76;
 const width=.105*Math.pow(Math.sin(Math.PI*u),.8);
 for(let j=0;j<2;j++){
  const radius=.95+(j-.5)*width;
  positions.push(Math.cos(angle)*radius,Math.sin(angle)*radius,0);uvs.push(u,j);
 }
 if(i<segments){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
}
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
export function createMeleeTrail(key){
 const material=new T.ShaderMaterial({
  uniforms:{strength:{value:0}},transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,
  vertexShader:'varying vec2 trailUv; void main(){trailUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`varying vec2 trailUv; uniform float strength;
  void main(){
   float crosswise=(trailUv.y-.5)*2.0;
   float feather=exp(-crosswise*crosswise*5.0);
   float spine=exp(-crosswise*crosswise*65.0);
   float ends=pow(sin(trailUv.x*3.14159265),.65);
   float wisps=.88+.12*sin(trailUv.x*48.0+crosswise*3.0);
   float alpha=(feather*.32+spine*.62)*ends*wisps*strength;
   vec3 color=mix(vec3(.40,.66,.59),vec3(.95,.97,.85),spine);
   gl_FragColor=vec4(color,alpha);
  }`
 });
 const trail=new T.Mesh(geometry,material);trail.name='melee-sweep';trail.rotation.set(-Math.PI/2,0,-Math.PI/2);trail.scale.setScalar(key==='whip'?1.8:1.25);trail.position.set(0,.05,.4);trail.visible=false;return trail;
}
export function updateMeleeTrail(trail,strike,key,reducedMotion=false){
 if(!trail)return;
 const start=key==='whip'?.12:.18,end=key==='whip'?.8:.62;
 const t=Math.max(0,Math.min(1,((strike?.phase??0)-start)/(end-start)));
 trail.visible=!!strike?.trail;
 trail.material.uniforms.strength.value=Math.sin(Math.PI*t)*(reducedMotion?.4:1);
}
