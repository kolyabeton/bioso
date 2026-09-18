import {partAffixes,affixBonus,magazineCapacity,rollAffixes,affixDescriptions} from './affixes.js';
export {partAffixes,affixBonus,magazineCapacity,rollAffixes,affixDescriptions} from './affixes.js';
import {CATALOG,partAvailable} from '../../catalog.js';
import {markInventoryUnseen} from '../../inventory-notifications.js';
import {weaponFamilyBonus} from '../weapon-specialization.js';
import {bodyReloadBonus} from '../body-traits.js';

import {SETS,RARITIES,partMeta,equipped,setCounts} from './definitions.js';
import {setBonuses} from './bonuses.js';
export {SETS,RARITIES,SET_LEGS,partMeta,equipped,setCounts} from './definitions.js';
export {setBonuses,hitSetMultiplier} from './bonuses.js';
export const LOOT_RULES={normalChance:.015,normalPity:80,qualityPity:8,bossPity:5,relicAt:480,weights:{normal:[75,20,4.8,.2],elite:[35,45,19,1],boss:[0,0,0,100],event:[0,0,100,0]}};
const setKeys=Object.keys(SETS),rareKeys=Object.keys(CATALOG).filter(k=>CATALOG[k].rare);
export function initializePart(p,rng){Object.assign(p,partMeta(p));if(rng&&!p.affixes&&!p.affix)p.affixes=rollAffixes(p,rng);if(p.setId&&CATALOG[p.key]?.kind==='body')p.visualId??=SETS[p.setId].body;return p;}
export function reloadDuration(s,p,base){return base/(1+setBonuses(s).reload+affixBonus(p,'reload')+weaponFamilyBonus(s,p).reload+bodyReloadBonus(s,p));}
const state=s=>{const l=s.lootState??={normalMisses:0,qualityMisses:0,bossMisses:0,duplicates:0,receivedSequence:0};l.receivedSequence??=0;return l;};
export function normalDrop(s){const l=state(s);if(++l.normalMisses>=LOOT_RULES.normalPity||s.rng()<LOOT_RULES.normalChance){l.normalMisses=0;return true;}return false;}
function weighted(values,weights,rng){let n=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<values.length;i++){n-=weights[i];if(n<0)return values[i];}return values.at(-1);}
export function rollRarity(s,source='normal'){
 const l=state(s),weights=[...(LOOT_RULES.weights[source]||LOOT_RULES.weights.normal)];if(s.time<480){weights[2]+=weights[3];weights[3]=0;}
 if(source==='boss'&&l.bossMisses>=4&&s.time>=480)return'relic';
 let r=weighted(Object.keys(RARITIES),weights,s.rng);if(l.qualityMisses>=7&&['common','uncommon'].includes(r))r='rare';return r;
}
const fingerprint=p=>JSON.stringify([p.key,partMeta(p).setId,p.tier,partMeta(p).rarity,partAffixes(p)]);
export function recordReward(s,p,source='normal'){
 const l=state(s);l.qualityMisses=['common','uncommon'].includes(partMeta(p).rarity)?l.qualityMisses+1:0;
 if(p.rarity==='relic')l.bossMisses=0;else if(source==='boss')l.bossMisses++;
 l.duplicates=[...equipped(s),...s.inventory].some(q=>q!==p&&fingerprint(q)===fingerprint(p))?l.duplicates+1:0;
}
export function generateLoot(s,createPart,tier,source='normal',quality=null,commit=true,exclude=[],onlyKind=null){
 const rarity=quality||rollRarity(s,source),all=[...new Set([...s.profile.unlocked.filter(k=>CATALOG[k]&&!CATALOG[k].rare),'reflexNerve','returnNerve','slime','parasite','repairGland'])];
 let pool=(rarity==='relic'?[...new Set([...all,...rareKeys])]:all).filter(key=>partAvailable(s.profile,key));
 if(onlyKind)pool=pool.filter(key=>CATALOG[key].kind===onlyKind);
 const ownedKeys=[...equipped(s),...s.inventory].map(p=>p.key),avoidKeys=[...exclude,...(state(s).duplicates>=4?ownedKeys:[])],novel=pool.filter(k=>!avoidKeys.includes(k));if(novel.length)pool=novel;
 const counts=setCounts(s),active=Object.keys(counts),preferred=active.length&&s.rng()<.3?active[Math.floor(s.rng()*active.length)]:null;
 const available=['arm','leg','organ','body'].filter(kind=>pool.some(k=>CATALOG[k].kind===kind)),weights={arm:40,leg:25,organ:20,body:15};
 const kind=weighted(available,available.map(k=>weights[k]),s.rng);pool=pool.filter(k=>CATALOG[k].kind===kind);
 const owned=[...equipped(s),...s.inventory].map(p=>p.key),avoid=[...exclude,...(state(s).duplicates>=4?owned:[])],different=pool.filter(k=>!avoid.includes(k));if(different.length)pool=different;
 const key=pool[Math.floor(s.rng()*pool.length)],p=createPart(s,key,tier);p.rarity=rarity;
 p.setId=null;p.setCandidateId=kind==='body'?key:preferred||setKeys[Math.floor(s.rng()*setKeys.length)];
 p.affixes=rollAffixes(p,s.rng);delete p.affix;
 if(CATALOG[key].magazine)p.ammo=magazineCapacity(p);
 if(commit)recordReward(s,p,source);return p;
}
function fallbackSetId(s,p){if(CATALOG[p.key]?.kind==='body'&&SETS[p.key])return p.key;const hash=((s.seed??0)^Math.imul(p.id??1,2654435761))>>>0;return setKeys[hash%setKeys.length];}
export function finalizeReceivedPart(s,p){
 if(!p||p.setAssignmentComplete)return p;
 const l=state(s),isSetItem=++l.receivedSequence%3===0;
 if(!p.setId)p.setId=isSetItem&&(SETS[p.setCandidateId]?p.setCandidateId:fallbackSetId(s,p))||null;
 if(p.setId&&CATALOG[p.key]?.kind==='body')p.visualId??=SETS[p.setId].body;
 delete p.setCandidateId;p.setAssignmentComplete=true;return p;
}
// A boss is the only guaranteed jump in power: its reward is a full rank above ordinary loot.
export function queueBossReward(s,createPart,tier){const rarity=rollRarity(s,'boss'),options=[],bossTier=Math.min(5,tier+1);for(let i=0;i<3;i++)options.push(generateLoot(s,createPart,bossTier,'boss',rarity,false,options.map(p=>p.key)));(s.bossRewards??=[]).push({id:++s.entityId,rarity,options});}
export function chooseBossReward(s,index){const r=s.bossRewards?.[0];if(!r||!Number.isInteger(index)||!r.options[index])return false;const p=finalizeReceivedPart(s,r.options[index]);recordReward(s,p,'boss');s.inventory.push(p);markInventoryUnseen(s,p);s.bossRewards.shift();if(!s.profile.unlocked.includes(p.key))s.profile.unlocked.push(p.key);if(s.mode==='survival'){const now=s.time+(s.isaac?.extraTime||0);s.health.invulnerableUntil=Math.max(s.health.invulnerableUntil||0,now+2);s.reliefUntil=Math.max(s.reliefUntil||0,now+4);if(s.waves)s.waves.credit=Math.min(s.waves.credit||0,.5);}return true;}
export function partTraitLines(p){const m=partMeta(p),setName=m.setId?SETS[m.setId].name:null;return [setName?`${RARITIES[m.rarity]} · ${setName}`:RARITIES[m.rarity],...affixDescriptions(p)];}
export const partTraits=p=>partTraitLines(p).join(' · ');
