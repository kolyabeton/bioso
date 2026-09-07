import {BODIES,CATALOG} from '../catalog.js';
import {seededRandom} from '../simulation.js';

const recipe=(id,name,role,body,weapon,leg,organ=null)=>Object.freeze({id,name,role,body,weapons:[weapon],leg,organs:organ?[organ]:[],from:({mass:0,ranged:30,fast:90,armored:180})[role]??480});
export const ENEMY_RECIPES=Object.freeze([
 recipe('worker','Рабочий','mass','wanderer','claws','universal'),
 recipe('gatherer','Собиратель','mass','wanderer','fangs','universal'),
 recipe('digger','Землекоп','mass','wanderer','drill','universal'),
 recipe('gardener','Садовник','mass','rootwalker','whip','universal'),
 recipe('small-hunter','Малый ловчий','mass','hunter','claws','universal'),
 {...recipe('robo-bee','Робо-пчела','flying','hunter','fangs','runner'),from:120},
 recipe('runner','Бегун','fast','wanderer','claws','runner'),
 recipe('biter','Кусач','fast','hunter','fangs','runner'),
 recipe('quick-digger','Быстрый землекоп','fast','hunter','drill','runner'),
 recipe('chaser','Загонщик','fast','chimera','whip','runner'),
 recipe('carapace','Панцирник','armored','bastion','claws','plated','armor'),
 recipe('crusher','Дробитель','armored','bastion','hammer','plated'),
 recipe('heavy-digger','Тяжёлый землекоп','armored','rootwalker','drill','plated','armor'),
 recipe('sower','Сеятель','ranged','wanderer','seed','universal'),
 recipe('needler','Игольщик','ranged','hunter','needle','universal'),
 recipe('acid-spitter','Кислотник','ranged','chimera','acid','universal'),
]);
export const BOSS_RECIPES=Object.freeze([
 {id:'warden',name:'Страж',body:'bastion',weapons:['hammer','claws'],leg:'plated',organs:['armor']},
 {id:'stalker',name:'Преследователь',body:'hunter',weapons:['needle','claws'],leg:'runner',organs:['armor']},
 {id:'orchid',name:'Орхидея',body:'chimera',weapons:['acid','whip'],leg:'universal',organs:['armor']},
 {id:'root-warden',name:'Корневой страж',body:'rootwalker',weapons:['hammer','drill'],leg:'plated',organs:['armor']},
 {id:'mother',name:'Матка',body:'hecaton',weapons:['seed','needle','claws'],leg:'universal',organs:['armor']},
]);
export const enemyTier=time=>Math.min(5,1+Math.floor(Math.max(0,time)/480));
export const eligibleRecipes=(time,role)=>ENEMY_RECIPES.filter(r=>r.from<=time&&(!role||r.role===role));
export function assembleEnemy(recipe,tier=1,kind='normal'){
 const body=BODIES[recipe.body],weapons=[...recipe.weapons],organs=[...recipe.organs];
 if(kind==='elite'){if(weapons.length<body.arms)weapons.push('claws');if(!organs.includes('armor'))organs.push('armor');}
 const part=(key,i)=>({key,id:`enemy:${recipe.id}:${i}`,tier});
 return {body:part(recipe.body,'body'),arms:Array.from({length:body.arms},(_,i)=>weapons[i]?part(weapons[i],`arm:${i}`):null),legs:Array.from({length:body.legs},(_,i)=>part(recipe.leg,`leg:${i}`)),organs:Array.from({length:body.organs},(_,i)=>organs[i]?part(organs[i],`organ:${i}`):null)};
}
export function validateEnemyRecipe(recipe,kind='normal'){
 const a=assembleEnemy(recipe,1,kind),parts=[...a.arms,...a.legs,...a.organs].filter(Boolean);
 return !!BODIES[recipe.body]&&parts.every(p=>CATALOG[p.key])&&parts.reduce((n,p)=>n+CATALOG[p.key].weight,0)<=BODIES[recipe.body].capacity&&recipe.weapons.length<=a.arms.length&&recipe.organs.length<=a.organs.length;
}
/** Separate stream: selecting equipment never consumes combat/loot RNG or item IDs. */
export function assignEnemyAssembly(s,e,threat=s.time){
 if(s.mode!=='survival')return e;
 let r;
 if(e.kind==='boss'||e.kind==='final')r=BOSS_RECIPES[e.kind==='final'?4:Math.min(3,Math.max(0,Math.floor(threat/480)-1))];
 else{
  const pool=eligibleRecipes(threat,e.kind==='elite'?null:e.role),available=pool.length?pool:eligibleRecipes(threat,'mass');
  s.enemyAssemblyRng??=seededRandom((s.seed^0x6e624d31)>>>0);r=available[Math.floor(s.enemyAssemblyRng()*available.length)];
 }
 e.flying=r.role==='flying';e.recipeId=r.id;e.enemyLevel=e.tier=enemyTier(threat);e.threat=threat;e.assemblyRole=r.role||'boss';e.assembly=assembleEnemy(r,e.tier,e.kind);
 e.enemyAttack={index:0,readyAt:e.born+1,warning:null};return e;
}
