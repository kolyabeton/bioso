import {RARITIES} from '../systems/sets-loot.js';
import {e} from './atoms.js';

// Keep gameplay descriptions as plain text; add presentation only at rendering.
export function rarityText(text){
 const value=String(text??'');
 const match=Object.entries(RARITIES).find(([,label])=>value===label||value.startsWith(label+' ·'));
 if(!match)return e(value);
 const [key,label]=match;
 return `<span class="ui-rarity ui-rarity--${key}">${e(label)}</span>${e(value.slice(label.length))}`;
}
