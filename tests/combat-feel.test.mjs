import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack,step,spawnEnemy} from '../src/game.js';
import {createPart,stats,weaponStats,equip,unequip} from '../src/assembly.js';
import {toggleWeapon,startReload,tickWeapons,movementFactor,tickImpact,hitFeedback,SHOOT_MOVE_FACTOR} from '../src/combat-feel.js';
import {handPresentation} from '../src/hud-presentation.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(key='seed'){
 const s=createRun(undefined,'survival',123);s.arms=[createPart(s,key),null];
 const enemy=spawnEnemy(s,'normal',{x:0,z:5});enemy.hp=enemy.maxHp=100000;enemy.speed=enemy.damage=0;
 return {s,p:s.arms[0],enemy};
}
test('Winch projectile never pulls and retains 25% bonus against elites and bosses',()=>{
 for(const kind of ['normal','elite','boss','final']){
  const {s,p,enemy}=fixture('harpoon');
  Object.assign(enemy,{kind,armor:0,assembly:null,specialty:null});
  s.rng=()=>.99;s.arms=[null,null];s.waves.credit=-1e6;s.waves.nextElite=s.waves.nextBoss=Infinity;
  const w={...weaponStats(s,p),crit:0};
  const before={x:enemy.x,z:enemy.z,hp:enemy.hp};
  s.shots.push({id:++s.entityId,source:p.id,x:enemy.x,y:(enemy.y??0)+1,z:enemy.z-.1,dx:0,dz:1,dy:0,speed:26,life:1,travel:0,w,hit:new Set(),remaining:w.pierce,mode:'projectile',target:enemy.id});
  step(s,.01);
  near(enemy.x,before.x);near(enemy.z,before.z);
  near(before.hp-enemy.hp,w.damage*(kind==='normal'?1:1.25));
 }
});
test('Winch hits one target without innate piercing',()=>{
 const {s,p,enemy:first}=fixture('harpoon');
 const second=spawnEnemy(s,'normal',{x:0,z:7});second.hp=second.maxHp=100000;second.speed=second.damage=0;
 s.rng=()=>.99;s.waves.credit=-1e6;s.waves.nextElite=s.waves.nextBoss=Infinity;
 assert.equal(weaponStats(s,p).pierce,1);
 attack(s,0);assert.equal(s.shots.length,1);
 s.arms=[null,null];step(s,.3);
 assert.ok(first.hp<first.maxHp);assert.equal(second.hp,second.maxHp);
});
test('twelve rounds start a committed reload; no shots until magazine restored',()=>{
 const {s,p}=fixture();let fired=0;
 for(let i=0;i<300&&p.reloadRemaining===0;i++){attack(s,1/60);fired=s.events.filter(e=>e.type==='attack').length;}
 assert.equal(fired,12);assert.equal(p.ammo,0);near(p.reloadRemaining,1.2);
 const count=s.shots.length;attack(s,.5);assert.equal(s.shots.length,count);
 attack(s,.5);assert.equal(s.shots.length,count);attack(s,.21);
 assert.equal(s.shots.length,count+1);assert.equal(p.ammo,11);assert.equal(p.reloadRemaining,0);
});
test('one shotgun spends one of two charges on five pellets without a duplicate-family bonus',()=>{
 const {s,p}=fixture('shotgun');s.rng=()=>.5;attack(s,0);
 assert.equal(s.shots.length,5);assert.equal(p.ammo,1);assert.ok(s.shots.every(q=>q.w.damage===5.25));
 assert.deepEqual(s.shots.map(q=>Number((Math.atan2(q.dz,q.dx)-Math.PI/2).toFixed(2))),[-.2,-.1,0,.1,.2]);
 p.cooldown=0;attack(s,0);assert.equal(s.shots.length,10);assert.equal(p.ammo,0);near(p.reloadRemaining,2);
});
test('machine gun uses strong line spread that grows through the burst',()=>{
 const {s,p}=fixture('seed');s.rng=()=>1;attack(s,0);p.cooldown=0;attack(s,0);const second=Math.atan2(s.shots[1].dx,s.shots[1].dz);
 assert.ok(Math.abs(second)>.16);assert.ok(p.bloom>1);
});
test('partial magazine reloads after combat and idle never spends rounds',()=>{
 const {s,p}=fixture();attack(s,.01);assert.equal(p.ammo,11);s.enemies=[];
 for(let i=0;i<75;i++)attack(s,1/60);
 assert.ok(p.reloadRemaining>0);assert.equal(p.ammo,11);
 for(let i=0;i<90;i++)attack(s,1/60);
 assert.equal(p.ammo,12);assert.equal(p.reloadRemaining,0);
});
test('independent magazines do not block other guns or claws',()=>{
 const {s,p}=fixture();s.body=createPart(s,'hunter');s.arms.push(createPart(s,'seed'));s.arms[1]=createPart(s,'claws');
 s.enemies[0].z=1;p.ammo=0;startReload(s,p);attack(s,.01);
 assert.ok(!s.events.some(e=>e.type==='attack'&&e.source===p.id));
 assert.ok(s.events.some(e=>e.type==='attack'&&e.key==='claws'));
 assert.ok(s.events.some(e=>e.type==='attack'&&e.source===s.arms[2].id));
});
test('melee charges are spent and restored independently without slowing movement',()=>{
 const expected={claws:[2,.7],hammer:[1,2],drill:[6,1],whip:[3,1.1],fangs:[2,.9]};
 for(const [key,[magazine,reload]] of Object.entries(expected)){
  const {s,p,enemy}=fixture(key);enemy.z=1;
  assert.equal(p.ammo,magazine,key);assert.equal(movementFactor(s),1,key);
  for(let hit=0;hit<magazine;hit++){
   p.cooldown=0;attack(s,0);
   assert.equal(p.ammo,magazine-hit-1,key);
  }
  near(p.reloadRemaining,reload);const attacks=s.events.filter(e=>(e.type==='attack'||e.type==='melee-windup')&&e.source===p.id).length;
  p.cooldown=0;attack(s,0);assert.equal(s.events.filter(e=>(e.type==='attack'||e.type==='melee-windup')&&e.source===p.id).length,attacks,key);
  tickWeapons(s,reload);assert.equal(p.ammo,magazine,key);near(p.reloadRemaining,0);
 }
});
test('unequip/equip cannot refill a magazine or cancel its timer; pauses freeze both',()=>{
 const {s,p}=fixture();p.ammo=0;startReload(s,p);unequip(s,'arms',0);tickWeapons(s,.25);equip(s,p.id,0);
 assert.equal(p.ammo,0);near(p.reloadRemaining,.95);
 s.pending=1;step(s,.5);near(p.reloadRemaining,.95);assert.equal(p.ammo,0);
});
test('shooting slows walking once, reload restores it, releasing input stops immediately',()=>{
 const {s,p}=fixture();near(movementFactor(s),1);
 const speed=stats(s).speed;attack(s,0);near(movementFactor(s),SHOOT_MOVE_FACTOR);step(s,.1,{x:1,z:0});near(s.player.x,speed*.1*SHOOT_MOVE_FACTOR);
 p.ammo=0;startReload(s,p);near(movementFactor(s),SHOOT_MOVE_FACTOR);p.attackAge=.12;near(movementFactor(s),1);
 const x=s.player.x;step(s,.1,{x:1,z:0});near(s.player.x-x,speed*.1);
 const stop={...s.player};step(s,.1,{x:0,z:0});near(s.player.x,stop.x);near(s.player.z,stop.z);near(s.motion.x,0);
 s.arms=[createPart(s,'claws'),null];near(movementFactor(s),1);
});
test('rocket launch slows the short recovery window; flying bees do not keep the player slow',()=>{
 const {s,p}=fixture('rocket'),speed=stats(s).speed;
 step(s,.05,{x:1,z:0});near(s.player.x,speed*.05);
 assert.equal(s.shots.filter(q=>q.mode==='rocket').length,4);assert.ok(p.cooldown>0);near(movementFactor(s),SHOOT_MOVE_FACTOR);
 let x=s.player.x;step(s,.05,{x:1,z:0});near(s.player.x-x,speed*.05*SHOOT_MOVE_FACTOR);assert.ok(s.shots.some(q=>q.mode==='rocket'));
 x=s.player.x;step(s,.1,{x:1,z:0});near(s.player.x-x,speed*.1*SHOOT_MOVE_FACTOR);near(movementFactor(s),1);
});
test('diagonal motion is normalized and regular bullets do not home after emission',()=>{
 const {s}=fixture();s.enemies[0].z=100;
 const before={...s.player};step(s,.1,{x:1,z:1});near(Math.hypot(s.player.x-before.x,s.player.z-before.z),stats(s).speed*.1);
 s.enemies[0].z=8;s.player.facing=Math.atan2(s.enemies[0].x-s.player.x,s.enemies[0].z-s.player.z);attack(s,0);const q=s.shots[0],dir=[q.dx,q.dz];s.enemies[0].x=20;
 step(s,.05);assert.deepEqual([q.dx,q.dz],dir);
});
test('needle still sweeps through close targets between simulation frames',()=>{
 const {s,enemy}=fixture('needle');enemy.z=1;const hp=enemy.hp;step(s,.05);assert.ok(enemy.hp<hp);
});
test('hit knockback is damped, bounded by collision and weaker on bosses',()=>{
 const {s,enemy}=fixture();hitFeedback(s,enemy,{knockback:6},{dx:0,dz:1});const z=enemy.z;
 const initial=enemy.kickZ;tickImpact(s,enemy,.1);assert.ok(enemy.z-z>1);assert.ok(enemy.kickZ<initial);
 const boss={...enemy,kind:'boss',kickX:0,kickZ:0};hitFeedback(s,boss,{knockback:6},{dx:0,dz:1});assert.ok(boss.kickZ<1);
 s.world={walkable:()=>false};const stopped=enemy.z;tickImpact(s,enemy,.1);near(enemy.z,stopped);
});
test('shot cadence stays within one shot at 30, 60 and 120 Hz',()=>{
 const counts=[30,60,120].map(hz=>{const {s}=fixture();for(let i=0;i<hz*12;i++)attack(s,1/hz);return s.events.filter(e=>e.type==='attack').length;});
 assert.ok(Math.max(...counts)-Math.min(...counts)<=1,counts.join('/'));
});
test('HUD uses real ammo and reload time without mutating the weapon',()=>{
 const {s,p}=fixture();p.ammo=2;startReload(s,p);tickWeapons(s,.3);
 const before=JSON.stringify(p),hud=handPresentation(s)[0];assert.equal(hud.ammo,2);assert.equal(hud.magazine,12);assert.ok(hud.reloading);near(hud.reloadProgress,.25);assert.equal(JSON.stringify(p),before);
});

