import { CATALOG, ROMAN, MAX_ARMS } from './catalog.js';
import { stats, weaponStats } from './assembly.js';

// Presentation only: read real slots, enabled state and independent cooldowns.
export function handPresentation(run) {
  const st = stats(run);
  return run.arms.slice(0,MAX_ARMS).map((part, index) => ({
    identity: part ? `${part.id}:${part.key}:${part.tier}` : `empty:${index}`,
    key: part?.key ?? 'empty',
    enabled: !!part && !part.disabled,
    name: part ? CATALOG[part.key].name : `Свободное крепление ${index + 1}`,
    tier: part ? ROMAN[part.tier] : '—',
    charge: part ? Math.max(0, Math.min(1, 1 - part.cooldown / weaponStats(run, part, st).interval)) : 0,
    magazine: part ? CATALOG[part.key].magazine ?? 0 : 0,
    ammo: part ? part.ammo ?? CATALOG[part.key].magazine ?? 0 : 0,
    reloading: (part?.reloadRemaining ?? 0)>0,
    reloadLeft: part?.reloadRemaining ?? 0,
    reloadProgress: part?.reloadDuration ? 1-(part.reloadRemaining||0)/part.reloadDuration : 0,
  }));
}

const frame = '<svg class="slot-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><use href="#module-frame"/></svg>';
const silhouettes = {
  hammer: '<path d="m30 19 30-5 13 26-32 8Z M49 45l9 35-12 4-8-35Z"/>',
  whip: '<path d="M30 77c-3-24 51-13 39-38C62 25 25 42 37 16" fill="none" stroke-width="9"/><path d="m24 70 16 5-5 15-16-5Z"/>',
  fangs: '<path d="M22 20c33 0 30 29 19 44-2-20-7-25-19-25Z M78 20C45 20 48 49 59 64c2-20 7-25 19-25Z M36 71h28v15H36Z"/>',
  needle: '<path d="m43 42 8-31 6 32M30 47l2-30 10 29M58 44l16-26-6 33M26 49l43-4-6 27-29 5Z M38 77l21-3 2 14-20 2Z"/>',
  rocket: '<path d="m23 36 27-20 27 20-5 42-22 12-22-12Z"/><path d="M36 37v20M50 29v25M64 37v20" stroke="#91ddbb" stroke-width="7"/>',
  arc: '<path d="m22 20 12 24-3 13 15 12-3 18h17l-3-18 15-12-3-13 10-24-19 19 4 12-14 9-13-9 4-12Z"/><path d="m50 20-8 17h16l-8 17" fill="none" stroke="#91ddbb" stroke-width="3"/>',
  acid: '<path d="M38 15h24v13c0 13 20 22 18 40-3 24-57 24-60 0-2-18 18-27 18-40Z"/><path d="M27 59q23-9 46 0v10q-23 17-46 0Z" fill="#91ddbb"/>',
  empty: '<path d="M50 30v40M30 50h40" fill="none"/>',
};
function icon(key) {
  if (['claws', 'seed', 'drill'].includes(key)) return `<span class="module-art" data-art="${key === 'claws' ? 'arc' : 'seed'}" aria-hidden="true"></span>`;
  return `<svg class="hand-glyph" viewBox="0 0 100 100" aria-hidden="true">${silhouettes[key] ?? silhouettes.empty}</svg>`;
}

export function createHandsHud(element, openAssembly) {
  let signature = '';
  return run => {
    const hands = handPresentation(run);
    const next = hands.map(p => p.identity).join('|');
    if (next !== signature) {
      signature = next;
      element.style.setProperty('--hand-count', hands.length);
      element.replaceChildren(...hands.map(hand => {
        const button = document.createElement('button');
        button.className = 'hand-slot' + (hand.key === 'empty' ? ' is-empty' : '');
        button.setAttribute('aria-label', `${hand.name}, ${hand.tier} · открыть сборку`);
        button.title = `${hand.name} · ${hand.tier}`;
        button.innerHTML = `${frame}${icon(hand.key)}<span class="module-tier" aria-hidden="true">${hand.tier}</span><span class="ammo-label" aria-hidden="true"></span><span class="hand-charge" aria-hidden="true"><i></i></span>`;
        button.onclick = openAssembly;
        return button;
      }));
    }
    hands.forEach((hand, i) => {
      const button=element.children[i],fraction=hand.reloading?hand.reloadProgress:hand.magazine?hand.ammo/hand.magazine:hand.charge;
      button.style.setProperty('--charge',`${Math.max(0,Math.min(1,fraction))*100}%`);
      button.classList.toggle('is-reloading',hand.reloading);
      const label=hand.reloading?`↻ ${hand.reloadLeft.toFixed(1)}с`:hand.magazine?`${hand.ammo}/${hand.magazine}`:'';
      button.querySelector('.ammo-label').textContent=label;
      button.setAttribute('aria-label',`${hand.name}, ${hand.tier}${hand.reloading?`, перезарядка ${hand.reloadLeft.toFixed(1)} с`:hand.magazine?`, зарядов ${hand.ammo} из ${hand.magazine}`:''} · открыть сборку`);
    });
  };
}
