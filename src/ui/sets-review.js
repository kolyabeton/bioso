// Isolated DEV/acceptance initial states on the real Soul / catalog / build routes.
import {createPart,stats} from '../assembly.js';
import {SETS} from '../systems/sets-loot.js';
import {syncSetState} from '../systems/sets/bonuses.js';
import {tickEffects} from '../systems/effects.js';

export function prepareSetReview(s,params=new URLSearchParams(location.search)){
 const id=SETS[params.get('set')]?params.get('set'):'broodmother',count=Math.max(1,Math.min(4,Number(params.get('count'))||3));
 s.body=createPart(s,'hecaton');s.arms=['pistol','claws','seed',null].map(key=>key?createPart(s,key):null);
 s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.organs=[createPart(s,'digestion'),null];
 const other=Object.keys(SETS).filter(key=>key!==id),groups=[[s.body],s.arms,s.legs,s.organs];
 groups.forEach((parts,i)=>parts.filter(Boolean).forEach(p=>{p.setId=i<count?id:other[i];p.affixes=[];delete p.affix;}));
 s.inventory=[];s.ground=[];s.biomass=100;s.time=0;
 s.abilities.learned=[];s.abilities.levels={};s.abilities.companions=[];
 s.health.armorSpent=0;s.health.missing=0;delete s.setsV2;syncSetState(s);
 s.hp=stats(s).hp;tickEffects(s,0,()=>{});
 if(params.get('phase')==='ready')s.time=12;
 if(params.get('phase')==='active'){
  s.setsV2.meleeUntil=3;s.setsV2.rangedUntil=3;s.setsV2.broodUntil=4;
 }
 if(params.get('phase')==='wounded'){s.hp=Math.max(.5,s.hp-1);s.health.missing=stats(s).hp-s.hp;}
}
