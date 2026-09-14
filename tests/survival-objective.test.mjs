import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorldRun} from '../src/world-run.js';
import {hurtEnemy,missionStatus} from '../src/game.js';
import {survivalObjective} from '../src/systems/survival-objective.js';
import {setWaypoint,waypointTarget} from '../src/systems/waypoint.js';
import {translateText} from '../src/i18n/index.js';
import {filteredMapMarkers} from '../src/ui/map.js';
import {SURVIVAL_BOSS_INTERVAL,tickSurvivalBosses} from '../src/systems/survival-bosses.js';
import {spawnEnemy} from '../src/game.js';

test('each survival starts with its introductory boss selected and localized objective',()=>{
 for(const seed of [12,42,20317,20260908]){
  const s=createWorldRun(undefined,'survival',seed),boss=s.enemies.find(e=>e.id===s.introBossId);
  assert.ok(boss?.habitat);assert.equal(waypointTarget(s).id,boss.id);
  assert.equal(boss.recipeId,'warden');assert.equal(boss.bossName,'Страж');
  assert.equal(boss.bossDesignId,undefined);assert.equal(boss.bossCombat,undefined);
  assert.equal(boss.assembly.body.key,'bastion');assert.equal(boss.maxHp,182);
  assert.equal(filteredMapMarkers(s,'threats').find(marker=>marker.id===boss.id)?.label,'Первый босс');
  assert.equal(s.waypoint.source,'enemy');assert.equal(s.waypoint.label,'Первый босс');
  assert.equal(missionStatus(s),'Убейте первого босса');
  assert.equal(translateText(missionStatus(s),'en'),'Kill First Boss');
  boss.x+=3;assert.equal(waypointTarget(s).x,boss.x);
 }
});

test('Hunter belongs to the timed special wave and never replaces the introductory boss',()=>{
 const s=createWorldRun(undefined,'survival',42),introId=s.introBossId;
 assert.equal(s.enemies.some(e=>e.bossDesignId==='boss-mercury-hunter'),false);
 s.time=SURVIVAL_BOSS_INTERVAL;
 const hunter=tickSurvivalBosses(s,(...args)=>spawnEnemy(s,...args));
 assert.equal(hunter.bossDesignId,'boss-mercury-hunter');assert.equal(hunter.survivalInvader,true);
 assert.equal(s.introBossId,introId);assert.equal(waypointTarget(s).id,introId);
 hurtEnemy(s,hunter,1e9);assert.equal(s.introBossRewarded,undefined);
 assert.equal(s.ground.some(q=>q.part?.key==='digestion'),false);
});

test('objective ends only when the introductory boss dies and does not replace manual waypoints',()=>{
 const s=createWorldRun(undefined,'survival',12),boss=s.enemies.find(e=>e.id===s.introBossId);
 const other=s.enemies.find(e=>e.kind==='boss'&&e!==boss);hurtEnemy(s,other,1e9);
 assert.equal(s.ground.some(q=>q.part?.key==='digestion'),false);
 assert.ok(survivalObjective(s));assert.equal(waypointTarget(s).id,boss.id);
 setWaypoint(s,s.world.tiles[2].safe[2]);const manual={...s.waypoint};
 assert.ok(survivalObjective(s));assert.deepEqual(s.waypoint,manual);
 setWaypoint(s,{...boss,label:'Первый босс'});hurtEnemy(s,boss,1e9);
 assert.equal(s.ground.filter(q=>q.part?.key==='digestion').length,1);
 assert.equal(survivalObjective(s),'');assert.equal(waypointTarget(s),null);
 s.enemies=s.enemies.filter(e=>e.hp>0);assert.equal(survivalObjective(s),'');
});

test('missions keep their own status and have no automatic survival waypoint',()=>{
 const s=createWorldRun(undefined,'garden',42);
 assert.equal(survivalObjective(s),'');assert.equal(waypointTarget(s),null);
 assert.match(missionStatus(s),/Комната/);
});
