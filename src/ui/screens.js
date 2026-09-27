import {description} from './typography.js';
import {statTable} from './stat-table.js';
import {difficultyLabel} from '../systems/difficulty.js';
import {RECYCLE_RARITIES,recycleRarities,setRecycleRarity} from '../systems/reverse-stomach.js';
import {overloadDetails,overloadGuideProgress,overloadGuideStep} from './overload-guide.js';
import {installationSound,createOperationFeedback} from './audio-feedback.js';
import {creditsScreen} from './credits.js';
import {trackAchievements,earnedThisRun} from '../systems/achievements.js';
import {firstUpgradeGuide} from './first-upgrade-guide.js';
import {worldLabel,WORLD_LABEL_STATES} from './world-label.js';
import {BRANCHES,ABILITIES} from '../systems/abilities.js';
import {profileScreen,achievementScreen,achievementRunSummary} from './achievement-screens.js';
import {loadoutScreen,overrunScreen} from './meta-screens.js';
import {meta,availableRerolls,missionBossVictories,missionAvailable,missionRequirement,survivalUnlocked,starterAllowed,starterSlotAllowed,starterSlotRequirement,validLoadout,knownAbilityBranches} from '../systems/meta-progression.js';
import {continueSurvival,beginOverrun,rerollReward,exitDungeon} from '../game.js';
import {skipMissionEvent} from '../mission-run.js';
import {activeEquipmentCards,activeSetCard,catalogSets} from './catalog-sets.js';
import {rarityText} from './rarity.js';
import {bodyFitsHere} from '../body-size.js';
import {setWaypoint} from '../systems/waypoint.js';
import {ENCOUNTERS} from '../systems/encounters.js';
import {abilityArt,abilityTree as renderAbilityTree,abilityBranchOption} from './ability-tree.js';
import './ability-tree.css';
import './fusion.css';
import './results.css';
import {itemInspectorData,catalogInspectorData} from './item-inspector-data.js';
import {createItemTooltip} from './item-tooltip.js';
import {enterScreen,pulse} from './motion.js';
import {RARITIES,setCounts,chooseBossReward} from '../systems/sets-loot.js';
import {paginateScreen} from './screen-pages.js';
import {activeMutationSection,mutationPanel,compatibility,mutationWarning,encounterList,encounterDetail,encounterHeaderData} from './isaac-ui.js';
import {slotCount,boundPart} from '../systems/mutations.js';
import {claimEncounter,takeDeal,dealAllowed} from '../systems/encounters.js';
import {beginEncounter} from '../game.js';
import {e,icon,frame,button,linkButton,iconButton,badge,meter,healthSegments,sectionLabel,segmented,toggle,slider,checkbox,emptyState} from './atoms.js';
import {partArt,partCard,partGrid,partSlot,stat,resource,comparisonTable,weightReadout,abilityCard,missionCard,branchIcon,abilityDetail as renderAbilityDetail} from './molecules.js';
import {cardData,cloneForComparison,comparisonRows,describePart,unlockCondition,catalogDescription,findPart,timeText,groupNames} from './adapters.js';
import {CATALOG,MISSIONS,ROMAN} from '../catalog.js';
import {moveInstalled,stats,def,capacity,canDrop,upgrade as upgradePart,equip as equipPart,unequip as unequipPart,swapBody as swapBodyPart,drop,pickup as pickupPart,digest as digestPart,digestionYield,equipGround as equipGroundPart,preferredSlot} from '../assembly.js';
import {abilityCards,learnedAbilities,eligible,soulAbilityDescription} from '../systems/progression.js';
import {soulStatColumns} from './soul-stats.js';
import {chooseUpgrade,missionStatus} from '../game.js';
import {abilityById,abilityDescriptionAtLevel,abilityLevel,modifiers} from '../systems/abilities.js';
import {choiceList,choicePanel,compactChoicePanel,inventoryGrid,missionList} from './organisms.js';
import {bindAssemblyDrag} from './drag.js';
import {mountAtlas,atlasSelection} from './map-atlas.js';
import {missionRetryMode} from './mission-retry.js';
import './map-atlas.css';
import {markInventorySeen} from '../inventory-notifications.js';
import {journalScreen,journalEntryScreen} from './story-journal.js';
import {storyCue} from '../story-cues.js';
import './story-journal.css';
import {enemyCatalogScreen,enemyCatalogEntry,enemyInspectorData,enemyCatalogEntries} from './enemy-catalog.js';
import {mountEnemyCatalogThumbs} from './enemy-3d-preview.js';

const categoryOptions=[{value:'all',label:'Все'},{value:'body',label:'Корпуса'},{value:'arm',label:'Руки'},{value:'leg',label:'Ноги'},{value:'organ',label:'Органы'}];
const titles={'recycle-settings':'Что перерабатываем',profile:'Достижения',loadout:'Подготовка','meta-achievement':'Достижение',overrun:'За пределом','boss-reward':'Награда босса',mutations:'Мутации тела',encounters:'События рядом','encounter-detail':'Событие',soul:'Душа','ability-detail':'Развитие способности',development:'Развитие',journal:'Журнал','journal-entry':'Запись журнала',home:'BIOSO',missions:'Миссии',assembly:'Сборка','body-swap':'Смена корпуса',loot:'Добыча',level:'Новый уровень',map:'Карта',catalog:'Атлас',end:'Итоги забега',pause:'Пауза',settings:'Настройки',credits:'Создатели',components:'Компоненты BIOSO'};
const forced=new Set(['home','level','end','boss-reward']);

