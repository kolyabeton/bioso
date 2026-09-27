// Physical arm shields are independent of the charge-based shield organ.
export const SHIELD_ARM_REDUCTION=.5;
export const SHIELD_ARM_MAX_REDUCTION=.8;
export const SHIELD_ARM_HALF_ANGLE=Math.PI/3;
export const isShieldBash=key=>key==='hammer';
export const shieldArmBaseDamage=p=>100+8*(Math.max(1,Math.min(5,Math.floor(p?.tier??1)))-1);
export const SHIELD_AURA_RADIUS=5;
export const SHIELD_AURA_SLOW=.1;
export const shieldArmReduction=s=>Math.min(SHIELD_ARM_MAX_REDUCTION,(s.arms||[]).filter(p=>p?.key==='shieldArm'&&!p.disabled).length*SHIELD_ARM_REDUCTION);
/** dx/dz is the projectile's direction of travel, not the shooter's position. */
export function frontalShieldReduction(s,{cause,projectile,dx=0,dz=0}={}){
 if(cause!=='projectile')return 0;
 dx=projectile?.dx??dx;dz=projectile?.dz??dz;
 if(!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)<1e-9)return 0;
 const incoming=Math.atan2(-dx,-dz),facing=s.player.facing??0;
 const delta=Math.atan2(Math.sin(incoming-facing),Math.cos(incoming-facing));
 return Math.abs(delta)<=SHIELD_ARM_HALF_ANGLE+1e-9?shieldArmReduction(s):0;
}
