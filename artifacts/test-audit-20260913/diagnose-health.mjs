import {createRun} from '../../src/game.js';
import {createPart,stats,equip,unequip} from '../../src/assembly.js';
import {receiveHit,healthView,tickHealth} from '../../src/systems/health.js';

const fixture=()=>{const s=createRun();s.body=createPart(s,'bastion');s.organs=[createPart(s,'armor'),createPart(s,'shield')];s.hp=stats(s).hp;s.organs[1].shieldCharge=1;return s;};
const s=fixture(),st=stats(s),hits=[];
for(let i=0;i<8;i++){hits.push([s.time,receiveHit(s,st),healthView(s,st.hp,st.armor)]);s.time++;}
const repair=fixture();repair.organs=[createPart(repair,'armor'),createPart(repair,'repairGland')];const repairStats=stats(repair);const repairHits=[];
for(let i=0;i<6;i++){repairHits.push(receiveHit(repair,repairStats));repair.time++;}
repair.time=15;tickHealth(repair,repairStats);
const plate=createRun();plate.body.tier=5;const armor=createPart(plate,'armor'),gland=createPart(plate,'repairGland');
plate.organs=[armor,null];const plateRanks=[];for(let tier=1;tier<=5;tier++){armor.tier=tier;plateRanks.push(stats(plate));}
plate.organs=[gland,null];const glandRanks=[];for(let tier=1;tier<=5;tier++){gland.tier=tier;glandRanks.push(stats(plate));}
console.log(JSON.stringify({base:st,hits,repairStats,repairHits,repairAfter:healthView(repair,repairStats.hp,repairStats.armor),plateRanks,glandRanks},null,2));
