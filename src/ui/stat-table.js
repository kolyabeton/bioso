import {e} from './atoms.js';

// Presentation only: callers supply approved rows and already formatted values.
export function statTable(rows,{className='',comparison=false}={}){
 if(!rows.length)return '';
 if(comparison)return `<div class="ui-stat-table ui-stat-table--comparison ui-comparison" role="region" aria-label="Сравнение характеристик"><table><thead><tr><th>Характеристика</th><th>Сейчас</th><th>После</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${e(r.label)}</th><td>${e(r.before)}</td><td class="${r.changed?'is-'+(r.tone||'neutral'):''}">${r.changed?(r.tone==='positive'?'↑ ':r.tone==='negative'?'↓ ':'↔ '):''}${e(r.after)}</td></tr>`).join('')}</tbody></table></div>`;
 return `<dl class="ui-stat-table ${e(className)}">${rows.map(r=>`<div${r.wide?' class="is-wide"':''}><dt>${e(r.label)}</dt><dd>${e(r.value)}</dd></div>`).join('')}</dl>`;
}
