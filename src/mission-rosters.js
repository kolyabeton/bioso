import {seededRandom} from './simulation.js';
import {ENEMY_RECIPES} from './systems/enemy-assembly.js';

const roleById=Object.fromEntries(ENEMY_RECIPES.map(r=>[r.id,r.role]));
const PROFILES={
 garden:{signature:'worker',pool:['worker','gatherer','small-hunter','gardener']},
 quarantine:{signature:'shield-bearer',pool:['worker','gatherer','digger','runner','carapace','crusher','shield-bearer']},
 core:{signature:'divider',pool:['worker','gatherer','digger','gardener','runner','carapace','heavy-digger','sower','shield-bearer','divider']},
 nursery:{signature:'mirrorling',pool:['worker','digger','runner','biter','chaser','carapace','sower','needler','shield-bearer','divider','mirrorling']},
 mother:{signature:'robo-bee',pool:['worker','runner','biter','carapace','sower','needler','acid-spitter','robo-bee','shield-bearer','divider','mirrorling','puppeteer']},
};
const TACTICS=[
 {id:'pressure',roles:['mass','mass','fast','mass','armored']},
 {id:'rush',roles:['fast','fast','mass','fast','ranged']},
 {id:'bulwark',roles:['armored','mass','armored','ranged','mass']},
 {id:'crossfire',roles:['ranged','mass','ranged','armored','fast']},
 {id:'pincer',roles:['fast','mass','ranged','fast','armored','mass']},
 {id:'swarm',roles:['flying','fast','mass','flying','ranged','mass']},
 {id:'siege',roles:['armored','ranged','mass','armored','ranged','mass']},
 {id:'specialists',roles:['mass','fast','ranged','armored','flying','mass','ranged']},
];
const ENHANCEMENTS=['dense','fast-pack','armored-line','crossfire','flankers','signature-pair'];
const TACTIC_NAMES={pressure:'давление',rush:'рывок',bulwark:'щитовой строй',crossfire:'перекрёстный огонь',pincer:'клещи',swarm:'рой',siege:'осада',specialists:'особая стая'};
const ENHANCEMENT_NAMES={dense:'плотная стая','fast-pack':'быстрые охотники','armored-line':'бронелиния',crossfire:'дальний заслон',flankers:'фланговая пара','signature-pair':'усиленная особь'};
const SPECIALS=new Set(['shield-bearer','divider','mirrorling','puppeteer']);

const shuffle=(list,rng)=>{for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;};

/** Mission identity is recipe-specific. Adjacent floors always change tactic,
 * composition and enhancement without consuming combat or loot randomness. */
export function missionRosters(seed,count,missionId='garden'){
 const profile=PROFILES[missionId]??PROFILES.garden,rng=seededRandom((seed^0x726f6f6d^missionId.length*0x45d9f3b)>>>0),result=[];
 while(result.length<count){
  const deck=shuffle([...TACTICS],rng),previous=result.at(-1)?.tactic;
  if(deck[0].id===previous)[deck[0],deck[1]]=[deck[1],deck[0]];
  for(const tactic of deck){
   if(result.length===count)break;
   const index=result.length,availableCount=Math.min(profile.pool.length,Math.max(3,3+Math.floor(index/2))),available=profile.pool.slice(0,availableCount);
   if(!available.includes(profile.signature))available.push(profile.signature);
   const enhancement=ENHANCEMENTS[(index+TACTICS.indexOf(tactic))%ENHANCEMENTS.length],desired=[...tactic.roles];if(index>=8)desired.push(tactic.roles[index%tactic.roles.length]);if(index>=16)desired.push(tactic.roles[(index+2)%tactic.roles.length]);
   if(enhancement==='dense')desired.push('mass');
   if(enhancement==='fast-pack')desired.push('fast','fast');
   if(enhancement==='armored-line')desired.push('armored','armored');
   if(enhancement==='crossfire')desired.push('ranged','ranged');
   if(enhancement==='flankers')desired.push('fast','ranged');
   const recipes=[];
   for(let slot=0;slot<desired.length;slot++){
    let candidates=available.filter(id=>roleById[id]===desired[slot]);if(!candidates.length)candidates=available.filter(id=>roleById[id]==='mass');if(!candidates.length)candidates=available;
    let id=slot%3===0&&roleById[profile.signature]===desired[slot]?profile.signature:candidates[Math.floor(rng()*candidates.length)];
    if(id===recipes.at(-1)&&candidates.length>1)id=candidates[(candidates.indexOf(id)+1)%candidates.length];
    recipes.push(id);
   }
   if(!recipes.includes(profile.signature))recipes[Math.min(recipes.length-1,index%recipes.length)]=profile.signature;
   if(enhancement==='signature-pair'&&recipes.filter(id=>id===profile.signature).length<2)recipes[(index+2)%recipes.length]=profile.signature;
   let puppeteers=0;for(let i=0;i<recipes.length;i++)if(recipes[i]==='puppeteer'&&puppeteers++>0)recipes[i]='robo-bee';
   const roles=recipes.map(id=>roleById[id]??'mass'),eliteRecipeId=available.find(id=>!SPECIALS.has(id)&&roleById[id]===roles.at(-1))??available.find(id=>!SPECIALS.has(id))??'worker';
   result.push({theme:tactic.id,tactic:tactic.id,tacticName:TACTIC_NAMES[tactic.id],enhancement,enhancementName:ENHANCEMENT_NAMES[enhancement],roles,recipeIds:recipes,eliteRole:roleById[eliteRecipeId]??'mass',eliteRecipeId,signature:`${tactic.id}:${enhancement}:${recipes.join(',')}`});
  }
 }
 return result;
}
