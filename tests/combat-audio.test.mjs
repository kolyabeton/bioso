import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createCombatAudio} from '../src/combat-audio.js';

function fixture(){
 let level=60,loads=0,contexts=0;
 const voices=[],gains=[];
 const context={state:'running',currentTime:0,destination:{},
  createGain(){const g={gain:{value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){return this;},disconnect(){}};gains.push(g);return g;},
  createBufferSource(){const source={playbackRate:{value:1},connect(g){return g;},disconnect(){},start(){this.started=true;},stop(){this.stopped=true;}};voices.push(source);return source;},
 };
 const effectLoads=[];
 const audio=createCombatAudio(()=>level,{createContext:()=>{contexts++;return context;},loadShot:async()=>{loads++;return {name:'pistol',duration:.74};},loadEffect:async(c,key)=>{effectLoads.push(key);return{name:key,duration:.32};}});
 return{audio,voices,gains,context,effectLoads,setLevel:v=>{level=v;},counts:()=>({loads,contexts})};
}
const settle=()=>new Promise(r=>setImmediate(r));

test('approved insect, movement, ability and world WAVs match their manifest and contain audible mono PCM',()=>{
 const keys=['acid','symbiont-bite','dodge','spring-leap','drone-death','sporebrood','overgrowth','revive','heart-pulse','challenge-result','level-up','player-step','shield-block','player-death','boss-arrival','boss-phase','boss-swarm','boss-heavy-slam','boss-root-eruption','boss-heavy-sweep','weapon-reload','enemy-wasp-volley','enemy-wet-cast','unlock','group-cleared','lore-found','important-death','world-root-forest','world-brood-nursery','world-garden-pump','world-scrap-turbine','world-mission-gate'];
 const dir=new URL('../public/assets/audio/',import.meta.url),rows=JSON.parse(readFileSync(new URL('effect-sources.json',dir))).filter(row=>keys.includes(row.key));
 assert.deepEqual(rows.map(row=>row.key),keys);
 assert.deepEqual(rows.map(row=>row.file),['approved-acid-wash.wav','approved-symbiont-bite.wav','approved-dodge.wav','approved-spring-leap.wav','approved-drone-death.wav','approved-sporebrood.wav','approved-overgrowth.wav','approved-revive.wav','approved-heart-discharge.wav','approved-challenge-result.wav','approved-level-up.wav','approved-player-step.wav','approved-shield-block.wav','approved-player-death.wav','approved-boss-arrival.wav','approved-boss-phase.wav','approved-boss-swarm.wav','approved-boss-heavy-slam.wav','approved-boss-root-eruption.wav','approved-boss-heavy-sweep.wav','approved-weapon-reload.wav','approved-enemy-wasp-volley.wav','approved-enemy-wet-cast.wav','approved-unlock.wav','approved-group-cleared.wav','approved-lore-found.wav','approved-important-death.wav','approved-world-root-forest.wav','approved-world-brood-nursery.wav','approved-world-garden-pump.wav','approved-world-scrap-turbine.wav','approved-world-mission-gate.wav']);
 for(const row of rows){
  const bytes=readFileSync(new URL(row.file,dir));
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt16LE(22),1);assert.equal(bytes.readUInt16LE(34),16);assert.equal(bytes.readUInt32LE(24),row.sampleRate);
  assert.equal((bytes.length-44)/2,Math.round(row.duration*row.sampleRate));assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  const pcm=Array.from({length:(bytes.length-44)/2},(_,i)=>bytes.readInt16LE(44+i*2));assert.ok(pcm.some(value=>Math.abs(value)>1000));
 }
});

test('welder attack keeps its dedicated electric recording audible',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 assert.ok(f.effectLoads.includes('arc'));
 f.audio.event({type:'arc',key:'arc',source:'welder'});
 assert.equal(f.voices.at(-1).buffer.name,'arc');
 assert.ok(f.gains.at(-1).gain.value>=.4);
});

test('approved dodge and spring launch cues follow their gameplay events',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'dodge',source:'player'});
 f.audio.event({type:'spring-leap',source:'player'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['dodge','spring-leap']);
});

test('approved drone death and ability cues follow their gameplay events without doubling the spore proc',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'summon-death',id:'drone-1'});
 f.audio.event({type:'soul-proc',kind:'sporebrood'});
 f.audio.event({type:'ability-impact',kind:'sporebrood'});
 f.audio.event({type:'soul-proc',kind:'overgrowth'});
 f.audio.event({type:'soul-proc',kind:'revive'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['drone-death','sporebrood','overgrowth','revive']);
});

