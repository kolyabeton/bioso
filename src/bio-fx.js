/** Fixed storage, no per-hit meshes or materials. Simulation state is never modified. */
export const FX_CAPACITY = 192;
export const WEAPON_COLORS = Object.freeze({seed:0xb5dfba,needle:0xd0eeeb,rocket:0xe4b48b,acid:0x98bf75,arc:0x9ce6dd,claws:0xc6f5d5,hammer:0xf3c58c,drill:0xc4efff,whip:0x99ddb2,fangs:0xf1d5cd});
export function createBioParticles(capacity = FX_CAPACITY) {
  const particles = Array.from({length:capacity},()=>({life:0}));
  let quality='medium', reduced=false, cursor=0;
  const limit=()=>reduced?0:quality==='low'?Math.min(32,capacity):quality==='high'?capacity:Math.min(112,capacity);
  function emit(e) {
    const max=limit(); if(e.type==='volatile-blast'||e.soul||!max || !Number.isFinite(e.x) || !Number.isFinite(e.z))return;
    const burst=['blast','volatile-blast'].includes(e.type), ring=['level','pickup','shield','assembly'].includes(e.type);
    if(!burst&&!ring&&!['hit','attack','arc','player-hit'].includes(e.type))return;
    const arc=e.type==='arc'&&Number.isFinite(e.tx)&&Number.isFinite(e.tz);
    const melee=e.type==='attack'&&['claws','hammer','drill','whip','fangs'].includes(e.key);
    const count=Math.min(max,arc?8:melee?(quality==='low'?6:e.key==='claws'?24:16):quality==='low'?3:ring?16:burst?24:e.killed?14:e.type==='hit'?7:4);
    const tint=WEAPON_COLORS[e.key] ?? (e.type==='player-hit'?0xe4a18f:e.killed?0xb0beb0:0xa4e5d1);
    for(let i=0;i<count;i++) {
      const a=i/count*Math.PI*2+(e.dx?Math.atan2(e.dx,e.dz||0):0),p=particles[cursor++%max];
      Object.assign(p,{x:e.x,y:(e.y??0)+(ring?.18:.85),z:e.z,vx:Math.sin(a)*(ring?3:burst?7:3.5),vz:Math.cos(a)*(ring?3:burst?7:3.5),vy:ring?.2:1.5+(i%3),life:ring?.55:burst?.48:.28,duration:ring?.55:burst?.48:.28,size:ring?.1:e.killed?.17:.085,color:tint,length:0,angle:0,pitch:0,gravity:5});
      if(arc){const dx=e.tx-e.x,dz=e.tz-e.z,dy=(e.ty??e.y??0)-(e.y??0),horizontal=Math.hypot(dx,dz),length=Math.hypot(horizontal,dy);p.x=e.x+dx*(i+.5)/count;p.z=e.z+dz*(i+.5)/count;p.y=(e.y??0)+.8+dy*(i+.5)/count;p.vx=p.vy=p.vz=0;p.length=length/count*1.05;p.angle=Math.atan2(dx,dz);p.pitch=-Math.atan2(dy,horizontal);const zig=(i%2?1:-1)*.12;p.x+=Math.cos(p.angle)*zig;p.z-=Math.sin(p.angle)*zig;p.life=p.duration=.16;p.gravity=0;}
      if(melee){
        const aim=Math.atan2((e.tx??e.x)-e.x,(e.tz??e.z+1)-e.z),u=i/Math.max(1,count-1);
        let forward=1.2,lateral=0;
        p.vx=p.vy=p.vz=0;p.gravity=0;p.life=p.duration=.24;p.size=.11;
        if(e.key==='claws'||e.key==='whip'){
          const lanes=e.key==='claws'?3:1,segments=Math.ceil(count/lanes),j=i%segments,t=j/Math.max(1,segments-1),a=aim-1.05+t*2.1,r=e.key==='claws'?1.8+Math.floor(i/segments)*.28:3.2;
          forward=Math.cos(a-aim)*r;lateral=Math.sin(a-aim)*r;p.angle=a+Math.PI/2;p.length=r*2.1/segments*1.25;p.life=p.duration=e.key==='whip'?.32:.22;
        }else if(e.key==='hammer'){
          const a=aim-Math.PI/2+u*Math.PI;forward=1.8+Math.cos(a-aim)*.8;lateral=Math.sin(a-aim)*.8;p.angle=a+Math.PI/2;p.length=.24;p.size=.13;p.vx=Math.sin(aim)*2;p.vz=Math.cos(aim)*2;
        }else if(e.key==='fangs'){
          forward=.7+u*1.9;lateral=i%2?.28:-.28;p.angle=aim;p.length=.32;p.size=.09;
        }else{
          forward=1.2+u*.7;lateral=Math.sin(u*Math.PI*4)*.27;p.y+=Math.cos(u*Math.PI*4)*.27;p.angle=aim;p.length=.19;p.vy=(i%3)*.8;p.gravity=4;
        }
        p.x=e.x+Math.sin(aim)*forward+Math.cos(aim)*lateral;p.z=e.z+Math.cos(aim)*forward-Math.sin(aim)*lateral;
      }else if(e.type==='attack'){
        const aim=Math.atan2((e.tx??e.x)-e.x,(e.tz??e.z+1)-e.z),fan=(i-(count-1)/2)*.15,back=e.key==='rocket'?-1:1;
        p.angle=aim+fan;p.vx=Math.sin(p.angle)*back*(e.key==='needle'?12:5);p.vz=Math.cos(p.angle)*back*(e.key==='needle'?12:5);
        p.size=e.key==='acid'?.18:.085;p.length=e.key==='needle'?.9:e.key==='rocket'?.5:.2;p.vy=e.key==='acid'?1:0;p.gravity=e.key==='acid'?5:0;
      }

    }
  }
  return {particles,emit,step(dt){for(const p of particles)if(p.life>0){p.life=Math.max(0,p.life-dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*p.gravity;}},
    configure(nextQuality=quality,nextReduced=reduced){quality=nextQuality;reduced=nextReduced;for(let i=limit();i<particles.length;i++)particles[i].life=0;},
    reset(){cursor=0;for(const p of particles)p.life=0;}, count:()=>particles.filter(p=>p.life>0).length};
}
