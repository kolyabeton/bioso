import * as T from 'three';

/** One terrain-conforming contact patch, shared by every biome and mission. */
export function createHeroContactShadow(scene){
 const geometry=new T.PlaneGeometry(1,1,4,4).rotateX(-Math.PI/2);
 const material=new T.ShaderMaterial({transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  uniforms:{contactOpacity:{value:1}},
  vertexShader:'varying vec2 contactUV;void main(){contactUV=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:`uniform float contactOpacity;varying vec2 contactUV;
   void main(){float r=dot(contactUV,contactUV);
    float halo=.42*pow(max(0.0,1.0-r),1.7);
    float core=.38*(1.0-smoothstep(.04,.42,r));
    gl_FragColor=vec4(.018,.025,.03,(halo+core)*contactOpacity);}`});
 const mesh=new T.Mesh(geometry,material);mesh.name='environment-hero-contact';mesh.visible=false;scene.add(mesh);
 let previous=null;
 function update(s,enabled,bodyScale=1,player=s.player){
  if(!enabled){mesh.visible=false;return;}
  const p=player,ground=s.world.heightAt(p.x,p.z);
  mesh.visible=Boolean(enabled&&ground!==null&&ground!==undefined);if(!mesh.visible)return;
  const altitude=Math.max(0,(p.y??ground)-ground),spread=1+Math.min(altitude,6)*.08;
  const x=p.x+.18*bodyScale,z=p.z+.22*bodyScale,width=2.9*bodyScale*spread,depth=2.55*bodyScale*spread;
  material.uniforms.contactOpacity.value=1/(1+altitude*.35);
  if(previous?.world===s.world&&previous.x===x&&previous.z===z&&previous.width===width&&previous.ground===ground)return;
  mesh.position.set(x,ground+.045,z);mesh.scale.set(width,1,depth);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const h=s.world.heightAt(x+positions.getX(i)*width,z+positions.getZ(i)*depth);
   positions.setY(i,(h??ground)-ground);
  }
  positions.needsUpdate=true;geometry.computeBoundingSphere();
  previous={world:s.world,x,z,width,ground};
 }
 return{update,reset(){previous=null;mesh.visible=false;},dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
