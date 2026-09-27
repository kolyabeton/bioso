import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CATALOG,WEAPONS,LEGS,ORGANS} from '../src/catalog.js';
import {createRun} from '../src/game.js';
import {createPart,weaponStats,legHealth,legArmor} from '../src/assembly.js';
import {organEffect} from '../src/systems/body-traits.js';
import {partPropertyRows} from '../src/ui/adapters.js';
import {itemInspectorData,catalogInspectorData} from '../src/ui/item-inspector-data.js';

// Independent closed expectations from docs/UI_ITEM_CONTRACT.md.
// Do not derive/regenerate these names from the implementation under test.
test('atlas does not append Survival drop or boss unlock notices',()=>{
 const screens=readFileSync(new URL('../src/ui/screens.js',import.meta.url),'utf8');
 const atlas=screens.slice(screens.indexOf("if(['catalog-select','catalog-detail'].includes(data.action))"),screens.indexOf('const info=p?describePart'));
 assert.ok(atlas.includes('catalogInspectorData'));
 assert.doesNotMatch(atlas,/До победы над боссом|Может выпадать в выживании/);
});

const armProperties={
 drone:['Призыв','Радиус удара'],harpoon:['Особенность'],
 claws:['Тип атаки'],hammer:['Тип атаки','Особенность'],
 shieldArm:['Защита от снарядов','Радиус ауры','Замедление'],
 drill:['Особенность'],whip:['Тип атаки'],fangs:['Эффект'],seed:[],
 pistol:['Синергия'],shotgun:['Залп','Разброс','Синергия'],needle:['Пробитие'],
 rocket:['Усиления','Залп','Радиус взрыва','Особенность'],arc:['Цели'],acid:['Длительность лужи'],
};
test('Winch copy omits pulling normal enemies',()=>{
 const s=createRun();
 const p=createPart(s,'harpoon',1);
 assert.equal(partPropertyRows(p).find(([label])=>label==='Особенность')[1],'урон по элите и боссам +25%');
 assert.doesNotMatch(CATALOG.harpoon.description,/притягивает обычных врагов/iu);
 assert.doesNotMatch(CATALOG.harpoon.description,/пробива/iu);
 assert.equal(weaponStats(s,p).pierce,1);
 assert.equal(partPropertyRows(p).some(([label])=>label==='Пробитие'),false);
});
const legProperties={swarmLeg:['Урон роя'],spring:['Заряд','Столкновение','Время перезарядки'],root:['Урон'],runner:['Горящий след'],universal:[],plated:[]};
const organKeys=['mirrorGland','reflexNerve','returnNerve','slime','parasite','commonNerve','reverseHeart','regen','shield','armor','repairGland','broodNode','stabilizer','digestion','reverseStomach','accelerator','revivalCore'];
const boostedOrgans=new Set(['reflexNerve','returnNerve','slime','parasite','commonNerve','reverseHeart','regen','shield','armor','stabilizer','accelerator']);
const bodyBonuses={wanderer:['Уклонение','+20%'],reactor:['Восстановление Кожуха','+40%'],hunter:['Критический урон','+25%'],bastion:['Получаемый опыт','+10%'],chimera:['Длительность кислотных луж','+50%'],rootwalker:['Восстановление здоровья','1%/с'],regulator:['Урон по замороженным врагам','+30%'],hecaton:['Время перезарядки оружия','−10% за каждые +10% скорости атаки']};
const bodySpeeds={wanderer:'+3 м/с',reactor:'+2 м/с',hunter:'+1 м/с',chimera:'+2 м/с',regulator:'+1 м/с',hecaton:'+1 м/с',broodmother:'+1 м/с'};
const number='\\d+(?:,\\d{1,2})?';
const sorted=keys=>[...keys].sort();

function plainPart(s,key,tier){
 const p=createPart(s,key,tier);Object.assign(p,{modifier:null,rarity:'common',setId:null,affixes:[],affix:null});return p;
}
function expectedLabels(s,p){
 const d=CATALOG[p.key],labels=[];
 if(d.kind==='arm'){
  const w=weaponStats(s,p);if(p.key==='shieldArm')labels.push('Урон ауры');else labels.push('Урон','Интервал атак','Дальность');
  if(p.key!=='drone'&&p.key!=='shieldArm')labels.push('Крит');
  if(w.magazine)labels.push(['sector','area','contact'].includes(w.mode)?'Заряды':'Магазин','Время перезарядки');
  labels.push(...armProperties[p.key]);
 }else if(d.kind==='body'){
  labels.push('Здоровье корпуса');if(d.armor)labels.push('Броня детали');labels.push('Вместимость','Крепления');if(bodySpeeds[p.key])labels.push('Бонус скорости');if(bodyBonuses[p.key])labels.push(bodyBonuses[p.key][0]);
 }else if(d.kind==='leg'){
  labels.push('Скорость движения');if(legHealth(p)>0)labels.push('Здоровье детали');if(legArmor(p))labels.push('Броня детали');if(d.regen)labels.push('Регенерация');labels.push(...legProperties[p.key]);
 }else{
  if(p.key==='reverseStomach')labels.push('Здоровье детали');
  if(d.armor)labels.push('Броня детали');labels.push('Эффект');
  if(p.key==='digestion')labels.push('Свойство');
  if(boostedOrgans.has(p.key)&&organEffect(s,p.key)>1)labels.push('Бонус корпуса');
 }
 return [...labels,'Вес'];
}
function checkModel(s,p,model,context){
 assert.deepEqual(model.rows.map(r=>r.label),expectedLabels(s,p),context);
 assert.equal(model.rows.at(-1).label,'Вес',context);
 assert.ok(model.rows.every(r=>r.value!==undefined&&!/NaN|undefined/.test(String(r.value))),context);
 assert.ok(!model.rows.some(r=>/DPS|ДПС|урон в секунду/iu.test(r.label)),context);
 for(const r of model.rows){
  if(r.label==='Здоровье детали')assert.match(r.value,new RegExp(`^\\+${number} HP$`),context);
  if(r.label==='Вес'||r.label==='Вместимость')assert.match(r.value,/^\d+$/,context);
  if(r.label==='Интервал атак'||r.label==='Время перезарядки')assert.match(r.value,new RegExp(`^${number} с$`),context);
  if(r.label==='Дальность')assert.match(r.value,/^\d+(?:,\d)? м$/,context);
  if(r.label==='Крит')assert.match(r.value,new RegExp(`^\\d+% · ×${number}$`),context);
  if(r.label==='Магазин'||r.label==='Заряды')assert.match(r.value,/^\d+ из \d+$/,context);
  if(r.label==='Крепления')assert.match(r.value,/^Рук: \d+ · ног: \d+ · органов: \d+$/,context);
  if(r.label==='Бонус скорости')assert.equal(r.value,bodySpeeds[p.key],context);
  if(bodyBonuses[p.key]?.[0]===r.label)assert.equal(r.value,bodyBonuses[p.key][1],context);
 }
}

