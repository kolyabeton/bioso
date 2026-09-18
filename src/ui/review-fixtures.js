import {prepareSetReview} from './sets-review.js';
import {meta} from '../systems/meta-progression.js';
import {isaacState} from '../systems/mutations.js';
import {finalizeReceivedPart,magazineCapacity,queueBossReward,rollAffixes} from '../systems/sets-loot.js';
// Development-only, isolated initial states for visual and interaction QA.
// Loaded only by Vite DEV with ?review=...; never writes the player's profile.
import {createPart,equip,swapBody,stats} from '../assembly.js';
import {CATALOG} from '../catalog.js';
import {addXP} from '../game.js';
import {ABILITIES} from '../systems/abilities.js';
import {STORY_CUES} from '../story-cues.js';
export function prepareReview(run,name){
  if(new URLSearchParams(location.search).get('variant')==='sets-v2'){prepareSetReview(run);return name==='catalog'?{view:'sets'}:{};}
  if(name==='journal'||name==='journal-entry'){
    run.profile.meta.storyEvidence=['garden-agronomist-log','survival-fire-census','survival-field-clinic','survival-launch-dissent','survival-air-ledger','survival-river-sample','survival-empathy-author'];
    run.profile.meta.storyCues=STORY_CUES.filter(item=>['global','garden'].includes(item.mission)).map(item=>item.id);
    if(name==='journal-entry')return {id:new URLSearchParams(location.search).get('id')||'survival-fire-census'};
    return {view:new URLSearchParams(location.search).get('view')||'chronology'};
  }
  if(name==='development'){
    if(new URLSearchParams(location.search).get('variant')!=='base')run.profile.meta.abilityBranches=['fire','cold'];
    return {browse:true,branch:new URLSearchParams(location.search).get('branch')||'might'};
  }
  if(name==='soul'){
    run.body=createPart(run,'broodmother',1);
    run.arms=['seed','acid'].map(key=>createPart(run,key,1));
    run.legs=Array.from({length:3},()=>createPart(run,'swarmLeg',1));
    run.organs=[createPart(run,'broodNode',1),createPart(run,'broodNode',1),createPart(run,'regen',1)];
    for(const part of [run.body,...run.arms,...run.legs,...run.organs])part.setId='broodmother';
    run.abilities.learned=['summons.0','summons.1','summons.2','summons.3'];
    run.abilities.levels={'summons.0':5,'summons.1':5,'summons.2':5,'summons.3':5};
    run.abilities.companions=Array.from({length:8},(_,i)=>({id:`symbiont-${i}`,cooldown:0,attacks:0,x:run.player.x,y:run.player.y??0,z:run.player.z}));
    run.inventory=[];run.ground=[];run.hp=stats(run).hp;
    const variant=new URLSearchParams(location.search).get('variant');
    if(['chimera-two','chimera-ready','chimera-recovering'].includes(variant)){
      run.body=createPart(run,'chimera');
      run.arms=[createPart(run,'claws'),createPart(run,'acid')];
      run.legs=[createPart(run,'runner'),createPart(run,'runner')];
      run.organs=variant==='chimera-two'?[]:[createPart(run,'digestion')];
      run.abilities.learned=[];run.abilities.levels={};run.abilities.companions=[];
      run.setCombat={chimeraAt:variant==='chimera-recovering'?run.time+1:0};
      run.hp=stats(run).hp;
    }
  }
  if(name==='boss-reward'){run.time=480;queueBossReward(run,createPart,2);if(new URLSearchParams(location.search).get('variant')==='first-boss'){run.bosses=1;meta(run.profile).rerolls=1;}}
  if(new URLSearchParams(location.search).get('variant')==='sets'){run.arms=[createPart(run,'seed'),createPart(run,'claws')];for(const p of [run.body,...run.arms,...run.legs]){p.setId='wanderer';p.rarity='rare';}run.arms[0].affix={stat:'reload',value:.08};}
  if(['assembly','part','body-swap','level','map','end'].includes(name)){
    run.biomass=128;
    for(const key of ['drill','bastion','shield','regen','digestion','plated']){const part=createPart(run,key);finalizeReceivedPart(run,part);run.inventory.push(part);}
    const digestion=run.inventory.find(p=>p.key==='digestion');equip(run,digestion.id,0);
    run.ground.push({id:++run.entityId,part:createPart(run,'arc'),x:run.player.x+1,z:run.player.z});
  }
  if(new URLSearchParams(location.search).get('variant')==='affixes'){const p=run.inventory[0];if(p){p.rarity='relic';p.affixes=rollAffixes(p,()=>0);}run.body.rarity='rare';run.body.affixes=rollAffixes(run.body,()=>0);}
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='legendary-weapon'){
    const p=createPart(run,'needle',3);p.rarity='relic';p.affixes=[{stat:'magazine',value:2},{stat:'reload',value:.25},{stat:'damage',value:.1}];p.ammo=magazineCapacity(p);run.inventory=[p];
  }
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='leg-rank'){const key=new URLSearchParams(location.search).get('leg')||'root';run.legs[0]=createPart(run,CATALOG[key]?.kind==='leg'?key:'root',Number(new URLSearchParams(location.search).get('tier'))||2);run.inventory=[];run.hp=stats(run).hp;}
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='armor-affix'){
    const p=createPart(run,'stabilizer',2);p.rarity='uncommon';p.affixes=[{stat:'armor',value:1}];run.inventory=[p];
  }
  if(name==='level'){addXP(run,18);const query=new URLSearchParams(location.search),variant=query.get('variant');if(['tree','synergy','minor'].includes(variant)){const synergy=ABILITIES[query.get('synergy')]?.branch==='synergy'?query.get('synergy'):'thermal';run.abilities.learned=variant==='synergy'?[...ABILITIES[synergy].requires]:['fire.0'];run.choices=(variant==='synergy'?[synergy,'fire.2','cold.2','minor.damage','minor.rate']:variant==='minor'?['minor.damage','minor.rate','minor.pickup','minor.speed','minor.hp']:['fire.1','fire.2','cold.0','electric.0','vitality.0']).map(id=>({id}));}}
  if(name==='level'&&new URLSearchParams(location.search).get('variant')==='metabolism')run.choices=['metabolism.0','might.0','vitality.0','motion.0','summons.0'].map(id=>({id}));
  if(name==='level'){
    const query=new URLSearchParams(location.search),id=query.get('ability'),rank=Math.max(0,Math.min(4,Number(query.get('rank'))||0));
    if(rank&&ABILITIES[id]){if(!run.abilities.learned.includes(id))run.abilities.learned.push(id);run.abilities.levels[id]=rank;run.choices=[{id},...run.choices.filter(choice=>choice.id!==id)].slice(0,5);}
  }
  if(name==='level'&&new URLSearchParams(location.search).get('variant')==='metabolism-xp'){
    run.abilities.learned=['metabolism.0'];run.choices=['metabolism.1','metabolism.2','vitality.0','motion.0','summons.0'].map(id=>({id}));
    run.xpDrops.push({id:++run.entityId,...run.player,value:10});
  }
  if(name==='catalog'){
    run.profile.unlocked=Object.keys(CATALOG).slice(0,12);
    const key=new URLSearchParams(location.search).get('key');
    if(CATALOG[key])return {key};
  }
  if(name==='map'){
    run.time=180;run.mission?.nodes?.forEach((n,i)=>n.active=i<2);if(run.mission)run.mission.activated=2;
    run.recoveryDrops.push({id:++run.entityId,kind:'health',x:run.player.x+16,y:run.player.y??0,z:run.player.z-10,expiresAt:300});
    run.recoveryDrops.push({id:++run.entityId,kind:'armor',x:run.player.x-15,y:run.player.y??0,z:run.player.z+12,expiresAt:300});
  }
  if(name==='end'){run.won=true;if(run.mission)run.mission.complete=true;run.time=462;run.level=12;run.kills=186;run.profile.unlocked.push('arc','regen');}
  if(name==='end'){
    const variant=new URLSearchParams(location.search).get('variant');
    if(['defeat','overrun-defeat','overrun-complete','many'].includes(variant)){
      run.dead=variant!=='overrun-complete'&&variant!=='many';run.won=!run.dead;
      run.time=614;run.level=1;run.kills=4;
      run.profile.unlocked=run.profile.unlocked.filter(key=>!['arc','regen'].includes(key));
      if(variant.startsWith('overrun-'))run.overrun={state:variant==='overrun-complete'?'complete':'failed'};
      if(variant==='many'){run.time=5999;run.level=99;run.kills=99999;run.profile.unlocked=Object.keys(CATALOG);}
    }
  }
  if(new URLSearchParams(location.search).get('variant')==='stress'){
    run.body=createPart(run,'hecaton');const d=CATALOG.hecaton;
    run.arms=Array.from({length:d.arms},()=>createPart(run,'seed'));
    run.legs=Array.from({length:d.legs},(_,i)=>createPart(run,i?'universal':'plated'));
    run.organs=Array.from({length:d.organs},(_,i)=>i<2?createPart(run,i?'armor':'shield'):null);
    run.inventory=[];run.hp=1;
  }
  if(name==='assembly'&&['equipment','regeneration'].includes(new URLSearchParams(location.search).get('variant'))){
    const body=new URLSearchParams(location.search).get('body');
    if(CATALOG[body]?.kind==='body')run.body=createPart(run,body);
    const d=CATALOG[run.body.key];
    run.arms=Array.from({length:d.arms},(_,i)=>i<2?createPart(run,i?'needle':'whip'):null);
    run.legs=Array.from({length:d.legs},(_,i)=>createPart(run,i===0?'root':'universal'));
    run.organs=Array.from({length:d.organs},(_,i)=>i===0?createPart(run,'regen'):null);
    run.inventory=['hammer','universal'].map(key=>createPart(run,key));
    if(new URLSearchParams(location.search).get('variant')==='regeneration'){run.arms[0]=createPart(run,'seed');run.biomass=1000;}
    run.ground=[];
  }
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='body-trait-bastion'){
    const active=new URLSearchParams(location.search).get('active')==='1';
    run.body=createPart(run,'bastion',2);
    run.arms=['whip','needle'].map(key=>createPart(run,key));
    run.legs=['root','plated','universal','runner'].map(key=>createPart(run,key));
    run.organs=['regen','shield','digestion',active?'stabilizer':null].map(key=>key?createPart(run,key):null);
    run.inventory=active?[]:[createPart(run,'stabilizer')];
    run.ground=[];run.hp=stats(run).hp;
  }
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='assembly-dense'){
    run.body=createPart(run,'rootwalker');run.arms=['seed','needle','whip','hammer'].map(k=>createPart(run,k));
    run.legs=['root','plated','universal','runner'].map(k=>createPart(run,k));
    isaacState(run).deals.organs=3;run.organs=['regen','shield','digestion','stabilizer','accelerator',null].map(k=>k?createPart(run,k):null);
    run.abilities.learned=['might.0','tempo.0','projectiles.0'];run.biomass=128;
  }
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='eight-organs'){
    const body=createPart(run,'wanderer',5);body.rarity='rare';run.inventory.push(body);swapBody(run,body.id);
    run.organs=['returnNerve','slime','parasite','commonNerve','reverseHeart','shield',null,null].map(k=>k?createPart(run,k):null);run.hp=stats(run).hp;
  }
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='mounts'){
    const q=new URLSearchParams(location.search),body=q.get('body')||'rootwalker';
    if(CATALOG[body]?.kind==='body')run.body=createPart(run,body);
    run.body.setId=run.body.key==='reactor'?'bastion':run.body.key;
    const d=CATALOG[run.body.key],weapons=(q.get('weapons')||'harpoon,rocket,fangs,whip').split(','),legs=(q.get('legs')||'spring,runner,plated,root,universal,runner').split(',');
    run.arms=Array.from({length:d.arms},(_,i)=>createPart(run,CATALOG[weapons[i%weapons.length]]?.kind==='arm'?weapons[i%weapons.length]:'seed'));
    const count=q.get('six')==='1'?6:d.legs;
    if(count>d.legs)isaacState(run).deals.legs=count-d.legs;
    run.legs=Array.from({length:count},(_,i)=>createPart(run,CATALOG[legs[i%legs.length]]?.kind==='leg'?legs[i%legs.length]:'universal'));
    run.organs=Array.from({length:d.organs},(_,i)=>createPart(run,i?'shield':'regen'));
    run.inventory=[];run.ground=[];run.hp=stats(run).hp;
  }
  if(name==='part'&&new URLSearchParams(location.search).get('variant')==='summon-equipment'){
    const key=new URLSearchParams(location.search).get('key');
    if(['drone','swarmLeg','broodNode','parasite'].includes(key)){
      const p=createPart(run,key);run.body=createPart(run,'broodmother');run.biomass=1000;
      run[{drone:'arms',swarmLeg:'legs',broodNode:'organs',parasite:'organs'}[key]][0]=p;
      return {group:{drone:'arms',swarmLeg:'legs',broodNode:'organs',parasite:'organs'}[key],slot:0};
    }
  }
  if(name==='part')return {id:run.inventory.find(p=>p.key==='drill').id};
  if(name==='ability-detail'){
    const query=new URLSearchParams(location.search),branch=query.get('branch')||'might',id=ABILITIES[branch]?branch:`${branch}.0`,rank=Math.max(0,Math.min(5,Number(query.get('rank'))||0));
    run.arms=(['projectiles','ricochet','neuralweb'].includes(branch)?['pistol','seed']:branch==='ranged'?['pistol','arc']:branch==='melee'?['claws']:['claws','pistol']).map(key=>createPart(run,key));
    if(rank&&ABILITIES[id]){run.abilities.learned=id.startsWith('ricochet.')&&id!=='ricochet.0'?['ricochet.0',id]:[id];run.abilities.levels[id]=rank;if(run.abilities.learned.includes('ricochet.0'))run.abilities.levels['ricochet.0']=1;}
    return {browse:true,branch};
  }
  if(name==='body-swap')return {id:run.inventory.find(p=>p.key==='bastion').id};
  if(name==='map'&&new URLSearchParams(location.search).get('variant')==='recovery')return {filter:'loot',zoom:'near'};
  if(name==='map'&&new URLSearchParams(location.search).get('variant')==='loot')return {filter:'loot',zoom:'world'};
  return {};
}
