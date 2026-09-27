import {CATALOG,ORGANS} from '../src/catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {upgrade,createPart,stats} from '../src/assembly.js';
import {itemInspectorData,catalogInspectorData} from '../src/ui/item-inspector-data.js';
import {describePart,catalogDescription,formatUiNumber} from '../src/ui/adapters.js';
import {partArt} from '../src/ui/molecules.js';
test('preview matches paid upgrade without mutating the live run',()=>{
 const s=createRun();s.biomass=1000;const p=s.arms[0];
 for(const stat of ['damage']){
  const before=JSON.stringify(s),model=itemInspectorData(s,p,stat);
  assert.equal(JSON.stringify(s),before);
  assert.equal(upgrade(s,p.id,stat,true),true);
  assert.equal(itemInspectorData(s,p,stat).preview.before,model.preview.after);
 }
});
test('inspector disables unaffordable and exhausted upgrades; inventory cannot upgrade',()=>{
 const s=createRun(),p=s.arms[0];s.biomass=0;assert.equal(itemInspectorData(s,p).disabled,true);
 p.upgrades.damage=20;assert.equal(itemInspectorData(s,p).preview,null);assert.equal(itemInspectorData(s,p).disabled,true);
 const spare=createPart(s,'claws');s.inventory.push(spare);assert.equal(itemInspectorData(s,spare).preview,null);assert.equal(itemInspectorData(s,spare).actionLabel,undefined);
});
test('capacity preview does not heal or change wounds on the live run',()=>{
 const s=createRun();const before=JSON.stringify(s);const model=itemInspectorData(s,s.body,'capacity');assert.equal(JSON.stringify(s),before);assert.equal(model.preview.after,'99');
});

test('body inspectors show the trait rule without live bonus status text',()=>{
 const s=createRun(),installed=itemInspectorData(s,s.body);
 assert.equal(installed.rows.some(r=>r.label==='Состояние бонуса'),false);assert.equal(installed.rows.some(r=>r.label==='Бонус корпуса'),false);assert.ok(installed.lines.some(line=>line.includes('скорость движения +20%')));
 assert.doesNotMatch(describePart(s,s.body).lines.join(' '),/Скорость: Активно|Уклонение: Неактивно/);
 s.legs[1]=null;assert.equal(itemInspectorData(s,s.body).rows.some(r=>r.label==='Состояние бонуса'),false);assert.doesNotMatch(describePart(s,s.body).lines.join(' '),/Скорость: Неактивно/);
 const spare=createPart(s,'bastion');s.inventory.push(spare);const spareModel=itemInspectorData(s,spare);assert.equal(spareModel.rows.some(r=>r.label==='Состояние бонуса'),false);assert.ok(spareModel.lines.some(line=>line.includes('эффективность всех органов +30%')));
 const catalogModel=catalogInspectorData(s,'bastion');assert.equal(catalogModel.rows.some(r=>r.label==='Состояние бонуса'),false);assert.ok(catalogModel.lines.some(line=>line.includes('эффективность всех органов +30%')));
});
test('broodmother shows its current drone count once without a redundant active state',()=>{
 const s=createRun(),p=createPart(s,'broodmother',5);s.body=p;
 const model=itemInspectorData(s,p),text=[...model.rows.map(r=>`${r.label}: ${r.value}`),...model.lines].join(' ');
 assert.equal(model.rows.some(r=>r.label==='Состояние бонуса'),false);
 assert.equal(model.rows.some(r=>r.label==='Бонус корпуса'),false);
 assert.equal((text.match(/5 постоянных неуязвимых дронов/g)||[]).length,1);
 assert.doesNotMatch(text,/перехват/i);
});
test('rare common nerve has no contradictory common label and exposes its real volley upgrade',()=>{
 const s=createRun(),p=createPart(s,'commonNerve');p.rarity='rare';s.organs[0]=p;
 const m=itemInspectorData(s,p);assert.ok(!m.subtitle.includes('Обычная'));assert.ok(m.lines.some(l=>l.includes('Эпическая')));
 assert.equal(m.rows.some(r=>r.label==='Совместимость'),false);assert.equal(m.preview.label,'Урон общего залпа');assert.equal(m.preview.before,'+50%');assert.equal(m.preview.after,'+60%');assert.match(m.actionLabel,/Улучшить/);
 s.arms[0]=createPart(s,'seed');const rows=itemInspectorData(s,p).rows;assert.ok(!rows.some(r=>['Категория','Совместимое оружие','Сейчас влияет на'].includes(r.label)));
});

