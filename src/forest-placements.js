// One placement source for the live renderer and offline light baking.
export function forestPlacements(tile,world){
 const banks=tile.decorations.filter(d=>d.forestRole&&d.feature!=='rock'),placements=new Map();
 const add=(id,d,scale=1,rotation=0,offset=[0,0,0])=>{
  if(!placements.has(id))placements.set(id,[]);
  placements.get(id).push({d,scale,rotation,offset});
 };
 if(world){
  const edges=[],b=world.bounds;
  if(tile.x-32===b.minX)edges.push([-1,0]);if(tile.x+32===b.maxX)edges.push([1,0]);
  if(tile.z-32===b.minZ)edges.push([0,-1]);if(tile.z+32===b.maxZ)edges.push([0,1]);
  for(const [dx,dz] of edges){
   const anchor=(along,depth)=>({x:tile.x+(dx?dx*(32+depth):along),z:tile.z+(dz?dz*(32+depth):along),forestEdge:true});
   // An uneven forest margin, not a hedge: low near edge, broken tall silhouettes
   // farther back. Every anchor remains outside the existing playable boundary.
   const flip=(tile.index%2?1:-1)*(dx||dz);
   for(const [i,p] of [[-27,3.4,.72],[-13,9,1.1],[3,4.8,.83],[14,14,1.21],[28,6,.64]].entries()){
    const [a,depth,size]=p,d=anchor(a*flip,depth+(tile.index%3)*.7);
    add(i%2?'forest-tree-0-v3':'forest-tree-broad-v4',d,[size*(i%2?.86:1.08),size,size],a*.63+tile.index);
   }
   for(const [a,depth,size] of [[-21,18,.93],[0,22,1.17],[23,17,.78]])add('forest-tree-0-v3',anchor(a*flip,depth),size,a*.91);
   // Broad undergrowth islands bridge the near/far layers without another row.
   for(const [a,depth] of [[-25,12],[-10,17],[8,13],[25,19]]){
    add('forest-shrub-v3',anchor(a*flip,depth),1.65,a*.48);
    add('forest-shrub-v3',anchor((a+2.6)*flip,depth+1.4),1.12,a*.92);
   }
   for(const [i,a] of [-29,-21,-8,2,13,26].entries()){
    const d=anchor(a*flip,1.4+(i%3)*1.8);
    add('forest-boulder-v3',d,[1.5+(i%2)*.8,.55+(i%3)*.22,1.1],a*.73);
    add('forest-shrub-v3',anchor((a+2.3)*flip,3+(i%3)*2.3),.62+(i%3)*.21,a*.4);
    if(i%2)add('forest-shrub-v3',anchor((a-2)*flip,6.5+(i%3)),.82,a*.9);
    add('forest-fern-v3',anchor((a-1.7)*flip,1.1+(i%2)*2.2),.85+(i%3)*.14,a*.6);
   }
  }
 }
 for(const [i,d] of banks.entries()){
  if(d.forestRole==='arch')add('forest-ruin-arch-v2',d,1.35,-.15);
  else if(d.forestRole==='relic')add('forest-relic-v3',d,1.35,.23);
  else if(d.forestRole==='canopy'){
   add('forest-tree-0-v3',d,1.15+(i%3)*.15,i*2.4);
   add('forest-tree-broad-v4',d,.68+(i%2)*.15,i*1.7,[i%2?2.5:-2.4,0,1.8]);
  }else{
   add('forest-root-bank-v2',d,1.25+(i%3)*.13,i*1.7);
   if(i%2)add('forest-tree-0-v3',d,.78,i*2.4,[1.5,0,-1]);
  }
  for(let j=0;j<(d.forestRole==='arch'?3:5);j++){
   const a=j*2.4+i*.7,r=d.radius*(j===0?.1:.7);
   const offset=d.forestRole==='arch'?[(j%2?1:-1)*4.1,0,(j-1)*1.3]:[Math.cos(a)*r,0,Math.sin(a)*r*.65];
   add('forest-shrub-v3',d,.95+(j%3)*.24,a,offset);
  }
  for(let j=0;j<4;j++){const a=j*2.4+i*.7;add('forest-fern-v3',d,.9+(j%3)*.3,a,[Math.cos(a)*d.radius*.75,0,Math.sin(a)*d.radius*.6]);}
 }
 for(const d of tile.decorations.filter(d=>d.forestRole==='boulder')){
  add('forest-boulder-v3',d,[d.radius,d.height*.9,d.radius],d.rotation);
  for(let j=0;j<3;j++){const a=j*2.4+d.rotation;add('forest-fern-v3',d,.7+(j%2)*.25,a,[Math.cos(a)*d.radius*.86,0,Math.sin(a)*d.radius*.86]);}
 }
 for(const [x,z,scale,rotation] of [[.45,-3.2,1.65,.25],[-1.2,13.8,1.4,1.4],[2,-25,1.3,-.8]])add('forest-bedrock-v2',{x:tile.x+x,z:tile.z+z},scale,rotation);
 // Embedded, ankle-low fragments break the flat surface without false obstacles.
 for(let i=0;i<130;i++){
  const x=Math.sin(i*127.1+tile.index)*43758.5453,z=Math.sin(i*311.7+tile.index)*22578.1459;
  const px=(x-Math.floor(x)-.5)*58,pz=(z-Math.floor(z)-.5)*58;
  const size=.13+(i%5)*.047;
  add('forest-boulder-v3',{x:tile.x+px,z:tile.z+pz},[size,.045+(i%3)*.017,size*.8],i*2.4,[0,-.025,0]);
 }
 return placements;
}
