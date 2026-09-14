import {e,icon,frame,badge,meter,emptyState} from './atoms.js';
import {STORY_CHAPTERS,STORY_EVIDENCE,SURVIVAL_EVIDENCE,ALL_STORY_EVIDENCE} from '../story-evidence.js';
import {STORY_CUES,storyCueRecordId} from '../story-cues.js';

const sideLabel={human:'Люди',machine:'Хранители',gardener:'Душа'};
const kindLabel={note:'Записка',artifact:'Предмет',trace:'След',thought:'Мысль'};
const chapterOrder=new Map(STORY_CHAPTERS.map((chapter,index)=>[chapter.id,index]));
const evidenceById=new Map(ALL_STORY_EVIDENCE.map(item=>[item.id,item]));
const cueById=new Map(STORY_CUES.map(item=>[item.id,item]));
const survivalOrder=new Map(SURVIVAL_EVIDENCE.map((item,index)=>[item.id,3000+index*10]));

const recordFromEvidence=item=>({id:item.id,chapter:item.mission,order:survivalOrder.get(item.id)??item.room*100,title:item.title,text:item.text,thought:item.thought,side:item.side,kind:kindLabel[item.kind]||'Свидетельство',source:SURVIVAL_EVIDENCE.includes(item)?'Найдено в выживании':'Найдено в миссии',icon:item.icon,voiced:false});
const recordFromCue=item=>({id:item.id,chapter:item.mission==='survival'?'mother':item.mission==='global'?'garden':item.mission,order:item.order??0,title:item.speaker,text:item.text,side:item.side,kind:'Радиоперехват',source:item.mission==='survival'?'Выживание':'Миссия',icon:item.icon,voiced:!!item.audio});

export function journalRecords(profile){
 const evidence=new Set(profile?.meta?.storyEvidence||[]),cues=new Set(profile?.meta?.storyCues||[]),completed=new Set(profile?.achievements||[]),records=[];
 for(const id of evidence){const item=evidenceById.get(id);if(item)records.push(recordFromEvidence(item));}
 for(const item of STORY_CUES)if(cues.has(item.id)||cues.has(storyCueRecordId(item))||item.mission!=='survival'&&completed.has('mission:'+item.mission))records.push(recordFromCue(item));
 return records.sort((a,b)=>(chapterOrder.get(a.chapter)??99)-(chapterOrder.get(b.chapter)??99)||(a.order??0)-(b.order??0)||a.id.localeCompare(b.id));
}

const listenButton=record=>record.voiced?`<button type="button" class="ui-journal-audio" data-action="journal-audio" data-id="${e(record.id)}" aria-label="Прослушать: ${e(record.title)}" title="Прослушать">${icon('sound')}</button>`:'';
const recordRow=record=>`<article class="ui-frame ui-journal-record">${listenButton(record)}<small>${e(record.kind)} · ${e(sideLabel[record.side]||record.source)}</small><strong>${e(record.title)}</strong><p>${e(record.text)}</p>${record.thought?`<div class="ui-journal-record-thought"><small>Душа · внутренняя связь</small><p>${e(record.thought)}</p></div>`:''}</article>`;

const chapterCard=(chapter,records)=>{
 const items=records.filter(record=>record.chapter===chapter.id),total=STORY_EVIDENCE.filter(item=>item.mission===chapter.id).length+SURVIVAL_EVIDENCE.filter(item=>item.mission===chapter.id).length+STORY_CUES.filter(item=>(item.mission==='survival'?'mother':item.mission==='global'?'garden':item.mission)===chapter.id).length;
 return frame(`<header><span class="ui-journal-chapter-index">${e(chapter.index)}</span><div><small>${e(chapter.subtitle)}</small><h3>${e(chapter.title)}</h3></div>${badge(`${items.length} / ${total}`,items.length?'mint':'neutral')}</header>${items.length?`<div class="ui-journal-records">${items.map(recordRow).join('')}</div>`:`<div class="ui-chronology-empty">${icon('lock')}<span>Хронология ещё не восстановлена</span></div>`}`,{tag:'section',className:`ui-chronology-chapter ${items.length?'is-open':'is-locked'}`});
};

export function journalScreen(profile){
 const records=journalRecords(profile),foundEvidence=new Set(profile?.meta?.storyEvidence||[]),survivalFound=SURVIVAL_EVIDENCE.filter(item=>foundEvidence.has(item.id)).length;
 const progress=frame(`<div><span>Фрагменты выживания</span>${badge(`${survivalFound} / ${SURVIVAL_EVIDENCE.length}`,survivalFound?'mint':'neutral')}</div>${meter(survivalFound,SURVIVAL_EVIDENCE.length,{label:'Найденные фрагменты выживания'})}<p>В каждом новом забеге появляется первая ещё не найденная запись.</p>`,{className:'ui-journal-progress'});
 return `<section class="ui-screen-body ui-journal"><div class="ui-chronology">${STORY_CHAPTERS.map(chapter=>chapterCard(chapter,records)).join('')}</div>${progress}</section>`;
}

export function journalEntryScreen(profile,id){
 const record=journalRecords(profile).find(item=>item.id===id);
 if(!record)return `<section class="ui-screen-body ui-journal-entry">${emptyState('Эта запись ещё не найдена.','lock')}</section>`;
 return `<article class="ui-screen-body ui-journal-entry">${frame(icon(record.icon||'info'),{className:'ui-journal-entry-mark'})}<header><small>${e(record.source)} · ${e(sideLabel[record.side]||record.kind)}</small><h3>${e(record.title)}</h3></header>${frame(`${listenButton(record)}<p>${e(record.text)}</p>`,{tag:'blockquote',className:'ui-journal-quote'})}${record.thought?frame(`<small>Душа · внутренняя связь</small><p>${e(record.thought)}</p>`,{className:'ui-journal-thought'}):''}</article>`;
}
