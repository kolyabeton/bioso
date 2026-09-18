import {CONSUMABLE_BY_KIND} from './systems/consumable-drops.js';
/** Fixed storage, no per-hit meshes or materials. Simulation state is never modified. */
export const FX_CAPACITY = 192;
export const WEAPON_COLORS = Object.freeze({pistol:0xf3d4a0,seed:0xb5dfba,shotgun:0xe8c786,needle:0xd0eeeb,rocket:0xe4b48b,acid:0x98bf75,arc:0x9ce6dd,claws:0xc6f5d5,hammer:0xf3c58c,drill:0xc4efff,whip:0x99ddb2,fangs:0xf1d5cd});
export const BIO_BLOOD_COLORS = Object.freeze([0x1d4629,0x326232,0x557a39,0x7f9149]);
export const ENEMY_BLOOD_COLORS = Object.freeze([0x755306,0x9b7108,0xc79710,0xe0bd32]);
export function createBioParticles(capacity = FX_CAPACITY) {
  const particles = Array.from({length:capacity},()=>({life:0}));
  let quality='medium', reduced=false, cursor=0;
  const limit=()=>reduced?0:quality==='low'?Math.min(32,capacity):quality==='high'?capacity:Math.min(112,capacity);
  function emit(e) {
    if(e.type==='arc'&&e.kind==='consumable-parasite'||e.type==='consumable-burst'||e.type==='pickup'&&CONSUMABLE_BY_KIND[e.kind])return;
    const max=limit(); if(e.type==='volatile-blast'||e.soul||!max || !Number.isFinite(e.x) || !Number.isFinite(e.z))return;
    // These weapons own their contact geometry in melee-trail. Do not layer the
    // former particle fan underneath it.
    if(e.type==='attack'&&['claws','drill','whip'].includes(e.key))return;
    if(e.key==='shotgun'&&['attack','hit'].includes(e.type))return;
    const burst=['blast','volatile-blast'].includes(e.type),abilityRing=['consumable-burst','heart-pulse','boss-phase'].includes(e.type),ring=['level','pickup','shield','assembly'].includes(e.type)||abilityRing,enemyBlood=e.type==='death',blood=e.type==='player-hit'||enemyBlood;
    if(!burst&&!ring&&!['hit','attack','arc','player-hit','death','projectile-end','summon-create','summon-death'].includes(e.type))return;
    const arc=e.type==='arc'&&Number.isFinite(e.tx)&&Number.isFinite(e.tz);
    const melee=e.type==='attack'&&['claws','hammer','drill','whip','fangs'].includes(e.key);
    const count=Math.min(max,blood?(enemyBlood?(quality==='low'?6:quality==='high'?18:12):(quality==='low'?3:quality==='high'?5:4)):arc?8:melee?(quality==='low'?6:e.key==='claws'?24:16):quality==='low'?3:ring?16:burst?24:e.killed?14:e.type==='hit'?7:4);
    const burstTint=e.type==='consumable-burst'?(e.kind==='sleep'?0xa969df:0x58aee8):e.type==='heart-pulse'?0xc94f72:null,tint=(typeof e.color==='string'?parseInt(e.color.replace('#',''),16):e.color) ?? burstTint ?? WEAPON_COLORS[e.key] ?? (e.killed?0xb0beb0:0xa4e5d1);
    for(let i=0;i<count;i++) {
      const a=i/count*Math.PI*2+(e.dx?Math.atan2(e.dx,e.dz||0):0),p=particles[cursor++%max];
      if(blood){
        const impact=Number.isFinite(e.dx)&&Number.isFinite(e.dz)?Math.atan2(e.dx,e.dz):Math.PI,fan=(i/Math.max(1,count-1)-.5)*1.35+(i%3-1)*.055,angle=enemyBlood?a+((e.target||0)%7)*.17:impact+fan,slow=i%6===0,speed=enemyBlood?.75+(i%4)*.22:(slow?.6:1.7)+(i%5)*.38,size=enemyBlood?.032+(i%3)*.011:(slow?.12:.07)+(i%3)*.018,duration=enemyBlood?.62+(i%3)*.08:.4+(i%4)*.1,spread=.05+(i%4)*.055,colors=enemyBlood?ENEMY_BLOOD_COLORS:BIO_BLOOD_COLORS;
        Object.assign(p,{kind:'blood',x:e.x+Math.sin(angle)*spread,y:(e.y??0)+(enemyBlood?Math.max(.45,e.radius??.6):.7)+(i%3)*.1,z:e.z+Math.cos(angle)*spread,vx:Math.sin(angle)*speed,vz:Math.cos(angle)*speed,vy:(slow?.6:1.35)+(i%6)*.3,life:duration,duration,size,color:colors[i%colors.length],length:0,angle,pitch:0,gravity:10.5,floor:(e.y??0)+.025,grounded:false});
        continue;
      }
      const ringLife=abilityRing?.65:.55,ringSpeed=abilityRing?(e.radius||5)/ringLife:3;Object.assign(p,{kind:'energy',x:e.x,y:(e.y??0)+(ring?.18:.85),z:e.z,vx:Math.sin(a)*(ring?ringSpeed:burst?7:3.5),vz:Math.cos(a)*(ring?ringSpeed:burst?7:3.5),vy:ring?.2:1.5+(i%3),life:ring?ringLife:burst?.48:.28,duration:ring?ringLife:burst?.48:.28,size:ring?.1:e.killed?.17:.085,color:tint,length:0,angle:0,pitch:0,gravity:5,grounded:false});
      if(arc){const dx=e.tx-e.x,dz=e.tz-e.z,dy=(e.ty??e.y??0)-(e.y??0),horizontal=Math.hypot(dx,dz),length=Math.hypot(horizontal,dy);p.x=e.x+dx*(i+.5)/count;p.z=e.z+dz*(i+.5)/count;p.y=(e.y??0)+.8+dy*(i+.5)/count;p.vx=p.vy=p.vz=0;p.length=length/count*1.05;p.angle=Math.atan2(dx,dz);p.pitch=-Math.atan2(dy,horizontal);const zig=(i%2?1:-1)*.12;p.x+=Math.cos(p.angle)*zig;p.z-=Math.sin(p.angle)*zig;p.life=p.duration=.16;p.gravity=0;}
      if(melee){
        const aim=Math.atan2((e.tx??e.x)-e.x,(e.tz??e.z+1)-e.z),u=i/Math.max(1,count-1);
        let forward=1.2,lateral=0;
        p.vx=p.vy=p.vz=0;p.gravity=0;p.life=p.duration=.24;p.size=.11;
        if(e.key==='claws'||e.key==='whip'){
          const lanes=e.key==='claws'?3:1,segments=Math.ceil(count/lanes),j=i%segments,t=j/Math.max(1,segments-1),a=aim-1.05+t*2.1,r=e.key==='claws'?1.8+Math.floor(i/segments)*.28:3.2;
          forward=Math.cos(a-aim)*r;lateral=Math.sin(a-aim)*r;p.angle=a+Math.PI/2;p.length=r*2.1/segments*1.25;p.life=p.duration=e.key==='whip'?.32:.22;
        }else if(e.key==='hammer'){
          const radius=e.areaRadius??2.4,a=aim-Math.PI/2+u*Math.PI;forward=1.35+Math.cos(a-aim)*radius*.7;lateral=Math.sin(a-aim)*radius;p.angle=a+Math.PI/2;p.length=.3;p.size=.16;p.vx=Math.sin(a)*5;p.vz=Math.cos(a)*5;
        }else if(e.key==='fangs'){
          forward=.7+u*1.9;lateral=i%2?.28:-.28;p.angle=aim;p.length=.32;p.size=.09;
        }else{
          forward=1.2+u*.7;lateral=Math.sin(u*Math.PI*4)*.27;p.y+=Math.cos(u*Math.PI*4)*.27;p.angle=aim;p.length=.19;p.vy=(i%3)*.8;p.gravity=4;
        }
        p.x=e.x+Math.sin(aim)*forward+Math.cos(aim)*lateral;p.z=e.z+Math.cos(aim)*forward-Math.sin(aim)*lateral;
      }else if(e.type==='projectile-end'){
        p.life=p.duration=e.duration||.2;p.vx=-(e.dx||0)*1.4;p.vz=-(e.dz||0)*1.4;p.vy=0;p.gravity=0;p.size=.055;p.length=.22;p.angle=Math.atan2(e.dx||0,e.dz||1);
      }else if(e.type==='attack'){
        const aim=Math.atan2((e.tx??e.x)-e.x,(e.tz??e.z+1)-e.z),fan=(i-(count-1)/2)*.15,back=e.key==='rocket'?-1:1;
        p.angle=aim+fan;p.vx=Math.sin(p.angle)*back*(e.key==='needle'?12:5);p.vz=Math.cos(p.angle)*back*(e.key==='needle'?12:5);
        p.size=e.key==='acid'?.18:.085;p.length=e.key==='needle'?.9:e.key==='rocket'?.5:.2;p.vy=e.key==='acid'?1:0;p.gravity=e.key==='acid'?5:0;
      }

    }
  }
  return {particles,emit,step(dt){for(const p of particles)if(p.life>0){p.life=Math.max(0,p.life-dt);if(!p.life||p.grounded)continue;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=dt*p.gravity;if(p.kind==='blood'){const drag=Math.exp(-1.8*dt);p.vx*=drag;p.vz*=drag;if(p.y<=p.floor){p.y=p.floor;p.vx=p.vy=p.vz=0;p.grounded=true;p.life=Math.min(p.life,.55);}}}},
    configure(nextQuality=quality,nextReduced=reduced){quality=nextQuality;reduced=nextReduced;for(let i=limit();i<particles.length;i++)particles[i].life=0;},
    reset(){cursor=0;for(const p of particles)p.life=0;}, count:()=>particles.filter(p=>p.life>0).length};
}
