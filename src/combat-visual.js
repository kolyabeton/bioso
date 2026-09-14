// Screen-readable feedback, independent from collision coordinates and the painted camera.
export function weaponPose(part){
 const recoil=part.recoil||0,progress=part.reloadRemaining>0?1-part.reloadRemaining/part.reloadDuration:0;
 if(part.key==='shotgun'){
  const age=Math.max(0,part.attackAge??1),kick=age<.04?1:Math.max(0,1-(age-.04)/.22);
  return{retract:kick*.42,lift:kick*.18+Math.sin(progress*Math.PI)*.7,roll:kick*.035,slide:0,breech:0};
 }
 if(part.key==='pistol'){
  const age=Math.max(0,part.attackAge??1),recover=age<.05?1:Math.max(0,1-(age-.05)/.23),slide=age<.045?age/.045:Math.max(0,1-(age-.045)/.15),cycle=Math.sin(Math.min(1,age/.24)*Math.PI);
  return{retract:recover*.52+recoil*.1,lift:recover*.16+Math.sin(progress*Math.PI)*1.05,roll:cycle*.085,slide:slide*.17,breech:cycle*Math.PI*2};
 }
 const weight={pistol:[.85,.3],seed:[.65,.22],needle:[1,.12],rocket:[1.3,.42],acid:[.4,.35],arc:[.18,.08]}[part.key]||[.65,.22];
 return{retract:recoil*weight[0],lift:recoil*weight[1]+Math.sin(progress*Math.PI)*1.05,roll:0,slide:0,breech:0};
}
export function impactShape(enemy){
 const flash=Math.max(0,Math.min(1,(enemy.hitFlash||0)/.16));
 return{flash,squash:1-flash*.22,stretch:1+flash*.28};
}
export function reloadReadout(arms){
 const guns=arms.filter(p=>p?.reloadRemaining>0);
 if(!guns.length)return null;
 const p=guns.reduce((a,b)=>a.reloadRemaining<b.reloadRemaining?a:b);
 return{text:`ПЕРЕЗАРЯДКА ${p.reloadRemaining.toFixed(1)}`,progress:1-p.reloadRemaining/p.reloadDuration};
}
