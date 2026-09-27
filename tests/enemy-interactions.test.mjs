import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,hurtEnemy} from '../src/game.js';
import {difficultyCounterScale} from '../src/systems/difficulty.js';
import {enemyInteractionTags,enemyWeaponMultiplier} from '../src/systems/enemy-interactions.js';

const target=(role,extra={})=>({role,recipeId:role==='ranged'?'acid-spitter':role,...extra});

test('counter penalties are disabled on easy and reach authored values on hard',()=>{
 const armored=target('armored',{recipeId:'carapace'});
 assert.equal(difficultyCounterScale(0),0);
 assert.equal(enemyWeaponMultiplier({difficulty:0},armored,'claws'),1);
 assert.equal(enemyWeaponMultiplier({difficulty:50},armored,'claws'),.75);
 assert.equal(enemyWeaponMultiplier({difficulty:100},armored,'claws'),.5);
});

test('washer keeps normal damage against armored enemies while acid remains weak against acidics',()=>{
 const armored=target('armored',{recipeId:'carapace'}),acidic=target('ranged',{recipeId:'acid-spitter'});
 assert.equal(enemyWeaponMultiplier({difficulty:100},armored,'acid'),1);
 assert.equal(enemyWeaponMultiplier({difficulty:100},acidic,'acid'),.5);
});

test('welder has a shield-bearer counter instead of an armor counter',()=>{
 const shielded=target('armored',{specialty:'shield-bearer',recipeId:'shield-bearer'}),armored=target('armored',{recipeId:'carapace'});
 assert.equal(enemyInteractionTags(shielded).has('shielded'),true);
 assert.equal(enemyWeaponMultiplier({difficulty:100},shielded,'arc'),.5);
 assert.equal(enemyWeaponMultiplier({difficulty:100},armored,'arc'),1);
});

test('Seeder, Marker and Spreader keep full damage against every enemy tag',()=>{
 const enemies=[target('armored',{recipeId:'carapace'}),target('fast'),target('ranged',{recipeId:'acid-spitter'}),target('flying',{flying:true}),target('fast',{summonOwner:1})];
 for(const key of ['seed','pistol','shotgun'])for(const enemy of enemies)assert.equal(enemyWeaponMultiplier({difficulty:100},enemy,key),1,`${key} versus ${enemy.role}`);
});

test('hurtEnemy applies the weapon matchup at the selected difficulty',()=>{
 const easy=createRun(undefined,'survival',41),hard=createRun(undefined,'survival',41);
 easy.difficulty=0;hard.difficulty=100;
 const easyEnemy={id:1,x:0,y:0,z:0,hp:100,maxHp:100,armor:0,role:'armored',recipeId:'carapace',kind:'normal',born:0};
 const hardEnemy={...easyEnemy,id:2};
 easy.enemies=[easyEnemy];hard.enemies=[hardEnemy];
 hurtEnemy(easy,easyEnemy,10,0,'direct',false,'claws');
 hurtEnemy(hard,hardEnemy,10,0,'direct',false,'claws');
 assert.equal(easyEnemy.hp,90);
 assert.equal(hardEnemy.hp,95);
});
