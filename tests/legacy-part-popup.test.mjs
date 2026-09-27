import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('retired full-screen part popup has no renderer, dispatcher or styles',()=>{
 const screens=source('src/ui/screens.js');
 assert.doesNotMatch(screens,/function (?:part|removePart|performPart)\(/);
 assert.doesNotMatch(screens,/part-properties|remove-part|remove-review|action:['"]selected-detail|case['"]selected-detail|open\(['"]part['"]/);
 assert.match(screens,/if\(!Object\.hasOwn\(renderers,name\)\)return;/);
 assert.doesNotMatch(source('src/ui/game-ui.css'),/data-screen=part(?:\]|\b)|\.ui-detail(?:[\s>.:{]|-heading|-meta|-lines|-art)/);
});

test('review entry points cannot reopen the retired popup',()=>{
 assert.doesNotMatch(source('src/isaac-review.js'),/route===['"]part['"]|name:['"]part['"]/);
 assert.doesNotMatch(source('src/ui/review-fixtures.js'),/name===['"]part['"]|name:['"]part['"]/);
 assert.doesNotMatch(source('src/main.js'),/['"]part['"]/);
});

test('assembly cards still use the existing lightweight item inspector',()=>{
 const screens=source('src/ui/screens.js');
 assert.match(screens,/function inspectItem\(/);
 assert.match(screens,/createItemTooltip/);
 assert.match(screens,/data\.action==='part'/);
 assert.match(source('src/ui/item-tooltip.js'),/item-inspector/);
});
