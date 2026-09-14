import {execFileSync} from 'node:child_process';
import {mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {STORY_CUES} from '../../src/story-cues.js';
import {STORY_EVIDENCE,evidenceCue,thoughtCue} from '../../src/story-evidence.js';

const root=resolve(import.meta.dirname,'../..');
const out=resolve(root,'artifacts/lore-film-step-by-step-20260912');
mkdirSync(out,{recursive:true});
const framesDir=resolve(out,'frames');mkdirSync(framesDir,{recursive:true});
const audioDuration=audio=>Number(execFileSync('mdls',['-raw','-name','kMDItemDurationSeconds',resolve(root,'public',audio)],{encoding:'utf8'}).replaceAll('\0','').trim());
const readingDuration=text=>Math.max(4.4,Math.min(7.2,1.25+text.length/17));
const missions=['garden','quarantine','core','nursery','mother','survival'];
const plan=[];

function addCue(cue){
 plan.push({id:cue.id,mission:cue.mission,kind:'dialogue',speaker:cue.speaker,text:cue.text,room:cue.trigger==='mission-mid'?12:cue.trigger.startsWith('mission-boss')?999:1,duration:audioDuration(cue.audio)+.55,audio:cue.audio,voice:cue.voice,route:`?review=story-radio&cue=${cue.id}&lang=ru&quality=high`});
}
function addEvidence(item){
 const clue=evidenceCue(item);plan.push({id:clue.id,mission:item.mission,kind:'evidence',room:item.room,duration:readingDuration(clue.text),route:`?review=story-evidence&id=${item.id}&lang=ru&quality=high`});
 const thought=thoughtCue(item);if(thought)plan.push({id:thought.id,mission:item.mission,kind:'thought',room:item.room,duration:readingDuration(thought.text),route:`?review=story-evidence&id=${item.id}&thought=1&lang=ru&quality=high`});
}
for(const mission of missions){
 const cues=STORY_CUES.filter(cue=>cue.mission===mission),clues=STORY_EVIDENCE.filter(item=>item.mission===mission).sort((a,b)=>a.room-b.room);
 if(mission==='survival'){for(const cue of cues)addCue(cue);continue;}
 for(const cue of cues.filter(item=>item.trigger==='mission-start'))addCue(cue);
 if(clues[0])addEvidence(clues[0]);
 for(const cue of cues.filter(item=>item.trigger==='mission-mid'))addCue(cue);
 if(clues[1])addEvidence(clues[1]);
 for(const cue of cues.filter(item=>item.trigger.startsWith('mission-boss')))addCue(cue);
}
const existing=readdirSync(framesDir,{withFileTypes:true}).filter(item=>item.isDirectory()).map(item=>item.name);
let at=0;for(const [index,item] of plan.entries()){
 item.index=index;item.start=at;at+=item.duration;
 const safe=item.id.replace(':','-'),found=existing.find(name=>name.endsWith(`-${safe}`));
 item.frameDir=found||`${String(index).padStart(2,'0')}-${safe}`;
}
writeFileSync(resolve(out,'step-plan.json'),JSON.stringify({fps:8,totalDuration:at,segments:plan},null,2)+'\n');
console.log(JSON.stringify({segments:plan.length,totalDuration:at,missions:Object.fromEntries(missions.map(id=>[id,plan.filter(item=>item.mission===id).length]))},null,2));
