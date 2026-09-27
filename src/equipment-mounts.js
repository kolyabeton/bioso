import {CHASSIS_PROFILES,chassisPoint} from './chassis-profiles.js';
// Slot identity is independent of occupancy. Additional pairs use the same chassis envelope.
export function equipmentLayout(s,{authoredChassis=false}={}){
 const arms=s.arms.length,legs=s.legs.length,wide=arms>=3?1.35:1;
 const legRows=Math.ceil(legs/2),armRows=Math.ceil(arms/2);
 const legDepth=legRows>1?1.1:0;
 return {
  wide,
  legs:Array.from({length:legs},(_,slot)=>{
   if(legs===3){
    const side=slot===2?0:slot===0?1:-1;
    const frontWidth=authoredChassis?Math.max(.54,(CHASSIS_PROFILES[s.body?.key]?.mountWidth??.39)+.15):.45;
    return {slot,side,position:[side*frontWidth,.65,slot===2?-.78:.18]};
   }
   const side=slot%2?-1:1,row=Math.floor(slot/2);
   const z=legRows<=1?0:(row/(legRows-1)-.5)*legDepth;
   let x=authoredChassis?(legs>2?.48:.45):.45*wide;
   const profile=authoredChassis&&CHASSIS_PROFILES[s.body?.key];
   if(profile){
    const latitude=Math.asin(Math.max(-.99,-.41/profile.height)),width=profile.horizontal?profile.mountWidth:chassisPoint(s.body.key,latitude,Math.PI/2)[0],depth=profile.horizontal?.78:chassisPoint(s.body.key,latitude,0)[2];
    x=Math.max(x,width*Math.sqrt(Math.max(0,1-(z/depth)**2))+.22);
   }
   return {slot,side,position:[side*x,.65,z]};
  }),
  arms:Array.from({length:arms},(_,slot)=>{
   const side=slot%2?-1:1,row=Math.floor(slot/2);
   // Upper pair forward, lower pair outboard: long weapons cannot lie on each other.
   const profile=authoredChassis&&CHASSIS_PROFILES[s.body?.key];
   const y=profile?.horizontal?1.18:armRows>1?1.45-row*.62:1.15;
   const x=profile?Math.max(.49,(profile.mountWidth??profile.width)+.22)+row*.09:.7*wide+row*.22;
   return {slot,side,position:[side*x,y,armRows>1?(profile?.horizontal?.62-row*1.25:.3-row*.6):0]};
  }),
 };
}
