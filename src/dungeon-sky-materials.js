import * as T from 'three';

const NOISE=`
 float skyHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
 float skyNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(skyHash(i),skyHash(i+vec2(1,0)),f.x),mix(skyHash(i+vec2(0,1)),skyHash(i+vec2(1,1)),f.x),f.y);}
 float skyFbm(vec2 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*skyNoise(p);p=mat2(.8,.6,-.6,.8)*p*2.03+vec2(17.2,4.1);a*=.5;}return n;}
`;

/** Weathered steel deck plates, inset seams, ventilation slots and fasteners. */
export function skyDeckMaterial(){
 const material=new T.MeshStandardMaterial({color:'#7e8b8d',roughness:.72,metalness:.48,side:T.DoubleSide});
 material.name='lair-technical-deck';
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 deckPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\ndeckPosition=(modelMatrix*vec4(position,1.)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 deckPosition;${NOISE}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec2 p=deckPosition.xz,period=vec2(2.4,3.2),cell=floor(p/period),q=mod(p,period),edge=min(q,period-q);
   float seamDistance=min(edge.x,edge.y),aa=max(.012,fwidth(seamDistance));
   float plate=smoothstep(.022-aa,.022+aa,seamDistance),bevel=smoothstep(.04,.11,seamDistance);
   float grain=skyNoise(p*35.),wear=skyNoise(p*1.3),variation=skyHash(cell);
   vec3 steel=vec3(.20,.245,.26)*(.78+variation*.32+grain*.12);
   steel=mix(steel,vec3(.14,.115,.085),smoothstep(.65,.85,wear)*.24);
   steel+=vec3(.055)*(1.-bevel);
   vec2 boltPoint=edge-vec2(.15);float bolt=1.-smoothstep(.035,.055,length(boltPoint));
   steel=mix(steel,vec3(.38,.40,.39),bolt);
   float ventPanel=step(.72,variation)*step(.38,edge.x)*step(.6,edge.y);
   float vent=(1.-smoothstep(.03,.055,abs(mod(q.y,.22)-.11)))*ventPanel;
   steel=mix(steel,vec3(.055,.075,.08),vent*.75);
   diffuseColor.rgb=mix(vec3(.027,.039,.045),steel,plate);
  `);
 };
 material.customProgramCacheKey=()=> 'lair-steel-deck-v1';return material;
}

/** A continuous cloud sea below the platform, shaded in world space with slow drift. */
export function createLairClouds(){
 const uniforms={cloudTime:{value:0}};
 const material=new T.ShaderMaterial({uniforms,depthWrite:true,toneMapped:false,
  vertexShader:`varying vec2 cloudPoint;void main(){vec4 world=modelMatrix*vec4(position,1.);cloudPoint=world.xz;gl_Position=projectionMatrix*viewMatrix*world;}`,
  fragmentShader:`varying vec2 cloudPoint;uniform float cloudTime;${NOISE}
   float cloudHeight(vec2 p){vec2 warp=vec2(skyFbm(p*.65),skyFbm(p*.65+14.7));return skyFbm(p+warp*1.4);}
   void main(){
    vec2 p=cloudPoint*.047+vec2(cloudTime*.006,cloudTime*.002);
    float body=cloudHeight(p),lit=cloudHeight(p+vec2(-.08,.07));
    float billow=smoothstep(.29,.69,body),light=clamp(.65+(body-lit)*7.,.23,1.);
    vec3 deep=vec3(.40,.51,.60),white=vec3(.94,.955,.945);
    vec3 clouds=mix(deep,white,billow)*(.76+light*.24);
    float haze=skyFbm(p*.24+40.);clouds=mix(clouds,vec3(.76,.82,.86),haze*.14);
    gl_FragColor=vec4(clouds,1.);
   }`
 });
 const mesh=new T.Mesh(new T.PlaneGeometry(640,640),material);mesh.name='lair-cloud-sea';mesh.rotation.x=-Math.PI/2;mesh.position.y=-8;
 return{mesh,update:time=>{uniforms.cloudTime.value=time;}};
}
