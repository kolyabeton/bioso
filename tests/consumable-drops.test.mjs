import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun,spawnEnemy,hurtEnemy,step} from '../src/game.js';
import {createPart,stats} from '../src/assembly.js';
import {receiveHit,healthView} from '../src/systems/health.js';
import {isaacState} from '../src/systems/mutations.js';
import {setWaypoint,waypointTarget} from '../src/systems/waypoint.js';
import {biomeMapMarkers} from '../src/ui/map.js';
import {CONSUMABLES,CONSUMABLE_RULES,placeConsumable,spawnConsumableDrop,applyConsumable,tickConsumableDrops,consumableTarget} from '../src/systems/consumable-drops.js';
import {createConsumableDropsView} from '../src/consumable-drops-view.js';
const run=()=>{const s=createRun(undefined,'survival',77);s.world.walkable=()=>true;s.enemies=[];return s;};
const apply=(s,kind)=>applyConsumable(s,kind,stats(s),(e,d,i,source)=>hurtEnemy(s,e,d,i,source));
const collect=s=>tickConsumableDrops(s,stats(s),(e,d,i,source)=>hurtEnemy(s,e,d,i,source));
test('ordinary deaths drop once, elites/bosses/objectives do not drop orbs',()=>{
 const s=run();s.consumableRng=()=>0;
 const normal=spawnEnemy(s,'normal',{x:3,z:0});hurtEnemy(s,normal,9999);
 assert.equal(s.consumableDrops.length,1);hurtEnemy(s,normal,9999);assert.equal(s.consumableDrops.length,1);
 for(const kind of ['elite','boss','final','objective'])assert.equal(spawnConsumableDrop(s,{kind,x:3,z:0}),null);
});
test('all eleven weighted outcomes are reachable without advancing combat RNG',()=>{
 for(let i=0;i<CONSUMABLES.length;i++){
  const s=run();let calls=0;const weightBefore=CONSUMABLES.slice(0,i).reduce((a,q)=>a+q.weight,0);
  s.rng=()=>{throw Error('Combat RNG must be untouched');};
  s.consumableRng=()=>++calls===1?0:(weightBefore+.5)/100;
  assert.equal(spawnConsumableDrop(s,{kind:'normal',x:3,z:0}).kind,CONSUMABLES[i].kind);
 }
});
test('eligible rolls yield about one percent and biomass dominates',()=>{
 const s=run(),counts={};for(let i=0;i<100000;i++){s.time=i*12;s.consumableDrops=[];const q=spawnConsumableDrop(s,{kind:'normal',x:3,z:0});if(q)counts[q.kind]=(counts[q.kind]??0)+1;}
 const total=Object.values(counts).reduce((a,b)=>a+b,0);assert(total>900&&total<1100);assert(counts.biomass_5>total*.48);assert.equal(Object.keys(counts).length,11);
});
test('mass kills cannot bypass the twelve-second combat-time interval',()=>{
 const s=run();s.consumableRng=()=>0;const enemy={kind:'normal',x:3,z:0};
 for(let i=0;i<1000;i++)spawnConsumableDrop(s,enemy);assert.equal(s.consumableDrops.length,1);
 s.time=11;assert.equal(spawnConsumableDrop(s,enemy),null);
 isaacState(s).extraTime=1;assert(spawnConsumableDrop(s,enemy));assert.equal(s.consumableDrops.length,2);
});
test('six natural drops block more until a pickup or expiry frees room',()=>{
 const s=run();s.consumableRng=()=>0;const enemy={kind:'normal',x:3,z:0};
 for(let i=0;i<6;i++){s.time=i*12;assert(spawnConsumableDrop(s,{...enemy,x:20}));}
 s.time=72;const ids=s.consumableDrops.map(q=>q.id);assert.equal(spawnConsumableDrop(s,enemy),null);assert.deepEqual(s.consumableDrops.map(q=>q.id),ids);
 s.time=91;assert(spawnConsumableDrop(s,{...enemy,x:20}));collect(s);assert.equal(s.consumableDrops.length,6);
 Object.assign(s.consumableDrops[0],s.player);collect(s);assert.equal(s.consumableDrops.length,5);
 s.time=103;assert(spawnConsumableDrop(s,enemy));assert.equal(s.consumableDrops.length,6);
});
test('failed placement does not spend cooldown and a fresh run has no cooldown',()=>{
 const s=run();s.consumableRng=()=>0;s.world.heightAt=()=>null;
 assert.equal(spawnConsumableDrop(s,{kind:'normal',x:3,z:0}),null);assert.equal(s.nextConsumableDropAt,undefined);
 s.world.heightAt=()=>0;assert(spawnConsumableDrop(s,{kind:'normal',x:3,z:0}));assert.equal(run().nextConsumableDropAt,undefined);
});
test('biomass is collected exactly once through the game step',()=>{
 const s=run();placeConsumable(s,'biomass_5',s.player);step(s,.01);assert.equal(s.biomass,5);step(s,.01);assert.equal(s.biomass,5);assert.equal(s.consumableDrops.length,0);
});
test('collection respects distance, floors, walls, expiry, cap and death',()=>{
 const s=run(),q=placeConsumable(s,'biomass_5',{x:stats(s).pickup+1,z:0});collect(s);assert.equal(s.biomass,0);
 q.x=0;q.y=4;s.world.heightAt=()=>0;collect(s);assert.equal(s.biomass,0);q.y=0;s.world.heightAt=()=>0;s.world.lineClear=()=>false;collect(s);assert.equal(s.biomass,0);
 s.world.lineClear=()=>true;s.dead=true;collect(s);assert.equal(s.biomass,0);s.dead=false;s.time=91;collect(s);assert.equal(s.consumableDrops.length,0);
 for(let i=0;i<100;i++)placeConsumable(s,'shield',{x:5,z:0});assert.equal(s.consumableDrops.length,CONSUMABLE_RULES.capacity);
 s.world.heightAt=()=>null;assert.equal(placeConsumable(s,'shield',{x:5,z:0}),null);
});
test('one-use shield blocks before organ armor and expires without stacking',()=>{
 const s=run();apply(s,'shield');assert.equal(apply(s,'shield'),false);const hp=s.hp;
 assert.equal(healthView(s,stats(s).hp).shield,true);
 assert.equal(receiveHit(s,stats(s)),'shield');assert.equal(s.hp,hp);s.time=2;assert.equal(receiveHit(s,stats(s)),'armor');assert.equal(s.hp,hp);s.time=3;assert.equal(receiveHit(s,stats(s)),'hurt');assert.equal(s.hp,hp-25);
 apply(s,'shield');s.time=15;assert.equal(receiveHit(s,stats(s)),'hurt');
});
test('map and compass follow consumables and remove collected targets',()=>{
 const s=run(),q=placeConsumable(s,'biomass_5',{x:3,z:0}),marker=biomeMapMarkers(s).find(m=>m.id===q.id);
 assert.equal(marker.label,'Биомасса');assert.equal(marker.itemDetail,'+5 биомассы');setWaypoint(s,marker);assert.equal(waypointTarget(s).x,3);
 Object.assign(q,s.player);collect(s);assert.equal(waypointTarget(s),null);
});
test('phase lasts two combat seconds including challenge time',()=>{
 const s=run();isaacState(s).extraTime=10;apply(s,'phase');assert.equal(receiveHit(s,stats(s)),'ignored');s.isaac.extraTime=11.99;assert.equal(receiveHit(s,stats(s)),'ignored');s.isaac.extraTime=12;assert.equal(receiveHit(s,stats(s)),'armor');assert.equal(receiveHit(s,stats(s)),'hurt');
});
test('attraction gathers distant XP and consumables without collecting equipment',()=>{
 const s=run();s.xpDrops=[{id:1,x:100,z:50,value:1}];s.ground=[{id:2,x:50,z:50,part:createPart(s,'claws')}];
 placeConsumable(s,'attraction',s.player);placeConsumable(s,'biomass_5',{x:50,z:50});collect(s);
 assert.equal(s.biomass,5);assert.equal(s.xpDrops[0].x,s.player.x);assert.equal(s.ground[0].x,50);assert.equal(s.consumableDrops.length,0);
});
test('recharge grants an eight-second speed buff without refilling or resetting weapons',()=>{
 const s=run();s.arms[0]=createPart(s,'seed');const p=s.arms[0];p.ammo=0;p.cooldown=5;p.reloadRemaining=2;apply(s,'recharge');assert.equal(p.ammo,0);assert.equal(p.cooldown,5);assert.equal(p.reloadRemaining,2);assert.equal(s.consumables.rechargeUntil,8);assert(!s.events.some(e=>e.type==='reload-end'));
});
test('sleep stops ordinary enemies and ends on damage, never sleeping elites',()=>{
 const s=run(),e=spawnEnemy(s,'normal',{x:5,z:0}),elite=spawnEnemy(s,'elite',{x:10,z:0});apply(s,'sleep');assert(e.pickupSleepUntil>0);assert(!elite.pickupSleepUntil);
 const old={x:e.x,z:e.z};step(s,.05);assert.equal(e.x,old.x);assert.equal(e.z,old.z);hurtEnemy(s,e,.1);assert.equal(e.pickupSleepUntil,0);
});
test('impulse preserves newly spawned drops and pushes only ordinary enemies',()=>{
 const s=run();s.consumableRng=()=>0;const e=spawnEnemy(s,'normal',{x:4,z:0});e.hp=1;placeConsumable(s,'impulse',s.player);collect(s);
 assert.equal(e.hp,0);assert(s.consumableDrops.some(q=>q.kind==='biomass_5'));
});
test('parasites deal secondary damage and stop at their deadline',()=>{
 const s=run(),e=spawnEnemy(s,'normal',{x:6,z:0});e.hp=100;e.armor=0;apply(s,'parasite');s.time=.3;collect(s);assert.equal(e.hp,76);s.time=9;collect(s);assert.equal(e.hp,76);
});
test('mark amplifies damage for eight seconds and remains on ground without a target',()=>{
 const s=run();placeConsumable(s,'hunter',s.player);collect(s);assert.equal(s.consumableDrops.length,1);
 const e=spawnEnemy(s,'normal',{x:5,z:0});e.hp=100;e.armor=0;collect(s);hurtEnemy(s,e,10);assert.equal(e.hp,85);s.time=9;hurtEnemy(s,e,10);assert.equal(e.hp,75);
});
test('beacon distracts reachable normal pursuers and expires',()=>{
 const s=run(),e={kind:'normal',x:5,z:0};apply(s,'beacon');assert.equal(consumableTarget(s,e,s.player),s.consumables.beacon);assert.equal(consumableTarget(s,{...e,kind:'elite'},s.player),s.player);s.time=7;assert.equal(consumableTarget(s,e,s.player),s.player);
});
test('revival charges stack, are spent before the equipped revive and never revive a dead run',()=>{
 const s=run();assert.equal(apply(s,'revival'),true);assert.equal(apply(s,'revival'),true);s.hp=25;
 assert.equal(receiveHit(s,{...stats(s),revive:true}),'armor');assert.equal(receiveHit(s,{...stats(s),revive:true}),'revived');assert.equal(s.hp,25);assert.equal(s.health.revived,false);assert.equal(s.consumables.revivalCharges,1);
 s.time=3;assert.equal(receiveHit(s,{...stats(s),revive:true}),'revived');assert.equal(s.health.revived,false);s.time=6;assert.equal(receiveHit(s,{...stats(s),revive:true}),'revived');assert.equal(s.health.revived,true);s.time=9;receiveHit(s,stats(s));s.dead=true;assert.equal(apply(s,'revival'),false);
});
test('view shares fixed batches, renders every hue and resets/disposes resources',()=>{
 const s=run(),scene=new T.Scene(),camera=new T.PerspectiveCamera(),view=createConsumableDropsView(scene);
 for(const q of CONSUMABLES)placeConsumable(s,q.kind,{x:5,z:0});view.update(s,camera);assert.equal(view.info().consumableOrbs,11);
 const core=scene.getObjectByName('pickup-orbs:internal-energy');assert.equal(core.count,11);assert(core.geometry.attributes.position.count>1000);assert(core.instanceColor);
 const geometries=scene.children.map(o=>o.geometry);view.update(s,camera,1,true);assert.deepEqual(scene.children.map(o=>o.geometry),geometries);
 view.reset();assert.equal(core.count,0);view.dispose();assert.equal(scene.children.length,0);
});

