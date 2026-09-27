import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,receiveDamage} from '../src/game.js';
import {createPart,stats,equip,unequip,drop} from '../src/assembly.js';

const bonuses=[{stat:'movement',value:.05},{stat:'rate',value:.1},{stat:'armor',value:1},{stat:'pickup',value:.1}];
const values=s=>{const st=stats(s);return {speed:st.speed,rate:st.rate,armor:st.armor,pickup:st.pickup};};
function setup(){
 const s=createRun(undefined,'survival',88);
 s.body=createPart(s,'bastion');s.body.affixes=[];s.body.upgrades.capacity=20;
 s.inventory=[];s.organs=Array(5).fill(null);
 for(const p of [s.body,...s.arms,...s.legs].filter(Boolean)){p.affixes=[];delete p.affix;}
 const core=createPart(s,'revivalCore');core.affixes=[];delete core.affix;s.inventory.push(core);
 return {s,core};
}
test('Reanimator grants the same bonuses in inventory and organ slot without duplication',()=>{
 const {s,core}=setup(),base=values(s);core.affixes=bonuses;
 const active=values(s);
 assert.ok(Math.abs(active.speed-base.speed*1.05)<1e-9);
 assert.equal(active.rate,base.rate+.1);assert.equal(active.armor,base.armor+1);
 assert.ok(Math.abs(active.pickup-base.pickup*1.1)<1e-9);
 assert.ok(equip(s,core.id,0));assert.deepEqual(values(s),active);
 s.inventory.push(core);assert.equal(stats(s).rate,active.rate);s.inventory=[];
 assert.ok(unequip(s,'organs',0));assert.deepEqual(values(s),active);
 const second=createPart(s,'revivalCore');second.affixes=bonuses;s.inventory.push(second);
 assert.equal(stats(s).rate,base.rate+.2);
 assert.ok(drop(s,core.id));assert.equal(stats(s).rate,base.rate+.1);
 assert.ok(drop(s,second.id));assert.equal(stats(s).rate,base.rate);
});
test('consuming a Reanimator removes its passive bonuses; other inventory organs remain inactive',()=>{
 const {s,core}=setup(),base=values(s);core.affixes=bonuses;
 const other=createPart(s,'accelerator');other.affixes=bonuses;s.inventory.push(other);
 assert.equal(stats(s).rate,base.rate+.1);
 s.rng=()=>1;const st=stats(s);s.hp=1;s.health.missing=st.hp-1;s.health.armorSpent=st.armor;
 assert.equal(receiveDamage(s,99,st),'revived');assert.ok(!s.inventory.includes(core));
 assert.deepEqual(values(s),base);
});
