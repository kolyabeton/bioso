import outlines from './obstacle-footprints.json' with {type:'json'};
// Local bounds of the authored GLBs, normalized exactly as fittedModel(size).
// Keep these in sync with public/assets/kit using scripts/architecture-bounds.mjs.
export const ARCHITECTURE_BOUNDS=Object.freeze({
 'arch-planter':[1,.5175780057907104,1],
 'arch-solar-panel':[1,.8671880066394806,.96875],
 'arch-pillar':[.5175780057907104,1,.3242179900407791],
 'arch-wall-corner':[1,.9316409826278687,.96875],
 'arch-wall-straight':[1,.7128909826278687,1],
 'arch-cistern':[.9648439884185791,.9667969942092896,1],
 'arch-turbine':[.8730469942092896,.9492180049419403,1],
});
export function architectureFootprint(item){
 const d=ARCHITECTURE_BOUNDS[item.model];
 return d?{halfX:d[0]*item.size/2,halfZ:d[2]*item.size/2,height:d[1]*item.size}:null;
}
const profiles=Object.fromEntries(Object.entries(outlines).map(([key,p])=>[key,{...p,radius:Math.max(...p.hull.map(([x,z])=>Math.hypot(x,z)))}]));
export const obstacleProfile=item=>profiles[item.feature==='rock'?'rock':item.feature==='thicket'?'veg-shrub':item.model];
export const obstacleScale=item=>item.feature==='rock'?item.radius:item.size;
export function obstacleHeight(item){
 const p=obstacleProfile(item);return p?p.height*(item.feature==='thicket'?item.height:obstacleScale(item)):item.height;
}
// Circle against the convex outline of the visible geometry, including rounded corners.
export function obstacleContains(item,x,z,r=0){
 const profile=obstacleProfile(item);
 if(!profile)return Math.hypot(x-item.x,z-item.z)<item.radius+r;
 const scale=obstacleScale(item),dx=x-item.x,dz=z-item.z;
 if(dx*dx+dz*dz>(profile.radius*scale+r)**2)return false;
 const c=Math.cos(item.rotation||0),s=Math.sin(item.rotation||0),px=(c*dx-s*dz)/scale,pz=(s*dx+c*dz)/scale,rr=(r/scale)**2;
 let inside=true,near=false;
 const points=profile.hull;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],ex=b[0]-a[0],ez=b[1]-a[1],vx=px-a[0],vz=pz-a[1];
  if(ex*vz-ez*vx< -1e-10)inside=false;
  if(r>0){const t=Math.max(0,Math.min(1,(vx*ex+vz*ez)/(ex*ex+ez*ez))),qx=vx-ex*t,qz=vz-ez*t;if(qx*qx+qz*qz<rr-1e-10)near=true;}
 }
 return inside||near;
}