test('Synchronizer describes extra damage rather than the total multiplier',()=>{
 const s=createRun();
 for(let tier=1;tier<=5;tier++){
  const p=plainPart(s,'commonNerve',tier);
  const effect=itemInspectorData(s,p).rows.find(r=>r.label==='Эффект').value;
  assert.match(effect,/Работает только один Синхронизатор — самый сильный\./);
  assert.match(effect,new RegExp(`общим залпом: \\+${50+(tier-1)*10}% урона\\.`));
 }
});

test('closed special-property lists cover the entire catalog without unapproved exceptions',()=>{
 assert.deepEqual(sorted(Object.keys(WEAPONS)),sorted(Object.keys(armProperties)));
 assert.deepEqual(sorted(Object.keys(LEGS)),sorted(Object.keys(legProperties)));
 assert.deepEqual(sorted(Object.keys(ORGANS)),sorted(organKeys));
 const s=createRun();
 for(const [key,labels] of Object.entries({...armProperties,...legProperties}))for(let tier=1;tier<=5;tier++){
  assert.deepEqual(partPropertyRows(plainPart(s,key,tier)).map(([label])=>label),labels,`${key} ${tier}`);
 }
});

test('every item rank keeps the exact approved row order in inventory, assembly and atlas',()=>{
 for(const [key,d] of Object.entries(CATALOG))for(let tier=1;tier<=5;tier++){
  const s=createRun(),p=plainPart(s,key,tier);s.inventory.push(p);
  checkModel(s,p,itemInspectorData(s,p),`${key} ${tier} inventory`);
  checkModel(s,p,catalogInspectorData(s,key,tier),`${key} ${tier} atlas`);
  if(d.kind==='body')s.body=p;else s[{arm:'arms',leg:'legs',organ:'organs'}[d.kind]][0]=p;
  checkModel(s,p,itemInspectorData(s,p),`${key} ${tier} installed`);
  if(d.kind==='organ'){
   s.body=plainPart(s,'chimera',tier);checkModel(s,p,itemInspectorData(s,p),`${key} ${tier} chassis bonus`);
  }
 }
});

test('shield never adds a DPS row after damage upgrades or across ranks',()=>{
 for(let tier=1;tier<=5;tier++)for(const damage of [0,1,20]){
  const s=createRun(),p=plainPart(s,'shieldArm',tier);s.arms[0]=p;p.upgrades.damage=damage;
  const model=itemInspectorData(s,p);checkModel(s,p,model,`shield ${tier} upgrades ${damage}`);
  assert.equal(model.rows.find(r=>r.label==='Защита от снарядов').value,'50% спереди · сектор 120°');
  assert.equal(model.rows.find(r=>r.label==='Радиус ауры').value,'5 м');
  assert.equal(model.rows.find(r=>r.label==='Замедление').value,'10% за каждый щит');
 }
});

test('an added calculated row fails the contract instead of silently extending it',()=>{
 const s=createRun(),p=plainPart(s,'shieldArm',1),model=itemInspectorData(s,p);
 model.rows.splice(1,0,{label:'DPS',value:'5'});
 assert.throws(()=>checkModel(s,p,model,'unapproved DPS row'),assert.AssertionError);
});

test('Pruner describes third-strike gathering at the end of its reach on every rank',()=>{
 const s=createRun();
 for(let rank=1;rank<=5;rank++){const p=createPart(s,'whip',rank);assert.deepEqual(partPropertyRows(p).filter(([label])=>label==='Тип атаки'),[['Тип атаки','Широкая дуга · каждый удар слегка отталкивает; каждый третий затем стягивает врагов к концу удара; элит — слабее, боссов не перемещает']]);}
 assert.match(CATALOG.whip.description,/к концу удара/);
});

test('Marker has the approved ten metre range',()=>{assert.equal(CATALOG.pistol.range,10);});

test('Pollinator copy explains shared damage for every swarm creature',()=>{
 const text=CATALOG.drone.description;
 assert.equal(text.split(/[.!?]+/).filter(Boolean).length,2);
 assert.match(text,/Суммарный урон включённых Опылителей получают все существа роя и башни Сборщика/);
 assert.match(CATALOG.parasite.description,/Урон усиливают Опылители/);
 assert.match(CATALOG.rocket.description,/Урон усиливают Опылители/);
 assert.equal(partPropertyRows(createPart(createRun(),'rocket')).find(([label])=>label==='Усиления')[1],'Опылители, оружие и рой');
});
