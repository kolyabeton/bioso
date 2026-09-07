import {createChangeTracker,pulse} from './motion.js';
import {nearbyLootRadius} from '../systems/mutations.js';
import {BIOMES} from '../biome-world.js';
import {e,icon,healthSegments} from './atoms.js';
import {partArt} from './molecules.js';
import {handPresentation} from '../hud-presentation.js';
import {stats} from '../assembly.js';
import {toggleWeapon} from '../combat-feel.js';
import {healthView} from '../systems/health.js';
import {xpRequired} from '../systems/progression.js';
import {missionStatus} from '../game.js';
import {timeText} from './adapters.js';

export function createHandsHud(element,onOpen){let signature='',currentRun;
  element.addEventListener('click',event=>{const target=event.target.closest('button[data-slot]');if(!target||!currentRun)return;
    if(toggleWeapon(currentRun,Number(target.dataset.slot)))render(currentRun);else onOpen();
  });
  const render=run=>{currentRun=run;const hands=handPresentation(run),next=hands.map(h=>h.identity).join('|');
    if(next!==signature){signature=next;element.style.setProperty('--hand-count',hands.length);element.innerHTML=hands.map((h,i)=>`<button data-slot="${i}" type="button" class="ui-frame ui-hand-slot ${h.key==='empty'?'is-empty':''}">${partArt(h.key)}<span class="ui-tier">${e(h.tier)}</span><span class="ui-ammo"></span><span class="ui-hand-charge" aria-hidden="true"><i></i></span></button>`).join('');}
    hands.forEach((h,i)=>{const b=element.children[i],empty=h.key==='empty',off=!empty&&!h.enabled,charge=h.reloading?h.reloadProgress:h.magazine?h.ammo/h.magazine:h.charge;
      b.style.setProperty('--charge',`${off?0:Math.max(0,Math.min(1,charge))*100}%`);
      b.classList.toggle('is-reloading',h.reloading&&!off);b.classList.toggle('is-weapon-off',off);
      if(empty)b.removeAttribute('aria-pressed');else b.setAttribute('aria-pressed',String(h.enabled));
      b.querySelector('.ui-ammo').textContent=off?'Выкл':h.reloading?`↻ ${h.reloadLeft.toFixed(1)}с`:h.magazine?`${h.ammo}/${h.magazine}`:'';
      const action=empty?'открыть сборку':off?'включить оружие':'выключить оружие';
      b.setAttribute('aria-label',`${h.name} · ${h.tier}${h.reloading?` · перезарядка ${h.reloadLeft.toFixed(1)} с`:h.magazine?` · ${h.ammo} из ${h.magazine} зарядов`:''} · ${action}`);b.title=`${h.name} · ${action}`;
    });
  };
  render.event=(event,run)=>{if(!['attack','reload-end'].includes(event.type))return;const index=run.arms.findIndex(p=>p?.id===event.source);if(index>=0&&!run.arms[index].disabled)pulse(element.children[index],event.type==='attack'?'shot':'energy');};
  return render;
}
export function createHud(root){const $=id=>root.querySelector('#'+id);let healthSignature='',previousRun=null;const changes=createChangeTracker();let oldHp=0;
  for(const [id,name]of [['pause-button','pause'],['map-button','map'],['assembly-button','assembly']])$(id).innerHTML=icon(name)+(id==='map-button'?'<span>Карта</span>':id==='assembly-button'?'<span>Сборка</span>':'');
  $('resource-icon').innerHTML=icon('soul');
  return run=>{const st=stats(run),health=healthView(run,st.hp,st.armor),healthKey=JSON.stringify([health.segments,health.armor,health.shield,health.shieldEquipped]),xpMax=xpRequired(run.level);
    $('location').textContent=BIOMES.find(b=>b.id===run.world.tileAt?.(run.player.x,run.player.z)?.biome)?.name||'Верхние сады';$('run-mode').textContent=run.mission?.name||'Выживание';$('timer').textContent=timeText(run.time);
    if(healthKey!==healthSignature){healthSignature=healthKey;$('health-fill').innerHTML=healthSegments(health);}
    const hp=$('health-fill').parentElement;hp.setAttribute('aria-label',`Здоровье ${run.hp} из ${st.hp}. Броня ${health.armor} из ${st.armor}. ${health.shieldEquipped?health.shield?'Щит готов':'Щит заряжается':'Без щита'}`);hp.setAttribute('aria-valuemax',st.hp);hp.setAttribute('aria-valuenow',run.hp);$('health-text').textContent=`${run.hp} / ${st.hp}`;$('shield-text').textContent='';$('armor-text').textContent='';
    const ring=$('health-fill').querySelector('.ui-shield-charge');if(ring)ring.style.strokeDasharray=`${health.shieldProgress*100} 100`;
    $('biomass-text').textContent=run.biomass;$('level-text').textContent=`УРОВЕНЬ ${run.level}`;$('xp-text').textContent=`${run.xp} / ${xpMax}`;$('xp-fill').style.width=`${Math.min(100,run.xp/xpMax*100)}%`;
    const xp=$('xp-fill').parentElement;xp.setAttribute('aria-valuemax',xpMax);xp.setAttribute('aria-valuenow',run.xp);
    $('weight-text').textContent=`Вес ${st.weight.toFixed(0)} / ${st.capacity.toFixed(0)}`;$('objective').textContent=missionStatus(run);const overrun=run.overrun?.state==='active';$('objective').hidden=run.mode==='survival'&&!overrun; $('objective').classList.toggle('meta-overrun-status',overrun);if(overrun)$('objective').textContent=`За пределом · ${Math.max(0,Math.ceil(30-run.overrun.elapsed))} с · элиты ${2-run.enemies.filter(e=>run.overrun.guards.includes(e.id)&&e.hp>0).length}/2`; 
    $('nearby').hidden=true;
    $('assembly-button').classList.toggle('is-overloaded',st.overloaded);
    $('assembly-button').setAttribute('aria-label',st.overloaded?'Открыть сборку · перегруз, удалите лишние детали':'Открыть сборку');
    if(previousRun!==run){changes.reset();previousRun=run;oldHp=run.hp;}
    const changed=changes.sample({hp:run.hp,shield:health.shield,armor:health.armor,biomass:run.biomass,level:run.level});
    if(changed.includes('hp')){const cells=$('health-fill').querySelector('.ui-health-segments')?.children;if(cells)for(let i=Math.min(run.hp,oldHp);i<Math.max(run.hp,oldHp);i++)pulse(cells[i],run.hp<oldHp?'health-damage':'energy');}
    if(changed.includes('shield'))pulse($('health-fill').querySelector('.ui-shield-ring'));
    if(changed.includes('biomass'))pulse($('biomass-text').parentElement);
    if(changed.includes('level'))pulse($('level-text'));
    oldHp=run.hp;
    $('shield-text').hidden=true;$('armor-text').hidden=true;
    root.dataset.health=run.hp<=1?'critical':'normal';
  };
}
