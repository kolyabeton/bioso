import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,attack} from '../src/game.js';
import {CATALOG} from '../src/catalog.js';
import {createPart,equip,equipGround,unequip,swapBody,preferredSlot,carried,stats,weaponStats,digestionYield,stackedReturnNerveDamage,resonanceBonus} from '../src/assembly.js';
import {cloneForComparison} from '../src/ui/adapters.js';
import {prepareIsaacAttack,isaacHit,isaacDeath,slimePace,tickIsaacCombat} from '../src/systems/organs/combat.js';
import {heal,receiveHit,tickHealth,healthView} from '../src/systems/health.js';
import {tickExtraParts} from '../src/systems/extra-parts.js';
import {healthSegments} from '../src/ui/atoms.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const parts=(s,key,count=2)=>Array.from({length:count},()=>createPart(s,key));

for(const key of Object.keys(CATALOG).filter(key=>CATALOG[key].kind==='organ')){
 test(`two ${key} organs equip, replace and remove independently`,()=>{
  const s=createRun(),parts=Array.from({length:3},()=>createPart(s,key));
  s.inventory.push(...parts);
  assert(equip(s,parts[0].id,0));
  const preview=cloneForComparison(s);
  assert(equip(preview,parts[1].id,preferredSlot(preview,parts[1])));
  assert.equal(s.organs[1],null);
  assert(equip(s,parts[1].id,preferredSlot(s,parts[1])));
  assert.deepEqual(s.organs,parts.slice(0,2));
  const before=JSON.stringify({organs:s.organs,inventory:s.inventory});
  assert.equal(equip(s,parts[0].id,1),false);
  assert.equal(equip(s,parts[2].id,s.organs.length),false);
  assert.equal(JSON.stringify({organs:s.organs,inventory:s.inventory}),before);
  assert(equip(s,parts[2].id,1));
  assert.deepEqual(s.organs,[parts[0],parts[2]]);
  assert(s.inventory.includes(parts[1]));
  assert(unequip(s,'organs',0));
  assert.equal(s.organs[1],parts[2]);
  for(const p of parts)assert.equal(carried(s).filter(q=>q.id===p.id).length,1);
 });
}

test('ground quick equip accepts a second identical organ exactly once and body swap preserves both',()=>{
 const s=createRun(),first=createPart(s,'regen'),second=createPart(s,'regen');
 s.inventory.push(first);assert(equip(s,first.id,0));
 s.ground.push({id:888,part:second,...s.player});
 assert(equipGround(s,888,preferredSlot(s,second)));
 assert.equal(equipGround(s,888,1),false);
 assert.equal(s.ground.length,0);
 const body=createPart(s,'bastion');s.inventory.push(body);
 assert(swapBody(s,body.id));
 assert.deepEqual(s.organs.filter(Boolean),[first,second]);
 for(const p of [first,second])assert.equal(carried(s).filter(q=>q.id===p.id).length,1);
});

test('duplicate passive organs add their full numeric effects except stomachs',()=>{
 const s=createRun();
 s.organs=parts(s,'stabilizer');near(stats(s).projectile,1);near(stats(s).reloadReduction,.3);
 s.organs=parts(s,'accelerator');near(stats(s).rate,.3);
 s.organs=parts(s,'regen');near(stats(s).regenPerSecond,.02);
 s.organs=parts(s,'armor');assert.equal(stats(s).armor,2.5);
 const target=createPart(s,'seed');s.inventory.push(target);
 s.organs=parts(s,'digestion');const digestionYieldOnce=digestionYield(s,target.id);
 s.organs=s.organs.slice(0,1);assert.equal(digestionYieldOnce,digestionYield(s,target.id));
 const nerves=parts(s,'returnNerve');nerves[1].tier=5;s.organs=nerves;near(stackedReturnNerveDamage(s),.6);
});

test('duplicate slime snapshots on attack while wombs produce independently',()=>{
 const s=createRun(),hand=s.arms[0];s.organs=parts(s,'slime');
 const slimed={kind:'normal'};isaacHit(s,slimed,10,prepareIsaacAttack(s,hand,{}));near(slimePace(s,slimed),.98);
 s.organs=parts(s,'parasite');s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];for(let i=0;i<40;i++)tickIsaacCombat(s,.05,()=>{});
 assert.equal(s.isaac.larvae.length,4);
});

test('parasite organs preserve each rank damage in automatic broods',()=>{
 const s=createRun();s.organs=[createPart(s,'parasite',1),createPart(s,'parasite',5)];s.enemies=[{id:1,x:5,y:0,z:0,hp:10000,radius:1,kind:'normal'}];
 for(let i=0;i<40;i++)tickIsaacCombat(s,.05,()=>{});
 assert.deepEqual(s.isaac.larvae.map(l=>l.damage),[6,6,18,18]);
 assert.equal(new Set(s.isaac.larvae.map(l=>`${l.x},${l.z}`)).size,4);
});

test('duplicate attack organs retain their contributions; mirrors add up their resonance',()=>{
 const common=createRun();common.arms=[createPart(common,'harpoon')];common.organs=parts(common,'commonNerve');common.enemies=[{id:1,x:0,y:0,z:2,hp:1000,maxHp:1000,kind:'normal',armor:0,radius:.5,speed:0,contact:99,damage:1,born:0,xp:0}];
 const base=weaponStats(common,common.arms[0]).damage;attack(common,0);near(common.shots[0].w.damage,base*1.5);
 const heart=createRun();heart.organs=parts(heart,'reverseHeart');heart.enemies=[{hp:1000,x:1,y:0,z:0,kind:'normal'}];heal(heart,stats(heart).hp);let pulse=0;tickIsaacCombat(heart,0,(e,d)=>pulse+=d);near(pulse,weaponStats(heart,heart.arms[0]).damage*4);
 const mirror=createRun();mirror.organs=parts(mirror,'mirrorGland');mirror.organs[0].tier=1;mirror.organs[1].tier=5;near(resonanceBonus(mirror),.06);mirror.organs=[mirror.organs[1]];near(resonanceBonus(mirror),.05);
});

test('duplicate shields charge and block independently with a visible charge count',()=>{
 const s=createRun();s.rng=()=>.99;s.organs=parts(s,'shield');const st=stats(s);assert.equal(st.shieldMax,2);
 tickHealth(s,st);s.time=15;tickHealth(s,st);assert.deepEqual(s.organs.map(p=>p.shieldCharge),[1,1]);
 const ready=healthView(s,st.hp);assert.equal(ready.shieldCharges,2);assert.match(healthSegments(ready),/>2</);
 assert.equal(receiveHit(s,st),'shield');s.time+=.5;assert.equal(receiveHit(s,st),'shield');assert.equal(healthView(s,st.hp).shieldCharges,0);
});
