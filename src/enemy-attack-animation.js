const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const zero=()=>({x:0,y:0,z:0,pitch:0,yaw:0,roll:0,spin:0});
const profiles={
 claws:{back:{yaw:-.9,z:-.15},hit:{yaw:1.1,z:.45,roll:.2},return:.38},
 fangs:{back:{z:-.3,pitch:-.2},hit:{z:.85,pitch:.15},return:.35},
 drill:{back:{z:-.25},hit:{z:.7},return:.3},
 whip:{back:{yaw:-1.2,pitch:-.25},hit:{yaw:1.4,z:.6,roll:.35},return:.5},
 hammer:{back:{pitch:-.35,z:-.35,y:.1},hit:{pitch:.12,z:.95,y:-.08},return:.6},
 seed:{back:{pitch:-.08},hit:{z:-.28,pitch:-.15},return:.28,shot:true},
 needle:{back:{pitch:-.06},hit:{z:-.4,pitch:-.2},return:.4,shot:true},
 acid:{back:{pitch:-.35,z:-.2},hit:{z:.45,pitch:.18},return:.45},
};
export const enemyAttackRecovery=key=>profiles[key]?.return??.35;
export function enemyAnimationState(e,time){
 if(e.hp<=0||e.volatile||e.frozenUntil>time||e.territory&&e.territory.state!=='engaged'&&!e.challengeId)return null;
 if(e.enemyAttack?.warning)return {attack:e.enemyAttack.warning,preparing:true};
 const a=e.attackPose;if(a&&time>=a.at&&time<a.at+enemyAttackRecovery(a.key))return {attack:a,preparing:false};
 return null;
}
/** The weapon reaches contact at warning.at, exactly when simulation applies the hit.
 * No render-delta accumulator: pause, replay and low frame rates share the same pose. */
export function enemyWeaponPose(e,slot,time,reducedMotion=false){
 const state=enemyAnimationState(e,time),pose=zero();if(!state||state.attack.slot!==slot)return pose;
 const {attack:a,preparing}=state,p=profiles[a.key];if(!p)return pose;
 const side=slot%2?1:-1,back={...zero(),...p.back},hit={...zero(),...p.hit};
 let blend,release=1;
 if(preparing){const t=Math.max(0,Math.min(1,(time-a.started)/(a.at-a.started||1)));
  const lift=smooth(t/.65);blend=p.shot?0:smooth((t-.65)/.35);
  for(const key of Object.keys(pose))pose[key]=back[key]*lift*(1-blend)+hit[key]*blend;
 }else{release=1-smooth((time-a.at)/p.return);for(const key of Object.keys(pose))pose[key]=hit[key]*release;}
 pose.yaw*=side;pose.roll*=side;
 if(a.key==='drill'&&!reducedMotion){const elapsed=time-a.started;pose.spin=Math.sin(elapsed*36)*.8*(preparing?smooth(elapsed/.15):release);}
 // Reduced motion keeps the attack readable while suppressing spin and large arcs.
 if(reducedMotion)for(const key of Object.keys(pose))pose[key]*=.55;
 return pose;
}
