// Slot identity is independent of occupancy. Additional pairs use the same chassis envelope.
export function equipmentLayout(s){
 const arms=s.arms.length,legs=s.legs.length,wide=arms>=3?1.35:1;
 const legRows=Math.ceil(legs/2),armRows=Math.ceil(arms/2);
 const legDepth=legRows>1?1.1:0;
 return {
  wide,
  legs:Array.from({length:legs},(_,slot)=>{
   const side=slot%2?-1:1,row=Math.floor(slot/2);
   return {slot,side,position:[side*.45*wide,.65,legRows<=1?0:(row/(legRows-1)-.5)*legDepth]};
  }),
  arms:Array.from({length:arms},(_,slot)=>{
   const side=slot%2?-1:1,row=Math.floor(slot/2);
   // Upper pair forward, lower pair outboard: long weapons cannot lie on each other.
   return {slot,side,position:[side*(.7*wide+row*.22),armRows>1?1.45-row*.62:1.15,armRows>1?.3-row*.6:0]};
  }),
 };
}
