import {visibleBetween} from '../elevation.js';
import {SURVIVAL_CADENCE} from './survival-cadence.js';
import {scaleEnemyStats} from './difficulty.js';
import {SURVIVAL_HABITAT_BALANCE,SURVIVAL_HABITAT_RADIUS} from './balance.js';
import {BOSS_RECIPES} from './enemy-assembly.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Keep even two fully extended 30 m territories separated by a visible stretch of map.
export const BOSS_HABITAT_DISTANCE=112;
export const isBoss=e=>['boss','final'].includes(e.kind);
export const bossEngaged=e=>e.hp>0&&isBoss(e)&&(!e.territory||e.territory.state==='engaged');
export function assignTerritory(s,e){
 if(s.mode!=='survival'||!s.world.flat||!['elite','boss','final'].includes(e.kind))return e;
 e.territory={home:{x:e.x,y:e.y??0,z:e.z},aggro:isBoss(e)?18:14,leash:isBoss(e)?30:24,state:'idle'};
 return e;
}
export function assignWaveEliteDisposition(s,e){
 if(e?.kind!=='elite'||e.waveElite||!e.territory&&s.mode!=='survival')return e;
 e.waveElite=true;e.waveEliteIndex=(s.waves.waveEliteCount||0)+1;s.waves.waveEliteCount=e.waveEliteIndex;
 if(s.mode==='survival'&&e.wavePressureIndex===0)e.damage*=SURVIVAL_CADENCE.firstEliteDamage;
 if(!e.territory)return e;
 // Every elite of a pack walks to the player. A wall that waits on its home spot never
 // arrives, so the pack could not be fought, let alone cleared. Minute mini-bosses of
 // the map keep their own territory; only pack members are pursuers.
 e.territory.pursuit=true;e.territory.state='engaged';
 return e;
}
export function territoryTarget(s,e,fallback){
 const t=e.territory,active=s.encounters?.active,zone=e.dungeonAggroZoneId&&active?.aggroZones?.find(q=>q.id===e.dungeonAggroZoneId);
 if(zone){
  if(zone.state==='cleared')return t?.home||fallback;
  if(t)t.state=zone.state==='engaged'?'engaged':'idle';
  return zone.state==='engaged'?fallback:(t?.home||e);
 }
 if(!t||e.challengeId&&active?.id===e.challengeId)return fallback;
 if(t.pursuit){t.state='engaged';return fallback;}
 const atHome=distance(e,t.home)<=e.radius+.7,playerHome=distance(s.player,t.home);
 if(t.state==='engaged'&&(playerHome>t.leash||distance(e,t.home)>t.leash)){
  t.state='returning';e.windup=null;e.path=null;
 }
 if(t.state==='returning'){
  if(!atHome)return t.home;
  t.state='idle';e.path=null;
 }
 if(t.state==='idle'&&distance(e,s.player)<=t.aggro&&playerHome<=t.leash&&visibleBetween(s,e,s.player)){t.state='engaged';if(isBoss(e)&&!e.arrivalSounded){e.arrivalSounded=true;s.events.push({type:'boss-arrival',boss:e.id,kind:e.kind,x:e.x,y:e.y??0,z:e.z});}}
 return t.state==='engaged'?s.player:t.home;
}
/** Fixed boss habitats, separate from the seeded combat loot stream. */
export function prepareTerritories(s,spawn){
 if(s.mode!=='survival'||!s.world.flat)return s;
 const candidates=s.world.tiles.filter(t=>t.index!==0)
  .sort((a,b)=>distance(a,s.player)-distance(b,s.player));
 s.bossHabitats=[];const occupied=[];
 for(let i=0;i<5;i++){
  const target=Math.floor((i+1)*candidates.length/6),ordered=candidates.map((tile,index)=>({tile,index})).sort((a,b)=>Math.abs(a.index-target)-Math.abs(b.index-target));
  const requiredRadius=SURVIVAL_HABITAT_RADIUS;
  let p=null;for(const {tile}of ordered){p=tile?.safe.find(point=>s.world.walkable(point.x,point.z,2.4)&&occupied.every(q=>distance(point,q)>=Math.max(BOSS_HABITAT_DISTANCE,requiredRadius+q.radius+68))&&s.encounters.nodes.every(n=>distance(point,n)>requiredRadius+(n.radius||1.4)+4));if(p){
    // Keep a clearing for the generated assembly, independent of mission models.
    for(const nearby of [tile,...s.world.neighbors(tile)])nearby.decorations=nearby.decorations.filter(o=>distance(p,o)>requiredRadius+(o.radius||o.size*.5||1)+1);
    for(const worldTile of s.world.tiles)delete worldTile.collisionDecorations;
    if(!s.world.walkable(p.x,p.z,requiredRadius)){p=null;continue;}
    break;
   }}if(!p)continue;occupied.push({...p,radius:requiredRadius});
  const e=spawn(i===4?'final':'boss',p,'mass',(i+1)*480);if(!e)continue;
  const habitatBalance=SURVIVAL_HABITAT_BALANCE[i];
  e.habitatRank=i+1;e.bossLevel=habitatBalance.level;e.radius=requiredRadius;
  e.hp=e.maxHp=habitatBalance.hp;e.damage=habitatBalance.damage;e.armor=habitatBalance.armor;e.speed=habitatBalance.speed;e.attackRecoveryScale=habitatBalance.recovery;delete e.difficultyBossSpeedApplied;scaleEnemyStats(s,e);
  // spawnEnemy already built five distinct assemblies and the Mother's own stats.
  // Never replace them with a mission model/controller or apply wave multipliers.
  e.bossName=BOSS_RECIPES.find(recipe=>recipe.id===e.recipeId).name;
  e.habitat=true;s.bossHabitats.push({id:e.id,...p,kind:e.kind,rank:i+1,level:e.bossLevel,name:e.bossName});
 }
 return s;
}
