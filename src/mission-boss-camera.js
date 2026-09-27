const TRANSITION_SECONDS=1.2;
export const GAMEPLAY_CAMERA=Object.freeze({height:30,depth:40,lookAhead:1.4,viewHeight:34});
export const ANGLED_CAMERA=Object.freeze({...GAMEPLAY_CAMERA,height:23,depth:48,viewHeight:GAMEPLAY_CAMERA.viewHeight/1.2,yaw:20*Math.PI/180});
export function cameraPitchDegrees(pose=GAMEPLAY_CAMERA){return Math.atan2(pose.height-(pose.lookHeight??0),pose.depth+pose.lookAhead)*180/Math.PI;}
/** Shared lower three-quarter view; bosses retain a small additional framing shift. */
export function createMissionBossCamera(){
 let progress=0,active=false;
 function update(s,dt,reducedMotion=false,cameraMode='standard'){
  active=!!(s.mission?.bossId&&!s.mission.complete&&!s.dead&&s.enemies.some(e=>e.hp>0&&e.bossDesignId===s.mission.bossId));
  const target=active?1:0;
  if(dt>0)progress=reducedMotion?target:progress+Math.sign(target-progress)*Math.min(Math.abs(target-progress),Math.min(dt,.1)/TRANSITION_SECONDS);
  const pose=cameraMode==='angled'?ANGLED_CAMERA:GAMEPLAY_CAMERA;
  const blend=progress*progress*(3-2*progress);
  return{active,blend,height:pose.height-3*blend,depth:pose.depth+3*blend,lookAhead:pose.lookAhead+1.5*blend,lookHeight:.6*blend};
 }
 return{update,reset(){progress=0;active=false;}};
}

export function cameraRelativeInput(input,mode){
 if(mode!=='angled')return input;
 const c=Math.cos(ANGLED_CAMERA.yaw),s=Math.sin(ANGLED_CAMERA.yaw);
 return{x:input.x*c+input.z*s,z:input.z*c-input.x*s};
}
