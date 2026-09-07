import {meta} from '../systems/meta-progression.js';
import {isaacState} from '../systems/mutations.js';
import {queueBossReward,rollAffixes} from '../systems/sets-loot.js';
// Development-only, isolated initial states for visual and interaction QA.
// Loaded only by Vite DEV with ?review=...; never writes the player's profile.
import {createPart,equip,swapBody,stats} from '../assembly.js';
import {CATALOG} from '../catalog.js';
import {addXP} from '../game.js';
export function prepareReview(run,name){
  if(name==='boss-reward'){run.time=480;queueBossReward(run,createPart,2);if(new URLSearchParams(location.search).get('variant')==='first-boss'){run.bosses=1;meta(run.profile).rerolls=1;}}
  if(new URLSearchParams(location.search).get('variant')==='sets'){run.arms=[createPart(run,'seed'),createPart(run,'claws')];for(const p of [run.body,...run.arms,...run.legs]){p.setId='wanderer';p.rarity='rare';}run.arms[0].affix={stat:'reload',value:.08};}
  if(['assembly','part','body-swap','level','map','end'].includes(name)){
    run.biomass=128;
    for(const key of ['drill','bastion','shield','regen','digestion','plated'])run.inventory.push(createPart(run,key));
    const digestion=run.inventory.find(p=>p.key==='digestion');equip(run,digestion.id,0);
    run.ground.push({id:++run.entityId,part:createPart(run,'arc'),x:run.player.x+1,z:run.player.z});
  }
  if(new URLSearchParams(location.search).get('variant')==='affixes'){const p=run.inventory[0];if(p){p.rarity='relic';p.affixes=rollAffixes(p,()=>0);}run.body.rarity='rare';run.body.affixes=rollAffixes(run.body,()=>0);}
  if(name==='level'){addXP(run,18);const variant=new URLSearchParams(location.search).get('variant');if(['tree','synergy','minor'].includes(variant)){run.abilities.learned=variant==='synergy'?['fire.0','fire.1','fire.3','cold.0','cold.1','cold.3']:['fire.0'];run.choices=(variant==='synergy'?['thermal','fire.2','cold.2','minor.damage','minor.rate']:variant==='minor'?['minor.damage','minor.rate','minor.pickup','minor.speed','minor.critPower']:['fire.1','fire.2','cold.0','electric.0','vitality.0']).map(id=>({id}));}}
  if(name==='level'&&new URLSearchParams(location.search).get('variant')==='metabolism')run.choices=['metabolism.0','might.0','vitality.0','motion.0','summons.0'].map(id=>({id}));
  if(name==='level'&&new URLSearchParams(location.search).get('variant')==='metabolism-xp'){
    run.abilities.learned=['metabolism.0'];run.choices=['metabolism.1','metabolism.2','vitality.0','motion.0','summons.0'].map(id=>({id}));
    run.xpDrops.push({id:++run.entityId,...run.player,value:10});
  }
  if(name==='catalog')run.profile.unlocked=Object.keys(CATALOG).slice(0,12);
  if(name==='map'){run.time=180;run.mission?.nodes.forEach((n,i)=>n.active=i<2);if(run.mission)run.mission.activated=2;}
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
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='assembly-dense'){
    run.body=createPart(run,'rootwalker');run.arms=['seed','needle','whip','hammer'].map(k=>createPart(run,k));
    run.legs=['root','plated','universal','runner'].map(k=>createPart(run,k));
    isaacState(run).deals.organs=3;run.organs=['regen','shield','digestion','stabilizer','accelerator',null].map(k=>k?createPart(run,k):null);
    run.abilities.learned=['might.0','tempo.0','projectiles.0'];run.biomass=128;
  }
  if(name==='assembly'&&new URLSearchParams(location.search).get('variant')==='eight-organs'){
    const body=createPart(run,'wanderer',5);body.rarity='rare';run.inventory.push(body);swapBody(run,body.id);
    run.organs=['returnNerve','slime','parasite','commonNerve','outerStomach','reverseHeart','shield',null].map(k=>k?createPart(run,k):null);run.hp=stats(run).hp;
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
  if(name==='part')return {id:run.inventory.find(p=>p.key==='drill').id};
  if(name==='body-swap')return {id:run.inventory.find(p=>p.key==='bastion').id};
  return {};
}
