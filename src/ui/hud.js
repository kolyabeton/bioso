import {createChangeTracker,pulse} from './motion.js';
import {BIOMES} from '../biome-world.js';
import {e,icon,healthSegments} from './atoms.js';
import {partArt} from './molecules.js';
import {handPresentation} from '../hud-presentation.js';
import {stats} from '../assembly.js';
import {toggleWeapon} from '../combat-feel.js';
import {healthView} from '../systems/health.js';
import {xpRequired} from '../systems/progression.js';
import {missionStatus} from '../game.js';
import {survivalObjective} from '../systems/survival-objective.js';
import {timeText} from './adapters.js';
import {unseenInventoryCount} from '../inventory-notifications.js';

export function createHandsHud(element,onOpen){let signature='',currentRun;
  element.addEventListener('click',event=>{const target=event.target.closest('button[data-slot]');if(!target||!currentRun)return;
    if(toggleWeapon(currentRun,Number(target.dataset.slot)))render(currentRun);else onOpen();
  });
  const render=run=>{currentRun=run;const hands=handPresentation(run),next=hands.map(h=>h.identity).join('|');
    if(next!==signature){signature=next;element.style.setProperty('--hand-count',hands.length);element.innerHTML=hands.map((h,i)=>`<button data-slot="${i}" type="button" class="ui-frame ui-hand-slot ${h.key==='empty'?'is-empty':''}">${partArt(h.key)}${h.upgradeRank?`<span class="ui-upgrade-rank" aria-hidden="true">${e(h.upgradeRank)}</span>`:''}<span class="ui-ammo"></span><span class="ui-hand-charge" aria-hidden="true"><i></i></span></button>`).join('');}
    hands.forEach((h,i)=>{const b=element.children[i],empty=h.key==='empty',off=!empty&&!h.enabled,charge=h.reloading?h.reloadProgress:h.magazine?h.ammo/h.magazine:h.charge;
      b.style.setProperty('--charge',`${off?0:Math.max(0,Math.min(1,charge))*100}%`);
      b.classList.toggle('is-reloading',h.reloading&&!off);b.classList.toggle('is-weapon-off',off);
      if(empty)b.removeAttribute('aria-pressed');else b.setAttribute('aria-pressed',String(h.enabled));
      b.querySelector('.ui-ammo').textContent=off?'Выкл':h.reloading?`↻ ${h.reloadLeft.toFixed(1)}с`:h.magazine?`${h.ammo} из ${h.magazine}`:'';
      const action=empty?'открыть сборку':off?'включить оружие':'выключить оружие';
      const upgrade=h.upgradeRank?`усиление ${h.upgradeRank} из ${h.maxUpgradeRank}`:'без усилений';
      b.setAttribute('aria-label',`${h.name} · ${upgrade}${h.reloading?` · перезарядка ${h.reloadLeft.toFixed(1)} с`:h.magazine?` · ${h.ammo} из ${h.magazine} зарядов`:''} · ${action}`);b.title=`${h.name} · ${upgrade} · ${action}`;
    });
  };
  render.event=(event,run)=>{if(!['attack','reload-end'].includes(event.type))return;const index=run.arms.findIndex(p=>p?.id===event.source);if(index>=0&&!run.arms[index].disabled)pulse(element.children[index],event.type==='attack'?'shot':'energy');};
  return render;
}
export function createHud(root){const $=id=>root.querySelector('#'+id);let healthSignature='',previousRun=null;const changes=createChangeTracker();let oldHp=0;
  for(const [id,name]of [['pause-button','pause'],['map-button','map'],['assembly-button','assembly'],['soul-button','soul']])$(id).innerHTML=icon(name)+(id==='map-button'?'<span>Карта</span>':id==='assembly-button'?'<span>Сборка</span><output class="ui-new-items-badge" aria-hidden="true" hidden></output>':id==='soul-button'?'<span>Душа</span>':'');
  $('resource-icon').innerHTML=icon('soul');
  return run=>{const st=stats(run),health=healthView(run,st.hp,st.armor,st),healthKey=JSON.stringify([health.current,health.max,health.segments,health.armor,health.shield,health.shieldCharges,health.shieldMax,health.shieldEquipped]),xpMax=xpRequired(run.level);
    $('assembly-button').hidden=false;
    $('map-button').hidden=run.mode!=='survival'||!!run.encounters?.active?.dungeon;
    $('map-button').parentElement.hidden=$('map-button').hidden;
    const tile=run.world.tileAt?.(run.player.x,run.player.z);$('location').textContent=tile?.environmentName||run.world.environmentName||BIOMES.find(b=>b.id===tile?.biome)?.name||'Верхние сады';$('run-mode').textContent=run.mission?.name||'Выживание';$('timer').textContent=timeText(run.time);
    if(healthKey!==healthSignature){healthSignature=healthKey;$('health-fill').innerHTML=healthSegments(health);}
    const hp=$('health-fill').parentElement,regenStatus=health.regenActive?` Восстановление через ${Math.ceil(health.regenSecondsLeft)} с.`:'',armorStatus=health.armorRepairActive?` Ремонт брони: ${Math.round(health.armorRepairProgress*100)}%, ${Math.ceil(health.armorRepairSecondsLeft)} с.`:'';hp.setAttribute('aria-label',`Здоровье ${run.hp} из ${st.hp}. Броня ${health.armor} из ${st.armor}.${armorStatus}${regenStatus} ${health.shieldEquipped?`${health.shieldCharges} из ${health.shieldMax} · ${health.shield?'Щит готов':'Щит заряжается'}`:'Без щита'}`);hp.setAttribute('aria-valuemax',st.hp);hp.setAttribute('aria-valuenow',run.hp);hp.classList.toggle('is-regenerating',health.regenActive);hp.classList.toggle('is-repairing-armor',health.armorRepairActive);hp.style.setProperty('--armor-repair',`${health.armorRepairProgress*100}%`);hp.dataset.regenProgress=health.regenProgress.toFixed(3);$('health-text').textContent=`${run.hp} из ${st.hp}`;$('shield-text').textContent='';$('armor-text').textContent='';
    const cells=$('health-fill').querySelector('.ui-health-segments')?.children;if(cells)for(const [i,cell]of [...cells].entries()){const layer=cell.querySelector('.ui-health-regen'),regenCell=health.regenCells[i];if(!layer||!regenCell)continue;layer.style.left=`${regenCell.start*100}%`;layer.style.width=`${regenCell.fill*100}%`;cell.classList.toggle('is-regenerating',regenCell.fill>0);}
    const ring=$('health-fill').querySelector('.ui-shield-charge');if(ring)ring.style.strokeDasharray=`${health.shieldProgress*100} 100`;
    $('biomass-text').textContent=run.biomass;$('level-text').textContent=`УРОВЕНЬ ${run.level}`;$('kills-text').textContent=`УБИТО ${run.kills}`;$('xp-text').textContent=`${run.xp} из ${xpMax}`;$('xp-fill').style.width=`${Math.min(100,run.xp/xpMax*100)}%`;
    const xp=$('xp-fill').parentElement;xp.setAttribute('aria-valuemax',xpMax);xp.setAttribute('aria-valuenow',run.xp);
    $('weight-text').textContent=`Вес ${st.weight.toFixed(0)} из ${st.capacity.toFixed(0)}`;const firstBoss=survivalObjective(run),overrun=run.overrun?.state==='active',encounter=!!run.encounters?.active;
    // An active encounter already prints its countdown on the world marker, so the banner stays out of the way.
    $('objective').textContent=firstBoss||missionStatus(run);$('objective').hidden=!overrun&&(encounter||run.mode==='survival'&&!firstBoss);$('objective').classList.toggle('meta-overrun-status',overrun);if(overrun)$('objective').innerHTML=`${icon('reroll')}<span>За пределом · ${Math.max(0,Math.ceil(30-run.overrun.elapsed))} с · 6 кубиков</span>`;
    $('nearby').hidden=true;
    const revivalCharges=Math.max(0,Math.floor(run.consumables?.revivalCharges||0)),roman=n=>{const values=[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let out='';for(const [v,glyph]of values)while(n>=v){out+=glyph;n-=v;}return out;},revival=$('revival-badge');revival.hidden=!revivalCharges;revival.textContent=roman(revivalCharges);revival.setAttribute('aria-label',`Заряды возрождения: ${revivalCharges}`);
    const unseen=unseenInventoryCount(run),newItemsBadge=$('assembly-button').querySelector('.ui-new-items-badge');
    newItemsBadge.textContent=String(unseen);newItemsBadge.hidden=unseen===0;
    $('assembly-button').classList.toggle('is-overloaded',st.overloaded);
    $('assembly-button').setAttribute('aria-label',`Открыть сборку${unseen?` · новых предметов: ${unseen}`:''}${st.overloaded?' · перегруз, удалите лишние детали':''}`);
    if(previousRun!==run){changes.reset();previousRun=run;oldHp=run.hp;}
    const changed=changes.sample({hp:run.hp,shield:health.shield,armor:health.armor,biomass:run.biomass,level:run.level});
    if(changed.includes('hp')){const changedCells=$('health-fill').querySelector('.ui-health-segments')?.children;if(changedCells)for(let i=Math.floor(Math.min(run.hp,oldHp));i<Math.ceil(Math.max(run.hp,oldHp));i++)pulse(changedCells[i],run.hp<oldHp?'health-damage':'energy');else pulse($('health-fill').querySelector('.ui-health-progress-fill'),run.hp<oldHp?'health-damage':'energy');}
    if(changed.includes('shield'))pulse($('health-fill').querySelector('.ui-shield-ring'));
    if(changed.includes('biomass'))pulse($('biomass-text').parentElement);
    if(changed.includes('level'))pulse($('level-text'));
    oldHp=run.hp;
    $('shield-text').hidden=true;$('armor-text').hidden=true;
    root.dataset.health=run.hp<=1?'critical':'normal';
    root.dataset.mode=run.mission?'mission':run.mode;
  };
}
