import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun} from '../src/game.js';
import {createPart} from '../src/assembly.js';
import {activeMutationSection} from '../src/ui/isaac-ui.js';

test('Soul explains Hive larvae without an Incubator and removes the card when the source is lost',()=>{
 const s=createRun();s.arms=['rocket','fangs'].map(k=>createPart(s,k));s.legs=[];s.organs=[createPart(s,'digestion')];
 const html=activeMutationSection(s);
 assert.match(html,/Активные мутации/);assert.match(html,/Улей · Активна/);assert.match(html,/3 личинки/);
 assert.match(html,/Доставщик · Захват · Компостер/);assert.doesNotMatch(html,/Инкубатор|Проводник|Топь/);
 s.inventory.push(s.organs.pop());assert.equal(activeMutationSection(s),'');
});

test('Soul lists every active mutation without counting inventory or duplicate parts',()=>{
 const s=createRun();s.arms=['rocket','fangs','arc','acid'].map(k=>createPart(s,k));s.legs=[];
 s.organs=['digestion','shield','stabilizer','slime','regen'].map(k=>createPart(s,k));
 const html=activeMutationSection(s);for(const id of ['hive','conductor','mire'])assert.match(html,new RegExp(`data-mutation="${id}"`));
 s.arms=['rocket','rocket'].map(k=>createPart(s,k));s.organs=[createPart(s,'digestion')];assert.equal(activeMutationSection(s),'');
});
