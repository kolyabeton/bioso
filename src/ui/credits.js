import {e,sectionLabel} from './atoms.js';
import threeLicense from '../../public/licenses/three-MIT.txt?raw';
import onestLicense from '../../public/licenses/onest-OFL.txt?raw';
import './credits.css';

// Add future contributors/assets here, with verified authorship and license sources.
export const CREDITS = [
  {"section":"Музыка","title":"231 Реальность (Hard Techno)","author":"Владислав Заворин","source":"https://pixabay.com/ru/music/техно-и-транс-231-реальность-hard-techno-владислав-заворин-541191/","license":"Pixabay Content License","licenseUrl":"https://pixabay.com/service/license-summary/"},
  {"section":"Музыка","title":"105 Касание (Bleep Techno)","author":"Владислав Заворин","source":"https://pixabay.com/ru/music/электронный-105-касание-bleep-techno-владислав-заворин-527326/","license":"Pixabay Content License","licenseUrl":"https://pixabay.com/service/license-summary/"},
  {"section":"Музыка","title":"Technology","author":"Sub_Clair","source":"https://pixabay.com/ru/music/техно-и-транс-technology-587852/","license":"Pixabay Content License","licenseUrl":"https://pixabay.com/service/license-summary/"},
  {section:'Звуковые эффекты',title:'Single Pistol Gunshot',author:'freesman',role:'Загрузил',source:'https://directory.audio/sound-effects/weapons/39507-single-pistol-gunshot',license:'CC0 1.0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {"section": "Звуковые эффекты", "title": "Sword Slash With Metal Shield Impact", "author": "DavidDumaisAudio", "source": "https://pixabay.com/sound-effects/film-special-effects-sword-slash-with-metal-shield-impact-185433/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Sword Blade Slicing Flesh", "author": "Universfield", "source": "https://pixabay.com/sound-effects/film-special-effects-sword-blade-slicing-flesh-352708/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Drill spinning in open air", "author": "neuroxik (Freesound)", "source": "https://pixabay.com/sound-effects/film-special-effects-drill-spinning-in-open-air-33575/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Crossbow Firing", "author": "GameWithBepis (Freesound)", "source": "https://pixabay.com/sound-effects/film-special-effects-crossbow-firing-95020/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Electric Sparks", "author": "kev_durr (Freesound)", "source": "https://pixabay.com/sound-effects/film-special-effects-electric-sparks-6130/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "HQ Explosion", "author": "Quaker540 (Freesound)", "source": "https://pixabay.com/sound-effects/film-special-effects-hq-explosion-6288/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Cassette Recorder Stop Button – Mechanical Click Sound", "author": "arunangshubanerjee", "source": "https://pixabay.com/sound-effects/film-special-effects-cassette-recorder-stop-button-mechanical-click-sound-359987/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "UI Movement - Menu - Modern Interface - Window Open Small", "author": "RescopicSound", "source": "https://pixabay.com/sound-effects/film-special-effects-ui-movement-menu-modern-interface-window-open-small-230486/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "UI Alert - Menu - Modern Interface - Confirm Small", "author": "RescopicSound", "source": "https://pixabay.com/sound-effects/film-special-effects-ui-alert-menu-modern-interface-confirm-small-230482/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "UI Alert - Menu - Modern Interface - Deny Large", "author": "RescopicSound", "source": "https://pixabay.com/sound-effects/film-special-effects-ui-alert-menu-modern-interface-deny-large-230478/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Wet Squelch Impact", "author": "Universfield", "source": "https://pixabay.com/sound-effects/film-special-effects-wet-squelch-impact-352302/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Metal Latch Latching 2", "author": "deleted_user_7146007 (Freesound)", "source": "https://pixabay.com/sound-effects/film-special-effects-metal-latch-latching-2-101976/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {"section": "Звуковые эффекты", "title": "Item Pickup", "author": "UGILA (Freesound)", "source": "https://pixabay.com/sound-effects/film-special-effects-item-pickup-37089/", "license": "Pixabay Content License", "licenseUrl": "https://pixabay.com/service/license-summary/"},
  {section:'Шрифт',title:'Onest',author:'The Onest Project Authors',source:'https://github.com/simpals/onest',license:'SIL OFL 1.1',notice:onestLicense},
  {section:'Технологии',title:'Three.js',author:'three.js authors',source:'https://threejs.org/',license:'MIT',notice:threeLicense},
];

const link=(label,url)=>`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}<span aria-hidden="true"> ↗</span></a>`;

export function creditsScreen(){
  return `<section class="ui-credits"><div class="ui-credits-creator">${sectionLabel('Создатель игры')}<h3>Сергей Дорощенко</h3><p class="ui-note" translate="no">BIOSO</p></div>
    ${CREDITS.map(entry=>`<section class="ui-credit">${sectionLabel(entry.section)}<h3 translate="no">${e(entry.title)}</h3><p class="ui-credit-author">${entry.role?`<span>${e(entry.role)}:</span> `:''}<span translate="no">${e(entry.author)}</span></p><div class="ui-credit-links">${link('Источник',entry.source)}${entry.licenseUrl?link(entry.license,entry.licenseUrl):`<span translate="no">${e(entry.license)}</span>`}</div>${entry.notice?`<details class="ui-credit-license"><summary>Текст лицензии</summary><pre translate="no">${e(entry.notice)}</pre></details>`:''}</section>`).join('')}
  </section>`;
}
