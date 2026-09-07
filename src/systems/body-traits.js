import {CATALOG} from '../catalog.js';
import {slotCount,organCapacity} from './body-slots.js';
export function bodyBonuses(s){const d=CATALOG[s.body.key];return{speed:d.legs>=4?.15:0,rate:slotCount(s,s.body,'arms')>=3?.15:0,organ:slotCount(s,s.body,'organs')>=4?.3:0};}
export const organEffect=s=>1+bodyBonuses(s).organ;
export function bodyTraitDescription(p){const d=CATALOG[p.key]||p;return[d.trait+'.',d.legs>=4?'Четыре ноги: скорость движения +15%.':null,d.arms>=3?'Многорукое тело: скорость атак всех рук +15%.':null,organCapacity(p)>=4?'Развитая полость: эффективность органов +30%.':d.arms<3?'С 4 слотами органов: эффективность органов +30%.':null].filter(Boolean).join(' ');}
