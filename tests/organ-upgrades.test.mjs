import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,upgrade,upgradeOptions,upgradeLimit,regenerationDelay,armorPlateCapacity,unequip,equip,resonanceBonus} from '../src/assembly.js';
import {ORGAN_UPGRADE_STATS,RESONANCE_RANK_STEP,RESONANCE_UPGRADE_STEP} from '../src/systems/organ-upgrades.js';
import {modifiers,RESONANCE_EXEMPT} from '../src/systems/abilities.js';
import {receiveHit,tickHealth,armorRemaining} from '../src/systems/health.js';
import {tickExtraParts} from '../src/systems/extra-parts.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {describePart} from '../src/ui/adapters.js';
import {translateText} from '../src/i18n/index.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(key,tier=1){const s=createRun();s.body.tier=5;s.body.setId='hecaton';s.organs=[createPart(s,key,tier),null];s.hp=stats(s).hp;s.biomass=2000;s.rng=()=>.99;return s;}
for(const [key,stat] of Object.entries(ORGAN_UPGRADE_STATS))for(const tier of [1,5])test(`${key} tier ${tier}: prices, previews, limit, save and inventory`,()=>{
 const s=fixture(key,tier),p=s.organs[0],limit=key==='armor'?2:20;assert.equal(upgradeLimit(p),limit);
 let spent=0;for(let i=0;i<limit;i++){
  const before=JSON.stringify(s),model=itemInspectorData(s,p);assert.equal(JSON.stringify(s),before);assert.ok(model.preview,key);assert.equal(model.maxRank,limit);
  assert.match(model.actionLabel,new RegExp(String(12+6*i)+'$'));assert.ok(upgrade(s,p.id,stat,true));spent+=12+6*i;
  if(i<limit-1)assert.equal(itemInspectorData(s,p).preview.before,model.preview.after);
 }
 assert.equal(spent,limit===2?30:1380);assert.equal(p.spent,spent);assert.equal(s.biomass,2000-spent);
 const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,stat,true),false);assert.equal(JSON.stringify(s),before);assert.equal(itemInspectorData(s,p).notice,'Все доступные улучшения получены');
 const saved=JSON.parse(JSON.stringify(p));assert.deepEqual(saved.upgrades,p.upgrades);
 assert.ok(unequip(s,'organs',0));assert.equal(upgrade(s,p.id,stat,true),false);assert.equal(itemInspectorData(s,p).preview,null);
 assert.equal(upgradeLimit(s.arms[0]),20);
});
test('base and maximum effects, fixed plate increments after body boost',()=>{
 const s=fixture('reflexNerve'),p=s.organs[0];s.body=createPart(s,'reactor');near(stats(s).dodge,.1);p.upgrades.sensorDodge=20;near(stats(s).dodge,.2);
 for(const key of ['regen','repairGland']){const q=createPart(s,key);s.organs=[q,null];const measure=()=>key==='regen'?stats(s).regenDelay:stats(s).armorRepairDelay;const start=measure();q.upgrades[ORGAN_UPGRADE_STATS[key]]=20;near(start/measure(),1.6);}
 const plate=createPart(s,'armor');const base=armorPlateCapacity(plate,1.3);plate.upgrades.plateCapacity=2;near(armorPlateCapacity(plate,1.3),base+1);
});
test('70% dodge and capped stats reject ineffective purchases without spending',()=>{
 const s=fixture('reflexNerve',5),p=s.organs[0];s.organs=[p,...Array.from({length:3},()=>createPart(s,'reflexNerve',5))];near(stats(s).dodge,.7);
 const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,'sensorDodge',true),false);assert.equal(JSON.stringify(s),before);assert.equal(itemInspectorData(s,p).notice,'Достигнут предел сборки');
 s.organs=[p,null];assert.ok(upgrade(s,p.id,'sensorDodge',true));
 const a=fixture('armor',5);a.body.tier=1;a.organs.push(createPart(a,'armor',5));assert.equal(stats(a).armor,stats(a).hp);assert.deepEqual(upgradeOptions(a.organs[0],a),[]);
 const r=fixture('regen');r.legs.forEach((_,i)=>{r.legs[i]=createPart(r,'root');r.legs[i].upgrades.regen=10;});near(stats(r).regenDelay,.5);assert.equal(upgrade(r,r.organs[0].id,'regenRate',true),false);
});
test('repair and regeneration retain timer fractions; purchases never heal or fill new armor',()=>{
 for(const key of ['regen','repairGland']){const s=fixture(key),p=s.organs[0];s.hp--;s.health.missing=1;s.health.armorSpent=1;tickHealth(s,stats(s));s.time=5;const prop=key==='regen'?'regenAt':'armorRepairAt',duration=key==='regen'?'regenDelay':'armorRepairDelay',old=s.health[duration],remaining=(s.health[prop]-5)/old,hp=s.hp,spent=s.health.armorSpent;
  assert.ok(upgrade(s,p.id,ORGAN_UPGRADE_STATS[key],true));near((s.health[prop]-5)/s.health[duration],remaining);tickHealth(s,stats(s));assert.equal(s.hp,hp);assert.equal(s.health.armorSpent,spent);
 }
 const s=fixture('armor'),p=s.organs[0];s.health.armorSpent=.5;const before=armorRemaining(s,stats(s).armor);assert.ok(upgrade(s,p.id,'plateCapacity',true));near(armorRemaining(s,stats(s).armor),before);s.time=15;tickHealth(s,stats(s));near(armorRemaining(s,stats(s).armor),before+.5);
});
test('regeneration applies weighted upgrade multiplier after roots without amplifying their subtraction',()=>{
 const s=fixture('regen'),p=s.organs[0],q=createPart(s,'regen',5);s.organs=[p,q];s.legs[0]=createPart(s,'root');s.legs[0].upgrades.regen=1;const base=regenerationDelay(s);p.upgrades.regenRate=20;near(regenerationDelay(s),base/((1.6+1.8)/2.8));q.upgrades.regenRate=20;near(regenerationDelay(s),Math.max(.5,base/1.6));
});
test('reactor gives each casing two hits before its full recharge',()=>{
 const shieldRun=fixture('shield'),shield=shieldRun.organs[0];shieldRun.body=createPart(shieldRun,'reactor');shield.shieldCharge=1;
 tickHealth(shieldRun,stats(shieldRun));assert.equal(stats(shieldRun).shieldMax,2);assert.equal(shield.shieldCharge,2);
 assert.equal(receiveHit(shieldRun,stats(shieldRun)),'shield');assert.equal(shield.shieldCharge,1);assert.equal(shield.shieldReadyAt,null);
 assert.equal(receiveHit(shieldRun,stats(shieldRun)),'shield');assert.equal(shield.shieldCharge,0);assert.ok(shield.shieldReadyAt>shieldRun.time);assert.notEqual(receiveHit(shieldRun,stats(shieldRun)),'shield');
 shieldRun.time=shield.shieldReadyAt;tickHealth(shieldRun,stats(shieldRun));assert.equal(shield.shieldCharge,2);
});
test('the reflector resonates every invested percentage bonus and leaves counts alone',()=>{
 const s=fixture('mirrorGland',1),p=s.organs[0];
 near(resonanceBonus(s),RESONANCE_RANK_STEP);
 p.tier=5;near(resonanceBonus(s),RESONANCE_RANK_STEP*5);
 assert.ok(upgrade(s,p.id,'resonance',true));near(resonanceBonus(s),RESONANCE_RANK_STEP*5+RESONANCE_UPGRADE_STEP);
 const bare=createRun();bare.organs=[null,null];assert.equal(resonanceBonus(bare),0);
 const owner=createRun();owner.abilities.learned=['might.0','tempo.0','projectiles.0'];owner.abilities.levels={'might.0':1,'tempo.0':1,'projectiles.0':1};
 const before={...modifiers(owner)};assert.ok(before.damage>0&&before.rate>0&&before.extra>0);
 owner.organs=[createPart(owner,'mirrorGland',5),null];const after=modifiers(owner);
 for(const [key,amount] of Object.entries(before))if(typeof amount==='number')near(after[key],amount>0&&!RESONANCE_EXEMPT.has(key)?amount+RESONANCE_RANK_STEP*5:amount);
});
test('old retaliation is removed and new descriptions translate',()=>{
 const s=fixture('mirrorGland');s.health.hits=1;s.enemies=[{hp:100,x:1,y:0,z:0,kind:'normal'}];let damage=0;tickExtraParts(s,0,(_,n)=>damage+=n);assert.equal(damage,0);
 const data=itemInspectorData(s,s.organs[0]);for(const text of [describePart(s,s.organs[0]).lines[0],data.preview.label,...data.rows.flatMap(r=>[r.label,r.value])])assert.doesNotMatch(translateText(text),/[А-Яа-яЁё]/,text);
});
test('new paid upgrades reject insufficient biomass without touching instances or timers',()=>{
 for(const [key,stat] of Object.entries(ORGAN_UPGRADE_STATS)){const s=fixture(key);s.biomass=11;const p=s.organs[0];const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,stat,true),false,key);assert.equal(JSON.stringify(s),before);assert.equal(itemInspectorData(s,p).disabled,true);}
});
