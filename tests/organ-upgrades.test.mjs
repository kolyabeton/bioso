import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,stats,upgrade,upgradeOptions,upgradeLimit,armorPlateCapacity,unequip,equip,resonanceBonus} from '../src/assembly.js';
import {ORGAN_UPGRADE_STATS,RESONANCE_RANK_STEP,RESONANCE_UPGRADE_STEP} from '../src/systems/organ-upgrades.js';
import {ABILITIES,FALLBACKS,abilityDescriptionAtLevel,modifiers,RESONANCE_EXEMPT,learn} from '../src/systems/abilities.js';
import {learnedAbilities,soulAbilityDescription} from '../src/systems/progression.js';
import {setBonuses} from '../src/systems/sets/bonuses.js';
import {chassisTraitBoost} from '../src/systems/body-traits.js';
import {mutationView} from '../src/systems/sets/mutations.js';
import {affixBonus} from '../src/systems/sets/affixes.js';
import {receiveHit,tickHealth,armorRemaining} from '../src/systems/health.js';
import {tickExtraParts} from '../src/systems/extra-parts.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {describePart} from '../src/ui/adapters.js';
import {translateText} from '../src/i18n/index.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(key,tier=1){const s=createRun();s.body.tier=5;s.body.setId='hecaton';s.organs=[createPart(s,key,tier),null];s.hp=stats(s).hp;s.biomass=2000;s.rng=()=>.99;return s;}
for(const [key,stat] of Object.entries(ORGAN_UPGRADE_STATS).filter(([key])=>key!=='repairGland'))for(const tier of [1,5])test(`${key} tier ${tier}: prices, previews, limit, save and inventory`,()=>{
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
for(const tier of [1,5])test(`repairGland tier ${tier}: ten upgrades stay available without an active chassis trait`,()=>{
 const s=fixture('repairGland',tier),p=s.organs[0];s.biomass=1e9;
 assert.equal(upgradeLimit(p),10);
 for(let i=0;i<10;i++)assert.equal(upgrade(s,p.id,'traitBoost',true),true);
 assert.equal(p.upgrades.traitBoost,10);assert.deepEqual(upgradeOptions(p,s),[]);
 const model=itemInspectorData(s,p);assert.equal(model.maxRank,10);assert.equal(model.preview,null);assert.equal(model.notice,'Все доступные улучшения получены');
});
test('base and maximum effects, plate upgrades preserve capacity',()=>{
 const s=fixture('reflexNerve'),p=s.organs[0];s.body=createPart(s,'reactor');near(stats(s).dodge,.1);p.upgrades.sensorDodge=20;near(stats(s).dodge,.2);
 {const q=createPart(s,'regen');s.organs=[q,null];const start=stats(s).regenPerSecond;q.upgrades[ORGAN_UPGRADE_STATS.regen]=20;near(stats(s).regenPerSecond-start,.06);}
 // The Repair Kit scales the chassis trait: 20% at rank I, +2 points per upgrade.
 {const q=createPart(s,'repairGland');s.organs=[q,null];near(chassisTraitBoost(s),.2);
  q.upgrades[ORGAN_UPGRADE_STATS.repairGland]=10;near(chassisTraitBoost(s),.4);
  q.tier=5;near(chassisTraitBoost(s),.8);}
 const plate=createPart(s,'armor');const base=armorPlateCapacity(plate,1.3);plate.upgrades.plateCapacity=2;near(armorPlateCapacity(plate,1.3),base);
});
test('70% dodge and capped stats reject ineffective purchases without spending',()=>{
 const s=fixture('reflexNerve',5),p=s.organs[0];s.organs=[p,...Array.from({length:3},()=>createPart(s,'reflexNerve',5))];near(stats(s).dodge,.7);
 const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,'sensorDodge',true),false);assert.equal(JSON.stringify(s),before);assert.equal(itemInspectorData(s,p).notice,'Достигнут предел сборки');
 s.organs=[p,null];assert.ok(upgrade(s,p.id,'sensorDodge',true));
 const a=fixture('armor',5);a.body.tier=1;a.organs.push(createPart(a,'armor',5));assert.equal(stats(a).armor,stats(a).hp);assert.deepEqual(upgradeOptions(a.organs[0],a),['plateCapacity']);
 const armorBefore=stats(a).armor,rateBefore=stats(a).armorRepairPerSecond,preview=itemInspectorData(a,a.organs[0]).preview;
 assert.equal(preview.label,'Ремонт брони');assert.notEqual(preview.before,preview.after);assert.match(preview.after,/%\/с$/);
 assert.ok(upgrade(a,a.organs[0].id,'plateCapacity',true));near(stats(a).armor,armorBefore);near(stats(a).armorRepairPerSecond-rateBefore,.003);
 const r=fixture('regen');r.legs.forEach((_,i)=>{r.legs[i]=createPart(r,'root');r.legs[i].upgrades.regen=10;});
 // Roots feed continuous regeneration and leave the organ timer untouched.
 near(stats(r).regenPerSecond,.01+.04*r.legs.filter(Boolean).length);assert.ok(upgrade(r,r.organs[0].id,'regenRate',true));
});
test('repair and regeneration retain timer fractions; purchases never heal or fill new armor',()=>{
 {const s=fixture('regen'),p=s.organs[0];s.hp--;s.health.missing=1;s.health.armorSpent=1;tickHealth(s,stats(s));s.time=5;
  const hp=s.hp,spent=s.health.armorSpent;s.health.continuousAt=5;
  assert.ok(upgrade(s,p.id,ORGAN_UPGRADE_STATS.regen,true));assert.equal(s.hp,hp);
  tickHealth(s,stats(s));assert.equal(s.hp,hp);assert.equal(s.health.armorSpent,spent);}
 const s=fixture('armor'),p=s.organs[0];s.health.armorSpent=.5;const before=armorRemaining(s,stats(s).armor);
 assert.ok(upgrade(s,p.id,'plateCapacity',true));near(armorRemaining(s,stats(s).armor),before);
 // Continuous repair closes the spent half plate; tickHealth credits at most one second per call.
 const st=stats(s);for(let i=0;i<80;i++){s.time+=.25;tickHealth(s,st);}
 near(armorRemaining(s,st.armor),Math.min(st.armor,before+20*st.armor*st.armorRepairPerSecond));
});
test('regeneration upgrades add percentage points independently for each organ',()=>{
 const s=fixture('regen'),p=s.organs[0],q=createPart(s,'regen',5);s.organs=[p,q];s.legs[0]=createPart(s,'root');const base=stats(s).regenPerSecond;p.upgrades.regenRate=20;near(stats(s).regenPerSecond,base+.06);q.upgrades.regenRate=20;near(stats(s).regenPerSecond,base+.12);
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
test('Soul shows the effective Targeting Nerves bonus with an installed Reflector',()=>{
 const s=createRun();learn(s,'ranged.0');
 const shown=()=>learnedAbilities(s).find(d=>d.id==='ranged.0').description;
 assert.equal(shown(),'Урон снарядов +15%.');
 const reflector=createPart(s,'mirrorGland',2);s.organs[0]=reflector;
 near(modifiers(s).rangedDamage,.17);
 assert.equal(shown(),'Урон снарядов +17%.');
 reflector.upgrades.resonance=1;
 near(modifiers(s).rangedDamage,.172);
 assert.equal(shown(),'Урон снарядов +17,2%.');
 s.organs[0]=null;
 assert.equal(shown(),'Урон снарядов +15%.');
});
test('Soul updates every resonant ability while preserving fixed values and minor boosts',()=>{
 const s=createRun();s.organs[0]=createPart(s,'mirrorGland',2);
 const echo=resonanceBonus(s);
 for(const d of [...Object.values(ABILITIES),...Object.values(FALLBACKS)]){
  const active=Object.entries(d.bonus).some(([key,value])=>typeof value==='number'&&value>0&&!RESONANCE_EXEMPT.has(key));
  const base=abilityDescriptionAtLevel(d,1),shown=soulAbilityDescription(s,d,1);
  assert.equal(shown!==base,active,d.id);
 }
 assert.match(soulAbilityDescription(s,ABILITIES['melee.3'],1),/\+27%.*4 с/);
 assert.match(soulAbilityDescription(s,ABILITIES['might.3'],1),/\+22%.*−10%/);
 assert.match(soulAbilityDescription(s,ABILITIES['fire.0'],1),/17% шанса.*3 с.*20% урона/);
 assert.match(soulAbilityDescription(s,ABILITIES['detonation.0'],1),/30% итогового урона/);
 assert.equal(soulAbilityDescription(s,FALLBACKS['minor.damage'],2),'Урон всего оружия +8%.');
 assert.equal(soulAbilityDescription(s,FALLBACKS['minor.critPower'],1),'Множитель крита всего оружия +0,07.');
 s.abilities.biomassSpent=500;
 assert.match(soulAbilityDescription(s,ABILITIES.overgrowth,1),/Отражатель: \+2% к общему бонусу урона Души/);
 assert.doesNotMatch(translateText(soulAbilityDescription(s,ABILITIES.overgrowth,1),'en'),/[А-Яа-яЁё]/);
});
test('old retaliation is removed and new descriptions translate',()=>{
 const s=fixture('mirrorGland');s.health.hits=1;s.enemies=[{hp:100,x:1,y:0,z:0,kind:'normal'}];let damage=0;tickExtraParts(s,0,(_,n)=>damage+=n);assert.equal(damage,0);
 const data=itemInspectorData(s,s.organs[0]);for(const text of [describePart(s,s.organs[0]).lines[0],data.preview.label,...data.rows.flatMap(r=>[r.label,r.value])])assert.doesNotMatch(translateText(text),/[А-Яа-яЁё]/,text);
});
test('new paid upgrades reject insufficient biomass without touching instances or timers',()=>{
 for(const [key,stat] of Object.entries(ORGAN_UPGRADE_STATS)){const s=fixture(key);s.biomass=11;const p=s.organs[0];const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,stat,true),false,key);assert.equal(JSON.stringify(s),before);assert.equal(itemInspectorData(s,p).disabled,true);}
});