test('heart discharge plays once per pulse and challenge failure uses the lower result variant',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'heart-pulse',count:4});f.audio.event({type:'heart-pulse',count:4});
 f.context.currentTime=.31;f.audio.event({type:'challenge-result',result:'success'});
 f.context.currentTime=.57;f.audio.event({type:'challenge-result',result:'failed'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['heart-pulse','challenge-result','challenge-result']);
 assert.equal(f.voices.at(-1).playbackRate.value,.84);assert.equal(f.gains.at(-1).gain.value,.27);
});

test('approved RPG cues follow level, travel, successful block, death and boss events',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'level-up',count:2});
 f.context.currentTime=.5;f.audio.event({type:'player-step',step:1});
 f.context.currentTime=.7;f.audio.event({type:'shield',kind:'health-invulnerability'});
 f.audio.event({type:'shield',kind:'organ-shield'});
 f.context.currentTime=.9;f.audio.event({type:'player-death'});
 f.context.currentTime=1.8;f.audio.event({type:'boss-arrival'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['level-up','player-step','shield-block','player-death','boss-arrival']);
 assert.equal(f.voices[1].playbackRate.value,.99);
 assert.equal(f.gains[2].gain.value,.22);
});

test('approved mechanism plays only for Injector, Spreader and Courier reloads',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(const key of ['needle','shotgun','rocket']){
  f.audio.event({type:'reload-start',source:key,key});f.context.currentTime+=.09;
 }
 assert.equal(f.voices.length,3);
 for(const key of ['harpoon','pistol','seed','arc','acid','claws','hammer','drill','whip','fangs']){
  f.audio.event({type:'reload-start',source:key,key});f.context.currentTime+=.09;
  assert.equal(f.voices.length,3,`${key} must stay silent on reload-start`);
 }
 f.audio.event({type:'reload-end',source:'pistol',key:'pistol'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),Array(3).fill('weapon-reload'));
 assert.equal(f.gains.at(-1).gain.value,.119);
});

test('approved enemy ability cues play only for their named boss actions',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(const action of ['hunter-volley','hive-volley']){f.audio.event({type:'boss-action',action});f.context.currentTime+=.1;}
 for(const bossAction of ['needle-line','needle-fan','needle-rain']){f.audio.event({type:'enemy-strike',bossAction});f.context.currentTime+=.1;}
 f.audio.event({type:'boss-action',action:'brood-ring'});f.context.currentTime+=.11;
 for(const bossAction of ['acid-bloom','vine-sweep']){f.audio.event({type:'enemy-strike',bossAction});f.context.currentTime+=.11;}
 f.audio.event({type:'enemy-strike',key:'needle'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['enemy-wasp-volley','enemy-wasp-volley','enemy-wasp-volley','enemy-wasp-volley','enemy-wasp-volley','enemy-wet-cast','enemy-wet-cast','enemy-wet-cast']);
});

test('approved boss phase, swarm release and heavy strikes follow special actions without duplicate voices',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'boss-action',action:'phase-2'});
 f.audio.event({type:'boss-phase',phase:2});
 f.audio.event({type:'boss-action',action:'swarm'});
 f.audio.event({type:'boss-action',action:'bees'});
 f.context.currentTime=.31;f.audio.event({type:'boss-action',action:'bees'});
 f.context.currentTime=.5;f.audio.event({type:'boss-action',action:'crush'});
 f.audio.event({type:'enemy-strike',bossAction:'crush'});
 for(const bossAction of ['slam','root-slam','hunter-pounce','ground-claws']){f.context.currentTime+=.11;f.audio.event({type:'enemy-strike',bossAction});}
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['boss-phase','boss-swarm','boss-swarm','boss-heavy-slam','boss-heavy-slam','boss-heavy-slam','boss-heavy-slam','boss-heavy-slam']);
});

test('approved root eruption and boss sweeps follow only their named actions and coalesce root duplicates',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'boss-action',action:'roots'});
 f.audio.event({type:'enemy-strike',bossAction:'roots'});
 for(const bossAction of ['cleave','reaping-sweep','drill-sweep','brood-sweep']){
  f.context.currentTime+=.09;f.audio.event({type:'enemy-strike',bossAction});
 }
 f.audio.event({type:'enemy-strike',bossAction:'mirror-collapse'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['boss-root-eruption','boss-heavy-sweep','boss-heavy-sweep','boss-heavy-sweep','boss-heavy-sweep']);
});

