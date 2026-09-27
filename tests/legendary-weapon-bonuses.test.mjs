import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart,weaponStats} from '../src/assembly.js';
import {startReload,tickWeapons} from '../src/combat-feel.js';
import {handPresentation} from '../src/hud-presentation.js';
import {affixDescriptions,generateLoot,magazineCapacity,reloadDuration,rollAffixes} from '../src/systems/sets-loot.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {translateText} from '../src/i18n/index.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

test('only legendary magazine weapons can roll +3 charges and their reload coefficient is +37.5%',()=>{
 const legendary={key:'needle',rarity:'relic'},rolls=[.8,.999,0];
 const affixes=rollAffixes(legendary,()=>rolls.shift());
 assert.deepEqual(affixes.slice(0,2),[{stat:'reload',value:.375},{stat:'magazine',value:3}]);
 assert.deepEqual(affixDescriptions({...legendary,affixes}).slice(0,2),[
  'Время перезарядки этого оружия −27%',
  'Заряды этого оружия +3',
 ]);
 assert.equal(translateText('Заряды этого оружия +3'),'This weapon\'s charges +3');
 for(const rarity of ['common','uncommon','rare']){
  const rolled=Array.from({length:40},(_,i)=>rollAffixes({key:'needle',rarity},()=>((i*17)%41)/41)).flat();
  assert.equal(rolled.some(a=>a.stat==='magazine'),false,rarity);
  assert.ok(rolled.filter(a=>a.stat==='reload').every(a=>a.value<.25),rarity);
 }
 const rareRolls=[.999,0];
 assert.deepEqual(rollAffixes({key:'needle',rarity:'rare'},()=>rareRolls.shift())[0],{stat:'reload',value:.1});
});

test('legendary Injector uses four charges and the 0.375 reload coefficient in gameplay and UI',()=>{
 const s=createRun(undefined,'survival',20260914);s.profile.unlocked=['needle'];s.rng=()=>.999;
 const p=generateLoot(s,createPart,1,'boss','relic',false,[], 'arm');
 assert.equal(p.key,'needle');assert.equal(p.ammo,4);assert.equal(magazineCapacity(p),4);
 assert.equal(weaponStats(s,p).magazine,4);near(reloadDuration(s,p,2.3),2.3/1.375);
 s.arms=[p,null];p.ammo=0;assert.equal(startReload(s,p),true);near(p.reloadDuration,2.3/1.375);
 tickWeapons(s,p.reloadDuration-.01);assert.equal(p.ammo,0);tickWeapons(s,.01);assert.equal(p.ammo,4);
 const hud=handPresentation(s)[0],inspector=itemInspectorData(s,p);
 assert.equal(hud.magazine,4);assert.equal(hud.ammo,4);
 assert.equal(inspector.rows.find(row=>row.label==='Магазин').value,'4 из 4');
 assert.ok(inspector.lines.includes('Заряды этого оружия +3'));
 assert.ok(inspector.lines.includes('Время перезарядки этого оружия −27%'));
});