export function createScreens({dialog,content,previewHolder,getRun,getProfile,startRun,resume,canResume=()=>true,stopInput,notify,updateHud,settings,localize=()=>{},getSaveStatus=()=>true,saveProfile=()=>{},getNewUnlocks=()=>[],playStoryCue=()=>false,onRoute=()=>{}}){
  let route={name:'home',params:{}},stack=[],focusReturn=null,selectionBusy=false,lastAnimatedRoute=null;
  const $=id=>document.getElementById(id);
  const itemTooltip=createItemTooltip(dialog);
  const run=()=>getRun();
  const abilityTree=(card,node)=>renderAbilityTree(card,node,run());
  const profile=()=>getProfile();
  // Preview clones use the same validation functions, but only live mutations sound.
  const withSound=createOperationFeedback(run,cue=>settings.tick(cue));
  const partSound=(state,id)=>installationSound(CATALOG[state.inventory.find(p=>p.id===id)?.key]?.kind);
  const equip=withSound(equipPart,partSound),swapBody=withSound(swapBodyPart,'organic');
  const equipGround=withSound(equipGroundPart,(state,id)=>installationSound(CATALOG[state.ground.find(p=>p.id===id)?.part.key]?.kind));
  const upgrade=withSound(upgradePart,'confirm'),unequip=withSound(unequipPart,'confirm');
  const pickup=withSound(pickupPart,'pickup'),digest=withSound(digestPart,'confirm');

  function detachPreview(){itemTooltip.close();previewHolder.hidden=true;if(previewHolder.parentElement!==document.body)document.body.append(previewHolder);}
  function open(name,params={},options={}){
    if(!Object.hasOwn(renderers,name))return;
    if(name==='map'&&(run().mode!=='survival'||run().encounters?.active?.dungeon))return;
    if(name!=='home'&&name!=='level'&&name!=='end'&&name!=='boss-reward')settings.tick('open');
    stopInput();if(dialog.open&&!options.replace)stack.push({...route,contentScroll:content.scrollTop,metaScroll:content.querySelector('.meta-screen')?.scrollTop||0,scroll:dialog.scrollTop,inventoryScroll:dialog.querySelector('.ui-inventory-scroll')?.scrollTop||0});else if(!dialog.open){stack=[];focusReturn=document.activeElement;}
    route={name,params};render();content.scrollTop=0;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
    requestAnimationFrame(()=>$(name==='home'?'home-title':'panel-title')?.focus({preventScroll:true}));
  }
  function close(){if(!canResume()){showHome();return;}if(run().bossRewards?.length){open('boss-reward',{}, {replace:true});return;}if(run().pending){open('level',{}, {replace:true});return;}if(run().dead||run().won&&!run().continued){open('end',{}, {replace:true});return;}settings.tick('close');detachPreview();stack=[];dialog.close();onRoute('');resume();(focusReturn?.isConnected?focusReturn:$('world')).focus({preventScroll:true});}
  function back(){if(forced.has(route.name))return;if(route.name==='catalog'&&route.params.fromGrid){settings.tick('close');delete route.params.key;delete route.params.enemy;delete route.params.fromGrid;render();requestAnimationFrame(()=>$('panel-title')?.focus({preventScroll:true}));}else if(stack.length){settings.tick('close');const last=stack.pop();route=last;render();content.scrollTop=last.contentScroll||0;dialog.scrollTop=last.scroll||0;content.querySelector('.meta-screen')?.scrollTo(0,last.metaScroll||0);dialog.querySelector('.ui-inventory-scroll')?.scrollTo(0,last.inventoryScroll||0);requestAnimationFrame(()=>$('panel-title')?.focus({preventScroll:true}));}else if(route.name==='journal-entry'){route={name:'journal',params:{view:'chronology'}};render();}else if(route.name==='journal')showHome();else close();}
  function overloadGuide(){
    const s=run(),step=overloadGuideStep(s);if(!step)return '';
    if(step==='body')return `<aside class="ui-frame story-radio is-visible ui-overload-guide" data-overload-step="body" role="status"><div class="story-radio-copy"><small>Грузоподъёмность · 2/2</small>${!stats(s).overloaded?'<p>Перегруз снят — можно двигаться.</p>':''}<p>Чтобы нести больше, улучшите корпус или замените его на более вместительный.</p><p>Нажмите на подсвеченный корпус. Первое улучшение — бесплатно.</p></div></aside>`;
    return `<aside class="ui-frame story-radio is-visible ui-overload-guide" data-overload-step="item" role="status"><div class="story-radio-copy"><small>Перегруз · ${overloadGuideProgress(s,step)}</small><p>Слишком большой вес — нельзя двигаться.</p><p>Выбросьте или переработайте подсвеченную деталь.</p><p>Перенос в инвентарь не уменьшает вес.</p></div></aside>`;
  }
  function assemblyReturn(){const i=stack.map(x=>x.name).lastIndexOf('assembly');const prior=i>=0?stack[i]:{name:'assembly',params:{tab:'inventory'}};stack=i>=0?stack.slice(0,i):[];route={...prior,params:{tab:prior.params.tab||'inventory'}};render();dialog.scrollTop=prior.scroll||0;dialog.querySelector('.ui-inventory-scroll')?.scrollTo(0,prior.inventoryScroll||0);}
  function showHome(){if(run().won&&!run().overrun)run().victoryRerollsSettled=true;stack=[];open('home',{}, {replace:true});}
  function start(mode){settings.tick('confirm');detachPreview();stack=[];dialog.close();startRun(mode,undefined,mode==='survival'?route.params.choice:undefined);onRoute('');}
  function footer(html){return `<footer class="ui-screen-footer">${html}</footer>`;}
  function titleStrip(title,subtitle=''){return `<div class="ui-title-strip"><h3>${e(title)}</h3>${subtitle?`<p>${e(subtitle)}</p>`:''}</div>`;}
  const reward=key=>partCard({key,name:CATALOG[key].name,action:'catalog-detail'});

  function rerollBalance(){return `<span class="ui-reroll-balance">${icon('reroll')}<span>Кубик</span><strong>${availableRerolls(run())}</strong></span>`;}
  function home(){return `<section class="ui-home"><div class="ui-home-brand"><h1 id="home-title" tabindex="-1"><img class="ui-home-logo" src="/assets/ui/bioso-wordmark-v1.png" alt="bioso" width="1853" height="849" fetchpriority="high" draggable="false"></h1></div><div class="ui-home-actions">${button('Миссии',{action:'missions',indicator:true,size:'menu'})}${button('Выживание',{action:'start',variant:'primary',id:'home-start',indicator:true,size:'menu'})}<div class="ui-frame ui-button-surface ui-home-difficulty">${slider('Сложность',{value:settings.get().difficulty,action:'difficulty',ariaLabel:'Сложность игры',displayValue:difficultyLabel(settings.get().difficulty)})}<small class="ui-home-difficulty-ends"><span>Легко</span><span>Сложно</span></small></div><nav class="ui-home-utilities" aria-label="Разделы игры">${iconButton('target','Достижения',{action:'profile'})}${iconButton('soul','Развитие',{action:'development'})}${iconButton('assembly','Предметы',{action:'catalog'})}${iconButton('journal','Журнал',{action:'journal'})}${iconButton('settings','Настройки',{action:'settings'})}</nav></div></section>`;}
  function missions(){const p=profile();return `<section class="ui-screen-body ui-mission-list">${MISSIONS.map((m,i)=>missionCard(m,{index:i,complete:p.achievements.includes('mission:'+m.id),locked:!missionAvailable(p,m.id),requirement:missionRequirement(m.id)})).join('')}</section>`;}
  const fusionNode=()=>run().encounters?.nodes.find(n=>n.id===route.params.fusion);
  function fusionFooter(){const p=run().arms.find(p=>p?.id===route.params.fusionPart),allowed=p&&dealAllowed(run(),fusionNode(),'fuse',p.id);
    return `<footer class="ui-fusion-footer" aria-live="polite">${p?`<strong>${e(def(p).name)}</strong>`:''}<p>−25 макс. HP · Урон ×2.<br>Рука остаётся сращённой до конца забега.</p><div>${button('Отмена',{action:'back'})}${p?button('Срастить',{action:'fuse-accept',variant:'primary',disabled:!allowed}):''}</div></footer>`;
  }
  function assembly(){const s=run(),st=stats(s);
    const slots=group=>s[group].map((p,i)=>partSlot(p?cardData(p):null,{label:group==='arms'?`Рука ${i+1}`:group==='legs'?`Нога ${i+1}`:`Орган ${i+1}`,group,slot:i}));
    const arms=slots('arms'),legs=slots('legs'),organs=slots('organs');
    const kindOrder={arm:0,leg:1,body:2,organ:3};
    let collection=s.inventory.filter(p=>!route.params.filter||def(p).kind===route.params.filter).sort((a,b)=>(kindOrder[def(a).kind]??4)-(kindOrder[def(b).kind]??4)).map(p=>partCard(cardData(p)));
    return `<section class="ui-screen-body ui-assembly"><div class="ui-loadout"><div class="ui-specimen"><div id="preview-mount"></div><div class="ui-body-slot">${partSlot(cardData(s.body),{label:'Корпус',group:'body'})}</div></div><div class="ui-mount-scroll" tabindex="0" aria-label="Руки и ноги — прокрутка вниз"><div class="ui-loadout-side">${arms.join('')}</div><div class="ui-loadout-side">${legs.join('')}</div></div></div><section class="ui-organ-bank" aria-label="Органы"><div class="ui-organ-slots ${organs.length>3?'has-many-organs':''}" ${organs.length>3?'tabindex="0" aria-label="Крепления органов — прокрутка вниз"':''}>${organs.join('')}</div></section>${!s.overloadGuide&&firstUpgradeGuide(s)?`<p class="ui-note ui-first-upgrade-guide">${e(firstUpgradeGuide(s))}</p>`:''}<div class="ui-inventory-toolbar"><div class="ui-inventory-title">Инвентарь · ${s.inventory.length}</div></div><div class="ui-inventory-scroll" data-drop-inventory>${collection.length?inventoryGrid(collection):emptyState('Пусто')}</div></section>${route.params.fusion?fusionFooter():''}`;

  }
  function soulStatTable(rows){return statTable(rows.map(([label,value])=>({label,value})),{className:'ui-soul-stats'});}
    function soul(){const s=run(),st=stats(s),list=learnedAbilities(s),minor=Object.entries(s.abilities.minor),counts=setCounts(s),activeSets=Object.entries(counts).filter(([,count])=>count>=2);return `<section class="ui-soul-panel"><div class="ui-soul-stat-columns">${soulStatColumns(s,st).map(({title,groups,sections})=>`<section class="ui-soul-stat-group"><h2 class="ui-heading-h2 ui-soul-stat-title">${e(title)}</h2>${sections?sections.map(section=>`<section class="ui-soul-combat-section"><h4 class="ui-soul-stat-subtitle">${e(section.title)}</h4>${soulStatTable(section.groups.flatMap(({rows})=>rows))}</section>`).join(''):soulStatTable(groups.flatMap(({rows})=>rows))}</section>`).join('')}</div>${sectionLabel('Активные комплекты')}<div class="ui-learned-list">${activeEquipmentCards(s)}${activeSets.length?activeSets.map(([id,count])=>activeSetCard(s,id,count)).join(''):activeEquipmentCards(s)?'':emptyState('Соберите два разных типа деталей одного комплекта.')}</div>${activeMutationSection(s)}${sectionLabel('Изученные способности')}${list.length||minor.length?`<div class="ui-learned-list">${list.map(d=>frame(`${abilityArt(d.id)}<div><h2 class="ui-heading-h2">${e(d.name)} <span class="ui-ability-level ui-text ui-text--caption">Ур. ${d.level} из ${d.maxLevel}</span></h2>${description(d.description)}</div>`,{className:'ui-learned'})).join('')}${minor.map(([id,count])=>{const d=abilityById(id);return frame(`${abilityArt(id)}<div><h2 class="ui-heading-h2">Малое усиление · ${e(d?.name||'Душа')} <span class="ui-ability-level ui-text ui-text--caption">Ур. ${count} из 5</span></h2>${description(soulAbilityDescription(s,d,count))}</div>`,{className:'ui-learned'});}).join('')}</div>`:emptyState('Повышайте уровень и выбирайте способности из тринадцати веток.','soul')}</section>`;}
  function recycleSettings(){
    const p=findPart(run(),route.params);if(p?.key!=='reverseStomach')return `<section class="ui-screen-body">${emptyState('Эта деталь уже перемещена.')}</section>${footer(button('Назад',{action:'back'}))}`;
    const selected=recycleRarities(p),all=RECYCLE_RARITIES.every(r=>selected.includes(r));
    const rows=[['common','Обычные'],['uncommon','Необычные'],['rare','Эпические'],['all','Все']];
    return `<section class="ui-screen-body ui-settings"><p class="ui-note">Обратный желудок · нужен установленный Компостер. Выбранные детали перерабатываются при приближении.</p><div class="ui-settings-block">${rows.map(([r,label])=>toggle(label,{action:'recycle-'+r,checked:r==='all'?all:selected.includes(r),hint:r==='all'?'Включая легендарные':''})).join('')}</div></section>${footer(button('Назад',{action:'back'}))}`;
  }
  function bodySwap(){const s=run(),p=s.inventory.find(p=>p.id===route.params.id&&def(p).kind==='body');if(!p)return emptyState('Корпус уже перемещён.');const d=def(p);if(!route.params.keep)route.params.keep=Object.fromEntries(Object.keys(groupNames).map(g=>[g,[...s[g].filter(boundPart),...s[g].filter(p=>p&&!boundPart(p))].slice(0,slotCount(s,p,g)).map(p=>p.id)]));const candidate=cloneForComparison(s),valid=swapBody(candidate,p.id,route.params.keep);return `<section class="ui-screen-body"><div class="ui-swap-hero">${partArt(p.key)}${titleStrip(d.name,`${slotCount(s,p,'arms')} руки · ${d.legs} ноги · ${slotCount(s,p,'organs')} органа`)}${resource('Вместимость',capacity(p).toFixed(0),'bag')}</div><div id="swap-comparison">${valid?comparisonTable(comparisonRows(s,candidate))+mutationWarning(s,candidate):'<p class="ui-warning">Выбрано больше деталей, чем креплений. Снимите лишние отметки.</p>'}</div>${sectionLabel('Сохранить детали')}<div class="ui-keep-list">${Object.keys(groupNames).map(g=>s[g].filter(Boolean).map(q=>partCard({...cardData(q),group:g,action:'keep-detail',selected:route.params.keep[g].includes(q.id)})).join('')).join('')}</div><p class="ui-note">Старый корпус и оставшиеся детали перейдут в инвентарь. Число ран сохранится.</p></section>${footer(button('Назад',{action:'back'})+button('Установить корпус',{action:'swap-apply',variant:'primary',disabled:!valid}))}`;}
  function loot(){const s=run(),near=s.ground.filter(g=>g.part&&Math.hypot(g.x-s.player.x,g.z-s.player.z)<=3),q=near.find(g=>g.id===route.params.ground)||near[0];
    if(!q)return `<section class="ui-screen-body">${emptyState(run().encounters?.active?.dungeon?'Рядом нет деталей.':'Рядом нет деталей. Оставленная добыча отмечена на карте.')}${run().encounters?.active?.dungeon?'':button('Карта',{action:'map'})}${button('Полная сборка',{action:'assembly'})}</section>${footer(button('В игру',{action:'resume'}))}`;
    route.params.ground=q.id;const reachable=Math.hypot(q.x-s.player.x,q.z-s.player.z)<=3;const p=q.part,d=def(p),slot=route.params.targetSlot??preferredSlot(s,p),candidate=cloneForComparison(s),valid=d.kind!=='body'&&equipGround(candidate,q.id,slot),group={arm:'arms',leg:'legs',organ:'organs'}[d.kind];
    return `<section class="ui-screen-body ui-loot">${inventoryGrid(near.map(g=>partCard({...cardData(g.part),groundId:g.id,action:'loot-select',selected:g.id===q.id,compact:true})))}<div class="ui-loot-detail"><h3>${e(d.name)}</h3><p class="ui-note">${describePart(s,p).lines.map(e).join(' · ')}</p>${compatibility(s,p)}${group?`<label class="ui-field">Крепление<select id="equip-slot">${s[group].map((q,i)=>`<option value="${i}"${i===slot?' selected':''}>${i+1}: ${e(q?def(q).name:'Пусто')}</option>`).join('')}</select></label>`:'<p class="ui-note">Перед сменой корпуса выберите переносимые конечности.</p>'}${valid?comparisonTable(comparisonRows(s,candidate,{group,slot}).filter(r=>r.changed))+mutationWarning(s,candidate):group?`<p class="ui-warning">${!reachable?'Подойдите на 3 м для установки.':'Установка в это крепление недоступна.'}</p>`:''}</div></section>${footer(button('Забрать',{action:'loot-take',disabled:!reachable})+button('Установить',{action:'loot-equip',variant:'primary',disabled:!reachable||group&&!valid}))}`;
  }
  function rerollButton(){const count=availableRerolls(run());return button('Обновить · 1',{action:'reroll',icon:'reroll',className:'ui-reroll-button',disabled:count<1});}
  function level(){const s=run(),cards=abilityCards(s);return `<section class="ui-screen-body ui-level-body"><p class="ui-level-intro ui-text ui-text--caption">Уровень ${s.level} · Выберите одну способность</p>${choiceList(cards.map(c=>({...c,description:`Ур. ${c.nextLevel} · ${c.description}`,art:abilityArt(c.id)})),null,{action:'choose'})}</section>${footer(rerollButton())}`;}
  function bossReward(){
    const s=run(),r=s.bossRewards?.[0];if(!r)return '<p>Награда получена</p>';
    const cards=r.options.map((p,id)=>({...cardData(p),id,action:'boss-choose'}));
    return `<section class="ui-screen-body ui-level-body"><p class="ui-level-intro ui-text ui-text--caption">Выберите одну деталь · ${rarityText(RARITIES[r.rarity])}</p>${partGrid(cards)}<p class="ui-note">Остальные исчезнут без переработки.</p>${s.mode==='survival'&&s.bosses===1?'<p class="ui-note">Рядом с боссом выпал Компостер. Установите его в сборке. Две обычные детали рядом дадут 12 биомассы — на первое улучшение.</p>':''}</section>${footer(rerollButton())}`;
  }
  function abilityDetail(){if(route.params.browse){const s=run(),defs=Object.values(ABILITIES),known=new Set(knownAbilityBranches(profile(),s.abilities.learned||[])),allOptions=[...Object.entries(BRANCHES),...defs.filter(d=>d.branch==='synergy').map(d=>[d.id,d.name])],options=allOptions.filter(([id])=>known.has(id)),requested=route.params.branch||'might',key=options.some(([id])=>id===requested)?requested:options[0][0],base=ABILITIES[key]||defs.find(d=>d.branch===key)||ABILITIES['might.0'],nodes=defs.filter(d=>base.branch==='synergy'?d.id===base.id||base.requires.includes(d.id):d.branch===base.branch).map(d=>{const level=abilityLevel(s,d.id);return{...d,level,nextLevel:Math.min(d.maxLevel,level+1),maxed:level>=d.maxLevel,state:level?'learned':eligible(s,d)?'available':'locked'};}),baseLevel=abilityLevel(s,base.id),card={...base,level:baseLevel,nextLevel:Math.min(base.maxLevel,baseLevel+1),readOnly:true,branchName:BRANCHES[base.branch]||base.name,nodes},hasLearned=([id])=>ABILITIES[id]?.branch==='synergy'?abilityLevel(s,id)>0:defs.some(d=>d.branch===id&&abilityLevel(s,d.id)>0);options.sort((left,right)=>Number(hasLearned(right))-Number(hasLearned(left)));return `<section class="ui-screen-body ui-ability-browser ui-ability-browser--branches"><aside class="ui-branch-rail"><nav class="ui-ability-options ui-branch-options" aria-label="Ветки развития">${options.map(([id,name])=>abilityBranchOption(id,name,s.abilities.learned,id===key,s.abilities.levels)).join('')}</nav></aside><section class="ui-ability-reading"><header><span class="ui-eyebrow">Ветка</span><h3>${e(card.branchName)}</h3></header><div class="ui-ability-tree-scroll" tabindex="0" aria-label="Ветка ${e(card.branchName)} — прокрутка вниз">${abilityTree(card,route.params.node||base.id)}</div></section></section>`;}const cards=abilityCards(run()),index=route.params.index,card=cards[index];return `<section class="ui-screen-body ui-ability-browser"><nav class="ui-ability-options" aria-label="Способности на выбор">${cards.map(c=>button(c.name,{action:'detail-select','data-index':c.index,variant:c.index===index?'selected':'secondary','aria-pressed':String(c.index===index)}).replace('><span>',`>${abilityArt(c.id)}<span>`)).join('')}</nav><div class="ui-ability-reading">${abilityTree(card,route.params.node)}</div></section>${footer(button('Назад',{action:'back'})+button('Изучить',{action:'choose','data-index':index,variant:'primary',disabled:!card}))}`;}

  function map(){
   if(route.params.selected===undefined)route.params.selected=run().waypoint?.source==='point'?'waypoint':run().waypoint?.id;
   const s=run(),biomes=!!s.world.tiles;
   if(s.encounters?.active?.dungeon)return `<section class="ui-screen-body ui-map-body atlas-body dungeon-map-body"><div class="ui-map-illustration atlas-illustration dungeon-map-illustration"><canvas id="atlas" role="img" aria-label="Карта логова: дорожки в пустоте, вход, игрок и зоны агро"></canvas><div class="atlas-targets" role="group" aria-label="Зоны логова"></div></div></section>`;
   const sel=atlasSelection(s,route.params.selected??(s.waypoint?.source==='point'?'waypoint':s.waypoint?.id));
   if(!biomes)return `<section class="ui-screen-body ui-map-body">${segmented([{value:'world',label:'Весь мир'},{value:'near',label:'Рядом'}],route.params.zoom||'world',{action:'map-zoom',label:'Масштаб карты'})}<div class="ui-map-illustration"><canvas id="atlas" role="img" aria-label="Карта мира"></canvas></div></section>`;
   return `<section class="ui-screen-body ui-map-body atlas-body"><div class="atlas-toolbar">${segmented([{value:'all',label:'Все'},{value:'threats',label:'Угрозы'},{value:'events',label:'События'},{value:'loot',label:'Добыча'}],route.params.filter||'all',{action:'map-filter',label:'Объекты на карте'})}<span class="atlas-survey">${s.exploration.visited.size} из ${s.world.tiles.length}<small>исследовано</small></span></div><p class="atlas-access" aria-live="polite">${e(sel.access)}</p><div class="ui-map-illustration atlas-illustration"><canvas id="atlas" role="img" aria-label="Реальная местность забега: биомы, препятствия, игрок и области агро"></canvas><div class="atlas-targets" role="group" aria-label="Отметки карты"></div></div><div class="atlas-controls">${button(route.params.zoom==='near'?'Весь мир':'Рядом',{action:'map-toggle',className:'atlas-zoom'})}${iconButton('target','Центрировать на игроке',{action:'map-center'})}</div><div class="atlas-readout" aria-live="polite"><div><strong>${e(sel.title)}</strong><small>${e(sel.detail)}</small></div><span>${e(sel.state)}</span></div><div class="atlas-legend"><span><i class="atlas-key atlas-key-player">●</i>Вы</span><span><i class="atlas-key atlas-key-boss">Б</i>Босс</span><span><i class="atlas-key atlas-key-elite">◇</i>Элита</span><span><i class="atlas-key atlas-key-event">✚</i>Событие</span><span><i class="atlas-key atlas-key-loot">✦</i>Добыча</span></div></section>`;
  }
  function catalog(){
    // Вражеский раздел временно скрыт из навигации, но экран и данные сохраняются для следующего включения.
    const showEnemyCatalog=false;
    const view=showEnemyCatalog?(route.params.view||'parts'):(['parts','sets'].includes(route.params.view)?route.params.view:'parts');
    const catalogTabs=[{value:'parts',label:'Предметы'},...(showEnemyCatalog?[{value:'enemies',label:'Враги'}]:[]),{value:'sets',label:'Комплекты'}];
    const tabs=segmented(catalogTabs,view,{action:'catalog-view',label:'Раздел атласа',className:'ui-catalog-tabs',buttonClass:'ui-button--menu ui-button--indicator'});
    if(view==='sets')return `<section class="ui-screen-body ui-catalog ui-catalog-sets">${tabs}${catalogSets(stack.some(entry=>['home','end'].includes(entry.name))||run().dead?null:run())}</section>`;
    if(showEnemyCatalog&&view==='enemies')return `<section class="ui-screen-body ui-catalog ui-catalog-enemies">${tabs}${enemyCatalogScreen({selected:route.params.enemy||null,role:route.params.enemyRole||'all'})}</section>`;
    const category=route.params.category||'all',selected=route.params.key||null;
    return `<section class="ui-screen-body ui-catalog">${tabs}<p class="ui-catalog-progress">Открыто ${profile().unlocked.length} из ${Object.keys(CATALOG).length}</p>${segmented(categoryOptions,category,{action:'catalog-filter',label:'Категория деталей'})}${selected?frame(`<div class="ui-catalog-selection">${partArt(selected)}<div><h3>${e(CATALOG[selected].name)}</h3><p>${e(catalogDescription(CATALOG[selected]))}</p><small>Открытие: <strong>${e(unlockCondition(selected))}</strong></small>${badge(profile().unlocked.includes(selected)?'Открыто':'Ещё не открыто',profile().unlocked.includes(selected)?'mint':'neutral')}</div></div>`,{className:'ui-selected-detail'}):''}${partGrid(Object.values(CATALOG).filter(d=>(category==='all'||d.kind===category)).map(d=>({key:d.key,name:d.name,locked:!profile().unlocked.includes(d.key),selected:d.key===selected,action:'catalog-select'})),{className:'ui-catalog-grid',hidden:!!selected})}</section>`;
  }
  function results(){
    const s=run(),unlocks=getNewUnlocks(),won=!s.dead;
    const heading=s.dead?'Душа возвращается':s.mission?.complete?'Миссия выполнена':'Победа!';
    const notice=s.overrun?(s.overrun.state==='complete'?'<strong>Усиленная победа</strong><span>Получено +6 кубиков.</span>':s.dead?'<strong>Испытание проиграно</strong><span>Награда за забег: 0 кубиков.</span>':'<strong>Усиленное испытание</strong>'):s.victoryRerolls?'<strong>Награда за победу</strong><span>Получено +3 кубика.</span>':'';
    return `<section class="ui-screen-body ui-results" tabindex="0" aria-label="Результат и открытия — прокрутка вниз">
      <div class="result-report">
        <div class="result-outcome"><span class="result-core" aria-hidden="true">${icon('soul')}</span><div><h3>${e(heading)}</h3><p>${e(s.mission?.name||'Выживание')}</p></div></div>
        <div class="result-metrics"><div class="result-time"><div><span>Время</span><strong>${e(timeText(s.time))}</strong></div>${icon('clock')}</div><div class="result-secondary"><div><span>Уровень</span><strong>${icon('speed')}${e(s.level)}</strong></div><div><span>Побеждено</span><strong>${icon('target')}${e(s.kills)}</strong></div></div></div>
      </div>
      ${s.mode==='survival'?`<div class="result-notice"><div><strong>Собрано биомассы: ${e(Math.floor(s.biomassCollected||0).toLocaleString('ru-RU'))}</strong><span>Рекорд: ${e((s.profile.meta?.biomassRecord||0).toLocaleString('ru-RU'))}</span>${s.won?'<p>Сеть разрушена. Души свободны. Жизнь возвращается.</p><p>Продолжите на очки: боссы и волны ×3, события доступны снова.</p>':''}</div></div>`:''}
      ${notice?`<div class="result-notice ${s.dead?'is-defeat':''}">${icon('reroll')}<div>${notice}</div></div>`:''}
      ${achievementRunSummary(run())}<section class="result-discoveries" aria-labelledby="result-discoveries-title"><h3 id="result-discoveries-title">Новые открытия${unlocks.length?` <span>· ${unlocks.length}</span>`:''}</h3>${unlocks.length?`<div class="ui-rewards ui-result-rewards">${unlocks.map(reward).join('')}</div>`:`<div class="result-empty">${icon('leaf')}<p>Нет новых открытий</p></div>`}</section>
      ${s.mission?.complete?`<p class="ui-note">Предмет босса открыт в атласе и может выпадать в выживании. Победа засчитана в прогресс стартового органа: ${Math.min(3,missionBossVictories(s.profile))} из 3.</p>`:''}
      <p class="result-save ${getSaveStatus()?'':'is-error'}">${getSaveStatus()?'Каталог сохранён.':'Не удалось сохранить каталог. Открытия действуют только до перезагрузки страницы.'}<span>Тело и способности относятся к этому забегу.</span></p>
    </section>${footer(button('В меню',{action:'home',icon:'home'})+(won&&s.mode==='survival'&&!s.overrun?button('На рекорд',{action:'record-continue',variant:'primary'}):button(s.mission?'Перезапуск':'Новый забег',{action:'retry',variant:'primary',icon:'restart'})))}`;
  }
  function pause(){const s=run();return `<section class="ui-screen-body ui-pause"><p>${s.mode==='survival'?`Выживание сложность ${e(s.difficulty)}%: ${timeText(s.time)}`:`${e(s.mission?.name||'Выживание')} · ${timeText(s.time)}`}</p><div class="ui-menu-actions">${button('Продолжить',{action:'resume',variant:'primary',icon:'play'})}${button('Настройки',{action:'settings',icon:'settings'})}${button('Завершить забег',{action:'home',variant:'danger',icon:'exit'})}</div></section>`;}
  function settingsScreen(){const s=settings.get(),vibration=typeof navigator.vibrate==='function';return `<section class="ui-screen-body ui-settings"><div class="ui-settings-block">${sectionLabel('Язык')}${segmented([{value:'en',label:'EN'},{value:'ru',label:'RU'}],s.language,{action:'language',label:'Язык игры'})}</div><div class="ui-settings-block">${sectionLabel('Звук')}${button(s.soundEnabled?'Выключить звук':'Включить звук',{action:'sound-toggle',variant:s.soundEnabled?'secondary':'primary'})}<p class="ui-note">${s.soundEnabled?'Звук включён':'Музыка и эффекты выключены'}</p>${slider('Звуковые эффекты',{value:s.effects,action:'effects'})}${slider('Музыка',{value:s.music,action:'music'})}</div><div class="ui-settings-block">${sectionLabel('Графика')}<div class="ui-field">Камера</div>${segmented([{value:'standard',label:'Обычная'},{value:'angled',label:'Под углом'}],s.cameraMode,{action:'cameraMode',label:'Ракурс камеры'})}<div class="ui-field">Качество</div>${segmented([{value:'low',label:'Низкое'},{value:'medium',label:'Среднее'},{value:'high',label:'Высокое'}],s.quality,{action:'quality',label:'Качество графики'})}<div class="ui-field">Частота кадров</div>${segmented([{value:30,label:'30'},{value:60,label:'60'}],s.fps,{action:'fps',label:'Частота кадров'})}<div class="ui-field">Приоритет</div>${segmented([{value:'sharp',label:'Чётче'},{value:'fast',label:'Быстрее'}],s.renderMode,{action:'renderMode',label:'Приоритет отрисовки'})}<p class="ui-note">Быстрее может снижать чёткость ради FPS.</p></div><div class="ui-settings-block">${sectionLabel('Комфорт')}${toggle('История',{checked:s.storyEnabled,action:'storyEnabled',hint:'Показывать сюжетные реплики и включать их озвучку.'})}${vibration?toggle('Вибрация',{checked:s.vibration,action:'vibration'}):''}${toggle('Меньше движения',{checked:s.reducedMotion,action:'reducedMotion',hint:'Уменьшить движение интерфейса и декоративные эффекты боя.'})}</div><div class="ui-settings-block ui-settings-credits">${button('Создатели',{action:'credits',variant:'outline'})}${linkButton('Сайт автора',{href:'https://dorosenya.tech/',icon:'exit',className:'ui-settings-site'})}</div></section>`;}
  function components(){return `<section class="ui-screen-body ui-component-library"><p class="ui-note">Живые компоненты игры. Эти же функции формируют все экраны.</p>${sectionLabel('Подписи в мире')}<div class="ui-world-label-gallery">${Object.keys(WORLD_LABEL_STATES).map(state=>worldLabel({title:state==='failed'?'Заражённый биореактор террасы':'Алтарь органов',category:state==='failed'?'Испытание':'Сделка',state,level:5})).join('')}</div>${sectionLabel('Кнопки меню')}<div class="ui-material-demo">${button('Выживание',{action:'demo',variant:'primary',indicator:true,size:'menu'})}${button('Атлас деталей',{action:'demo',indicator:true,size:'menu'})}${button('Настройки',{action:'demo',indicator:true,size:'menu'})}</div>${sectionLabel('Атомы')}<div class="ui-demo-buttons">${button('Продолжить',{action:'demo',variant:'primary'})}${button('Установить',{action:'demo'})}${button('Выбрано',{action:'demo',variant:'selected','aria-pressed':'true'})}${button('Удалить',{action:'demo',variant:'danger'})}${button('Тихая',{action:'demo',variant:'quiet'})}${button('Недоступно',{disabled:true,indicator:true})}${iconButton('back','Назад',{action:'demo'})}${iconButton('close','Закрыть',{action:'demo'})}</div>${toggle('Переключатель',{action:'demo',checked:true})}${slider('Слайдер',{action:'demo',value:70})}${checkbox('Выбрано',{checked:true,value:'demo'})}${healthSegments({segments:[true,true,false]})}${sectionLabel('Броня поверх здоровья')}${healthSegments({segments:[true,true,true],armor:2,armorMax:2})}${sectionLabel('Защитный щит')}${healthSegments({segments:[true,true,true],armor:2,armorMax:2,shieldEquipped:true,shield:true})}${sectionLabel('Щит заряжается')}${healthSegments({segments:[true,true,true],armor:1.5,armorMax:2,shieldEquipped:true,shield:false})}${sectionLabel('Молекулы')}${segmented([{value:'a',label:'Первый'},{value:'b',label:'Второй'},{value:'c',label:'Третий'}],'b',{action:'demo'})}<div class="ui-inventory-grid">${['drill','shield','wanderer'].map(key=>partCard({key,name:CATALOG[key].name,tier:'III',action:'demo'})).join('')}</div>${weightReadout(72,100,128)}${comparisonTable([{label:'Здоровье',before:'50 из 75',after:'75 из 100',changed:true}])}${sectionLabel('Организмы')}${missionCard(MISSIONS[0],{selected:true,rewardCards:MISSIONS[0].rewards.map(reward).join('')})}${button('Открыть игру',{action:'home',variant:'primary'})}</section>`;}
  const renderers={'recycle-settings':recycleSettings,profile:()=>profileScreen(run(),profile(),route.params),loadout:()=>loadoutScreen(profile(),route.params),'meta-achievement':()=>achievementScreen(run(),profile(),route.params.id),overrun:()=>overrunScreen(run()),'boss-reward':bossReward,mutations:()=>`<section class="ui-screen-body">${mutationPanel(run()).replace(/<details[^>]*>|<\/details>|<summary>.*?<\/summary>/g,'')}</section>`,encounters:()=>encounterList(run()),'encounter-detail':()=>encounterDetail(run(),route.params.id),'ability-detail':abilityDetail,development:abilityDetail,journal:()=>journalScreen(profile(),route.params),'journal-entry':()=>journalEntryScreen(profile(),route.params.id),home,missions,assembly,soul:()=>`<section class="ui-screen-body">${soul()}</section>${footer(button('Назад',{action:'back'})+button('Ветки',{action:'soul-tree',icon:'soul'}))}`,'body-swap':bodySwap,loot,level,map,catalog,end:results,pause,settings:settingsScreen,credits:creditsScreen,components};
  let mapObserver;
  function render(){
    dialog.dataset.background=route.name==='home'||stack.some(entry=>entry.name==='home')?'menu':'game';
    mapObserver?.disconnect();detachPreview();const {name}=route;if(name==='assembly')markInventorySeen(run());dialog.dataset.screen=name==='development'?'ability-detail':name;dialog.className=`ui-frame ui-dialog ${name==='pause'?'ui-dialog--compact':''}`;document.body.dataset.screen=name;onRoute(name);
    const header=dialog.querySelector('.panel-head');header.className='panel-head ui-screen-header';header.hidden=name==='home';const branchBrowser=['ability-detail','development'].includes(name)&&route.params.browse,journalRoute=name==='journal'||name==='journal-entry',catalogSelection=name==='catalog'&&route.params.fromGrid;header.innerHTML=`${!forced.has(name)&&(stack.length||branchBrowser||journalRoute||catalogSelection)?iconButton('back','Назад',{action:'back'}):''}<div>${branchBrowser?`<span class="ui-eyebrow">${name==='development'?'Постоянное развитие':'Душа · ветки'}</span>`:''}<h2 id="panel-title" tabindex="-1">${e(titles[name])}</h2></div>${!forced.has(name)&&!stack.length&&!branchBrowser&&!journalRoute&&!catalogSelection?iconButton('close','Закрыть',{action:'back',id:'close-panel'}):''}`;
    if(name==='soul'){const s=run();header.querySelector('#panel-title').parentElement.classList.add('ui-soul-heading');header.querySelector('#panel-title').insertAdjacentHTML('afterend',`<p class="ui-soul-progress"><span>Уровень <strong>${s.level}</strong></span><span>Побеждено <strong>${s.kills}</strong></span></p>`);}
    if(name==='encounter-detail'){const event=encounterHeaderData(run(),route.params.id);header.classList.add('event-popup-header');header.innerHTML=`${event.art?`<img class="event-header-art event-illustration--${e(event.type)}" src="${e(event.art)}" alt="">`:''}<div class="event-popup-heading"><h2 id="panel-title" tabindex="-1">${e(event.name)}</h2><p>${e(event.meta)}</p></div>${iconButton('close','Закрыть',{action:'back',id:'close-panel'})}`;}
    if(['loadout','level','boss-reward'].includes(name)){const closeButton=header.querySelector('#close-panel');if(closeButton)closeButton.insertAdjacentHTML('beforebegin',rerollBalance());else header.insertAdjacentHTML('beforeend',rerollBalance());}
    if(name==='assembly'){const s=run(),st=stats(s);header.innerHTML=`<div class="ui-assembly-heading"><h2 id="panel-title" tabindex="-1">${e(def(s.body).name)} ${badge(ROMAN[s.body.tier])}</h2>${iconButton('close','Вернуться в игру',{action:'resume',id:'close-panel'})}</div><div class="ui-assembly-resources${st.overloaded?' is-overloaded ui-overload-weight':''}">${resource('Вес',st.weight.toFixed(0)+' из '+st.capacity.toFixed(0),'bag')}${resource('Биомасса',s.biomass)}${st.overloaded?'<span class="ui-warning">Перегруз</span>':''}</div>`;}
    if(name==='assembly'&&!route.params.fusion)header.insertAdjacentHTML('beforeend',overloadGuide());
    dialog.classList.remove('is-overload-inspecting','is-overload-body-inspecting');
    dialog.classList.toggle('is-fusion',name==='assembly'&&!!route.params.fusion);
    if(name==='assembly'&&route.params.fusion)header.innerHTML=`<div class="ui-assembly-heading"><h2 id="panel-title" tabindex="-1">Сращивание</h2>${iconButton('close','Отменить сращивание',{action:'back',id:'close-panel'})}</div><p class="ui-fusion-instruction">Выберите оружие для сращивания</p>`;
    content.innerHTML=renderers[name]();
    if(name==='catalog'&&route.params.view==='enemies'){try{mountEnemyCatalogThumbs(content,enemyCatalogEntries);}catch{}}
    if(name==='home')dialog.setAttribute('aria-label','BIOSO · Главное меню');else dialog.removeAttribute('aria-label');
    if(name==='assembly'){$('preview-mount').append(previewHolder);previewHolder.hidden=false;decorateAssembly();}
    if(name==='map')mapObserver=mountAtlas(content,run(),route.params,id=>{route.params.selected=id;refresh();});
    localize(dialog);
    updateHud();
    if(lastAnimatedRoute!==route){enterScreen(dialog,content);lastAnimatedRoute=route;}
    requestAnimationFrame(()=>{if(dialog.open&&route.name===name&&name!=='home'&&name!=='end')paginateScreen(content,route.params.pages ||= {});});
  }
  function refresh(){const metaScroll=content.querySelector('.meta-screen')?.scrollTop||0,top=dialog.scrollTop,active=document.activeElement,key=active?.id,signature=JSON.stringify({...active?.dataset}),inventory=dialog.querySelector('.ui-inventory-scroll')?.scrollTop;render();dialog.scrollTop=top;content.querySelector('.meta-screen')?.scrollTo(0,metaScroll);const target=key?$(key):[...dialog.querySelectorAll('button,input')].find(el=>JSON.stringify({...el.dataset})===signature&&el.value===active?.value);target?.focus({preventScroll:true});if(inventory)dialog.querySelector('.ui-inventory-scroll')?.scrollTo(0,inventory);}
  function abilityBrowserMarkup(selector){const template=document.createElement('template');template.innerHTML=abilityDetail();return template.content.querySelector(selector);}
  function inspectAbilityNode(id){
    route.params.node=id;const scroller=content.querySelector('.ui-ability-tree-scroll'),top=scroller?.scrollTop||0,next=abilityBrowserMarkup('.ui-spine-inspector'),current=content.querySelector('.ui-spine-inspector');
    if(next&&current){next.style.minHeight=`${Math.ceil(current.getBoundingClientRect().height)}px`;current.replaceWith(next);}
    for(const node of content.querySelectorAll('[data-action=ability-node]')){const selected=node.dataset.id===id;node.classList.toggle('is-inspected',selected);node.setAttribute('aria-pressed',String(selected));}
    localize(content);if(scroller)scroller.scrollTop=top;
  }
  function selectAbilityBranch(id){
    route.params.branch=id;delete route.params.node;const rail=content.querySelector('.ui-branch-options'),top=rail?.scrollTop||0,next=abilityBrowserMarkup('.ui-ability-reading'),current=content.querySelector('.ui-ability-reading');
    if(next&&current)current.replaceWith(next);
    for(const branch of content.querySelectorAll('[data-action=soul-branch]'))branch.setAttribute('aria-pressed',String(branch.dataset.id===id));
    localize(content);if(rail)rail.scrollTop=top;
  }
  function recycleItem(id){
    const amount=digest(run(),id);
    if(amount===false){notify('Переработка недоступна');return false;}
    route.params.selected=null;refresh();updateHud();notify(`Получено ${amount} биомассы`);return true;
  }
  function installBody(id,keep){
    const s=run(),p=s.inventory.find(p=>p.id===id&&def(p).kind==='body');
    if(!p){settings.tick('deny');notify('Корпус уже перемещён.');return;}
    if(!bodyFitsHere(s,p)){settings.tick('deny');notify('Для этого корпуса здесь тесно. Выйдите на свободное место.');return;}
    if(!swapBody(s,id,keep)){notify('Не удалось установить корпус: проверьте здоровье и сращённые детали.');return;}
    if(route.name==='assembly'){route.params.selected=null;refresh();}else assemblyReturn();
    pulse(dialog.querySelector('.ui-loadout'));notify('Корпус установлен');
  }
  function offerDrop(id,group,slot){const p=run().inventory.find(p=>p.id===id);if(!p||{body:'body',arm:'arms',leg:'legs',organ:'organs'}[def(p).kind]!==group){settings.tick('deny');notify('Это крепление не подходит');return;}if(group==='body'&&!bodyFitsHere(run(),p)){settings.tick('deny');notify('Для этого корпуса здесь тесно. Выйдите на свободное место.');return;}if(!(group==='body'?swapBody(run(),id):equip(run(),id,slot))){notify('Действие недоступно для этой детали.');return;}route.params.selected=null;refresh();const placed=[...dialog.querySelectorAll('.ui-slot button')].find(c=>c.dataset.group===group&&Number(c.dataset.slot||0)===slot);if(placed){placed.classList.add('is-drop-installed');setTimeout(()=>placed.classList.remove('is-drop-installed'),1200);}}
  function decorateAssembly(){
    const step=overloadGuideStep(run()),target=step==='item'?overloadDetails(run()).target:null;
    for(const card of dialog.querySelectorAll('[data-action=part]')){if(step==='item'&&Number(card.dataset.id)===target?.id)card.classList.add('is-overload-target');if(step==='body'&&card.dataset.group==='body')card.classList.add('is-overload-capacity-target');}
if(route.params.fusion){
    for(const c of dialog.querySelectorAll('.ui-assembly button')){
      const p=c.dataset.group==='arms'?run().arms[Number(c.dataset.slot)]:null,allowed=p&&dealAllowed(run(),fusionNode(),'fuse',p.id);
      c.disabled=!allowed;
      if(allowed){c.dataset.action='fuse-select';c.classList.add('is-fusion-eligible');c.setAttribute('aria-label',`Выбрать оружие ${Number(c.dataset.slot)+1}: ${def(p).name}`);c.setAttribute('aria-pressed',String(route.params.fusionPart===p.id));c.insertAdjacentHTML('beforeend',`<span class="ui-fusion-mark" aria-hidden="true">${route.params.fusionPart===p.id?'✓':'✦'}</span>`);}
    }return;
  }for(const card of dialog.querySelectorAll('[data-action="part"]')){if(card.dataset.ground||card.dataset.group==='body')continue;card.dataset.dragSource='true';}for(const slot of dialog.querySelectorAll('.ui-slot')){const c=slot.querySelector('button');slot.dataset.dropGroup=c.dataset.group;slot.dataset.dropSlot=c.dataset.slot||'0';if(c.dataset.group==='organs'&&c.dataset.key==='digestion'){slot.dataset.dropDigest='true';c.title='Перетащите сюда предмет из инвентаря для переработки';}if(route.params.selected){const p=run().inventory.find(p=>p.id===route.params.selected);const compatible=p&&{body:'body',arm:'arms',leg:'legs',organ:'organs'}[def(p).kind]===c.dataset.group;slot.classList.toggle('is-compatible',compatible);slot.classList.toggle('is-incompatible',!compatible);}}}
  function inspectItem(target,selectedStat){
    const data={...target.dataset};
    if(data.action==='enemy-select'){
      const enemy=enemyCatalogEntry(data.key);
      if(enemy)itemTooltip.show(target,enemyInspectorData(enemy));
      return;
    }
    const catalog=CATALOG[data.key];if(!catalog)return;
    const p=data.action==='keep-detail'?run()[data.group]?.find(p=>p?.id===Number(data.id)):data.action==='part'||data.action==='loot-select'?findPart(run(),data):data.action==='boss-choose'?run().bossRewards?.[0]?.options[Number(data.id)]:null;
    if(p&&data.action==='part'){
      const step=overloadGuideStep(run());
      dialog.classList.toggle('is-overload-inspecting',step==='item'&&p.id===overloadDetails(run()).target?.id);
      dialog.classList.toggle('is-overload-body-inspecting',step==='body'&&data.group==='body');
      const model=itemInspectorData(run(),p,selectedStat);
      itemTooltip.show(target,{...model,...(p.key==='reverseStomach'?{settingsLabel:'Что перерабатываем',onSettings:()=>open('recycle-settings',{id:p.id,...data})}:{}),dropLabel:canDrop(run(),p)?'Выбросить':undefined,onDrop:()=>{if(drop(run(),p.id)){refresh();updateHud();notify('Деталь выброшена');}},recycleLabel:digestionYield(run(),p.id)!==false?'Переработать · +'+digestionYield(run(),p.id):undefined,onRecycle:()=>recycleItem(p.id),actionLabel:data.group?model.actionLabel:(def(p).kind==='body'?'Установить корпус':'Установить'),onSelect:stat=>inspectItem(target,stat),onAction:()=>{
        if(data.group){
          if(upgrade(run(),p.id,model.selected,true)){
            notify('Деталь улучшена');refresh();
            const next=[...dialog.querySelectorAll('[data-item-icon]')].find(el=>el.dataset.group===data.group&&el.dataset.slot===data.slot);
            if(next)inspectItem(next,model.selected);
          }else notify('Улучшение недоступно');
        }else if(def(p).kind==='body')installBody(p.id);
        else {const slot=preferredSlot(run(),p);if(equip(run(),p.id,slot)){refresh();notify('Деталь установлена');}else notify('Нет доступного крепления');}
      }});return;
    }
    if(data.action==='starter-choice'){
      const slotOpen=starterSlotAllowed(profile(),data.id),allowed=slotOpen&&starterAllowed(profile(),data.key),selected=validLoadout(profile(),route.params.choice)[data.id]===data.key;
      itemTooltip.show(target,{...catalogInspectorData(run(),data.key),notice:allowed?'':slotOpen?unlockCondition(data.key):starterSlotRequirement(data.id),actionLabel:selected&&data.id==='organ'?'Снять':selected?'Выбрано':'Выбрать',disabled:!allowed||selected&&data.id!=='organ',onAction:()=>dispatchAction(data)});return;
    }
    if(['catalog-select','catalog-detail'].includes(data.action)){
      const model=catalogInspectorData(run(),data.key),mission=MISSIONS.find(m=>m.rewards.includes(data.key));
      itemTooltip.show(target,{...model,...(mission?{actionLabel:'К миссии',onAction:()=>open('missions')}:{})});return;
    }
    const info=p?describePart(run(),p):null,model=p?itemInspectorData(run(),p):catalogInspectorData(run(),data.key,Math.max(1,ROMAN.indexOf(data.itemTier)));
    const lines=model?model.lines:[catalogDescription(catalog),data.itemTier,data.itemNote,!profile().unlocked.includes(data.key)?'Получение: '+unlockCondition(data.key):''];
    const label=data.action==='keep-detail'?(route.params.keep[data.group].includes(Number(data.id))?'Не переносить':'Оставить на новом корпусе'):({'loot-select':'Выбрать добычу','encounter-claim':'Забрать','boss-choose':'Забрать'})[data.action];
    itemTooltip.show(target,{key:data.key,name:info?.name||catalog.name,primaryEffect:model?.primaryEffect,subtitle:model?.subtitle,rows:model?.rows||[],lines,setBonus:model?.setBonus,actionLabel:label,onAction:()=>{
      dispatchAction({...data,index:data.id});
    }});
  }
  bindAssemblyDrag(dialog,{active:()=>route.name==='assembly'&&!route.params.fusion,kind:id=>{const p=run().inventory.find(p=>p.id===id);return p&&{body:'body',arm:'arms',leg:'legs',organ:'organs'}[def(p).kind];},move:(id,group,from,to)=>{if(moveInstalled(run(),id,group,from,to)){refresh();updateHud();}else notify('Перемещение недоступно');},drop:(id,group,slot)=>offerDrop(id,group,slot),remove:({id,group,slot})=>{const s=run();if(s[group]?.[Number(slot)]?.id!==id||!unequip(s,group,Number(slot))){notify('Действие недоступно для этой детали.');return;}route.params.selected=null;refresh();const placed=[...dialog.querySelectorAll('.ui-slot button')].find(c=>c.dataset.group===group&&Number(c.dataset.slot||0)===slot);if(placed){placed.classList.add('is-drop-installed');setTimeout(()=>placed.classList.remove('is-drop-installed'),1200);}}});
  dialog.addEventListener('pointerdown',event=>{if(event.target.closest('button:disabled'))settings.tick('deny');},true);
  dialog.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target||target.disabled)return;let d=target.dataset;settings.tick();
    // Selection cards act on the first tap; only locked choices need an inspector.
    const directChoice=['fuse-select','keep-detail','loot-select','boss-select','select-ability'].includes(d.action)
      ||d.action==='starter-choice'&&starterSlotAllowed(profile(),d.id)&&starterAllowed(profile(),d.key);
    if(!directChoice&&target.matches('[data-item-icon]')){inspectItem(target);return;}
    dispatchAction(d);
  });
  function dispatchAction(d){
    settings.tick();
    switch(d.action){
      case'credits':open('credits');break;
      case'mutations':open('mutations');break;
      case'keep-detail':{const kept=route.params.keep[d.group],id=Number(d.id);route.params.keep[d.group]=kept.includes(id)?kept.filter(v=>v!==id):[...kept,id];refresh();break;}
      case'encounters':open('encounters');break;
      case'event-route':{const n=run().encounters.nodes.find(n=>n.id===route.params.id);if(n&&setWaypoint(run(),{...n,label:ENCOUNTERS[n.type].name}))close();break;}
      case'encounter-detail':open('encounter-detail',{id:d.id});break;
      case'encounter-claim':if(claimEncounter(run(),route.params.id,Number(d.id))){notify('Награда лежит рядом');close();}break;
      case'encounter-start':if(beginEncounter(run(),route.params.id))close();break;
      case'dungeon-exit':if(exitDungeon(run(),route.params.id))close();break;
      case'fuse-open':{const n=run().encounters?.nodes.find(n=>n.id===route.params.id);if(run().arms.some(p=>p&&dealAllowed(run(),n,'fuse',p.id)))open('assembly',{fusion:n.id});break;}
      case'fuse-select':{const p=run().arms[Number(d.slot)];if(route.name==='assembly'&&route.params.fusion&&p&&dealAllowed(run(),fusionNode(),'fuse',p.id)){route.params.fusionPart=p.id;refresh();}break;}
      case'fuse-accept':if(route.name==='assembly'&&route.params.fusion&&takeDeal(run(),route.params.fusion,'fuse',route.params.fusionPart)){settings.tick('confirm');notify('Рука сращена · Урон ×2');close();}else {settings.tick('deny');notify('Сращивание недоступно');refresh();}break;
      case'deal-accept':if(takeDeal(run(),route.params.id,d.key,d.part?Number(d.part):undefined)){settings.tick('confirm');notify('Сделка заключена');close();}break;
      case'recycle-settings':open('recycle-settings',{...route.params});break;
      case'home':showHome();break;case'back':back();break;case'resume':close();break;
      case'start':if(survivalUnlocked(profile()))open('loadout',{choice:validLoadout(profile())});break;
      case'profile':open('profile');break;
      case'journal':open('journal',{view:'chronology'});break;
      case'journal-entry':open('journal-entry',{id:d.id});break;
      case'journal-audio':{if(!settings.get().storyEnabled){notify('Включите историю в настройках');break;}const cue=storyCue(d.id);if(!cue||!playStoryCue(cue))notify('Включите звук в настройках');break;}
      case'development':open('development',{browse:true,branch:'might'});break;
      case'achievement-filter':route.params.filter=d.id;refresh();break;
      case'meta-achievement':open('meta-achievement',{id:d.id});break;
      case'starter-choice':route.params.inspect=d.key;if(starterSlotAllowed(profile(),d.id)&&starterAllowed(profile(),d.key)){const c=validLoadout(profile(),route.params.choice);route.params.choice={...c,[d.id]:d.id==='organ'&&c.organ===d.key?null:d.key};}refresh();break;
      case'starter-clear':if(d.id==='organ'&&starterSlotAllowed(profile(),d.id)){route.params.choice={...validLoadout(profile(),route.params.choice),organ:null};refresh();}break;
      case'starter-organ':if(starterAllowed(profile(),'stabilizer')){const c=validLoadout(profile(),route.params.choice);route.params.choice={...c,organ:c.organ?null:'stabilizer'};refresh();}break;
      case'loadout-start':start('survival',undefined,route.params.choice);break;
      case'record-continue':if(continueSurvival(run())){saveProfile();close();}break;
      case'overrun-review':open('overrun');break;
      case'overrun-start':if(beginOverrun(run())){saveProfile();close();}else notify('Не удалось разместить испытание. Попробуйте ещё раз.');break;
      case'reroll':if(rerollReward(run())){settings.tick('confirm');saveProfile();route.params={};refresh();}break;case'start-mission':if(missionAvailable(profile(),d.id))start(d.id);break;case'retry':{const mode=missionRetryMode(run());if(mode)start(mode);else open('loadout',{choice:validLoadout(profile())});break;}
      case'loot':case'missions':case'catalog':case'assembly':case'map':case'settings':open(d.action);break;
      case'mission-select':if(missionAvailable(profile(),d.id))start(d.id);break;
      case'assembly-tab':route.params={tab:d.value};refresh();break;
      case'soul':open('soul');break;
      case'empty-slot':if(route.params.selected){offerDrop(route.params.selected,d.group,Number(d.slot));break;}route.params={tab:'inventory',filter:{arms:'arm',legs:'leg',organs:'organ'}[d.group],targetSlot:Number(d.slot)};refresh();dialog.querySelector('.ui-inventory-grid,.ui-empty')?.scrollIntoView({block:'nearest'});break;
      case'loot-select':route.params={ground:Number(d.ground)};refresh();break;
      case'loot-take':case'loot-equip':{const s=run(),q=s.ground.find(g=>g.id===route.params.ground);if(!q)break;let ok=false;if(d.action==='loot-take')ok=pickup(s,q.id);else if(def(q.part).kind==='body'){if(pickup(s,q.id))installBody(q.part.id);break;}else ok=equipGround(s,q.id,Number($('equip-slot').value));if(ok){route.params={};refresh();}else notify('Действие недоступно');break;}
      case'body-swap':installBody(findPart(run(),route.params)?.id);break;
      case'swap-apply':installBody(route.params.id,route.params.keep);break;

      case'assembly-return':assemblyReturn();break;
      case'boss-select':if(route.name!=='boss-reward'||!run().bossRewards?.[0]?.options[Number(d.index)])break;
      case'select-ability':route.params.selected=Number(d.index);refresh();dialog.querySelector(`[data-action="${d.action}"][data-index="${d.index}"]`)?.focus({preventScroll:true});break;
      case'soul-tree':open('ability-detail',{browse:true,branch:'might'});break;
      case'ability-node':if(route.params.browse)inspectAbilityNode(d.id);else{route.params.node=d.id;refresh();dialog.querySelector(`[data-action=ability-node][data-id="${CSS.escape(d.id)}"]`)?.focus({preventScroll:true});dialog.querySelector('.ui-skill-inspector')?.scrollIntoView({block:'nearest'});}break;
      case'soul-branch':selectAbilityBranch(d.id);break;
      case'detail-select':delete route.params.node;route.params.index=Number(d.index);const parent=stack.findLast(r=>r.name==='level');if(parent)parent.params.selected=Number(d.index);refresh();break;case'ability-info':open('ability-detail',{index:route.params.selected});break;case'cancel-selection':route.params.selected=null;refresh();break;
      case'confirm-ability':if(route.params.selected==null)break;d.index=String(route.params.selected);
      case'boss-choose':if(route.name==='boss-reward'&&run().bossRewards?.[0]?.options[Number(d.index)]&&chooseBossReward(run(),Number(d.index)))close();break;
      case'mission-event-skip':if(route.name==='encounter-detail'&&skipMissionEvent(run(),route.params.id))close();break;
      case'choose':if(selectionBusy)return;selectionBusy=true;try{if(chooseUpgrade(run(),Number(d.index))){settings.tick('confirm');if(run().pending){stack=[];open('level',{}, {replace:true});}else close();}else settings.tick('deny');}finally{selectionBusy=false;}break;
      case'catalog-view':route.params.view=d.value;route.params.pages={};delete route.params.key;delete route.params.enemy;delete route.params.enemyRole;delete route.params.fromGrid;refresh();break;
      case'catalog-filter':route.params.category=d.value;delete route.params.key;delete route.params.enemy;delete route.params.fromGrid;refresh();break;
      case'enemy-filter':route.params.enemyRole=d.value;delete route.params.enemy;delete route.params.fromGrid;refresh();break;
      case'catalog-select':route.params.key=d.key;route.params.fromGrid=true;refresh();break;
      case'enemy-select':route.params.enemy=d.key;route.params.fromGrid=true;refresh();break;
      case'catalog-detail':open('catalog',{key:d.key});break;
      case'waypoint-clear':run().waypoint=null;route.params.selected=null;refresh();break;
      case'map-filter':route.params.filter=d.value;route.params.selected=null;refresh();break;
      case'map-toggle':route.params.zoom=route.params.zoom==='near'?'world':'near';refresh();break;
      case'map-center':route.params.zoom='near';refresh();break;
      case'map-zoom':route.params.zoom=d.value;refresh();break;
      case'continue-survival':run().continued=true;close();break;
      case'sound-toggle':settings.update('soundEnabled',!settings.get().soundEnabled);settings.tick();refresh();break;
      case'language':settings.update('language',d.value);refresh();break;
      case'cameraMode':settings.update('cameraMode',d.value);refresh();break;
      case'quality':settings.update('quality',d.value);refresh();break;
      case'fps':settings.update('fps',Number(d.value));refresh();break;
      case'renderMode':settings.update('renderMode',d.value);refresh();break;
      case'demo':notify('Состояние компонента проверено');break;
    }
    if(trackAchievements(run()))saveProfile();
  }
  dialog.addEventListener('input',event=>{const input=event.target;if(input.type==='range'&&input.dataset.setting){if(input.dataset.setting!=='demo')settings.update(input.dataset.setting,Number(input.value));if(input.dataset.setting==='difficulty'){const label=difficultyLabel(Number(input.value));input.parentElement.querySelector('output').textContent=label;input.setAttribute('aria-valuetext',label);localize(input.parentElement);}else input.nextElementSibling.textContent=input.value+'%';}});
  dialog.addEventListener('change',event=>{const input=event.target;if(route.name==='recycle-settings'&&input.dataset.setting?.startsWith('recycle-')){if(setRecycleRarity(findPart(run(),route.params),input.dataset.setting.slice(8),input.checked))refresh();}else if(input.id==='equip-slot'){route.params.targetSlot=Number(input.value);refresh();$('equip-slot')?.focus({preventScroll:true});}else if(input.dataset.group&&route.name==='body-swap'){route.params.keep=Object.fromEntries(Object.keys(groupNames).map(group=>[group,[...dialog.querySelectorAll(`input[data-group="${group}"]:checked`)].map(i=>Number(i.value))]));refresh();}else if(input.dataset.setting&&input.type==='checkbox'){if(input.dataset.setting!=='demo')settings.update(input.dataset.setting,input.checked);}});
  window.addEventListener('resize',()=>{if(dialog.open)refresh();});
  dialog.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS')requestAnimationFrame(()=>paginateScreen(content,route.params.pages ||= {}));},true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();back();});
  dialog.addEventListener('close',()=>{if(!dialog.open&&!canResume())showHome();});
  return {open,close,back,showHome,renderAssemblyFrame:()=>{const s=run(),st=stats(s);return {header:`<div class="ui-assembly-heading"><h2 id="panel-title" tabindex="-1">${e(def(s.body).name)} ${badge(ROMAN[s.body.tier])}</h2>${iconButton('close','Вернуться в игру',{action:'resume',id:'close-panel'})}</div><div class="ui-assembly-resources${st.overloaded?' is-overloaded ui-overload-weight':''}">${resource('Вес',st.weight.toFixed(0)+' из '+st.capacity.toFixed(0),'bag')}${resource('Биомасса',s.biomass)}${st.overloaded?'<span class="ui-warning">Перегруз</span>':''}</div>`,body:assembly()};},get screen(){return dialog.open?route.name:'';},get previewVisible(){return route.name==='assembly'&&dialog.open||!!run().guideHologram;}};
}