test('mark selects maximum health within 15m, including wounded strong targets',()=>{
 const s=run();s.world.lineClear=()=>true;s.world.heightAt=()=>0;
 const weak=spawnEnemy(s,'normal',{x:2,z:0}),strong=spawnEnemy(s,'elite',{x:15,z:0}),outside=spawnEnemy(s,'elite',{x:15.01,z:0});
 Object.assign(weak,{y:0,hp:100,maxHp:100});Object.assign(strong,{y:0,hp:10,maxHp:500});Object.assign(outside,{y:0,hp:900,maxHp:900});
 assert(apply(s,'hunter'));assert(strong.pickupMarkUntil>0);assert(!weak.pickupMarkUntil);assert(!outside.pickupMarkUntil);
 hurtEnemy(s,strong,1);assert(s.events.some(e=>e.type==='enemy-damage'&&e.target===strong.id&&e.marked));
});
test('mark excludes blocked, dead, dormant and invulnerable targets and uses closest tie',()=>{
 const s=run();s.world.heightAt=()=>0;
 const make=(x,extra={})=>{const e=spawnEnemy(s,'normal',{x,z:0});Object.assign(e,{hp:100,maxHp:100,y:0},extra);return e;};
 const far=make(8),near=make(3),dead=make(1,{hp:0,maxHp:900}),dormant=make(2,{dungeonDormant:true,maxHp:800}),burrowed=make(4,{maxHp:700,locomotionState:{kind:'burrow',phase:'travel'}});
 s.world.lineClear=()=>true;assert(apply(s,'hunter'));assert(near.pickupMarkUntil>0);for(const e of [far,dead,dormant,burrowed])assert(!e.pickupMarkUntil);
 s.world.lineClear=()=>false;assert.equal(apply(s,'hunter'),false);
});