test('common nerve paid upgrades add ten volley damage points and stop at ten',()=>{
 const s=createRun(),p=createPart(s,'commonNerve');s.organs[0]=p;s.biomass=10000;
 for(let i=0;i<10;i++){
  const model=itemInspectorData(s,p);assert.deepEqual(model.options,[{key:'commonVolley',label:'Урон общего залпа'}]);
  assert.deepEqual(model.preview,{label:'Урон общего залпа',before:`+${50+10*i}%`,after:`+${60+10*i}%`});
  assert(upgrade(s,p.id,'commonVolley',true));
 }
 assert.equal(upgrade(s,p.id,'commonVolley',true),false);assert.equal(itemInspectorData(s,p).notice,'Все доступные улучшения получены');
});

test('reverse heart paid upgrades add twenty pulse damage points and stop at ten',()=>{
 const s=createRun(),p=createPart(s,'reverseHeart');s.organs[0]=p;s.biomass=10000;
 for(let i=0;i<10;i++){
  const model=itemInspectorData(s,p);assert.deepEqual(model.options,[{key:'heartDamage',label:'Урон импульса'}]);
  assert.deepEqual(model.preview,{label:'Урон импульса',before:`${200+20*i}%`,after:`${220+20*i}%`});
  assert.ok(model.rows.some(r=>r.label==='Эффект'&&r.value.includes(`${200+20*i}% от сильнейшего установленного оружия`)));
  assert(upgrade(s,p.id,'heartDamage',true));
 }
 assert.equal(upgrade(s,p.id,'heartDamage',true),false);assert.equal(itemInspectorData(s,p).notice,'Все доступные улучшения получены');
});

test('shield ranks improve its starting recharge and paid upgrades remove one second',()=>{
 for(const [tier,seconds] of [[1,15],[2,14],[3,13],[4,12],[5,11]]){
  const s=createRun(),p=createPart(s,'shield',tier);s.organs[0]=p;s.biomass=10000;
  const model=itemInspectorData(s,p);assert.deepEqual(model.options,[{key:'shieldRecharge',label:'Восстановление щита'}]);
  assert.deepEqual(model.preview,{label:'Восстановление щита',before:`${seconds} с`,after:`${seconds-1} с`});
 }
 const s=createRun(),p=createPart(s,'shield');s.organs[0]=p;s.biomass=10000;
 for(let i=0;i<10;i++){const model=itemInspectorData(s,p);assert.equal(model.preview.before,`${15-i} с`);assert.equal(model.preview.after,`${14-i} с`);assert(upgrade(s,p.id,'shieldRecharge',true));}
 assert.equal(upgrade(s,p.id,'shieldRecharge',true),false);assert.equal(itemInspectorData(s,p).notice,'Все доступные улучшения получены');
});

test('every organ rank changes its displayed core effect',()=>{
 for(const key of Object.keys(ORGANS)){
  if(key==='revivalCore')continue; // one-shot revival does not scale with rank
  const s=createRun(),low=createPart(s,key,1),high=createPart(s,key,5);s.organs[0]=low;
  const label=key==='reverseStomach'?'Здоровье детали':'Эффект';
  const lowEffect=itemInspectorData(s,low).rows.find(r=>r.label===label)?.value;s.organs[0]=high;
  const highEffect=itemInspectorData(s,high).rows.find(r=>r.label===label)?.value;
  assert.notEqual(highEffect,lowEffect,key);
 }
});

test('all-hand organs do not repeat the installed weapon list',()=>{
 const s=createRun();s.arms=[createPart(s,'claws'),createPart(s,'seed')];
 for(const key of ['slime','parasite']){
  const model=itemInspectorData(s,createPart(s,key));
  assert.ok(!model.lines.some(line=>line.startsWith('Действует на:')));
 }
});

