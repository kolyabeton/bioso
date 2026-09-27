import test from 'node:test';
test('autoplay rejection retains the queued voice until the next user gesture',async()=>{
 let attempts=0;const media=[];const voice=createStoryAudio('/',()=>({soundEnabled:true,effects:50,language:'ru'}),{createAudio:src=>{const a=fakeAudio(src);if(!src.includes('interference'))a.play=()=>{attempts++;if(attempts===1){a.paused=true;return Promise.reject(Object.assign(new Error('gesture required'),{name:'NotAllowedError'}));}a.paused=false;return Promise.resolve();};media.push(a);return a;},createContext:()=>{throw Error('no context');}});
 voice.play({audio:'assets/audio/story/test.m4a',voice:'child'});await Promise.resolve();assert.match(voice.cue,/test.m4a/);voice.unlock();await Promise.resolve();assert.equal(attempts,2);assert.equal(voice.playing,true);voice.stop();
});
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createStoryAudio} from '../src/story-audio.js';
import {STORY_CUES} from '../src/story-cues.js';

const fakeAudio=src=>({src,paused:true,volume:1,preload:'',play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){}});

test('Russian child transmission plays at the effects level and ducks music',()=>{
  const ducked=[],media=[],ended=[],voice=createStoryAudio('/game/',()=>({soundEnabled:true,effects:50,language:'ru'}),{createAudio:src=>{const audio=fakeAudio(src);media.push(audio);return audio;},setDucked:value=>ducked.push(value),onEnded:cue=>ended.push(cue.id)});
  assert.equal(voice.play({audio:'assets/audio/story/test.m4a',voice:'child'}),true);assert.equal(voice.playing,true);assert.deepEqual(ducked,[true]);
  assert.equal(media.length,2);assert.match(media[1].src,/radio-interference\.m4a$/);assert.equal(media[1].loop,true);
  media[0].onended();assert.deepEqual(ended,[undefined]);assert.equal(voice.playing,false);assert.equal(media.every(item=>item.paused),true);assert.equal(ducked.at(-1),false);
});

test('muted sessions stay silent while English sessions select English dialogue',()=>{
  const muted=createStoryAudio('/',()=>({soundEnabled:false,effects:100,language:'ru'}),{createAudio:fakeAudio});
  const media=[],english=createStoryAudio('/',()=>({soundEnabled:true,effects:100,language:'en'}),{createAudio:src=>{const audio=fakeAudio(src);media.push(audio);return audio;}});
  assert.equal(muted.play({audio:'voice.m4a'}),false);assert.equal(english.play({audio:'assets/audio/story/voice.m4a'}),true);
  assert.equal(media[0].src,'/assets/audio/story/en/voice.m4a');english.stop();
});

test('switching from English to Russian replaces a paused line before it resumes',()=>{
  let language='en';const media=[];
  const voice=createStoryAudio('/game/',()=>({soundEnabled:true,effects:100,language}),{createAudio:src=>{const audio=fakeAudio(src);media.push(audio);return audio;}});
  voice.play({audio:'assets/audio/story/voice.m4a',voice:'child'});voice.pause();
  language='ru';assert.equal(voice.syncLanguage(),true);
  assert.equal(media[0].src,'/game/assets/audio/story/voice.m4a');assert.equal(voice.playing,false);
  assert.equal(voice.resume(),true);assert.equal(voice.playing,true);
});

test('every story cue ships Russian and English voice files',()=>{
  for(const cue of STORY_CUES){
    assert.ok(statSync(new URL(`../public/${cue.audio}`,import.meta.url)).size>4096,cue.id);
    assert.ok(statSync(new URL(`../public/${cue.audio.replace('story/','story/en/')}`,import.meta.url)).size>4096,`en:${cue.id}`);
  }
});

test('the approved Qwen cast covers every cue with stable character voices',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../artifacts/story-voices-20260913/qwen-cast-zero-context/verification.json',import.meta.url),'utf8'));
  assert.equal(manifest.backend,'local');
  assert.match(manifest.approvedGirl,/a-restrained-fear\.wav$/);
  assert.deepEqual([...new Set(manifest.clips.map(clip=>clip.profile))].sort(),['cathedral','child','collector','gardener','hunter','leviathan','mother','shepherd']);
  assert.equal(manifest.clips.length,STORY_CUES.length*2);
  for(const clip of manifest.clips){
    const locale=clip.locale==='en'?'en/':'';
    const path=new URL(`../public/assets/audio/story/${locale}${clip.id}.m4a`,import.meta.url);
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),clip.sha256,`${clip.locale}:${clip.id}`);
  }
});

test('assembly pauses both tracks and continues their positions without creating a new transmission',()=>{
  const media=[],ducked=[],voice=createStoryAudio('/',()=>({soundEnabled:true,effects:50,language:'ru'}),{createAudio:src=>{const audio=fakeAudio(src);media.push(audio);return audio;},setDucked:value=>ducked.push(value)});
  voice.play({audio:'assets/audio/story/test.m4a',voice:'child'});
  media[0].currentTime=3.25;media[1].currentTime=1.5;
  voice.pause();voice.pause();assert.equal(voice.playing,false);assert.ok(media.every(audio=>audio.paused));assert.equal(ducked.at(-1),false);
  assert.equal(voice.resume(),true);assert.equal(voice.resume(),false);
  assert.equal(media.length,2);assert.equal(media[0].currentTime,3.25);assert.equal(media[1].currentTime,1.5);assert.equal(voice.playing,true);assert.equal(ducked.at(-1),true);
  voice.pause();voice.stop();assert.equal(voice.resume(),false);
});

test('a completed transmission is not replayed by an assembly round trip',()=>{
  const media=[],voice=createStoryAudio('/',()=>({soundEnabled:true,effects:50,language:'ru'}),{createAudio:src=>{const audio=fakeAudio(src);media.push(audio);return audio;}});
  voice.play({audio:'assets/audio/story/test.m4a',voice:'child'});media[0].onended();
  voice.pause();assert.equal(voice.resume(),false);assert.equal(media.length,2);assert.equal(voice.playing,false);
});

test('radio bed is louder and short signal losses raise the interference',()=>{
  const media=[],timers=[];
  const voice=createStoryAudio('/',()=>({soundEnabled:true,effects:100,language:'ru'}),{
    createAudio:src=>{const audio=fakeAudio(src);media.push(audio);return audio;},
    random:()=>0,schedule:(callback,delay)=>{timers.push({callback,delay});return timers.length;},cancel:()=>{},
  });
  voice.play({audio:'assets/audio/story/test.m4a',voice:'child'});
  assert.equal(media[0].volume,.86);assert.equal(media[1].volume,.2);assert.equal(timers[0].delay,1500);
  timers[0].callback();assert.equal(media[0].volume,.08);assert.equal(media[1].volume,.34);assert.equal(timers[1].delay,65);
  timers[1].callback();assert.equal(media[0].volume,.86);assert.equal(media[1].volume,.2);
  voice.stop();
});