test('attraction keeps source positions for VFX while collecting instantly',()=>{
 const s=run();s.xpDrops=[{id:1,x:10,y:2,z:4,value:1}];apply(s,'attraction');
 const e=s.events.find(e=>e.type==='consumable-attract');assert.deepEqual(e.origins,[{x:10,y:2,z:4}]);assert.equal(s.xpDrops[0].x,s.player.x);
});
test('recharge emits one effect for each installed arm, preserving identifiers',()=>{
 const s=run();s.arms=[createPart(s,'seed'),null,createPart(s,'claws')];apply(s,'recharge');
 assert.deepEqual(s.events.filter(e=>e.type==='consumable-recharge').map(e=>e.source),s.arms.filter(Boolean).map(p=>p.id));
});
test('shield contact carries the incoming direction and only occurs for a real block',()=>{
 const s=run();apply(s,'shield');s.events=[];receiveHit(s,stats(s),{source:{x:3,z:0}});
 const block=s.events.find(e=>e.type==='shield'&&e.kind==='consumable');assert.equal(block.dx,1);assert.equal(Math.abs(block.dz),0);assert.equal(s.consumables.shieldCharges,0);
 s.events=[];receiveHit(s,stats(s),{source:{x:3,z:0}});assert(!s.events.some(e=>e.kind==='consumable'));
});
test('beacon feedback reflects actual target switching, once per beacon',()=>{
 const s=run(),e={id:12,hp:50,kind:'normal',x:4,z:0};apply(s,'beacon');s.events=[];
 assert.equal(consumableTarget(s,e,s.player),s.consumables.beacon);consumableTarget(s,e,s.player);assert.equal(s.events.filter(e=>e.type==='consumable-lured').length,1);
 consumableTarget(s,e,{x:9,z:2});assert.equal(e.pickupBeaconUntil,0);
});
test('parasite attacks originate at three distinct orbit positions',()=>{
 const s=run(),e=spawnEnemy(s,'normal',{x:5,z:0});e.hp=200;apply(s,'parasite');s.time=.3;collect(s);
 const events=s.events.filter(e=>e.type==='arc'&&e.kind==='consumable-parasite');assert.equal(events.length,3);
 for(const e of events){assert(Math.abs(Math.hypot(e.x-s.player.x,e.z-s.player.z)-1.7)<1e-6);assert.equal(e.y,(s.player.y??0)+1.27);}
 assert.equal(new Set(events.map(e=>e.x+','+e.z)).size,3);assert(s.events.filter(e=>e.type==='arc').every(e=>e.kind==='consumable-parasite'));
});

