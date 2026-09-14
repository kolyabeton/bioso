const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const mound=(x,z,cx,cz,rx,rz)=>Math.exp(-(((x-cx)/rx)**2)-(((z-cz)/rz)**2));

/** Broad readable landforms, shared by mesh and physics. Cross-cell lanes and
 * safe points stay level, boundaries meet at exactly zero. No mission changes. */
export function survivalRelief(relief,x,z,index=0){
 const edge=1-smooth(22,32,Math.max(Math.abs(x),Math.abs(z)));
 const lane=smooth(6,14,Math.abs(x))*smooth(6,14,Math.abs(z));
 const phase=(index%3)*1.2;
 let h;
 if(relief==='heaps')h=3.35*Math.max(mound(x,z,16,-17,12,14),.83*mound(x,z,-17,16,13,11),.55*mound(x,z,-19,-16,10,13));
 else if(relief==='terraces')h=2.6*(.28+.72*smooth(-.75,.75,Math.sin((z+phase)*.17)));
 else if(relief==='foundations')h=2.15*(.35+.65*smooth(-.65,.65,Math.sin(x*.13)*Math.cos((z+phase)*.14)));
 else if(relief==='nests')h=3.05*Math.max(mound(x,z,15,-17,11,13),.9*mound(x,z,-16,17,13,12),.7*mound(x,z,-19,-18,12,11));
 else return 0;
 return h*lane*edge;
}
