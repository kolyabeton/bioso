// Screen-readable feedback, independent from collision coordinates and the painted camera.
export function weaponPose(part){
 const recoil=part.recoil||0,progress=part.reloadRemaining>0?1-part.reloadRemaining/part.reloadDuration:0;
 const weight={seed:[.65,.22],needle:[1,.12],rocket:[1.3,.42],acid:[.4,.35],arc:[.18,.08]}[part.key]||[.65,.22];
 return{retract:recoil*weight[0],lift:recoil*weight[1]+Math.sin(progress*Math.PI)*1.05};
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
