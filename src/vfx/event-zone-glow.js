import * as T from 'three';

/** Reusable emissive boundary used by every event arena. */
export function createEventZoneGlow({radius=6,color=0xba9770,segments=192}={}){
 const outerRadius=radius+.48;
 const material=new T.ShaderMaterial({
  uniforms:{tint:{value:new T.Color(color)},strength:{value:.65},outerRadius:{value:outerRadius},radius:{value:radius-.04}},
  transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;uniform vec3 tint;uniform float strength;uniform float outerRadius;uniform float radius;void main(){float d=abs(length(vUv-.5)*2.*outerRadius-radius);float glow=exp(-pow(d/.19,2.));gl_FragColor=vec4(tint,glow*strength);}'
 });
 const geometry=new T.RingGeometry(Math.max(0,radius-.56),outerRadius,segments,4).rotateX(-Math.PI/2);
 const mesh=new T.Mesh(geometry,material);mesh.name='event-zone-glow';mesh.position.y=.045;mesh.castShadow=false;
 function ground(node,world){const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const h=world?.heightAt?.(node.x+positions.getX(i),node.z+positions.getZ(i));positions.setY(i,Number.isFinite(h)?h-(node.y||0):0);}positions.needsUpdate=true;geometry.computeBoundingSphere();}
 function setColor(colorValue,strength=.65){material.uniforms.tint.value.set(colorValue);material.uniforms.strength.value=strength;}
 function dispose(){geometry.dispose();material.dispose();}
 return {mesh,ground,setColor,dispose};
}