test('catalog inspectors describe every base part without actions or run mutations',()=>{
 const s=createRun(),before=JSON.stringify(s);
 for(const key of Object.keys(CATALOG)){
  const model=catalogInspectorData(s,key);
  assert.ok(model.rows.some(r=>r.label==='Вес'));
  assert.equal(model.actionLabel,undefined);
  assert.equal(model.dropLabel,undefined);
  assert.equal(model.preview,undefined);
  assert.equal(model.biomass,undefined);
  assert.equal(model.notice,undefined);
 }
 assert.equal(JSON.stringify(s),before);
});

test('each item category leads with its useful property, before weight',()=>{
 const s=createRun();
 for(const key of Object.keys(CATALOG)){
  const p=createPart(s,key),m=itemInspectorData(s,p),kind=CATALOG[key].kind;
  assert.equal(m.rows.at(-1).label,'Вес',key);
  if(kind==='arm')assert.equal(m.rows[0].label,'Урон',key);
  if(kind==='body'){assert.equal(m.rows[0].label,'Здоровье корпуса');assert.equal(m.rows.some(r=>r.label==='Броня детали'),CATALOG[key].armor>0);}
  if(kind==='leg')assert.equal(m.rows[0].label,'Скорость движения');
  if(kind==='organ')assert.ok(m.rows.some(r=>r.label==='Эффект'&&r.value),key);
  assert.ok(m.rows.every(r=>r.value!==undefined&&!String(r.value).includes('NaN')),key);
 }
 const p=createPart(s,'plated');assert.equal(itemInspectorData(s,p).rows.find(r=>r.label==='Броня детали').value,'0,5 пласт.');
});

test('player health and armor item values use only whole or half units',()=>{
 const expectedBodyArmor={bastion:1,rootwalker:1};
 for(const [key,d] of Object.entries(CATALOG))for(let tier=1;tier<=5;tier++){
  const s=createRun(),p=createPart(s,key,tier),model=itemInspectorData(s,p);
  for(const row of model.rows.filter(r=>['Здоровье корпуса','Здоровье детали','Броня детали'].includes(r.label))){
   const value=Number(String(row.value).match(/\d+(?:[.,]\d+)?/)?.[0].replace(',','.'));
   assert.equal(Number.isInteger(value*2),true,`${key} rank ${tier}: ${row.label} = ${row.value}`);
  }
  if(d.kind==='body'){
   s.body=p;
   assert.equal(Number.isInteger(stats(s).hp*2),true,`${key} rank ${tier}: runtime health`);
   assert.equal(Number.isInteger(stats(s).armor*2),true,`${key} rank ${tier}: runtime armor`);
  }
 }
 for(const [key,armor] of Object.entries(expectedBodyArmor)){
  const s=createRun(),p=createPart(s,key);s.body=p;
  assert.equal(itemInspectorData(s,p).rows.find(r=>r.label==='Броня детали').value,`${String(armor).replace('.',',')} пласт.`);
  assert.equal(stats(s).armor,armor+.5);
 }
 for(const key of ['chimera','hecaton']){const s=createRun(),p=createPart(s,key);s.body=p;assert.equal(itemInspectorData(s,p).rows.some(r=>r.label==='Броня детали'),false);assert.equal(stats(s).armor,.5);}
});

test('ranked leg speed is reflected in the stat without a duplicate explanation',()=>{
 const s=createRun(),p=createPart(s,'universal',2),model=itemInspectorData(s,p);
 assert.equal(model.rows.find(r=>r.label==='Скорость движения').value,'7,2 м/с');
 assert.ok(!model.lines.some(line=>line.includes('Ранг усиливает скорость движения')));
});

test('leg inspectors show current stats without rank formulas',()=>{
 const s=createRun();
 for(const key of Object.keys(CATALOG)){
  const part=createPart(s,key,3),model=itemInspectorData(s,part),forbidden=/за ранг|от ранга|ранг выше|ранг усиливает/i;
  assert.doesNotMatch([...model.rows.map(r=>`${r.label}: ${r.value}`),...model.lines].join(' '),forbidden,key);
  assert.doesNotMatch(describePart(s,part).lines.join(' '),forbidden,key);
  assert.doesNotMatch(catalogDescription(CATALOG[key])||'',forbidden,key);
 }
 assert.equal(itemInspectorData(s,createPart(s,'plated')).lines.some(line=>line.startsWith('Добавляет броню')),false);
 assert.equal(itemInspectorData(s,createPart(s,'root',3)).rows.some(r=>r.label==='Здоровье детали'),true);
});

