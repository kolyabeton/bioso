import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createRun,spawnEnemy,step} from '../src/game.js';
import {createPart,moveInstalled,digestionMultiplier,stats,newProfile} from '../src/assembly.js';
import {createWorldRun} from '../src/world-run.js';
import {createMissionWorld,missionRoomThreat,missionRoomStrength,strengthenMissionEnemy,MISSION_BOSS_HP_SCALE} from '../src/mission-run.js';
import {enemyBalance} from '../src/systems/balance.js';
import {MISSIONS} from '../src/catalog.js';
import {bodyTraitDescription,traitBoostShare} from '../src/systems/body-traits.js';
import {itemInspectorData} from '../src/ui/item-inspector-data.js';
import {soulStatGroups} from '../src/ui/soul-stats.js';
import {activeEquipmentCards} from '../src/ui/catalog-sets.js';
import {createGroundItemsView,LOOT_GLOW_COLORS} from '../src/ground-items-view.js';

test('installed parts move or swap atomically within their own group',()=>{
 const s=createRun(),p=createPart(s,'digestion'),q=createPart(s,'shield');s.organs=[p,q];
 assert.equal(moveInstalled(s,p.id,'organs',0,1),true);assert.deepEqual(s.organs,[q,p]);
 assert.equal(moveInstalled(s,q.id,'organs',0,9),false);assert.deepEqual(s.organs,[q,p]);
 assert.equal(moveInstalled(s,999,'organs',0,1),false);
});
test('Gardener has no unconditional dodge and Composter rank I copy matches actual mechanics',()=>{
 const s=createRun(),p=createPart(s,'digestion');s.organs=[p];
 assert.doesNotMatch(bodyTraitDescription(s.body),/Уклонение/);assert.equal(traitBoostShare(createPart(s,'repairGland')),.2);
 assert.match(JSON.stringify(itemInspectorData(s,p)),/80%/);p.upgrades.power=3;
 assert.ok(Math.abs(digestionMultiplier(s)-1.088)<1e-9);
 assert.equal(Object.fromEntries(soulStatGroups(s,stats(s)).flatMap(g=>g.rows))['Биомасса'],'+8,8%');
});
test('only the first mission freezes all enemy time and room scaling',()=>{
 const s=createWorldRun(newProfile(),'garden',1),a=spawnEnemy(s,'normal',{x:0,z:0},'mass',0),b=spawnEnemy(s,'normal',{x:0,z:0},'mass',9999);
 assert.equal(a.maxHp,b.maxHp);assert.equal(a.speed,b.speed);assert.equal(missionRoomThreat(s.mission,0),missionRoomThreat(s.mission,24));
 const e={hp:100,maxHp:100};strengthenMissionEnemy(e,24,s.mission);assert.equal(e.hp,100);
 assert.ok(missionRoomThreat(MISSIONS[1],24)>missionRoomThreat(MISSIONS[1],0));
});
test('final room has double walkable width and live terrain outside old corridor',()=>{
 const w=createMissionWorld(1,MISSIONS[0],{decorations:false,gates:false}),z=-24*64;
 assert.equal(w.halfWidthAt(0),9);assert.equal(w.halfWidthAt(z),18);assert.equal(w.walkable(15,z,1),true);assert.equal(w.walkable(15,0,1),false);assert.ok(w.tileAt(15,z));
});
test('all mission bosses use the shared reduced health scale',()=>{
 for(const m of MISSIONS){const s=createWorldRun(newProfile(),m.id,1),index=m.floors-1;s.mission.currentFloor=index;for(let i=0;i<index;i++)s.mission.floorsState[i].state='cleared';s.mission.floorsState[index].state='ready';s.player={x:0,y:0,z:-index*64};step(s,0);const boss=s.enemies.find(e=>e.bossCombat);assert.ok(boss,m.id);const hp=enemyBalance(m.difficulty*60+index*50+m.difficulty*360,'boss').hp*missionRoomStrength(index);assert.equal(boss.maxHp,Math.round(hp*MISSION_BOSS_HP_SCALE),m.id);}
});
test('Soul includes active chassis and both weapon families',()=>{
 const s=createRun();s.body=createPart(s,'hecaton');s.legs=['plated','plated'].map(k=>createPart(s,k));s.arms=['pistol','pistol','shotgun','shotgun'].map(k=>createPart(s,k));
 const html=activeEquipmentCards(s);for(const text of ['Бонус корпуса','Маркер','Рассеиватель'])assert.ok(html.includes(text));
});
test('loot glow uses per-instance rarity colors and larger legendary halo',()=>{
 const scene=new T.Scene(),v=createGroundItemsView(scene,async()=>null),items=Object.keys(LOOT_GLOW_COLORS).map((rarity,i)=>({x:i*4,z:0,part:{key:'armor',rarity}}));v.update(items);
 const h=scene.getObjectByName('ground-item-halos'),c=new T.Color(),m=new T.Matrix4();
 for(let i=0;i<4;i++){h.getColorAt(i,c);assert.equal(c.getHex(),Object.values(LOOT_GLOW_COLORS)[i]);}
 h.getMatrixAt(3,m);assert.ok(new T.Vector3().setFromMatrixScale(m).x>1.6);
});
