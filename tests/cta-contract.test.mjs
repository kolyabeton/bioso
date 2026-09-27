import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('primary CTAs are green-filled and preserve each screen action order',async()=>{
  const [components,theme,events,screens]=await Promise.all([
    readFile(new URL('../src/ui/components.css',import.meta.url),'utf8'),
    readFile(new URL('../src/ui/ceramic-theme.css',import.meta.url),'utf8'),
    readFile(new URL('../src/ui/isaac-ui.js',import.meta.url),'utf8'),
    readFile(new URL('../src/ui/screens.js',import.meta.url),'utf8'),
  ]);
  assert.match(components,/\.ui-button--primary\{[^}]*--button-fill:var\(--ui-mint\)[^}]*color:var\(--ui-ivory\)/s);
  assert.match(theme,/\.ui-screen-footer \.ui-button--primary\{color:var\(--ui-ivory\)\}/);
  assert.match(events,/<footer class="ui-screen-footer event-footer">\$\{primary\}\$\{exit\}<\/footer>/);
  assert.match(events,/button\('Принять',\{action:'deal-accept','data-key':key,variant:'primary'/);
  assert.match(events,/if\(directDeal\)primary=button\('Принять',\{action:'deal-accept','data-key':directDeal,variant:'primary'/);
  assert.doesNotMatch(screens,/deal-confirm|deal-review/);
  for(const contract of [
    /footer\(button\('Забрать',[\s\S]*?\)\+button\('Установить',[\s\S]*?variant:'primary'/,
    /footer\(button\('Назад',[^}]+\}\)\+button\('Установить корпус',[^}]+variant:'primary'/,
    /footer\(button\('В меню',[^}]+\}\)\+\(won.*variant:'primary'/,
  ])assert.match(screens,contract);
});