test('spring inspector shows only the current rank cooldown',()=>{
 const s=createRun();
 for(const [tier,seconds] of [[1,'10 с'],[2,'8,75 с'],[3,'7,5 с'],[4,'6,25 с'],[5,'5 с']]){
  const p=createPart(s,'spring',tier),model=itemInspectorData(s,p);
  assert.equal(model.rows.find(r=>r.label==='Время перезарядки')?.value,seconds);
  assert.doesNotMatch(describePart(s,p).lines.join(' '),/10 \/ 8,75 \/ 7,5/);
 }
});

test('fangs inspector shows current-rank healing and charges without slash notation',()=>{
 const s=createRun();
 for(const [tier,percent] of [[1,5],[2,6],[3,7],[4,8],[5,9]]){
  const p=createPart(s,'fangs',tier),model=itemInspectorData(s,p);
  assert.equal(model.rows.find(r=>r.label==='Эффект')?.value,`Восстанавливает ${percent}% максимального HP при атаке.`);
  assert.equal(model.rows.find(r=>r.label==='Заряды')?.value,'2 из 2');
  assert.doesNotMatch([...model.rows.map(r=>r.value),...describePart(s,p).lines].join(' '),/\d\s*\/\s*\d/);
 }
});

test('all item descriptions and inspector ranks avoid slash-separated values',()=>{
 const slash=/\d\s*\/\s*\d/,decimalDot=/\d\.\d/;
 for(const key of Object.keys(CATALOG))for(let tier=1;tier<=5;tier++){
  const s=createRun(),p=createPart(s,key,tier),item=itemInspectorData(s,p),catalog=catalogInspectorData(s,key,tier);
  const copy=[...item.rows.map(r=>`${r.label}: ${r.value}`),...item.lines,...catalog.rows.map(r=>`${r.label}: ${r.value}`),...catalog.lines,...describePart(s,p).lines,catalogDescription(CATALOG[key])].join(' ');
  assert.doesNotMatch(copy,slash,`${key} rank ${tier}`);
  assert.doesNotMatch(copy,decimalDot,`${key} rank ${tier}`);
  assert.doesNotMatch(copy,/\.\./,`${key} rank ${tier}`);
  assert.doesNotMatch(copy,/\+0 HP/,`${key} rank ${tier}`);
  assert.match(catalogDescription(CATALOG[key]),/[.!?]$/,`${key} catalog`);
  for(const effect of item.rows.filter(r=>r.label==='Эффект')){
   assert.match(effect.value,/[.!?]$/,`${key} rank ${tier} effect`);
   assert.doesNotMatch(effect.value,/^(Лечение|Призыв):/,`${key} rank ${tier} effect`);
  }
 }
});

test('repair kit effect stays concise',()=>{
 const s=createRun(),effect=describePart(s,createPart(s,'repairGland')).lines[0];
 assert.equal(effect,'Усиливает бонус способности корпуса на 20%. Складываются два сильнейших Ремкомплекта.');
 assert.doesNotMatch(effect,/ранг ускоряет|не даёт броню|попадания не сбрасывают/);
 assert.equal(catalogDescription(CATALOG.repairGland),'Усиливает бонус способности корпуса на 20%. Ранг добавляет 10%, каждое улучшение — 2%. Складываются два сильнейших Ремкомплекта.');
});

