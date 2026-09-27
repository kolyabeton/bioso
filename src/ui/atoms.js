// Shared, escaped HTML primitives. These have no access to gameplay state.
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const e = escapeHTML;
export function attrs(values = {}) {
  return Object.entries(values).filter(([,v]) => v !== false && v != null).map(([k,v]) => ` ${k}="${e(v === true ? '' : v)}"`).join('');
}
const paths = {
  back:'M15 5l-7 7 7 7M8 12h13', close:'M6 6l12 12M18 6 6 18', next:'m9 5 7 7-7 7', down:'m5 9 7 7 7-7',
  pause:'M8 5v14M16 5v14', play:'m8 4 12 8-12 8Z', check:'m4 12 5 5L20 6', plus:'M12 4v16M4 12h16',
  navigation:'m12 3 8 18-8-5-8 5Z',
  map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16',
  assembly:'m12 2 9 5v10l-9 5-9-5V7ZM3 7l9 5 9-5M12 12v10',
  soul:'m12 2 8 6-2 10-6 4-6-4L4 8Zm0 0-3 10 3 10 4-10Z',
  leaf:'M5 20C2 6 12 5 21 3c0 13-6 18-16 17ZM5 20l11-11',
  target:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z',
  clock:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3v7l5 3',
  settings:'m9 3 1-2h4l1 2 3 2 2 0 2 4-2 2v3l2 2-2 4-3-1-2 2-1 2h-4l-1-2-3-2-2 0-2-4 2-2v-3L2 9l2-4 3 0Zm3 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  health:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z', shield:'m12 2 9 4-1 8c-1 4-8 8-8 8s-7-4-8-8L3 6Zm0 4v11',
  speed:'m13 2-8 12h7l-1 8 8-12h-7Z', lock:'M6 10h12v11H6ZM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  bag:'M8 7h8l4 14H4ZM9 4a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z',
  home:'m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9', restart:'M4 9a9 9 0 1 1 1 9M4 3v7h7',
  exit:'M10 3H3v18h7M9 12h13m-5-5 5 5-5 5', sound:'m3 9 5 0 5-5v16l-5-5H3ZM17 8c3 2 3 6 0 8M20 4c5 5 5 11 0 16',
  radio:'M4 8h16v12H4ZM8 8l4-5 4 5M7 12h6M7 15h6M17 12v0M17 16v0',
  journal:'M3 5h6a3 3 0 0 1 3 3v12a3 3 0 0 0-3-3H3ZM21 5h-6a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h6Z',
  fire:'M12 2c2 8 9 8 9 14a9 9 0 0 1-18 0c0-5 3-7 4-10 0 5 3 6 3 6s3-4 2-10Z',
  cold:'M12 2v20M3 7l18 10M3 17 21 7M8 4l4 4 4-4M8 20l4-4 4 4',
  lair:'m3 20 3-12 6-6 6 6 3 12ZM8 20v-7l4-4 4 4v7',
  enemy:'m4 4 5 5h6l5-5M4 20l5-5h6l5 5M3 12h18M9 9v6M15 9v6',
  pointer:'m6 2 14 14-8-1-5 7Z', info:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 10v8M12 6v1',
};
// Canonical reroll currency icon; the legacy dice name uses this same component.
export function rerollIcon(className = '') {return `<svg class="ui-icon ui-reroll-icon ${e(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><g fill="currentColor" stroke="none"><circle cx="7.5" cy="7.5" r="1.4"/><circle cx="16.5" cy="7.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="7.5" cy="16.5" r="1.4"/><circle cx="16.5" cy="16.5" r="1.4"/></g></svg>`;}
export function icon(name, className = '') { if(name==='reroll'||name==='dice')return rerollIcon(className); return `<svg class="ui-icon ${e(className)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.soul}"/></svg>`; }
export function frame(content, {className='',tag='div',...attributes}={}) {return `<${tag} class="ui-frame ${e(className)}"${attrs(attributes)}>${content}</${tag}>`;}
export function button(label, {action,variant='secondary',icon:iconName,className='',disabled=false,indicator=false,size='',...attributes}={}) {
  return `<button type="button" class="ui-frame ui-button ui-button--${e(variant)}${indicator?' ui-button--indicator':''}${size==='menu'?' ui-button--menu':''} ${e(className)}"${attrs({'data-action':action,disabled,...attributes})}>${iconName?icon(iconName):''}<span>${e(label)}</span></button>`;
}
export function linkButton(label,{href,variant='outline',icon:iconName,className='',...attributes}={}){
  return `<a class="ui-frame ui-button ui-button--${e(variant)} ${e(className)}"${attrs({href,target:'_blank',rel:'noopener noreferrer',...attributes})}>${iconName?icon(iconName):''}<span>${e(label)}</span></a>`;
}
export function iconButton(name,label,options={}) {return button('',{...options,icon:name,className:`ui-icon-button ${options.className||''}`,'aria-label':label,title:label});}
export const badge=(label,tone='neutral')=>`<span class="ui-badge ui-badge--${e(tone)}">${e(label)}</span>`;
export function sectionLabel(label){return `<h3 class="ui-section-label"><span>${e(label)}</span></h3>`;}
export function meter(value,max,{label='',id='',className=''}={}){const percent=Math.max(0,Math.min(100,max>0?value/max*100:0));return `<div class="ui-meter ${e(className)}" role="progressbar"${attrs({'aria-label':label,'aria-valuemin':0,'aria-valuemax':max,'aria-valuenow':value})}><i${attrs({id:id||null})} style="width:${percent}%"></i></div>`;}
export const HEALTH_SEGMENT_LIMIT=12;
export function healthSegments(view){
  const current=view.current??view.segments.filter(Boolean).length,max=view.max??view.segments.length,armor=view.armorOverlay??view.armor??0,armorStart=current-Math.min(current,view.armorMaxOverlay??view.armorMax??armor);
  const shield=view.shieldEquipped?`<svg class="ui-shield-ring" viewBox="0 0 150 18" preserveAspectRatio="none" aria-hidden="true"><rect class="ui-shield-track" x="1" y="1" width="148" height="16" rx="5"/><rect class="ui-shield-charge" x="1" y="1" width="148" height="16" rx="5" pathLength="100" style="stroke-dasharray:${(view.shield?1:view.shieldProgress||0)*100} 100"/></svg>`:'';
  const shieldCount=(view.shieldMax||0)>1?`<small class="ui-shield-count"${attrs({'aria-label':`Щит ${view.shieldCharges||0} из ${view.shieldMax}`})}>${e(view.shieldCharges||0)}</small>`:'';
  if(max>HEALTH_SEGMENT_LIMIT){
    const percent=value=>Number((Math.max(0,Math.min(max,value))/max*100).toFixed(3)),healthWidth=percent(current),armorLeft=percent(armorStart),armorWidth=percent(Math.min(armor,Math.max(0,current-armorStart))),regenWidth=percent(Math.max(0,Math.min(max,current+(view.regenAmount||1)*(view.regenProgress||0))-current));
    return `<span class="ui-health-display ui-health-display--progress ${view.shield?'has-shield':''}"><span class="ui-health-bar">${shield}<span class="ui-health-progress" aria-hidden="true"><i class="ui-health-progress-fill" style="width:${healthWidth}%"></i>${regenWidth?`<i class="ui-health-progress-regen" style="left:${healthWidth}%;width:${regenWidth}%"></i>`:''}${armorWidth?`<i class="ui-health-progress-armor" style="left:${armorLeft}%;width:${armorWidth}%"></i>`:''}<b class="ui-health-progress-value">${e(current)} / ${e(max)}</b></span></span>${shieldCount}</span>`;
  }
  return `<span class="ui-health-display ${view.shield?'has-shield':''}"><span class="ui-health-bar">${shield}<span class="ui-health-segments" aria-hidden="true">${view.segments.map((full,i)=>`<i class="${full?(current-i<1?'is-half-full':'is-full'):''} ${full&&Math.min(i+1,armorStart+armor)>Math.max(i,armorStart)?`is-armored ${Math.min(i+1,armorStart+armor)-Math.max(i,armorStart)<1?'is-half-armored':''}`:''}"><span class="ui-health-regen"></span></i>`).join('')}</span></span>${shieldCount}</span>`;
}
export function toggle(label,{checked=false,action,disabled=false,hint=''}={}){return `<label class="ui-switch-row"><span>${e(label)}${hint?`<small>${e(hint)}</small>`:''}</span><input type="checkbox" role="switch"${attrs({'data-setting':action,checked,disabled,'aria-label':label})}><span class="ui-switch" aria-hidden="true"></span></label>`;}
export function checkbox(label,{checked=false,value,group,art='',disabled=false}={}) {return `<label class="ui-frame ui-check-row">${art}<span>${e(label)}</span><input type="checkbox"${attrs({checked,disabled,value,'data-group':group,'aria-label':label})}><span class="ui-checkbox" aria-hidden="true">${icon('check')}</span></label>`;}
export function slider(label,{value=50,action,disabled=false,hint='',displayValue,ariaLabel=label}={}){return `<label class="ui-slider-row"><span>${e(label)}${hint?`<small>${e(hint)}</small>`:''}</span><span class="ui-slider-control"><input type="range" min="0" max="100" step="5"${attrs({value,'data-setting':action,'aria-label':ariaLabel,'aria-valuetext':displayValue,disabled})}><output>${e(displayValue??`${value}%`)}</output></span></label>`;}
export function segmented(options,value,{action,label='Выбор',className='',buttonClass='',buttonSize='',buttonIndicator=false}={}) {return `<div class="ui-segmented ${e(className)}" role="group" aria-label="${e(label)}">${options.map(o=>button(o.label,{action,'data-value':o.value,'aria-pressed':String(o.value===value),variant:o.value===value?'selected':'secondary',className:buttonClass,size:buttonSize,indicator:buttonIndicator})).join('')}</div>`;}
export const emptyState=(text,iconName='bag')=>`<div class="ui-empty">${icon(iconName)}<p>${e(text)}</p></div>`;
