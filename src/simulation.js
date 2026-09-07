export const PARTS = {
  seed:{name:'Семенная пушка',description:'Прицельные семена · дальний бой',cooldown:.42,range:9,damage:2},
  arc:{name:'Нервная дуга',description:'Цепной разряд · до трёх целей',cooldown:1.05,range:6,damage:2.5},
  pulse:{name:'Импульсное сердце',description:'Круговая волна · ближний бой',cooldown:1.8,range:3.8,damage:5},
};
export function seededRandom(seed=831){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
export function movementFromDrag(dx,dy){
  const len=Math.hypot(dx,dy),strength=Math.min(1,len/45);
  if(len<5)return{x:0,z:0};
  return{x:dx/len*strength,z:dy/len*strength};
}
// Walkable ground traced against the approved background in fixed-camera space.
// Each row: world Z, left X, right X. Margins include creature footprints.
export const ARENA_ROWS=[[-9.2,0,4.5],[-4,-2,5],[2,-3,4.3],[8,-1.5,3],[11,-.7,2.5]];
export function arenaBounds(z){
  for(let i=1;i<ARENA_ROWS.length;i++){const a=ARENA_ROWS[i-1],b=ARENA_ROWS[i];if(z<=b[0]){const t=Math.max(0,(z-a[0])/(b[0]-a[0]));return{left:a[1]+(b[1]-a[1])*t,right:a[2]+(b[2]-a[2])*t};}}
  const last=ARENA_ROWS.at(-1);return{left:last[1],right:last[2]};
}
export function clampPosition(p){
  p.z=Math.max(ARENA_ROWS[0][0],Math.min(ARENA_ROWS.at(-1)[0],p.z));const bounds=arenaBounds(p.z);p.x=Math.max(bounds.left,Math.min(bounds.right,p.x));return p;
}
export function targetsForPart(part,origin,enemies){
  const def=PARTS[part];if(!def)return[];
  const targets=enemies.filter(e=>e.hp>0&&Math.hypot(e.x-origin.x,e.z-origin.z)<=def.range).sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z));
  return part==='pulse'?targets:targets.slice(0,part==='arc'?3:1);
}
export function initialState(){return{time:0,hp:100,cells:0,kills:0,part:'seed',paused:false,dead:false,started:false,cooldown:0,player:{x:.5,z:7},enemies:[]};}
