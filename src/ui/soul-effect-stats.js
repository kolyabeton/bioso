import {OVERGROWTH_STEP} from '../systems/abilities.js';
const n=(value,digits=1)=>Number(Number(value).toFixed(digits)).toString();
const pct=value=>`${n(value*100)}%`;
const signed=value=>`${value<0?'−':'+'}${pct(Math.abs(value))}`;
const seconds=value=>`${n(value,2)} с`;
// Only acquired, nonzero effects are included in the Soul overview.
export function soulEffectGroups(b,s){return [
 {title:'Эффекты попаданий',rows:[
  ['Шанс поджога',pct(b.burn?Math.min(1,b.burnChance||.15):0)],
  ['Урон горения',`${pct(b.burn||b.plasma||b.sporeBrood ? .2*(1+(b.burnDamage||0)):0)}/с`,'От урона попадания, за один стак'],
  ['Длительность огня',b.burn||b.plasma||b.sporeBrood?seconds(3+(b.burnDuration||0)):'0 с'],
  ['Радиус пожара',b.spread?`${n(2.5+(b.spreadRadius||.5))} м`:'0 м'],
  ['Шанс холода',pct(b.chill?Math.min(1,b.chillChance||.2):0)],
  ['Замедление холодом',pct(b.chill||b.cryoTrail ? .3:0)],
  ['Длительность холода',b.chill?seconds(2+(b.chillDuration||0)):'0 с'],
  ['Заморозка',b.freeze?seconds(.75+(b.freezeDuration||.25)):'0 с','Третье наложение холода, откат 3 с; боссов только замедляет'],
  ['Хрупкость',signed(b.brittle||0),'Урон по целям под холодом, Охладителем, Мойкой или аурой Щита'],
  ['Урон разряда',pct(b.electric?(.4+(b.electricPower||.1)+(b.stormPower||0))*(1+(b.electricDamage||0)):0),'От урона атаки'],
  ['Частота разряда',b.electric?`1 / ${b.storm?3:5} атак`:'—'],
  ['Целей разряда',String(b.electric?1+(b.chains||0):0)],
  ['Плазма',b.plasma?'Поджог разрядом':'—'],
  ['Термошок',pct(b.thermal?b.thermalDamage||1:0),'Взрыв по горящей замороженной цели'],
  ['Нервная сеть',pct(b.neuralWeb?b.neuralWebDamage||.4:0),'Дуга от первого попадания залпа, 12 м'],
  ['Криослед: радиус',b.cryoTrail?`${n(1.25+(b.cryoTrailRank||1)*.25)} м`:'0 м'],
  ['Криослед: время',b.cryoTrail?seconds(2.5+(b.cryoTrailRank||1)*.5):'0 с'],
 ]},
 {title:'Условные бонусы',rows:[
  ['Разгон атак',signed(b.focusRate?(b.focusRatePerStack||.05)*5:0),'Максимум, после пяти атак по одной цели'],
  ['Скорость атаки в движении',signed(b.running?b.runningRate||.2:0),'После 2 с движения'],
  ['Скорость атаки после убийства',signed(b.meleeFrenzy?b.meleeFrenzyRate||.25:0),'Ближние атаки, на 4 с'],
  ['Второй удар',signed(b.onslaught?b.onslaughtDamage||.3:0),'Второе ближнее попадание по одной цели'],
  ['Урон на дистанции',signed(b.ballisticGrowth?b.ballisticMax||.3:0),'Максимальный бонус'],
  ['Первый залп',signed(b.fullSalvo?b.fullSalvoDamage||.3:0),'После полной перезарядки'],
  ['Урон по метке',signed(b.rupture?b.ruptureDamage||.2:0),'Метка от крита действует 3 с'],
  ['Откат после крита',b.criticalTempo?`−${pct(b.criticalTempoReduction||.15)}`:'0%'],
  ['Повторные атаки',String(b.echo?b.echoes||1:0),'Каждая пятая атака'],
  ['Ответный панцирь',signed(b.counterShell?b.counterShellDamage||1:0),'Ближняя атака в течение 5 с после удара'],
  ['Сверхпитание',signed(b.overgrowth?Math.min(5,Math.floor((s.abilities.biomassSpent||0)/OVERGROWTH_STEP))*.05*(b.overgrowthPower||1):0),`Бонус за каждые ${OVERGROWTH_STEP} потраченной биомассы, до пяти порогов`],
 ]},
].map(g=>({...g,rows:g.rows.filter(([,value])=>value!=='—'&&parseFloat(value.replace(/[+−]/g,''))!==0)})).filter(g=>g.rows.length);}