test('base item properties stay in stats while chassis rules join the ordinary description',()=>{
 const s=createRun();
 for(const key of Object.keys(CATALOG)){
  const part=createPart(s,key);part.rarity='common';part.affixes=[];
  const model=itemInspectorData(s,part);
  assert.equal(model.lines.length,CATALOG[key].kind==='body'?2:1,key);
  assert.equal(model.lines[0],'Обычная',key);
  assert.equal(model.setBonus,null,key);
 }
 const rare=createPart(s,'seed');rare.rarity='rare';rare.affixes=[{stat:'damage',value:.1}];
 const model=itemInspectorData(s,rare);
 assert.deepEqual(model.lines.slice(1),['Урон этого оружия +10%']);
 assert.equal(model.rows.some(r=>r.label==='Эффект'),false);
 assert.equal(model.rows.filter(r=>r.label==='Магазин').length,1);
 assert.equal(model.rows.filter(r=>r.label==='Время перезарядки').length,1);
 assert.equal(itemInspectorData(s,createPart(s,'claws')).rows.filter(r=>r.label==='Заряды').length,1);
 assert.equal(itemInspectorData(s,createPart(s,'commonNerve')).rows.some(r=>r.label==='Свойство'),false);
});

test('every weapon omits prose that repeats common numeric characteristics',()=>{
 const s=createRun();
 for(const key of Object.keys(CATALOG).filter(key=>CATALOG[key].kind==='arm')){
  const model=itemInspectorData(s,createPart(s,key));
  const special=model.rows.filter(r=>!['Урон','Скорость атаки','Дальность','Крит','Магазин','Заряды','Перезарядка','Вес'].includes(r.label));
  assert.ok(special.every(r=>(key==='shotgun'&&r.label==='Синергия')||!/перезаряд|магазин/i.test(r.value)),key);
  assert.equal(new Set(model.rows.map(r=>`${r.label}\u0000${r.value}`)).size,model.rows.length,key);
 }
 assert.equal(itemInspectorData(s,createPart(s,'seed')).rows.some(r=>r.label==='Эффект'),false);
 assert.equal(describePart(s,createPart(s,'seed')).lines.filter(line=>/перезаряд/i.test(line)).length,1);
 assert.equal(describePart(s,createPart(s,'root')).lines.filter(line=>/восстанавливает 1 деление|регенерация/i.test(line)).length,1);
});

test('starter pistol shows its critical profile and uses dedicated transparent art',()=>{
 const s=createRun(),critical=itemInspectorData(s,createPart(s,'pistol')).rows.find(row=>row.label==='Крит');
 assert.equal(critical.value,'30% · ×2');
 assert.match(partArt('pistol'),/items\/pistol-arm-v2\.png/);
});

test('armor affix is shown only once in the general description',()=>{
 const s=createRun(),p=createPart(s,'stabilizer');p.rarity='uncommon';p.affixes=[{stat:'armor',value:1}];
 const model=itemInspectorData(s,p);
 assert.equal(model.rows.some(r=>r.label==='Броня детали'),false);
 assert.equal(model.lines.filter(line=>line==='Броня +1').length,1);
});


test('return nerve inspector shows the current rank and chassis damage bonus',()=>{
 const s=createRun();s.body=createPart(s,'bastion');s.isaac={deals:{organs:1}};
 for(const [tier,percent] of [[1,10],[2,20],[3,30],[4,40],[5,50]]){
  const p=createPart(s,'returnNerve',tier);s.organs=[p,createPart(s,'stabilizer'),createPart(s,'regen'),null];
  assert.ok(itemInspectorData(s,p).rows.some(r=>r.label==='Эффект'&&r.value.includes(`${percent}% урона`)));
  s.organs[3]=createPart(s,'digestion');assert.ok(itemInspectorData(s,p).rows.some(r=>r.label==='Эффект'&&r.value.includes(`${percent*1.3}% урона`)));
 }
});

test('parasite inspector shows autonomous larva damage and summon interval',()=>{
 const s=createRun();
 for(const [tier,damage] of [[1,6],[2,9],[3,12],[4,15],[5,18]]){
  const p=createPart(s,'parasite',tier);s.body=createPart(s,'wanderer');s.organs=[p];
  let text=itemInspectorData(s,p).rows.find(r=>r.label==='Эффект').value;
  assert.ok(text.includes(`Урон личинки — ${damage};`));assert.ok(text.includes('каждые 2 с'));assert.ok(text.includes('по врагу в радиусе 12 м'));
  s.body=createPart(s,'bastion');s.organs=[p,createPart(s,'stabilizer'),createPart(s,'regen'),createPart(s,'digestion')];
  text=itemInspectorData(s,p).rows.find(r=>r.label==='Эффект').value;assert.ok(text.includes(`Урон личинки — ${formatUiNumber(damage*1.3)};`));
 }
});

