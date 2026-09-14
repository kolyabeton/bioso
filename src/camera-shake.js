export const HERO_HIT_SHAKE=Object.freeze({duration:.22,horizontal:.28,depth:.18,frequency:70});

export function heroHitShakeOffset(remaining,reducedMotion=false){
 if(reducedMotion||remaining<=0)return{x:0,z:0};
 const clamped=Math.min(HERO_HIT_SHAKE.duration,remaining),life=clamped/HERO_HIT_SHAKE.duration,phase=(HERO_HIT_SHAKE.duration-clamped)*HERO_HIT_SHAKE.frequency,envelope=life*life;
 return{x:Math.sin(phase)*HERO_HIT_SHAKE.horizontal*envelope,z:Math.cos(phase*1.37)*HERO_HIT_SHAKE.depth*envelope};
}
