import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('completed event selections close the popup instead of rendering its completed state',async()=>{
 const screens=await readFile(new URL('../src/ui/screens.js',import.meta.url),'utf8');
 assert.match(screens,/case'encounter-claim':[\s\S]*?notify\('Награда лежит рядом'\);close\(\);/);
 assert.match(screens,/case'fuse-accept':[\s\S]*?notify\('Рука сращена · Урон ×2'\);close\(\);/);
 assert.match(screens,/case'deal-accept':[\s\S]*?notify\('Сделка заключена'\);close\(\);/);
});
