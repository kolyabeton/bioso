import {queueWhipStrike,tickWhipStrikes} from './systems/whip-pull.js';
import {motherDefeated,tickEscape,rememberSurvivalBoss,continueForRecord,tickRecordBosses} from './systems/survival-endgame.js';
import {syncSetState} from './systems/sets/bonuses.js';
import {prepareSetAttack,finishSetAttack,tickSetCollector} from './systems/sets/combat.js';
import {trackAchievements} from './systems/achievements.js';
import {recordSurvivalKill} from './systems/survival-achievement-progress.js';
import {recordChassisKill} from './systems/chassis-progress.js';
import {demolitionReduction,tickSupportChassis,tickRegulatorHold,interceptSupportShot,towerTarget,isTower,hitTower,damageTowersFromEvents,tickTowerAcid,recordAssemblerAttack} from './systems/support-chassis.js';
import {tickMissionBoss,bossDamageMultiplier,cleanupBoss} from './systems/mission-bosses.js';
import {tickSurvivalBosses} from './systems/survival-bosses.js';
import {updateSurvivalBossDamage} from './systems/survival-scaling.js';
import {tickSurvivalElites} from './systems/survival-elites.js';
import {tickSurvivalResponse} from './systems/survival-response.js';
import {spawnRecoveryDrop,tickRecoveryDrops} from './systems/recovery-drops.js';
import {spawnConsumableDrop,tickConsumableDrops,consumableTarget} from './systems/consumable-drops.js';
import {recordCritRamp,recordKillRamp,periodicDamageBonus} from './systems/body-traits.js';
import {recordRunnerFire,tickRunnerFire} from './systems/runner-fire.js';
import {SHIELD_IMPACT_DELAY} from './melee-animation.js';
import {isShieldBash,SHIELD_AURA_RADIUS,SHIELD_AURA_SLOW} from './systems/shield-arm.js';
import {armCanReach,turnBody} from './body-facing.js';
import {turnBossFacing} from './boss-facing.js';
import {specializationHit,specializationKill,prepareSpecializationAttack} from './systems/weapon-specialization.js';
import {awardMeta,recordVictory,tickOverrun,startOverrun,validLoadout,spendReroll,recordAbilityDiscovery} from './systems/meta-progression.js';
import {tickExtraParts,springContact} from './systems/extra-parts.js';
import {soulProc} from './systems/soul-procs.js';
import {assignEnemyAssembly,eligibleRecipes,ENEMY_RECIPES} from './systems/enemy-assembly.js';
import {tickModularAttack,tickEnemyAcidPools,enemyAttackRange,enemyContactRange,enemyAcidPace,cancelEnemyAttack} from './systems/enemy-combat.js';
import {PUPPETEER_BUILD_SECONDS,DRONE_HUNTER_REPLACEMENT_DELAY,puppeteerSummonSpread,tickEnemySpecialist,specialistDamageScale,specialistEvades,tryMirrorProjectile} from './systems/enemy-specialists.js';
import {enemyInvulnerable,enemyTargetable,tickEnemyLocomotion} from './systems/enemy-locomotion.js';
import {assignTerritory,territoryTarget} from './systems/territories.js';
import {generateLoot,normalDrop,queueBossReward,rollBossRewardOptions,hitSetMultiplier,rollRarity,rollAffixes,affixBonus} from './systems/sets-loot.js';
import {combatTime,isaacState,activeMutation,syncMutations} from './systems/mutations.js';
import {prepareIsaacAttack,isaacHit,isaacDeath,conductorAttack,slimePace,tickIsaacCombat,tickCoolerDamage} from './systems/isaac-combat.js';
import {prepareEncounters,discoverEncounters,secretTarget,openSecret,startChallenge,leaveDungeon,containChallenge,tickChallenge,encounterStatus} from './systems/encounters.js';
import {spatialDistance,groundDistance,visibleBetween,surfaceReach,bodyRadius,playerAttackRange,movePlayer,settleObjects} from './elevation.js';
import {createHealth,preserveHealth,receiveHit,tickHealth,healFromFangsAttack} from './systems/health.js';
import {createAbilities,modifiers,attackTriggers,updateMotion} from './systems/abilities.js';
import {destroySymbiont} from './systems/symbionts.js';
import {prepareAbilityAttack,abilityDamageMultiplier,applyCriticalTempo,markRupture,tryNeuralWeb,ricochetProfile,ricochetFinisherMultiplier,nextRicochetTarget,tickGuardian,tickCryoTrail} from './systems/ability-combat.js';
import {gainXP,selectAbility,rollChoices} from './systems/progression.js';
import {createWaves,tickWaves,tickEnemyRanged,tickHostileShots} from './systems/waves.js';
import {survivalCadenceForRun,startNextSurvivalWave,advanceSurvivalWave,survivalWavePosition,waveEliteAllowance,recordWaveElite} from './systems/survival-cadence.js';
import {tickTimedItems} from './systems/timed-items.js';
import {difficultyTime,scaleEnemyStats} from './systems/difficulty.js';
import {enemyWeaponMultiplier} from './systems/enemy-interactions.js';
import {enemyBalance,ECONOMY,SURVIVAL_ELITE_DROP_CHANCE,SURVIVAL_PRESSURE,SURVIVAL_FINAL,XP_PICKUP_MULTIPLIER,survivalPressureProfile,ACID_PUDDLE_RADIUS,ACID_PUDDLE_SLOW,ACID_PUDDLE_SECONDS} from './systems/balance.js';
import {onHit,onDeath,enemyPace,lightning,tickEffects,applyColdStack} from './systems/effects.js';
import {BODIES,BODY_BASE_BONUSES,CATALOG,MISSIONS,SURVIVAL_UNLOCKS,WEAPON_UNLOCKS,weaponUnlockProgress,INCREMENTS} from './catalog.js';
import {createPart,newProfile,autoPickup,stats,weaponStats,installed,upgradeOptions,upgrade,lootTier,tierFactor,addBonus,stackedCommonNerveVolleyMultiplier,MAX_CRIT_CHANCE} from './assembly.js';
import {seededRandom} from './simulation.js';
import {terrain,spawnPoint} from './terrain.js';
import {eventCollisionWorld,moveCreature} from './gameplay-modules/event-collision.js';
import {tickWeapons,startReload,consumeRound,movementFactor,hitFeedback,tickImpact,IDLE_RELOAD_DELAY} from './combat-feel.js';
import {decorateLivingEnemy,tickVolatile,separateEnemies,splinterShots} from './living-combat.js';
import {createSpatialIndex} from './spatial-index.js';
import {tickExploration,missionEnemyTarget} from './exploration.js';
import {setupMissionFloors,tickMissionFloors,missionFloorStatus,strengthenMissionEnemy} from './mission-run.js';
import {navigateEnemy,clearSegment} from './world-navigation.js';
import {survivalObjective,selectFirstBoss} from './systems/survival-objective.js';
import {itemCompatibleHandKeys} from './systems/hand-compatibility.js';
const distance=spatialDistance;
const COMMON_NERVE_HANDS=new Set(itemCompatibleHandKeys('commonNerve'));
export const SWARM_INTERCEPT_RADIUS=.8;
const combatEligible=(s,e)=>{const dungeon=s.encounters?.active?.dungeon?s.encounters.active.id:null;return e.hp>0&&!e.dungeonDormant&&(!dungeon||e.challengeId===dungeon);};
const combatTargetable=(s,e)=>combatEligible(s,e)&&enemyTargetable(e);
export function createRun(profile=newProfile(),mode='survival',seed=Date.now()>>>0){
 const s={health:createHealth(),abilities:createAbilities(),waves:createWaves(),reliefUntil:0,abilityOfferHistory:{rounds:[],misses:{}},hostileShots:[],enemyAcidPools:[],achievementBaseline:[...profile.achievements],metrics:{spawned:0,maxEnemies:0,killed:[]},seed,profile,mode,serial:0,entityId:0,normalSpawnCount:0,rng:seededRandom(seed),world:terrain(seed),time:0,level:1,xp:0,pending:0,choices:[],soul:{},biomass:0,player:{x:0,z:0,facing:0},enemies:[],shots:[],puddles:[],fireTrails:[],xpDrops:[],recoveryDrops:[],ground:[],events:[],inventory:[],unseenInventoryIds:new Set(),seenInventoryIds:new Set(),kills:0,elites:0,bosses:0,nextElite:180,nextBoss:480,spawnCredit:0,hitAgo:999,dead:false,won:false,finalDefeated:false,continued:false,visitedLairs:new Set()};
 s.body=createPart(s,'wanderer');s.arms=[createPart(s,'claws'),null];s.legs=[createPart(s,'universal'),createPart(s,'universal')];s.organs=Array(BODIES.wanderer.organs).fill(null);s.hp=stats(s).hp;
 if(mode!=='survival')setupMission(s);syncSetState(s);return s;
}
export function randomLoot(s,source='normal',kind=null,exclude=[]){const p=generateLoot(s,createPart,lootTier(s.level,s.rng),source,null,false,exclude,kind);p.lootSource=source;return p;}
export function award(s,id,keys,tier){
 if(s.profile.achievements.includes(id))return false;s.profile.achievements.push(id);
 for(const key of keys)if(!s.profile.unlocked.includes(key)){s.profile.unlocked.push(key);s.ground.push({id:++s.entityId,part:createPart(s,key,tier??lootTier(s.level,s.rng)),x:s.player.x+1,z:s.player.z});}
 s.events.push({type:'unlock',text:'Открыто: '+keys.map(k=>CATALOG[k].name).join(', ')});return true;
}
function checkUnlocks(s){for(const u of WEAPON_UNLOCKS)if(weaponUnlockProgress(s.profile,u)>=u.goal)award(s,u.id,[u.key],1);if(s.mode==='survival'){for(const u of SURVIVAL_UNLOCKS)if(u.test(s))award(s,u.id,u.rewards);awardMeta(s,createPart);}}
export function addXP(s,amount){const levels=gainXP(s,amount);checkUnlocks(s);trackAchievements(s);return levels;}
export function chooseUpgrade(s,index){const old=stats(s).hp,id=s.choices[index]?.id;if(!selectAbility(s,index))return false;recordAbilityDiscovery(s,id);preserveHealth(s,old,stats(s).hp);return true;}
export function spawnEnemy(s,kind='normal',position=null,role='mass',threat=s.time,{introductory=true,promote=true,wave=false,recipeId=null}={}){
 let promoted=false;
 if(wave&&kind==='elite'&&!waveEliteAllowance(s))return null;
 if(s.mode==='survival'&&kind==='normal'){
  s.normalSpawnCount++;
  if(promote&&s.normalSpawnCount%30===0&&(!wave||waveEliteAllowance(s))){kind='elite';promoted=true;}
 }
 if(s.mode==='survival'&&kind==='normal'&&!eligibleRecipes(threat,role).length)role='mass';
 if(s.mission?.id==='garden'&&['normal','elite'].includes(kind))threat=0;
 const statTime=difficultyTime(s,threat),base=enemyBalance(statTime,kind,role);
 if(s.mode==='survival'){
  // Opening mobs now survive a normal claw hit; preserve readable whole health.
  base.hp=Math.round(base.hp*SURVIVAL_PRESSURE.hp);base.speed*=SURVIVAL_PRESSURE.speed;
  if(['normal','elite'].includes(kind)){
   const pressure=survivalPressureProfile(statTime,s.difficulty,kind,threat);base.hp=Math.round(base.hp*pressure.health);base.damage*=pressure.damage;base.speed*=pressure.speed;
   base.attackRecoveryScale=1/pressure.attackRate;base.contactInterval=1/pressure.attackRate;
  }
  // Keep the introductory boss bounded even when its habitat uses a later threat tier.
  if(kind==='boss'&&introductory&&!s.introBossId){base.hp=SURVIVAL_PRESSURE.introBossHp;base.damage=SURVIVAL_PRESSURE.introBossDamage;base.xp=SURVIVAL_PRESSURE.introBossXp;}
  if(kind==='final')Object.assign(base,{hp:SURVIVAL_FINAL.hp,armor:SURVIVAL_FINAL.armor,speed:SURVIVAL_FINAL.speed,recommended:SURVIVAL_FINAL.recommendedLevel});
 }
 if(s.recordMode){base.hp*=3;base.damage=(base.damage||1)*3;}
 const collisionWorld=eventCollisionWorld(s),p=position||(s.mode==='survival'&&wave&&survivalCadenceForRun(s)?survivalWavePosition(s,base.radius):spawnPoint(collisionWorld,s.player,s.rng,27,40,s.world.heightAt?base.radius:undefined));if(!p||s.world.heightAt&&!s.world.walkable(p.x,p.z,base.radius)||(!position||wave)&&!collisionWorld.walkable(p.x,p.z,base.radius))return null;
 if(s.world.heightAt)p.y=s.world.heightAt(p.x,p.z);
 const e={...p,...base,id:++s.entityId,kind,contact:0,born:combatTime(s)};if(s.recordMode)e.endgameScaled=true;if(wave||promoted)e.waveSpawn=true;if(wave&&s.waves.cadence){e.survivalWaveIndex=s.waves.cadence.index;e.survivalWavePack=s.waves.cadence.pack;}e.maxHp=e.hp;if(s.mode==='survival'&&kind==='boss'&&introductory&&!s.introBossId)s.introBossId=e.id;assignEnemyAssembly(s,e,threat,recipeId?{missionRole:role,missionRecipeId:recipeId}:undefined);decorateLivingEnemy(s,e,!position);s.enemies.push(e);if(wave&&kind==='elite')recordWaveElite(s,e);s.metrics.spawned++;s.metrics.maxEnemies=Math.max(s.metrics.maxEnemies,s.enemies.length);return scaleEnemyStats(s,assignTerritory(s,e));
}
function spawnSpecialChild(s,parent,recipeId,side='left'){
 const recipe=ENEMY_RECIPES.find(r=>r.id===recipeId);if(!recipe)return null;
 const dx=s.player.x-parent.x,dz=s.player.z-parent.z,d=Math.hypot(dx,dz)||1,sign=side==='right'?1:-1,existing=s.enemies.filter(q=>q.hp>0&&q.summonOwner===parent.id).length,spread=parent.specialty==='puppeteer'?puppeteerSummonSpread(existing):1.15;
 const position={x:parent.x-dz/d*sign*spread,z:parent.z+dx/d*sign*spread};
 const child=spawnEnemy(s,'normal',position,recipe.role,parent.threat??s.time,{promote:false});if(!child)return null;
 assignEnemyAssembly(s,child,parent.threat??s.time,{missionRole:recipe.role,missionRecipeId:recipeId});
 if(parent.missionRoom)strengthenMissionEnemy(child,parent.missionRoom-1,s.mission);
 child.hp=child.maxHp=Math.max(1,child.maxHp*(recipeId==='divider'?.34:.28));child.damage*=recipeId==='divider'?.55:.4;
 child.radius=Math.min(child.radius,recipeId==='divider'?.46:.42);child.speed*=recipeId==='divider'?1.18:.92;if(parent.specialReview&&recipeId==='worker')child.speed=0;child.visualScale=recipeId==='divider'?.72:.84;
 if(parent.survivalWaveIndex!=null){child.survivalWaveIndex=parent.survivalWaveIndex;child.survivalWavePack=parent.survivalWavePack;child.waveSpawn=true;}
 child.summonOwner=parent.id;child.noRewards=true;if(recipeId==='divider')child.splitGeneration=1;
 if(recipeId==='worker'&&parent.specialty==='puppeteer')child.summonAssembly={started:combatTime(s),until:combatTime(s)+PUPPETEER_BUILD_SECONDS,speed:child.speed},child.speed=0;
 child.groupId=parent.groupId;child.anchor=parent.anchor;child.missionRoom=parent.missionRoom;
 const floor=s.mission?.floorsState?.[Math.max(0,(parent.missionRoom??1)-1)];if(floor&&!floor.members.includes(child.id))floor.members.push(child.id);
 return child;
}
export function hurtEnemy(s,e,damage,ignore=0,source='direct',critical=false,weaponKey=null){
 if(e.dungeonDormant)return false;
 if(e.summonAssembly&&combatTime(s)<e.summonAssembly.until)return false;
 if(enemyInvulnerable(e))return false;
 if(damage>0){if(e.pickupMarkUntil>combatTime(s)&&source!=='environment')damage*=1.5;e.pickupSleepUntil=0;}
 if(e.hp<=0)return false;damage*=enemyWeaponMultiplier(s,e,weaponKey);damage*=bossDamageMultiplier(s,e,source);if(['burn','acid','cooler-dot','shield-aura'].includes(source))damage*=(1+periodicDamageBonus(s))*(1+(modifiers(s).burnDamage||0));if(e.frozenUntil>combatTime(s))damage*=1+(BODY_BASE_BONUSES[s.body?.key]?.frozenDamage||0);e.engagedAt??=combatTime(s);const baseArmor=Number.isFinite(e.armor)?e.armor:0,effectiveArmor=baseArmor>0?Math.max(-baseArmor*.2,baseArmor*(1-demolitionReduction(s,e)-ignore)):baseArmor,armorMultiplier=effectiveArmor>=0?1/(1+effectiveArmor/100):1-effectiveArmor/100,applied=Math.min(e.hp,damage*armorMultiplier);s.metrics.damage??={direct:0,burn:0,electric:0,summon:0,acid:0,thermal:0,environment:0};s.metrics.damage[source]=(s.metrics.damage[source]||0)+applied;e.hp-=applied;
 if(applied>0&&source!=='environment')s.events.push({type:'enemy-damage',target:e.id,x:e.x,y:e.y??0,z:e.z,radius:e.radius??.6,amount:applied,critical,source,marked:e.pickupMarkUntil>combatTime(s)});
 if(e.hp>0)return true;e.hp=0;
 const deathEvent={type:'death',target:e.id,x:e.x,y:e.y,z:e.z,radius:e.radius??.6,role:e.assemblyRole||e.role||'mass',kind:e.kind||'normal',flying:!!e.flying,volatile:!!e.volatile,source};
 if(e.bossOwner){s.events.push(deathEvent);return true;}
 cleanupBoss(s,e);
 if(e.kind==='objective'){s.events.push({type:'destroy',x:e.x,z:e.z});return true;}
 if(e.specialty==='divider'&&!e.splitGeneration){spawnSpecialChild(s,e,'divider','left');spawnSpecialChild(s,e,'divider','right');s.events.push({type:'enemy-split',x:e.x,y:e.y??0,z:e.z,count:2});}
 if(e.specialty==='puppeteer')for(const child of s.enemies.filter(q=>q.hp>0&&q.summonOwner===e.id)){delete child.summonAssembly;hurtEnemy(s,child,Number.MAX_SAFE_INTEGER,0,'environment');}
 if(e.noRewards){onDeath(s,e);isaacDeath(s,e,source,(target,amount,kind)=>hurtEnemy(s,target,amount,0,kind));s.events.push(deathEvent);advanceSurvivalWave(s);return true;}
 recordSurvivalKill(s,e,source);recordChassisKill(s,e,source,weaponKey);
 if(source!=='environment'){
  const counters=(s.profile.meta??={}).weaponKills??={pistol:0,total:0};let changed=false;
  for(const u of WEAPON_UNLOCKS)if((u.counter==='total'||weaponKey===u.counter)&&(counters[u.counter]||0)<u.goal){counters[u.counter]=(counters[u.counter]||0)+1;changed=true;}
  if((e.recipeId==='shield-bearer'||e.specialty==='shield-bearer')&&(s.profile.meta.shieldBearerKills||0)<30){s.profile.meta.shieldBearerKills=(s.profile.meta.shieldBearerKills||0)+1;changed=true;}
  if(changed)s.events.push({type:'profile-progress'});
 }
 onDeath(s,e);isaacDeath(s,e,source,(target,amount,kind)=>hurtEnemy(s,target,amount,0,kind));s.metrics.killed.push({kind:e.kind,role:e.role,age:combatTime(s)-e.born,combatSeconds:e.engagedAt==null?0:combatTime(s)-e.engagedAt,minute:s.time/60});s.kills++;recordKillRamp(s);if(e.kind==='elite')s.elites++;if(['boss','final'].includes(e.kind))s.bosses++;
 rememberSurvivalBoss(s,e);
 if(e.kind==='final'){s.finalDefeated=true;motherDefeated(s);}
 const groundY=s.world.heightAt?.(e.x,e.z)??e.y??0;
 if(s.mode==='survival'&&e.kind==='final'&&!s.motherStomachRewarded){
  s.motherStomachRewarded=true;
  const stomach=createPart(s,'reverseStomach',5);stomach.rarity='relic';stomach.affixes=rollAffixes(stomach,s.rng);stomach.lootSource='boss';
  s.ground.push({id:++s.entityId,x:e.x,y:groundY,z:e.z,part:stomach});
  if(!s.profile.unlocked.includes('reverseStomach'))s.profile.unlocked.push('reverseStomach');
  s.events.push({type:'unlock',text:'Обратный желудок выпал! Установите с Компостером для автосбора биомассы.'});
 }
 s.xpDrops.push({id:++s.entityId,x:e.x,y:groundY,z:e.z,value:e.survivalSuperBoss||e.kind==='final'?90:e.xp??(e.kind==='normal'?1:e.kind==='elite'?16:60)});
 if(['boss','final'].includes(e.kind)){
  if(s.mode==='survival'&&e.survivalSuperBoss){s.reliefUntil=Math.max(s.reliefUntil||0,combatTime(s)+12);s.waves.credit=0;}
  if(s.mode==='survival'&&e.id===s.introBossId)startNextSurvivalWave(s);
  if(s.mode==='survival'&&e.id===s.introBossId&&!s.introBossRewarded){
   s.introBossRewarded=true;
   const stomach=createPart(s,'digestion',1);
   s.ground.push({id:++s.entityId,x:e.x,y:e.y,z:e.z,part:stomach});
   // One 50-weight shield replaces the four tutorial spares.
   s.ground.push({id:++s.entityId,x:e.x,y:e.y,z:e.z,part:createPart(s,'shieldArm',1)});
   if(!s.profile.unlocked.includes('digestion'))s.profile.unlocked.push('digestion');
   s.events.push({type:'unlock',text:'Компостер выпал! Установите его и переработайте лишние детали в биомассу.'});
  }
  if(s.mission&&e.bossDesignId===s.mission.bossId)missionStep(s);
  else queueBossReward(s,createPart,lootTier(s.level,s.rng));
 }
 else if(e.kind==='elite'){
  {const exclude=e.guaranteedPartKind==='arm'?s.arms.filter(Boolean).map(p=>p.key):[],rarityOrder=['common','uncommon','rare','relic'];
   // Item 21: survival elites drop 30% less often. Dungeon packs and mission
   // elites keep their guaranteed drop, so only the open survival roll changes.
   const rolled=s.mode!=='survival'||e.dungeonElite||e.guaranteedPartDrop||s.rng()<SURVIVAL_ELITE_DROP_CHANCE;
   if(rolled){
    let part;
    if(e.dungeonElite){
     // Item 35: the pack's marked carrier always yields a legendary.
     const quality=e.dungeonRelicDrop?'relic':Array.from({length:3},()=>rollRarity(s,'elite')).sort((a,b)=>rarityOrder.indexOf(b)-rarityOrder.indexOf(a))[0];
     part=generateLoot(s,createPart,lootTier(s.level,s.rng),'elite',quality,true,exclude,e.guaranteedPartKind);
    }else part=randomLoot(s,'elite',e.guaranteedPartKind,exclude);
    s.ground.push({id:++s.entityId,x:e.x,y:e.y,z:e.z,part,groupId:e.groupId,missionEliteDrop:!!e.guaranteedPartDrop,dungeonLoot:!!e.dungeonElite});
   }}
 }else normalDrop(s); // Preserve the established combat RNG stream; ordinary loot is suppressed.
 if(['elite','boss','final'].includes(e.kind))spawnRecoveryDrop(s,e);else if(e.kind==='normal')spawnConsumableDrop(s,e);checkUnlocks(s);s.events.push(deathEvent);if(s.mode==='survival'&&['boss','final'].includes(e.kind))selectFirstBoss(s);advanceSurvivalWave(s);return true;
}
function deal(s,e,w,scale=1,ignore=0,direction=null,sourceOverride=null){
 if(e.hp<=0||enemyInvulnerable(e))return false;
 if(specialistEvades(e,sourceOverride||w.mode,s.rng())){s.events.push({type:'enemy-evade',target:e.id,x:e.x,y:e.y??0,z:e.z});return false;}
 const b=modifiers(s),base=w.damage*scale*(w.key==='rocket'&&['elite','boss','final'].includes(e.kind)?w.summonBossDamage??1:1)*specializationHit(s,e,w)*(w.key==='harpoon'&&['elite','boss','final'].includes(e.kind)?1.25:1)*hitSetMultiplier(s,e,w)*abilityDamageMultiplier(s,e,w)*ricochetFinisherMultiplier(s,e,w),critical=s.rng()<w.crit,defense=specialistDamageScale(e,{now:combatTime(s),origin:s.player,direction,mode:sourceOverride||w.mode}),coldTarget=b.brittle&&(e.chillUntil>combatTime(s)||e.frozenUntil>combatTime(s)||e.regulatorFrozenUntil>combatTime(s)||slimePace(s,e)<1),damage=base*(critical?w.critPower:1)*(coldTarget?1+b.brittle:1)*defense;
 if(defense<1)s.events.push({type:'enemy-shield',target:e.id,x:e.x,y:e.y??0,z:e.z,reduction:1-defense});
 if(critical&&!w.secondary&&(b.crit||b.critPower||b.criticalTempo||(['sector','area','contact'].includes(w.mode)?b.meleeCrit:b.rangedCrit)))soulProc(s,'critical',e,{dx:direction?.dx??0,dz:direction?.dz??1});
 applyCriticalTempo(s,w,critical);
 const coldStackAdded=isaacHit(s,e,damage,w);if(!w.secondary)onHit(s,e,damage,(target,d)=>hurtEnemy(s,target,d,0,'thermal'),{coldStackAdded});const hit=hurtEnemy(s,e,damage,ignore,sourceOverride||w.secondary||(w.mode==='arc'?'electric':'direct'),critical,w.secondary?null:w.key);
 if(hit){markRupture(s,e,w,critical);tryNeuralWeb(s,e,w,damage,(target,d,source)=>hurtEnemy(s,target,d,0,source));if(e.hp<=0)specializationKill(s,w);hitFeedback(s,e,w,direction);}return hit;
}
function emitShot(s,p,w,target,offset=0,lateral=0,forward=0){
 const spread=w.spread?(s.rng()*2-1)*w.spread*(1+(p.bloom||0)):0;
 const a=Math.atan2(target.z-s.player.z,target.x-s.player.x)+offset+spread;
 const dx=Math.cos(a),dz=Math.sin(a),x=s.player.x+dx*forward+dz*lateral,z=s.player.z+dz*forward-dx*lateral;
 const ricochet=ricochetProfile(s,w);
 s.shots.push({id:++s.entityId,source:p.id,x,y:(s.player.y??0)+1,z,dy:((target.y??0)-(s.player.y??0))/(Math.hypot(target.x-s.player.x,target.z-s.player.z)||1),dx,dz,target:target.id,returning:false,returnable:!!w.isaac?.returning,life:w.lifetime??playerAttackRange(s,w)/w.speed,speed:w.speed,w,hit:new Set(),remaining:w.pierce||1,mode:w.mode,aim:{x:target.x,z:target.z},distance:distance(s.player,target),travel:0,returnDistance:playerAttackRange(s,w),...(ricochet?{ricochetLeft:ricochet.hops,ricochetDamage:ricochet.damage,ricochetCrit:ricochet.crit,ricochetHunter:ricochet.hunter,ricochetRange:ricochet.range,ricochetBaseWeapon:w}:null)});
}
// A rear strike is a secondary use of the same attack, so it never spends ammo or starts attack procs.
function emitRearAttack(s,p,w,primary){
 if(!w.rearAttack||w.secondary)return false;
 const vx=primary.x-s.player.x,vz=primary.z-s.player.z,reach=playerAttackRange(s,w);
 const rear=s.enemies.filter(e=>combatTargetable(s,e)&&e!==primary&&distance(s.player,e)<=reach+(e.radius||0)
  &&(e.x-s.player.x)*vx+(e.z-s.player.z)*vz<0&&visibleBetween(s,s.player,e))
  .sort((a,b)=>distance(s.player,a)-distance(s.player,b))[0];
 if(!rear)return false;
 const secondary={...w,secondary:'rear',rearAttack:false};
 s.events.push({type:'attack',key:p.key,source:p.id,rear:true,x:s.player.x,y:s.player.y??0,z:s.player.z,tx:rear.x,ty:rear.y??0,tz:rear.z});
 if(secondary.mode==='arc'){
  s.events.push({type:'arc',x:s.player.x,y:s.player.y??0,z:s.player.z,tx:rear.x,ty:rear.y??0,tz:rear.z});
  deal(s,rear,secondary);
 }else if(['projectile','rocket','acid'].includes(secondary.mode)){
  const count=(secondary.pellets??secondary.projectileCount??1)+(secondary.extra||0);
  for(let i=0;i<count;i++){const slot=i-(count-1)/2,offset=secondary.pellets?slot*secondary.pelletSpread:slot*.12;emitShot(s,p,secondary,rear,offset,secondary.mode==='rocket'?slot*.3:0,secondary.mode==='rocket'?.42:0);}
 }else if(secondary.mode==='area'){
  for(const e of s.enemies)if(combatTargetable(s,e)&&distance(rear,e)<=(secondary.areaRadius||2)+(e.radius||0)&&visibleBetween(s,s.player,e))deal(s,e,secondary);
 }else if(secondary.mode==='sector'){
  const a=Math.atan2(rear.z-s.player.z,rear.x-s.player.x);
  for(const e of s.enemies){if(!combatTargetable(s,e)||distance(s.player,e)>reach+(e.radius||0)||!visibleBetween(s,s.player,e))continue;const b=Math.atan2(e.z-s.player.z,e.x-s.player.x),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));if(Math.abs(delta)<=(secondary.angle||1)/2)deal(s,e,secondary);}
 }else deal(s,rear,secondary,1,p.key==='drill'?.5:0);
 return true;
}
function redirectRicochetShot(s,q,origin){
 if(!q.ricochetLeft||q.returning)return false;const target=nextRicochetTarget(s,origin,q.hit,q.ricochetHunter,q.ricochetRange);if(!target)return false;
 const w=q.ricochetBaseWeapon;q.x=origin.x;q.y=(origin.y??0)+1;q.z=origin.z;q.target=target.id;q.w={...w,secondary:'ricochet',damage:w.damage*q.ricochetDamage,crit:Math.min(MAX_CRIT_CHANCE,(w.crit||0)+q.ricochetCrit)};
 const dx=target.x-q.x,dz=target.z-q.z,d=Math.hypot(dx,dz)||1;q.dx=dx/d;q.dz=dz/d;q.dy=((target.y??0)+1-q.y)/d;q.life=d/q.speed+.15;q.travel=0;q.remaining=q.w.pierce||1;q.ricochetLeft--;
 soulProc(s,'ricochet',origin,{tx:target.x,ty:target.y??0,tz:target.z});return true;
}
function emitMeleeRicochet(s,source,origin,w,alreadyHit){
 const profile=ricochetProfile(s,w),visited=new Set(alreadyHit);if(!profile)return false;
 const target=nextRicochetTarget(s,origin,visited,profile.hunter,profile.range);if(!target)return false;
 const dx=target.x-origin.x,dz=target.z-origin.z,d=Math.hypot(dx,dz)||1,speed=16,secondary={...w,mode:'projectile',secondary:'ricochet',damage:w.damage*profile.damage,crit:Math.min(MAX_CRIT_CHANCE,(w.crit||0)+profile.crit),pierce:1};
 s.shots.push({id:++s.entityId,source,x:origin.x,y:(origin.y??0)+1,z:origin.z,dy:((target.y??0)+1-((origin.y??0)+1))/d,dx:dx/d,dz:dz/d,target:target.id,returning:false,returnable:false,life:d/speed+.15,speed,w:secondary,hit:visited,remaining:1,mode:'projectile',aim:{x:target.x,z:target.z},distance:d,travel:0,ricochetLeft:profile.hops-1,ricochetDamage:profile.damage,ricochetCrit:profile.crit,ricochetHunter:profile.hunter,ricochetRange:profile.range,ricochetBaseWeapon:w,meleeRicochet:true});
 soulProc(s,'ricochet',origin,{tx:target.x,ty:target.y??0,tz:target.z});return true;
}
function explodeRocket(s,q){
 const radius=q.w.blastRadius??1.5;
 for(const e of s.enemySpatial?.queryCircle(q.x,q.z,radius+Math.max(2,...s.enemies.filter(e=>e.bossCombat).map(e=>e.radius)))??s.enemies)if(e.hp>0&&Math.hypot(e.x-q.x,e.z-q.z)<=radius+(e.radius||0)&&visibleBetween(s,q,e,.2)){
  const dx=e.x-q.x,dz=e.z-q.z,length=Math.hypot(dx,dz),direction=length>.05?{dx,dz}:{dx:q.dx,dz:q.dz};
  deal(s,e,q.w,1,0,direction,'rocket');
 }
 const groundY=s.world.heightAt?.(q.x,q.z)??q.y??0;
 q.life=0;s.events.push({type:'blast',key:'rocket',x:q.x,y:groundY,z:q.z,radius});
}
// Resolve shield contact on the same combat clock as its thrust animation.
function shieldAreaTargets(s,hit){
 const primary=s.enemies.find(e=>e.id===hit.target&&combatTargetable(s,e)),aimTarget=primary??{x:hit.event.tx,y:hit.event.ty??s.player.y??0,z:hit.event.tz};
 const aimX=aimTarget.x-s.player.x,aimZ=aimTarget.z-s.player.z,aimLength=Math.hypot(aimX,aimZ)||1,dx=aimX/aimLength,dz=aimZ/aimLength;
 const centerDistance=Math.min(playerAttackRange(s,hit.w),aimLength),center={x:s.player.x+dx*centerDistance,y:s.player.y??0,z:s.player.z+dz*centerDistance},radius=hit.w.areaRadius??2;
 const reachMargin=Math.max(2,...s.enemies.filter(e=>e.hp>0).map(e=>e.radius||0));
 const candidates=s.enemySpatial?.queryCircle(center.x,center.z,radius+reachMargin)??s.enemies;
 return candidates.filter(e=>combatTargetable(s,e)&&distance(s.player,e)<=playerAttackRange(s,hit.w)+(e.radius||0)&&distance(center,e)<=radius+(e.radius||0)&&((e.x-s.player.x)*dx+(e.z-s.player.z)*dz)>=-(e.radius||0)*.25&&visibleBetween(s,s.player,e));
}
function shieldImpacts(s){
 const now=combatTime(s),pending=s.shieldStrikes??[];
 s.shieldStrikes=pending.filter(hit=>hit.at>now);
 for(const hit of pending){
  if(hit.at>now)continue;
  const slot=s.arms.findIndex(p=>p?.id===hit.event.source&&isShieldBash(p.key));
  if(slot<0||s.dead)continue;
  const targets=shieldAreaTargets(s,hit);
  s.events.push({...hit.event,x:s.player.x,y:s.player.y??0,z:s.player.z,at:now,animationStarted:true,areaRadius:hit.w.areaRadius,hitCount:targets.length});
  const struck=[];for(const e of targets){
   const d=distance(e,s.player)||1,direction={dx:(e.x-s.player.x)/d,dz:(e.z-s.player.z)/d};
   if(deal(s,e,hit.w,1,0,direction))struck.push(e);
  }
  if(struck.length)emitMeleeRicochet(s,hit.event.source,struck[0],hit.w,struck.map(e=>e.id));
 }
}
function tickShieldAura(s){
 const shields=s.arms.filter(p=>p?.key==='shieldArm'&&!p.disabled),power=shields.reduce((sum,p)=>sum+(weaponStats(s,p).auraDps||0),0),b=modifiers(s),now=combatTime(s);
 for(const e of s.enemies){
  if(!enemyTargetable(e))continue;
  const inside=power>0&&spatialDistance(s.player,e)<=SHIELD_AURA_RADIUS+(e.radius||0)&&visibleBetween(s,s.player,e);
  if(inside){
   if(!e.shieldAuraInside&&applyColdStack(s,e)&&s.rng()<Math.min(1,b.chillChance||.2))e.chillUntil=now+2+(b.chillDuration||0);
   if(!e.shieldAuraInside&&e.shieldAuraNextTick<now)e.shieldAuraNextTick=now;
   e.shieldAuraInside=true;e.shieldAuraUntil=now+.05+(b.chillDuration||0);e.shieldAuraSlow=SHIELD_AURA_SLOW*shields.length;
   e.shieldAuraDot={source:'shield-aura',dps:power,until:now+Math.max(.05,b.burnDuration||0)};
  }else{
   e.shieldAuraInside=false;
  }
  const dot=e.shieldAuraDot;
  if((inside||b.burnDuration&&dot?.until>=now)&&dot?.dps>0){
   e.shieldAuraNextTick??=now;
   while(e.shieldAuraNextTick<=now+1e-8){
    if(!inside&&e.shieldAuraNextTick>dot.until+1e-8)break;
    hurtEnemy(s,e,dot.dps,0,'shield-aura',false,'shieldArm');
    e.shieldAuraNextTick+=1;
    if(e.hp<=0)break;
   }
  }
  if(!inside&&dot?.until<now)e.shieldAuraDot=null;
 }
}
export function attack(s,dt,st=stats(s),repeatPart=null){
 syncSetState(s);if(!repeatPart)shieldImpacts(s);
 if(!repeatPart){
  if(s.whipStrikes?.length||s.enemies.some(e=>e.whipPull)){
   tickWhipStrikes(s,deal,combatTargetable,hit=>{if(hit.struck.length)emitMeleeRicochet(s,hit.event.source,hit.struck[0],hit.w,hit.struck.map(e=>e.id));});
   s.attackQueryCache=null;if(s.enemySpatial)s.enemySpatial=createSpatialIndex(s.enemies.filter(e=>combatTargetable(s,e)));
  }
  tickWeapons(s,dt);for(const p of s.arms.filter(Boolean))p.cooldown-=dt;}
 const now=combatTime(s),query=s.enemySpatial?(s.attackQueryCache?.time===now?s.attackQueryCache:(s.attackQueryCache={time:now,alive:s.enemies.filter(e=>combatTargetable(s,e)),distance:new Map(),visible:new Map()})):null;
 const alive=query?.alive??s.enemies.filter(e=>combatTargetable(s,e)),reachMargin=Math.max(2,...alive.map(e=>e.radius||0)),distanceTo=e=>{if(!query)return distance(s.player,e);if(!query.distance.has(e))query.distance.set(e,distance(s.player,e));return query.distance.get(e);},canSee=e=>{if(!query)return visibleBetween(s,s.player,e);if(!query.visible.has(e))query.visible.set(e,visibleBetween(s,s.player,e));return query.visible.get(e);},candidatesNear=radius=>(s.enemySpatial?.queryCircle(s.player.x,s.player.z,radius)??alive).filter(e=>combatTargetable(s,e));
 if(!repeatPart){
  let focus=null,focusSlot=0,nearest=Infinity;
  for(const [slot,p] of s.arms.entries())if(p&&!p.disabled&&!['drone','shieldArm'].includes(p.key)){
  const w=weaponStats(s,p,st),reach=playerAttackRange(s,w)+reachMargin,candidates=candidatesNear(reach).filter(e=>{const d=distanceTo(e);return e.hp>0&&d<=playerAttackRange(s,w)+(['sector','area','contact'].includes(w.mode)?e.radius||0:0)&&canSee(e);});
   const secret=secretTarget(s,p,w);if(secret&&!candidates.length)candidates.push(secret);
   for(const e of candidates){const d=distanceTo(e);if(d<nearest){focus=e;focusSlot=slot;nearest=d;}}
  }
  turnBody(s,dt,st.turnSpeed,focus,focusSlot);
 }
 const sync=s.arms.filter(p=>p&&!p.disabled&&COMMON_NERVE_HANDS.has(p.key)),commonMultiplier=stackedCommonNerveVolleyMultiplier(s),common=commonMultiplier>1;
 const syncReady=!common||sync.every(p=>{if(p.cooldown>1e-8||p.reloadRemaining>0||p.ammo<=0)return false;const slot=s.arms.indexOf(p),range=playerAttackRange(s,weaponStats(s,p,st));return candidatesNear(range).some(e=>e.hp>0&&distanceTo(e)<=range&&armCanReach(s,slot,e)&&canSee(e));});
 for(const p of (repeatPart?[repeatPart]:s.arms.filter(Boolean))){
  if(p.key==='drone'||p.key==='shieldArm')continue;
  if(p.disabled){p.cooldown=Math.max(0,p.cooldown);continue;}
  if(!repeatPart&&affixBonus(p,'burst')&&p.affixBurstReadyAt==null)p.affixBurstReadyAt=combatTime(s)+10;
  if(!repeatPart&&p.cooldown>1e-8)continue;
  let w=weaponStats(s,p,st);if(!repeatPart&&p.reloadRemaining>0){p.cooldown=Math.max(0,p.cooldown);continue;}
  if(!repeatPart&&w.magazine&&p.ammo===0){startReload(s,p);continue;}
  const reach=playerAttackRange(s,w)+(['sector','area','contact'].includes(w.mode)?reachMargin:0),targets=candidatesNear(reach).filter(e=>{const d=distanceTo(e);return e.hp>0&&d<=reach&&armCanReach(s,s.arms.indexOf(p),e)&&canSee(e)&&d<=playerAttackRange(s,w)+(['sector','area','contact'].includes(w.mode)?e.radius||0:0);}).sort((a,b)=>distanceTo(a)-distanceTo(b));
  const secret=!repeatPart&&secretTarget(s,p,w);
  if(secret&&!targets.length&&armCanReach(s,s.arms.indexOf(p),secret)){w=prepareSetAttack(s,p,prepareSpecializationAttack(s,p,prepareIsaacAttack(s,p,w)));p.cooldown=w.interval;s.events.push({type:p.key==='arc'?'arc':'attack',key:p.key,source:p.id,x:s.player.x,z:s.player.z,tx:secret.x,tz:secret.z});if(p.key==='acid'){emitShot(s,p,w,{...secret,id:secret.id});s.shots.at(-1).secret=secret.id;}else openSecret(s,secret);if(p.key==='whip')p.whipAttacks=(p.whipAttacks||0)+1;consumeRound(s,p);finishSetAttack(s,p,w,(e,d,source)=>hurtEnemy(s,e,d,0,source));const trigger=attackTriggers(s,p,w);recordAssemblerAttack(s,p,st);conductorAttack(s,w,(e,d,source)=>hurtEnemy(s,e,d,0,source));if(trigger.electric)lightning(s,w,(e,d)=>hurtEnemy(s,e,d,0,'electric'));continue;}
  if(!repeatPart&&common&&sync.includes(p)&&!syncReady&&targets.length){p.cooldown=Math.max(0,p.cooldown);continue;}
  if(!targets.length){if(repeatPart)continue;p.cooldown=0;p.idleFor=(p.idleFor||0)+dt;if(p.idleFor>=IDLE_RELOAD_DELAY)startReload(s,p);continue;}
  if(p.key==='drill')targets.sort((a,b)=>Number(b.kind!=='normal')-Number(a.kind!=='normal'));
  if(p.key==='rocket'){const density=new Map(targets.map(e=>[e,(s.enemySpatial?.queryCircle(e.x,e.z,3)??alive).reduce((n,q)=>n+(q.hp>0&&distance(q,e)<3?1:0),0)]));targets.sort((a,b)=>density.get(b)-density.get(a));}
  const target=targets[0];if(!repeatPart&&affixBonus(p,'burst')&&combatTime(s)>=p.affixBurstReadyAt){p.affixBurstUntil=combatTime(s)+1;p.affixBurstReadyAt=combatTime(s)+10;w=weaponStats(s,p,st);}
  w=prepareAbilityAttack(s,p,prepareSpecializationAttack(s,p,prepareIsaacAttack(s,p,w,!!repeatPart),!!repeatPart),target,!!repeatPart);if(common&&sync.includes(p))w.damage*=commonMultiplier;
  w=prepareSetAttack(s,p,w,!!repeatPart);
  if(repeatPart)soulProc(s,'echo',s.player,{tx:target.x,ty:target.y??0,tz:target.z});if(!repeatPart){p.cooldown=Math.max(.001,w.interval+Math.min(0,p.cooldown));recordCritRamp(s,combatTime(s));}p.idleFor=0;p.aim=Math.atan2(target.x-s.player.x,target.z-s.player.z);
  const attackEvent={type:'attack',key:p.key,source:p.id,at:combatTime(s),x:s.player.x,y:s.player.y??0,z:s.player.z,tx:target.x,ty:target.y??0,tz:target.z,targetRadius:target.radius};
  if(p.key==='whip')queueWhipStrike(s,p,w,attackEvent,!!repeatPart);
  s.events.push(isShieldBash(p.key)||p.key==='whip'?{...attackEvent,type:'melee-windup'}:attackEvent);
  if(p.key==='whip'){
   // Contact and the third-strike grab resolve on the animation clock.
  }else if(isShieldBash(p.key)){
   (s.shieldStrikes??=[]).push({at:combatTime(s)+SHIELD_IMPACT_DELAY,event:attackEvent,w,target:target.id});
  }else if(w.mode==='arc'){
   let previous=s.player,available=[...alive],scale=1;
   for(let i=0;i<3;i++){let nearest=null,nearestDistance=Infinity;for(const e of available){if(e.hp<=0||i===0&&!armCanReach(s,s.arms.indexOf(p),e))continue;const d=distance(previous,e);if(d<nearestDistance&&d<=(i?5:playerAttackRange(s,w))&&visibleBetween(s,previous,e)){nearest=e;nearestDistance=d;}}const e=nearest;if(!e)break;s.events.push({type:'arc',x:previous.x,y:previous.y??0,z:previous.z,tx:e.x,ty:e.y??0,tz:e.z});deal(s,e,w,scale);scale*=.75;available=available.filter(q=>q!==e);previous=e;}
  }else if(['projectile','rocket','acid'].includes(w.mode)){const count=(w.pellets??w.projectileCount??1)+(w.extra||0);if(w.extra)soulProc(s,'multishot',s.player,{tx:target.x,ty:target.y??0,tz:target.z,count});for(let i=0;i<count;i++){const shotTarget=w.mode==='rocket'?targets[i%Math.min(count,targets.length)]:target,slot=i-(count-1)/2,offset=w.pellets?slot*w.pelletSpread:slot*.12;emitShot(s,p,w,shotTarget,offset,w.mode==='rocket'?slot*.3:0,w.mode==='rocket'?.42:0);}}
  else if(w.mode==='contact'){const hit=deal(s,target,w,1,p.key==='drill'?.5:0);if(p.key==='fangs')healFromFangsAttack(s,st,p);if(hit)emitMeleeRicochet(s,p.id,target,w,[target.id]);}
  else{
   const a=Math.atan2(target.z-s.player.z,target.x-s.player.x);
   const struck=[];for(const e of targets){const b=Math.atan2(e.z-s.player.z,e.x-s.player.x),delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));if(w.mode==='sector'&&Math.abs(delta)>w.angle/2)continue;if(deal(s,e,w))struck.push(e);}
   if(struck.length)emitMeleeRicochet(s,p.id,struck[0],w,struck.map(e=>e.id));
  }
  if(!repeatPart)emitRearAttack(s,p,w,target);
  if(!repeatPart){conductorAttack(s,w,(e,d,source)=>hurtEnemy(s,e,d,0,source));const trigger=attackTriggers(s,p,w);recordAssemblerAttack(s,p,st);if(trigger.electric)lightning(s,w,(e,d)=>hurtEnemy(s,e,d,0,'electric'));for(let echo=0;echo<trigger.echo;echo++)s.abilities.echoes.push({partId:p.id,at:combatTime(s)+.15*(echo+1)});consumeRound(s,p,w);finishSetAttack(s,p,w,(e,d,source)=>hurtEnemy(s,e,d,0,source));}
 }
}
const segmentDistance=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,dy=(b.y??1)-(a.y??1),t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz+((p.y??1)-(a.y??1))*dy)/(dx*dx+dz*dz+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz,(p.y??1)-(a.y??1)-t*dy);};
const segmentProgress=(p,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,dy=(b.y??1)-(a.y??1);return Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz+((p.y??1)-(a.y??1))*dy)/(dx*dx+dz*dz+dy*dy||1)));};
function interceptHostileShot(s,hostile,old,next){
 if(interceptSupportShot(s,hostile,old,next))return true;
 const candidates=[];
 for(const c of s.abilities.companions||[]){if(c.phase==='dead')continue;const point={x:c.x,y:(c.y??0)+(c.hover??1.5),z:c.z};if(segmentDistance(point,old,next)<=SWARM_INTERCEPT_RADIUS)candidates.push({kind:'companion',value:c,point,progress:segmentProgress(point,old,next)});}
 for(const q of s.shots){if(q.mode!=='rocket'||q.life<=0)continue;const point={x:q.x,y:q.y??1,z:q.z};if(segmentDistance(point,old,next)<=SWARM_INTERCEPT_RADIUS)candidates.push({kind:'rocket',value:q,point,progress:segmentProgress(point,old,next)});}
 const blocker=candidates.sort((a,b)=>a.progress-b.progress)[0];if(!blocker)return false;
 if(blocker.kind==='rocket'){
  const dx=next.x-old.x,dy=(next.y??1)-(old.y??1),dz=next.z-old.z;
  Object.assign(blocker.value,{x:old.x+dx*blocker.progress,y:(old.y??1)+dy*blocker.progress,z:old.z+dz*blocker.progress});explodeRocket(s,blocker.value);
 }else{
  const c=blocker.value,replacement=destroySymbiont(s,c,modifiers(s));
  s.events.push({type:'summon-death',id:c.id,x:blocker.point.x,y:blocker.point.y,z:blocker.point.z,cause:'intercept',projectile:hostile.key,replacementAt:replacement.readyAt,replacementDelay:replacement.interval});
  s.events.push({type:'blast',key:'swarm',x:blocker.point.x,y:blocker.point.y,z:blocker.point.z,radius:.8,defensive:true});
 }
 return true;
}
function shotsStep(s,dt){
 const fragments=[];
 for(const q of s.shots){
  if(q.life<=0)continue;
  const paused=q.frozenUntil>0?Math.max(0,Math.min(dt,q.frozenUntil-(combatTime(s)-dt))):0;if(paused>=dt&&paused>0)continue;const shotDt=dt-paused;
  const old={x:q.x,y:q.y,z:q.z};q.life-=shotDt;
  if(q.mode==='rocket'&&q.life<=1e-9){explodeRocket(s,q);continue;}
  if(q.returning){const d=Math.hypot(s.player.x-q.x,s.player.z-q.z);if(d<=q.speed*shotDt+.5){q.life=0;continue;}q.dx=(s.player.x-q.x)/d;q.dz=(s.player.z-q.z)/d;q.dy=((s.player.y??0)+1-(q.y??1))/d;}

  if(q.mode==='rocket'){
   let target=s.enemies.find(e=>e.id===q.target&&combatTargetable(s,e));
   if(!target){const living=s.enemies.filter(e=>combatTargetable(s,e)),claimed=new Set(s.shots.filter(other=>other!==q&&other.mode==='rocket'&&living.some(e=>e.id===other.target)).map(other=>other.target)),available=living.filter(e=>!claimed.has(e.id)),candidates=available.length?available:living;let nearest=Infinity;for(const e of candidates){const d=distance(q,e);if(d<nearest){nearest=d;target=e;}}q.target=target?.id??null;}
   const searchAngle=combatTime(s)*.7+q.id*2.399963,searchRadius=4.5+(q.id%3)*.8,tx=target?.x??s.player.x+Math.cos(searchAngle)*searchRadius,tz=target?.z??s.player.z+Math.sin(searchAngle)*searchRadius,ty=(target?.y??s.player.y??0)+1,d=Math.hypot(tx-q.x,tz-q.z)||1;
   q.dx=(tx-q.x)/d;q.dz=(tz-q.z)/d;q.dy=(ty-(q.y??1))/d;
  }else if(q.mode==='projectile'&&q.w.homing&&(!q.w.secondary||q.w.secondary==='rear')&&!q.returning){
   const target=s.enemies.find(e=>e.id===q.target&&combatTargetable(s,e));
   if(target){const dx=target.x-q.x,dz=target.z-q.z,d=Math.hypot(dx,dz)||1;q.dx=dx/d;q.dz=dz/d;q.dy=((target.y??0)+1-(q.y??1))/d;}
  }
  q.x+=q.dx*q.speed*shotDt;q.z+=q.dz*q.speed*shotDt;q.y=(q.y??1)+(q.dy??0)*q.speed*shotDt;q.travel+=q.speed*shotDt;
  if(s.world.lineClear&&!s.world.lineClear(old,q)){if(q.mode==='rocket')q.y=Math.max(q.y,(s.world.heightAt?.(q.x,q.z)??0)+2);else{q.life=0;continue;}}
  if(q.mode==='rocket'){
   const hostile=s.hostileShots.filter(p=>p.life>0&&segmentDistance({x:p.x,y:p.y??1,z:p.z},old,q)<=SWARM_INTERCEPT_RADIUS).sort((a,b)=>distance(old,a)-distance(old,b))[0];
   if(hostile){hostile.life=0;explodeRocket(s,q);continue;}
  }
  const pad=Math.max(2.25,...s.enemies.filter(e=>e.hp>0&&e.bossCombat).map(e=>e.radius+.18)),candidates=s.enemySpatial?.rectangle(Math.min(old.x,q.x)-pad,Math.min(old.z,q.z)-pad,Math.max(old.x,q.x)+pad,Math.max(old.z,q.z)+pad)??s.enemies;
  const collisions=candidates.filter(e=>combatTargetable(s,e)&&(q.remaining>0||q.mode!=='projectile')&&!q.hit.has(e.id)&&segmentDistance({...e,y:(e.y??0)+1},old,q)<(e.radius||1)+.18).sort((a,b)=>distance(old,a)-distance(old,b));
  const secret=q.secret&&s.encounters?.nodes.find(n=>n.id===q.secret);if(secret&&q.mode==='acid'&&segmentDistance({...secret,y:(secret.y??0)+1},old,q)<1.6)openSecret(s,secret);
  if(q.mode==='acid'&&(collisions.length||q.travel>=q.distance||q.life<=0)){
   // The washer never damages on impact: it lands under the target and only the puddle deals damage.
   if(!s.world.heightAt||s.world.heightAt(q.x,q.z)!==null)s.puddles.push({id:++s.entityId,source:q.source,weaponKey:q.w.key,x:q.x,y:s.world.heightAt?.(q.x,q.z)??0,z:q.z,life:ACID_PUDDLE_SECONDS*(1+(q.w.acidDurationBonus||0))+(modifiers(s).burnDuration||0),radius:ACID_PUDDLE_RADIUS,slow:ACID_PUDDLE_SLOW,damage:q.w.damage});q.life=0;
  }else if(q.mode==='rocket'&&collisions.length)explodeRocket(s,q);
  else if(q.mode==='projectile'){for(const e of collisions){if(e.hp<=0)continue;if(q.organReflection){hurtEnemy(s,e,q.w.damage,0,'reflection');q.hit.add(e.id);q.remaining=0;q.life=0;break;}if(tryMirrorProjectile(s,e,q)){q.life=0;q.hit.add(e.id);break;}deal(s,e,q.isSplinter?{...q.w,isaac:null,secondary:'splinter'}:q.w,q.returning?(q.w.isaac?.returnDamage??.1):1,0,q);fragments.push(...splinterShots(s,q,e));if(q.remaining>1&&!q.isSplinter&&modifiers(s).pierce)soulProc(s,'pierce',e,{dx:q.dx,dz:q.dz});q.hit.add(e.id);const exhausted=--q.remaining<=0;if((e.id===q.target||exhausted)&&redirectRicochetShot(s,q,e))break;if(exhausted){if(!q.returnable)q.life=0;break;}}}
  if(q.returnable&&!q.returning&&(q.travel>=(q.returnDistance??q.w.range)||q.life<=0)){q.returning=true;q.ricochetLeft=0;if(q.ricochetBaseWeapon)q.w=q.ricochetBaseWeapon;q.hit=new Set();q.remaining=q.w.pierce||1;q.life=8;}
  if(!s.world.lineClear&&!s.world.walkable(q.x,q.z,.05)){if(q.mode==='rocket')q.y=Math.max(q.y,(s.world.heightAt?.(q.x,q.z)??0)+2);else q.life=0;}
 }
 for(const q of s.shots)if(q.life<=0&&!q.presentationEnded){q.presentationEnded=true;s.events.push({type:'projectile-end',x:q.x,y:q.y??0,z:q.z,dx:q.dx,dz:q.dz,travel:q.travel,w:q.w,mode:q.mode,duration:.2});}
 s.shots=s.shots.filter(q=>q.life>0);
 s.hostileShots=s.hostileShots.filter(q=>q.life>0);
 s.shots.push(...fragments.slice(0,Math.max(0,300-s.shots.filter(q=>q.isSplinter).length)));
 // Overlapping puddles stack, so soaking one spot is the Washer's damage curve.
 const puddleDamage=new Map(),puddleRadius=ACID_PUDDLE_RADIUS*(activeMutation(s,'mire')?1.5:1);
 for(const q of s.puddles)for(const e of s.enemySpatial?.queryCircle(q.x,q.z,puddleRadius+2)??s.enemies)if(e.hp>0&&!e.flying&&distance(e,q)<=puddleRadius&&surfaceReach(s,q,e)){
  puddleDamage.set(e,(puddleDamage.get(e)||0)+q.damage*Math.min(dt,q.life));
  if(modifiers(s).chillDuration){e.acidSlow=Math.max(e.acidSlow||0,q.slow||0);e.acidSlowUntil=Math.max(e.acidSlowUntil||0,combatTime(s)-dt+Math.min(dt,q.life)+modifiers(s).chillDuration);}
  if(modifiers(s).chill&&!(q.coldTargets??=new Set()).has(e.id)&&applyColdStack(s,e)){q.coldTargets.add(e.id);if(s.rng()<Math.min(1,modifiers(s).chillChance||.2))e.chillUntil=combatTime(s)+2+(modifiers(s).chillDuration||0);}
 }
 for(const [e,damage] of puddleDamage){const puddle=s.puddles.find(p=>p.weaponKey==='acid'&&p.life>0&&distance(e,p)<=puddleRadius);hurtEnemy(s,e,damage,0,'acid',false,puddle?.weaponKey??'acid');}
 for(const p of s.puddles)p.life-=dt;s.puddles=s.puddles.filter(p=>p.life>0);
}
export const ENEMY_HIT_KNOCKBACK=Object.freeze({elite:1.5,boss:4,final:4});
const ENEMY_HIT_KNOCKBACK_DURATION=.4;
export function applyEnemyHitKnockback(s,source,result){
 const strength=ENEMY_HIT_KNOCKBACK[source?.kind]??0;
 if(!strength||result==='ignored'||result==='dodged')return 0;
 let dx,dz;
 if(source.owner!=null&&Number.isFinite(source.dx)&&Number.isFinite(source.dz)){dx=source.dx;dz=source.dz;}
 else{dx=s.player.x-(source.x??s.player.x);dz=s.player.z-(source.z??s.player.z);}
 let length=Math.hypot(dx,dz);
 if(length<1e-6&&Number.isFinite(source.dx)&&Number.isFinite(source.dz)){dx=source.dx;dz=source.dz;length=Math.hypot(dx,dz);}
 if(length<1e-6){dx=1;dz=0;length=1;}
 s.playerKnockback={dx:dx/length,dz:dz/length,strength,elapsed:0};
 s.events.push({type:'player-knockback',kind:source.kind,strength,x:s.player.x,y:s.player.y??0,z:s.player.z,dx:dx/length,dz:dz/length});
 return strength;
}
function tickPlayerKnockback(s,dt){
 const kick=s.playerKnockback;if(!kick||dt<=0)return;
 const previous=Math.min(1,kick.elapsed/ENEMY_HIT_KNOCKBACK_DURATION);
 kick.elapsed+=dt;
 const next=Math.min(1,kick.elapsed/ENEMY_HIT_KNOCKBACK_DURATION);
 const distance=kick.strength*((1-previous)**2-(1-next)**2);
 if(s.world.heightAt)movePlayer(s,0,kick.dx*distance,kick.dz*distance);
 else moveCreature(s,s.player,kick.dx*distance,kick.dz*distance,bodyRadius(s));
 if(next===1)s.playerKnockback=null;
}
export function receiveDamage(s,damage,st=stats(s),source=null){const result=receiveHit(s,st,{damage,source,fractional:!!source?.missionRoomStrength});applyEnemyHitKnockback(s,source,result);return result;}
function setupMission(s){
 const m=MISSIONS.find(m=>m.id===s.mode);if(!m)throw Error('Unknown mission');
 s.mission={...m};setupMissionFloors(s);
}
export function missionStatus(s){if(s.encounters?.active)return encounterStatus(s);return survivalObjective(s)||missionFloorStatus(s);}
function missionStep(s){
 const m=s.mission;if(!m||m.rewarded)return;
 tickMissionFloors(s,{spawn:(...args)=>spawnEnemy(s,...args),loot:(source,key)=>key?createPart(s,key,1):randomLoot(s,source)});
 if(m.complete){m.rewarded=true;award(s,'mission:'+m.id,m.rewards,m.rewardTier);}
}
export function step(s,dt,input={x:0,z:0}){
 if(s.ending){if(tickEscape(s,dt)&&s.won){recordVictory(s);trackAchievements(s);}return;}
 if(s.dead||s.pending||s.bossRewards?.length||s.won&&!s.continued)return;
 if(tickEscape(s,0))return;
 tickRecordBosses(s);
 const profile=s.performanceEnabled?{start:performance.now(),at:performance.now(),values:{}}:null,mark=name=>{if(!profile)return;const now=performance.now();profile.values[name]=now-profile.at;profile.at=now;};
 syncSetState(s);if(!s.encounters)prepareEncounters(s);syncMutations(s);discoverEncounters(s);const challengeWasActive=!!s.encounters.active;
 if(challengeWasActive)isaacState(s).extraTime+=dt;else s.time+=dt;s.hitAgo+=dt;const st=stats(s),length=Math.hypot(input.x,input.z)||1,pace=movementFactor(s,st)*enemyAcidPace(s),oldPlayer={...s.player};
 const springLeaping=combatTime(s)<(s.extraParts?.springLeapUntil||0);
 if(!springLeaping&&!s.playerKnockback){if(s.world.heightAt)movePlayer(s,dt,input.x/Math.max(1,length)*st.speed*pace*dt,input.z/Math.max(1,length)*st.speed*pace*dt,st.overloaded);else moveCreature(s,s.player,input.x/Math.max(1,length)*st.speed*pace*dt,input.z/Math.max(1,length)*st.speed*pace*dt);}
 tickPlayerKnockback(s,dt);
 containChallenge(s,oldPlayer);tickTowerAcid(s,dt);tickEnemyAcidPools(s,dt,(damage,source)=>receiveHit(s,st,{damage,cause:'acid-puddle',source,fractional:true}));if(s.dead)return;
 const playerTravel=distance(oldPlayer,s.player);s.stationaryFor=playerTravel>1e-6?0:(s.stationaryFor||0)+dt;if(!springLeaping&&playerTravel>1e-6){s.playerStepDistance=(s.playerStepDistance||0)+playerTravel;const stride=1.4;if(s.playerStepDistance>=stride){const count=Math.floor(s.playerStepDistance/stride);s.playerStepDistance%=stride;s.playerStepIndex=(s.playerStepIndex||0)+count;s.events.push({type:'player-step',step:s.playerStepIndex,count,x:s.player.x,y:s.player.y??0,z:s.player.z});}}
 updateMotion(s,dt,playerTravel>1e-6);tickCryoTrail(s);recordRunnerFire(s,oldPlayer);
 s.motion={x:dt?(s.player.x-oldPlayer.x)/dt:0,z:dt?(s.player.z-oldPlayer.z)/dt:0,pace};
 if(!challengeWasActive&&!s.exploration&&s.time>=180){const c=s.world.chunk(Math.floor(s.player.x/64),Math.floor(s.player.z/64)),key=c.cx+','+c.cz;if(distance(s.player,c.lair)<8&&!s.visitedLairs.has(key)){s.visitedLairs.add(key);spawnEnemy(s,'elite');s.events.push({type:'notice',text:'Вы потревожили логово'});}}
 if(!challengeWasActive){tickSurvivalElites(s,(...args)=>spawnEnemy(s,...args));tickSurvivalBosses(s,(...args)=>spawnEnemy(s,...args));tickSurvivalResponse(s,(...args)=>spawnEnemy(s,...args));if(s.overrun?.state!=='active'&&(!s.exploration||s.mode==='survival'))tickWaves(s,dt,(...args)=>spawnEnemy(s,...args));}
 for(const enemy of s.enemies)if(enemy.hp>0)updateSurvivalBossDamage(s,enemy);
 if(!challengeWasActive){if(s.mission)missionStep(s);else tickExploration(s,dt,{spawn:(...args)=>spawnEnemy(s,...args),loot:()=>randomLoot(s,'event')});}
 mark('prelude');
 tickSupportChassis(s,dt,st,(e,d,source)=>hurtEnemy(s,e,d,0,source));
 const towerEventsFrom=s.events.length;
 const protectedNode=null,aiFrame=s.aiFrame=(s.aiFrame||0)+1;
 separateEnemies(s,dt);
 mark('separation');
 for(const e of s.enemies){if(!combatEligible(s,e)||e.kind==='objective')continue;if(tickRegulatorHold(s,e,dt)||e.whipPull)continue;tickImpact(s,e,dt);e.contact-=dt;const far=distance(e,s.player),stride=e.kind==='normal'&&!e.specialty?(far>70?8:far>38?4:1):1;if(stride>1&&(aiFrame+e.id)%stride)continue;const enemyDt=dt*stride;
  if(e.summonAssembly){if(combatTime(s)<e.summonAssembly.until){cancelEnemyAttack(e,combatTime(s));continue;}e.speed=e.summonAssembly.speed;delete e.summonAssembly;}
  if(tickMissionBoss(s,e,enemyDt,source=>receiveDamage(s,source?.damage??1,st,source),e.bossCombat?territoryTarget(s,e,s.player):s.player))continue;
  if(e.pickupSleepUntil>combatTime(s)){cancelEnemyAttack(e,combatTime(s));e.windup=null;continue;}
  if(tickVolatile(s,e,enemyDt,(q,d)=>hurtEnemy(s,q,d,0,'environment'),()=>receiveHit(s,st,{cause:'explosion',source:e})))continue;
  const specialistHolding=tickEnemySpecialist(s,e,enemyDt,(parent,recipeId,side)=>spawnSpecialChild(s,parent,recipeId,side),(companion,hunter)=>{
   if(!(s.abilities.companions||[]).includes(companion))return false;
   const replacement=destroySymbiont(s,companion,modifiers(s),DRONE_HUNTER_REPLACEMENT_DELAY);
   s.events.push({type:'summon-death',id:companion.id,x:companion.x,y:(companion.y??0)+(companion.hover??1.5),z:companion.z,cause:'hunter',source:hunter.id,replacementAt:replacement.readyAt,replacementDelay:replacement.interval});return true;
  });
  const fallback=protectedNode&&e.id%3===0?protectedNode:s.player;
  const target=towerTarget(s,e,consumableTarget(s,e,territoryTarget(s,e,s.exploration?missionEnemyTarget(s,e,fallback):fallback))),d=distance(e,target)||.001,enemySpeed=enemyPace(s,e)*(e.specialty==='shield-bearer'?.3:1);
  const bossAim=e.enemyAttack?.warning;
  turnBossFacing(e,bossAim?{x:e.x+bossAim.dx,z:e.z+bossAim.dz}:target,enemyDt,combatTime(s));
  const firingLane=e.assembly||e.role!=='ranged'||(s.world.lineClear?visibleBetween(s,e,target):clearSegment(s.world,e,target,.05));
  let holding=specialistHolding;
  let targetVisible;const canSeeTarget=()=>targetVisible??=visibleBetween(s,e,target);
  const potentialRange=e.assembly&&target===s.player?enemyAttackRange(e,s):null,bossPursuitRange=['boss','final'].includes(e.kind)?enemyContactRange(s,e):potentialRange,locomotionStop=bossPursuitRange??(e.role==='ranged'&&target===s.player&&firingLane?9:e.radius+.6),moveSpeed=e.speed*enemySpeed*slimePace(s,e)*(e.hitStagger>0?.1:1);
  const locomotion=specialistHolding?{movementOwned:false,attackLocked:true,contactAllowed:false}:tickEnemyLocomotion(s,e,target,enemyDt,{speed:moveSpeed,stopDistance:locomotionStop});
  if(e.assembly){if(locomotion.attackLocked){cancelEnemyAttack(e,combatTime(s));holding=true;}else if(target===s.player||isTower(target))holding=tickModularAttack(s,e,target,()=>isTower(target)?hitTower(target):receiveDamage(s,e.damage,st,e),canSeeTarget)||holding;else cancelEnemyAttack(e,combatTime(s));}
  else if(!locomotion.attackLocked&&(target===s.player||target===protectedNode)&&(firingLane||e.windup))tickEnemyRanged(s,e,target);
  const stopRange=potentialRange===null?null:(holding?potentialRange:d<=potentialRange+.75&&(s.world.lineClear?canSeeTarget():clearSegment(s.world,e,target,.05))?bossPursuitRange:0);
  if(s.exploration){if(!locomotion.movementOwned&&!holding&&d>(stopRange??(e.role==='ranged'&&target===s.player&&firingLane?9:e.radius+.6)))navigateEnemy(s,e,target,moveSpeed,enemyDt);}
  else if(!locomotion.movementOwned&&!holding&&d>(stopRange??(e.role==='ranged'?9:e.radius+.6))){const dx=(target.x-e.x)/d*moveSpeed*enemyDt,dz=(target.z-e.z)/d*moveSpeed*enemyDt,old={x:e.x,z:e.z};moveCreature(s,e,dx,dz,e.radius);if(distance(e,old)<.001)moveCreature(s,e,-dz,dx,e.radius);}
  const contactDistance=target===s.player?enemyContactRange(s,e):e.radius+1;
  if(locomotion.contactAllowed&&enemySpeed>0&&distance(e,target)<=contactDistance&&e.contact<=0&&visibleBetween(s,e,target)){if(target===s.player){if(!springContact(s,e))receiveDamage(s,e.damage??1,st,e);}else if(isTower(target))hitTower(target);else if(!e.assembly&&target===protectedNode)s.mission.targetHp-=e.damage;e.contact=(e.contactInterval??1)/(e.difficultyAttackRate??1);}
 }
 mark('enemies');
 damageTowersFromEvents(s,s.events.slice(towerEventsFrom));
 tickGuardian(s);tickHostileShots(s,dt,q=>{const result=receiveHit(s,st,{damage:q.damage??1,cause:'projectile',projectile:q,dx:q.dx,dz:q.dz,fractional:!!q.missionScaled||!!q.fractional});applyEnemyHitKnockback(s,q,result);},(q,old,next)=>interceptHostileShot(s,q,old,next));
 const due=s.abilities.echoes.filter(q=>q.at<=combatTime(s));s.abilities.echoes=s.abilities.echoes.filter(q=>q.at>combatTime(s));for(const q of due){const p=s.arms.find(p=>p?.id===q.partId);if(p)attack(s,0,st,p);}
 s.enemySpatial=createSpatialIndex(s.enemies.filter(e=>combatTargetable(s,e)));attack(s,dt,st);shotsStep(s,dt);tickShieldAura(s);tickEffects(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));tickCoolerDamage(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));tickRunnerFire(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));s.enemies=s.enemies.filter(e=>e.hp>0);s.enemySpatial=null;
 mark('combat');
 tickConsumableDrops(s,st,(e,d,ignore,source)=>hurtEnemy(s,e,d,ignore,source));
 tickSetCollector(s);
 for(const q of s.xpDrops){const d=groundDistance(s,q,s.player);if((d>=st.pickup&&!(q.setAttracted&&s.setsV2?.active.wanderer))||!surfaceReach(s,q,s.player))continue;q.x+=(s.player.x-q.x)*Math.min(1,dt*8);q.z+=(s.player.z-q.z)*Math.min(1,dt*8);if(s.world.heightAt)q.y=s.world.heightAt(q.x,q.z)??q.y??0;if(d<.8){const levels=addXP(s,q.value*XP_PICKUP_MULTIPLIER);if(!levels)s.events.push({type:'experience'});q.value=0;}}s.xpDrops=s.xpDrops.filter(q=>q.value);
 tickRecoveryDrops(s,st);tickExtraParts(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));tickHealth(s,st);tickIsaacCombat(s,dt,(e,d,source)=>hurtEnemy(s,e,d,0,source));containChallenge(s,s.player);if(!s.dead&&s.hp>0)tickChallenge(s,dt,(...args)=>spawnEnemy(s,...args));if(!challengeWasActive)tickTimedItems(s,()=>randomLoot(s,'normal'));
 if(s.hp<=0&&!s.dead){s.dead=true;s.events.push({type:'player-death',x:s.player.x,y:s.player.y??0,z:s.player.z},{type:'notice',text:'Душа возвращается.'});}
 tickOverrun(s,dt,(...args)=>spawnEnemy(s,...args),createPart);checkUnlocks(s);if(!s.dead&&!challengeWasActive&&s.mission)missionStep(s);trackAchievements(s);settleObjects(s,false);if(!s.dead){const items=autoPickup(s);if(items.length){s.events.push({type:'pickup',kind:'part',count:items.length,x:s.player.x,y:s.player.y??0,z:s.player.z});const equipped=items.filter(item=>installed(s).includes(item));s.events.push({type:'notice',text:items.length===1?`${CATALOG[items[0].key].name} · ${equipped.length?'установлено':'в инвентаре'}`:`Детали: ${equipped.length} установлено · ${items.length-equipped.length} в инвентаре`});}}
 mark('post');if(profile){const state=s.performanceTimings??={count:0};state.count++;for(const [name,ms]of Object.entries(profile.values)){const value=state[name]??={mean:0,max:0};value.mean+=(ms-value.mean)/state.count;value.max=Math.max(value.max,ms);}}
}