test('approved progression cues coalesce and the heavy crunch excludes ordinary deaths',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'unlock'});f.audio.event({type:'unlock'});
 f.context.currentTime=.3;f.audio.event({type:'group-cleared'});
 f.context.currentTime=.6;f.audio.event({type:'lore-found'});
 f.context.currentTime=.9;f.audio.event({type:'death',kind:'normal'});
 f.audio.event({type:'death',kind:'elite'});f.context.currentTime=1.03;
 f.audio.event({type:'death',kind:'boss'});f.context.currentTime=1.16;
 f.audio.event({type:'death',kind:'final'});f.context.currentTime=1.29;
 f.audio.event({type:'destroy'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['unlock','group-cleared','lore-found','important-death','important-death','important-death','important-death']);
});

test('approved gunshot covers pistol, seed, shotgun and needle; selected weapons keep their own recordings',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(const key of ['pistol','seed','shotgun','needle','claws','drill','hammer','harpoon','whip','fangs','rocket','arc','acid'])f.audio.event({type:'attack',key});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['pistol','pistol','pistol','pistol','claws','drill','hammer','harpoon','arc','acid']);
 assert.ok(f.voices.every(v=>v.started));
});

test('one symbiont bite cue represents a strike and dense simultaneous helpers stay bounded',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(let i=0;i<8;i++)f.audio.event({type:'summon-attack',source:`symbiont-${i}`});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['symbiont-bite']);
 f.context.currentTime=.07;
 for(let i=0;i<8;i++)f.audio.event({type:'summon-attack',source:`drone-${i}`});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['symbiont-bite','symbiont-bite']);
 assert.ok(f.voices.filter(v=>!v.stopped).length<=4);
});

test('shield waits for contact, rocket waits for explosion, and arc links do not stack a full sound per target',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 f.audio.event({type:'melee-windup',key:'hammer'});
 f.audio.event({type:'attack',key:'rocket'});f.audio.event({type:'attack',key:'arc'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['arc']);
 f.audio.event({type:'attack',key:'hammer',animationStarted:true});
 f.audio.event({type:'blast',key:'rocket'});
 for(let i=0;i<3;i++)f.audio.event({type:'arc'});
 assert.deepEqual(f.voices.map(v=>v.buffer.name),['arc','hammer','rocket']);
 f.context.currentTime=.1;f.audio.event({type:'arc'});
 assert.equal(f.voices.length,4);
});

test('repeated unlocks load every chosen file once; mute blocks all selected effects',async()=>{
 const f=fixture();f.audio.unlock();f.audio.unlock();await settle();f.audio.unlock();await settle();
 assert.equal(f.effectLoads.length,41);assert.equal(new Set(f.effectLoads).size,41);
 f.setLevel(0);
 for(const key of ['hammer','claws','drill','harpoon'])f.audio.event({type:'attack',key});
 f.audio.event({type:'arc'});f.audio.event({type:'blast',key:'rocket'});
 assert.equal(f.voices.length,0);
});

test('fast drills renew the owning motor; all new effects have a bounded voice count',async()=>{
 const f=fixture();f.audio.unlock();await settle();
 for(let i=0;i<10;i++){f.context.currentTime+=.2;f.audio.event({type:'attack',key:'drill',source:'left'});}
 assert.equal(f.voices.filter(v=>!v.stopped).length,1);
 for(let i=0;i<20;i++)for(const key of ['hammer','claws','harpoon'])f.audio.event({type:'attack',key,source:i});
 assert.ok(f.voices.filter(v=>!v.stopped).length<=12);
 for(const voice of f.voices)voice.onended();
 f.audio.event({type:'attack',key:'harpoon'});
 assert.ok(f.voices.at(-1).started);
});

test('master mute blocks loading and playback, and mutes already playing shots',async()=>{
 const f=fixture();f.setLevel(0);f.audio.unlock();assert.deepEqual(f.counts(),{loads:0,contexts:0});
 f.setLevel(60);f.audio.unlock();await settle();f.audio.event({type:'attack',key:'seed'});
 assert.equal(f.gains[0].gain.value,.6);
 f.setLevel(0);f.audio.syncVolume();assert.equal(f.gains[0].gain.value,0);
 f.audio.event({type:'attack',key:'needle'});assert.equal(f.voices.length,1);
});

test('simultaneous guns are audible independently, with a bounded voice count',async()=>{
 const f=fixture();f.audio.unlock();f.audio.unlock();await settle();
 for(let i=0;i<12;i++)f.audio.event({type:'attack',key:'seed',source:i});
 assert.equal(f.counts().loads,1);assert.equal(f.voices.filter(v=>!v.stopped).length,8);
});