test('beacon, satellites and mark finish gradually without changing their deadlines',()=>{
 const s=run(),scene=new T.Scene(),camera=new T.PerspectiveCamera(),view=createConsumableDropsView(scene),matrix=new T.Matrix4(),scale=new T.Vector3();
 s.consumables={beacon:{x:3,y:0,z:0,until:10},parasitesUntil:10};s.enemies=[{id:99,hp:10,x:2,z:0,pickupMarkUntil:10}];
 view.update(s,camera,9,false,()=>true,.1,.1);const core=scene.getObjectByName('pickup-orbs:internal-energy');core.getMatrixAt(0,matrix);scale.setFromMatrixScale(matrix);const full=scale.x;
 view.update(s,camera,9.8,false,()=>true,.1,.1);core.getMatrixAt(0,matrix);scale.setFromMatrixScale(matrix);assert(scale.x<full*.3);assert(scene.getObjectByName('consumable-hunter-mark').material.opacity<.3);
 view.update(s,camera,10.5,false,()=>true,.1,.5);assert.equal(core.count,0);assert.equal(scene.getObjectByName('consumable-hunter-mark').visible,false);assert.equal(s.consumables.parasitesUntil,10);view.dispose();
});

test('bonus collection uses the shared pickup radius including increases',()=>{
 const s=run(),st=stats(s);s.world.heightAt=()=>0;s.world.lineClear=()=>true;
 placeConsumable(s,'biomass_5',{x:st.pickup-.1,z:0});
 placeConsumable(s,'biomass_5',{x:st.pickup+1,z:0});
 tickConsumableDrops(s,st);assert.equal(s.biomass,5);assert.equal(s.consumableDrops.length,1);
 tickConsumableDrops(s,{...st,pickup:st.pickup*1.5});assert.equal(s.biomass,10);assert.equal(s.consumableDrops.length,0);
 tickConsumableDrops(s,st);assert.equal(s.biomass,10);
});
