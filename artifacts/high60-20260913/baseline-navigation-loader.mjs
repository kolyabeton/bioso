import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
registerHooks({load(url,context,nextLoad){if(url.endsWith('/src/world-navigation.js'))return {format:'module',source:readFileSync(new URL('./before/world-navigation.js',import.meta.url),'utf8'),shortCircuit:true};return nextLoad(url,context);}});