export const beginEncounter=(s,id)=>startChallenge(s,id,(...args)=>spawnEnemy(s,...args));
export const exitDungeon=(s,id)=>leaveDungeon(s,id);

export const beginOverrun=s=>startOverrun(s,(...args)=>spawnEnemy(s,...args));
export function applyStartingLoadout(s,choice){const c=validLoadout(s.profile,choice);(s.profile.meta??={}).loadout={...c};s.body=createPart(s,c.body);const d=CATALOG[c.body];s.arms=Array.from({length:d.arms},(_,i)=>i===0?createPart(s,c.arm):null);s.legs=Array.from({length:d.legs},()=>createPart(s,'universal'));s.organs=Array.from({length:d.organs},(_,i)=>i===0&&c.organ?createPart(s,c.organ):null);s.hp=stats(s).hp;syncSetState(s);return c;}

export function rerollReward(s){if(s.pending)return spendReroll(s,()=>rollChoices(s,s.choices.map(c=>c.id)));const r=s.bossRewards?.[0];if(!r)return false;return spendReroll(s,()=>{r.options=rollBossRewardOptions(s,createPart,lootTier(s.level,s.rng),r.rarity,r.options.map(p=>p.key),r.weaponsOnly);});}

export function continueSurvival(s){if(!continueForRecord(s))return false;const old=s.encounters?.nodes||[];prepareEncounters(s);const fresh=s.encounters.nodes;s.encounters.nodes=fresh.map(n=>{const previous=old.find(q=>q.id===n.id);return previous?{...n,x:previous.entrance?.x??previous.x,y:previous.entrance?.y??previous.y,z:previous.entrance?.z??previous.z,discovered:previous.discovered}:n;});return true;}
