// Stable silhouettes follow the inventory atlas, independent of set rolls.
export const CHASSIS_PROFILES={
 // Approved Astra models retain equipment keys and the shared fitting rules.
 demolition:{width:.72,height:.57,depth:.54,taper:0,power:.55,cross:.75,horizontal:true,mountWidth:.76,modelId:'body-demolition-astra5-v3'},
 regulator:{width:.52,height:.86,depth:.43,taper:0,power:.65,cross:.82,mountWidth:.56,modelId:'body-regulator-astra-polish-v3'},
 sentinel:{width:.74,height:.60,depth:.54,taper:0,power:.53,cross:.76,horizontal:true,mountWidth:.78,modelId:'body-sentinel-astra-polish-v3'},
 assembler:{width:.66,height:.57,depth:.52,taper:0,power:.65,cross:.82,horizontal:true,mountWidth:.70,modelId:'body-assembler-astra5-v3'},
 wanderer:{width:.48,height:.73,depth:.40,taper:.22,power:.85,cross:.85,lensY:-.28,lens:.19,mountWidth:.47},
 hunter:{width:.34,height:.88,depth:.27,taper:.36,power:.85,cross:.8,pitch:-1.22,horizontal:true,lensY:-.36,lens:.16,mountWidth:.38},
 bastion:{width:.60,height:.73,depth:.40,taper:.18,power:.53,cross:.76,pitch:-.22,lensY:-.27,lens:.20,mountWidth:.63},
 chimera:{width:.40,height:.88,depth:.32,taper:.42,power:1.1,cross:.85,bend:.24,pitch:-.55,lensY:-.34,lens:.17,mountWidth:.44},
 rootwalker:{width:.70,height:.57,depth:.52,taper:.05,power:.55,cross:.72,lensY:.02,lens:.20,moss:true,mountWidth:.65},
 hecaton:{width:.40,height:.76,depth:.34,taper:.23,power:.72,cross:.82,lensY:-.10,lens:.20,mountWidth:.59},
 reactor:{width:.62,height:.84,depth:.43,taper:.35,power:.7,cross:.75,waist:.25,lensY:.12,lens:.26,moss:true,mountWidth:.59},
 broodmother:{width:.56,height:.86,depth:.42,taper:-.13,power:.65,cross:.82,pitch:-1.10,horizontal:true,lensY:-.43,lens:.18,mountWidth:.57,nursery:true},
};
export const chassisModelId=key=>CHASSIS_PROFILES[key]?.modelId??`body-${key}-v3`;
export function chassisPoint(key,latitude,longitude,offset=0){
 const p=CHASSIS_PROFILES[key],s=Math.sin(latitude),c=Math.cos(latitude);
 const ring=Math.max(0,c)**p.power*(1+p.taper*s)*(1-(p.waist||0)*Math.exp(-(((s+.32)/.26)**2)));
 const sn=Math.sin(longitude),cs=Math.cos(longitude),rounded=v=>Math.sign(v)*Math.abs(v)**(p.cross||1);
 const x=rounded(sn)*(p.width*ring+offset*c);
 return [x,(p.height*s+offset*s)*(1-(p.saddle||0)*Math.exp(-(((x/p.width)/.38)**2))),rounded(cs)*(p.depth*ring+offset*c)+(p.bend||0)*s*s];
}