test('Cooler inspector shows five second damage and slowdown at every organ rank',()=>{
 const s=createRun();
 for(const [tier,percent] of [[1,10],[2,20],[3,30],[4,40],[5,50]]){
  const p=createPart(s,'slime',tier),effect=itemInspectorData(s,p).rows.find(r=>r.label==='Эффект').value;
  assert.match(effect,new RegExp(`наносит ${percent}% урона попадания за 5 с`));assert.match(effect,/замедляет врага на 10%/);
 }
});

test('Cooler paid upgrades add one damage point, preview exactly and stop at ten',()=>{
 const s=createRun(),p=createPart(s,'slime');s.organs[0]=p;s.biomass=10000;
 for(let i=0;i<10;i++){
  const model=itemInspectorData(s,p);assert.deepEqual(model.options,[{key:'slimeSlow',label:'Урон Охладителя'}]);
  assert.deepEqual(model.preview,{label:'Урон Охладителя',before:`${10+i}%`,after:`${11+i}%`});
  assert(upgrade(s,p.id,'slimeSlow',true));
 }
 assert.equal(upgrade(s,p.id,'slimeSlow',true),false);assert.equal(itemInspectorData(s,p).notice,'Все доступные улучшения получены');
});

test('parasite paid upgrades add 2.4 damage, preview exactly and stop at ten',()=>{
 const s=createRun(),p=createPart(s,'parasite');s.organs[0]=p;s.biomass=10000;
 for(let i=0;i<10;i++){
  const model=itemInspectorData(s,p);assert.deepEqual(model.options,[{key:'larvaDamage',label:'Урон личинок'}]);
  assert.deepEqual(model.preview,{label:'Урон личинок',before:formatUiNumber(6+2.4*i),after:formatUiNumber(8.4+2.4*i)});
  assert(upgrade(s,p.id,'larvaDamage',true));
 }
 assert.equal(upgrade(s,p.id,'larvaDamage',true),false);
 const boosted=createPart(s,'parasite');s.body=createPart(s,'bastion');s.organs=[boosted,createPart(s,'stabilizer'),createPart(s,'regen'),createPart(s,'digestion')];s.biomass=1000;
 assert.deepEqual(itemInspectorData(s,boosted).preview,{label:'Урон личинок',before:'7,8',after:'10,92'});
});

test('return nerve paid upgrades preview exact percentages, charge once and stop at ten',()=>{
 const s=createRun(),p=createPart(s,'returnNerve');s.organs[0]=p;s.biomass=10000;
 for(let i=0;i<10;i++){
  const before=JSON.stringify(s),model=itemInspectorData(s,p);
  assert.equal(JSON.stringify(s),before);assert.deepEqual(model.options,[{key:'returnDamage',label:'Возвратный урон'}]);
  assert.deepEqual(model.preview,{label:'Возвратный урон',before:`${10+3*i}%`,after:`${13+3*i}%`});
  const biomass=s.biomass,spent=p.spent;assert(upgrade(s,p.id,'returnDamage',true));assert.equal(biomass-s.biomass,p.spent-spent);
  assert.ok(itemInspectorData(s,p).rows.some(r=>r.label==='Эффект'&&r.value.includes(`${13+3*i}% урона`)));
 }
 const before=JSON.stringify(s);assert.equal(upgrade(s,p.id,'returnDamage',true),false);assert.equal(JSON.stringify(s),before);
 assert.equal(itemInspectorData(s,p).notice,'Все доступные улучшения получены');
 const other=createPart(s,'returnNerve');s.organs[0]=other;s.biomass=0;assert.equal(upgrade(s,other.id,'returnDamage',true),false);assert.deepEqual(other.upgrades,{});
 s.body=createPart(s,'bastion');s.isaac={deals:{organs:1}};s.organs=[other,createPart(s,'stabilizer'),createPart(s,'regen'),createPart(s,'digestion')];s.biomass=1000;assert.deepEqual(itemInspectorData(s,other).preview,{label:'Возвратный урон',before:'13%',after:'16,9%'});
});
