// Four overlapping windows are continuous on BOTH axes. Explicit gradients
// prevent fract() boundaries from selecting the coarsest mip for a single pixel.
export const SEAMLESS_GROUND_GLSL=`
 vec3 envSeamless(sampler2D tex,vec2 p,vec2 origin,vec2 span){
  vec2 f=fract(p),q=fract(p+.5),w=smoothstep(vec2(0),vec2(.18),min(f,1.0-f));
  vec2 dx=dFdx(p)*span,dy=dFdy(p)*span;
  vec3 a=vec3(0),b=vec3(0),c=vec3(0),d=vec3(0);
  if(w.x<1.0&&w.y<1.0)a=textureGrad(tex,origin+q*span,dx,dy).rgb;
  if(w.x>0.0&&w.y<1.0)b=textureGrad(tex,origin+vec2(f.x,q.y)*span,dx,dy).rgb;
  if(w.x<1.0&&w.y>0.0)c=textureGrad(tex,origin+vec2(q.x,f.y)*span,dx,dy).rgb;
  if(w.x>0.0&&w.y>0.0)d=textureGrad(tex,origin+f*span,dx,dy).rgb;
  return mix(mix(a,b,w.x),mix(c,d,w.x),w.y);
 }
`;