/** Item 37: the Reflector echoes soul abilities only. Sets, mutations and item
 * affixes are computed outside modifiers(), so they must be untouched by it. */
test('reflector raises soul abilities but never sets, mutations or item affixes',()=>{
 const s=createRun();
 learn(s,'might.0');
 const weapon=createPart(s,'seed');weapon.affixes=[{stat:'damage',value:.1},{stat:'weight',value:.3}];
 s.arms=[weapon,null];
 const before={damage:modifiers(s).damage,sets:JSON.stringify(setBonuses(s)),mutations:JSON.stringify(mutationView(s)),
  affixDamage:affixBonus(weapon,'damage'),affixWeight:affixBonus(weapon,'weight')};
 assert.equal(before.damage,.1);
 s.organs[0]=createPart(s,'mirrorGland',5);
 const after={damage:modifiers(s).damage,sets:JSON.stringify(setBonuses(s)),mutations:JSON.stringify(mutationView(s)),
  affixDamage:affixBonus(weapon,'damage'),affixWeight:affixBonus(weapon,'weight')};
 // The soul ability grows by the reflector's bonus.
 near(after.damage,.15);
 // Everything computed outside the ability map is byte-identical.
 assert.equal(after.sets,before.sets);
 assert.equal(after.mutations,before.mutations);
 assert.equal(after.affixDamage,before.affixDamage);
 assert.equal(after.affixWeight,before.affixWeight);
});