test('disabled guns stop firing and release movement immediately without refilling ammo',()=>{
 const {s,p}=fixture();attack(s,.01);const ammo=p.ammo,shots=s.shots.length;
 assert.ok(toggleWeapon(s,0));assert.equal(movementFactor(s),1);
 for(let i=0;i<60;i++)attack(s,1/60);
 assert.equal(s.shots.length,shots);assert.equal(p.ammo,ammo);assert.equal(handPresentation(s)[0].enabled,false);
 const before={...s.player};step(s,.1,{x:0,z:1});near(s.player.z-before.z,stats(s).speed*.1);
 toggleWeapon(s,0);attack(s,.01);assert.equal(p.ammo,ammo-1);
 assert.equal(toggleWeapon(s,1),false);
});
test('disabled synchronized weapon cannot block the enabled gun or fire an echo',()=>{
 const {s,p}=fixture('harpoon');s.body=createPart(s,'hunter');s.arms[1]=createPart(s,'needle');s.organs[0]=createPart(s,'commonNerve');
 s.arms[1].cooldown=100;toggleWeapon(s,1);attack(s,.01);
 assert.ok(s.events.some(e=>e.type==='attack'&&e.source===p.id));
 const shots=s.shots.length;attack(s,0,stats(s),s.arms[1]);assert.equal(s.shots.length,shots);
});
test('distant, occluded and out-of-arc targets do not slow walking',()=>{
 const {s,enemy}=fixture();enemy.z=10;assert.equal(movementFactor(s),1);attack(s,.01);assert.equal(s.shots.length,0);
 enemy.z=5;s.world.lineClear=()=>false;assert.equal(movementFactor(s),1);
 s.world.lineClear=()=>true;enemy.z=-5;assert.equal(movementFactor(s),1);
});
test('weapons engage at their effective range, including melee body radius',()=>{
 for(const key of ['seed','needle','rocket','harpoon','arc','acid','claws']){const {s,p,enemy}=fixture(key),range=weaponStats(s,p).range;enemy.radius=0;enemy.z=range+.1;attack(s,0);assert.equal(s.events.filter(e=>e.type==='attack').length,0,key);enemy.z=range-.1;attack(s,0);assert.ok(s.events.some(e=>e.type==='attack'),key);}
});
