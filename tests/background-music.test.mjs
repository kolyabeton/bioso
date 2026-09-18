import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackgroundMusic} from '../src/background-music.js';
import {createGameMusic} from '../src/game-music.js';
import {readSettings,SETTINGS_KEY} from '../src/ui/settings.js';

function fixture(load, urls = '/music.mp3', factory = createBackgroundMusic) {
  const voices=[];
  let contexts=0, loads=0;
  const gains=[];
  const makeGain=()=>{
    const events=[];
    const node={gain:{value:0,events,
      setTargetAtTime(value,time,constant){this.value=value;events.push(['target',value,time,constant]);},
      cancelScheduledValues(time){events.push(['cancel',time]);},
      setValueAtTime(value,time){events.push(['set',value,time]);},
      linearRampToValueAtTime(value,time){events.push(['ramp',value,time]);},
    },connect(){},disconnect(){this.disconnected=true;}};
    gains.push(node);return node;
  };
  const gain=makeGain();
  const context={state:'running',currentTime:0,destination:{},createGain:()=>gains.length===1&&!context.masterCreated?(context.masterCreated=true,gain):makeGain(),
    createBufferSource(){const voice={connect(target){this.target=target;},disconnect(){this.disconnected=true;},start(when,offset){this.offset=offset;},stop(when){if(when===undefined)this.stopped=true;else this.stopAt=when;}};voices.push(voice);return voice;},
    close:async()=>{},resume:async()=>{},
  };
  const advance=time=>{
    context.currentTime=time;
    for(const voice of voices)if(!voice.stopped&&voice.stopAt<=time){voice.stopped=true;voice.onended?.();}
  };
  const music=factory(urls,{createContext:()=>{contexts++;return context;},loadBuffer:async(context,url)=>{loads++;return load?load(url):{duration:28};}});
  music.setVolume(30);
  return {music,voices,context,gain,advance,counts:()=>({contexts,loads})};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('music waits for a gesture and repeated gestures keep a single looping voice',async()=>{
  const f=fixture();assert.equal(f.counts().contexts,0);
  f.music.unlock();f.music.unlock();await settle();f.music.unlock();
  assert.deepEqual(f.counts(),{contexts:1,loads:1});assert.equal(f.voices.length,1);
  assert.equal(f.voices[0].loop,true);assert.equal(f.gain.gain.value,.06);
});

test('mute and hidden tab stop playback; resume retains position without overlapping voices',async()=>{
  const f=fixture();f.music.unlock();await settle();
  f.context.currentTime=10;f.music.setVolume(0);assert.equal(f.voices[0].stopped,true);
  f.context.currentTime=20;f.music.setVolume(50);assert.equal(f.voices[1].offset,10);
  f.context.currentTime=25;f.music.setActive(false);assert.equal(f.voices[1].stopped,true);
  f.context.currentTime=100;f.music.setActive(true);assert.equal(f.voices[2].offset,15);
  assert.equal(f.voices.filter(v=>!v.stopped).length,1);
});

test('loading while hidden stays silent and failed loads can retry on the next gesture',async()=>{
  let resolve;
  const f=fixture(()=>new Promise(r=>{resolve=r;}));f.music.unlock();f.music.setActive(false);
  resolve({duration:28});await settle();assert.equal(f.voices.length,0);
  f.music.setActive(true);assert.equal(f.voices.length,1);f.music.dispose();assert.equal(f.voices[0].stopped,true);
  let attempts=0;const retry=fixture(()=>{if(++attempts===1)throw Error('offline');return {duration:28};});
  retry.music.unlock();await settle();assert.equal(retry.voices.length,0);
  retry.music.unlock();await settle();assert.equal(retry.voices.length,1);
});

test('a new profile starts with enabled 50 percent audio and saved settings remain compatible',()=>{
  assert.equal(readSettings({getItem:()=>null}).soundEnabled,true);
  assert.equal(readSettings({getItem:()=>null}).music,50);
  assert.equal(readSettings({getItem:key=>key===SETTINGS_KEY?' {"music":0}':null}).music,0);
  assert.equal(readSettings({getItem:()=>'{"music":30,"effects":60}'}).soundEnabled,true);
  assert.equal(readSettings({getItem:()=>'{"soundEnabled":true}'}).soundEnabled,true);
});


test('playlist advances in order, wraps, and resumes without skipping a track',async()=>{
  const loaded=[];
  const f=fixture(url=>{loaded.push(url);return {duration:28,url};},['/a.mp3','/b.mp3','/c.mp3']);
  f.music.unlock();await settle();
  assert.equal(f.voices[0].loop,false);
  const end=async()=>{const voice=f.voices.at(-1);voice.stopped=true;voice.onended();await settle();};
  await end();assert.deepEqual(loaded,['/a.mp3','/b.mp3']);
  f.context.currentTime=7;f.music.setActive(false);
  assert.equal(f.voices.at(-1).onended,null);
  f.music.setActive(true);assert.equal(f.voices.at(-1).offset,7);
  assert.deepEqual(loaded,['/a.mp3','/b.mp3']);
  await end();await end();
  assert.deepEqual(loaded,['/a.mp3','/b.mp3','/c.mp3','/a.mp3']);
  assert.equal(f.voices.filter(v=>!v.stopped).length,1);
  f.music.dispose();
});

test('a pending next track remains silent while hidden and after disposal',async()=>{
  let finish;
  const f=fixture(url=>url==='/a.mp3'?{duration:28}:new Promise(r=>{finish=r;}),['/a.mp3','/b.mp3']);
  f.music.unlock();await settle();
  f.voices[0].onended();f.music.setActive(false);
  finish({duration:28});await settle();assert.equal(f.voices.length,1);
  f.music.setActive(true);assert.equal(f.voices.length,2);
  f.music.dispose();assert.equal(f.voices[1].stopped,true);
  let resolve;
  const pending=fixture(()=>new Promise(r=>{resolve=r;}),['/a.mp3','/b.mp3']);
  pending.music.unlock();pending.music.dispose();resolve({duration:28});await settle();
  assert.equal(pending.voices.length,0);
});


test('Technology keeps the same voice across menu, atlas and ordinary gameplay',async()=>{
  const loaded=[];
  const f=fixture(url=>{loaded.push(url);return {duration:28,url};},'/game/',createGameMusic);
  f.music.unlock();await settle();
  const menu='/game/assets/audio/technology-sub-clair.mp3';
  assert.equal(f.voices[0].buffer.url,menu);assert.equal(f.voices[0].loop,true);
  for(const screen of ['home','catalog','settings','credits','home'])f.music.setScreen(screen);
  assert.equal(f.voices.length,1);
  f.context.currentTime=6;f.music.setScreen('');await settle();
  assert.equal(f.voices.length,1);
  assert.equal(f.voices[0].stopped,undefined);
  f.context.currentTime=10;f.music.setScreen('pause');f.music.setScreen('settings');
  assert.equal(f.voices.length,1);
  f.music.setScreen('catalog');await settle();
  assert.equal(f.voices.at(-1).buffer.url,menu);
  f.music.setScreen('');await settle();
  assert.equal(f.voices.length,1);assert.equal(f.voices[0].offset,0);
  assert.equal(f.voices.at(-1).loop,true);
  assert.deepEqual(loaded,[menu]);
  assert.equal(f.voices.filter(v=>!v.stopped).length,1);
  f.music.dispose();
});

test('switching playlists ignores stale loads without clearing the current pending request',async()=>{
  const pending={};const loaded=[];
  const f=fixture(url=>{loaded.push(url);return new Promise(resolve=>{pending[url]=resolve;});},['/menu.mp3']);
  f.music.unlock();f.music.setPlaylist(['/game.mp3']);
  pending['/menu.mp3']({duration:28,url:'/menu.mp3'});await settle();
  f.music.unlock();assert.deepEqual(loaded,['/menu.mp3','/game.mp3']);
  assert.equal(f.voices.length,0);
  pending['/game.mp3']({duration:28,url:'/game.mp3'});await settle();
  assert.equal(f.voices.length,1);assert.equal(f.voices[0].buffer.url,'/game.mp3');
  f.music.dispose();
});


test('Touch follows engaged bosses, including mission and final bosses, with menu priority',async()=>{
  const f=fixture(url=>({duration:28,url}),'/game/',createGameMusic);
  const boss={kind:'boss',hp:100,territory:{state:'idle'}};
  const run={enemies:[boss],dead:false,won:false};
  f.music.unlock();await settle();f.music.setScreen('');await settle();
  f.music.updateRun(run);assert.match(f.voices.at(-1).buffer.url,/technology-sub-clair/);
  f.context.currentTime=6;
  boss.territory.state='engaged';f.music.updateRun(run);await settle();
  assert.match(f.voices.at(-1).buffer.url,/touch-zavorin/);
  const count=f.voices.length;f.music.updateRun(run);f.music.setScreen('pause');
  assert.equal(f.voices.length,count);
  f.music.setScreen('catalog');await settle();assert.match(f.voices.at(-1).buffer.url,/technology/);
  f.music.updateRun(run);assert.match(f.voices.at(-1).buffer.url,/technology/);
  f.music.setScreen('');await settle();assert.match(f.voices.at(-1).buffer.url,/touch-zavorin/);
  boss.territory.state='returning';f.music.updateRun(run);await settle();
  assert.match(f.voices.at(-1).buffer.url,/technology-sub-clair/);
  assert.equal(f.voices.at(-1).offset,6);
  for(const kind of ['boss','final']){
    run.enemies=[{kind,hp:100}];f.music.updateRun(run);await settle();
    assert.match(f.voices.at(-1).buffer.url,/touch-zavorin/);
    run.enemies[0].hp=0;f.music.updateRun(run);await settle();
    assert.match(f.voices.at(-1).buffer.url,/technology-sub-clair/);
  }
  run.enemies=[{kind:'elite',hp:100},{kind:'boss-part',hp:100}];f.music.updateRun(run);
  assert.match(f.voices.at(-1).buffer.url,/technology-sub-clair/);
  run.enemies=[{kind:'boss',hp:100}];f.music.updateRun(run);await settle();
  run.dead=true;f.music.updateRun(run);await settle();assert.match(f.voices.at(-1).buffer.url,/technology-sub-clair/);
  f.advance(f.context.currentTime+1);
  assert.equal(f.voices.filter(v=>!v.stopped).length,1);f.music.dispose();
});


test('loaded track crossfades for 0.8 seconds; loading never cuts the old track',async()=>{
  let finish;
  const f=fixture(url=>url==='/a.mp3'?{duration:28}:new Promise(resolve=>{finish=resolve;}),'/a.mp3');
  f.music.unlock();await settle();f.advance(5);
  const old=f.voices[0];
  f.music.setPlaylist('/b.mp3');await settle();
  assert.equal(old.stopAt,undefined);assert.equal(old.stopped,undefined);
  f.advance(7);finish({duration:28});await settle();
  const next=f.voices[1];
  assert.deepEqual(old.target.gain.events.slice(-3),[['cancel',7],['set',1,7],['ramp',0,7.8]]);
  assert.deepEqual(next.target.gain.events,[['set',0,7],['ramp',1,7.8]]);
  assert.equal(old.stopAt,7.8);assert.equal(old.disconnected,undefined);
  f.advance(7.8);assert.equal(old.disconnected,true);assert.equal(old.target.disconnected,true);
  f.music.setPlaylist('/a.mp3');await settle();
  assert.equal(f.voices.at(-1).offset,7);
  f.music.dispose();assert.ok(f.voices.every(voice=>voice.stopped&&voice.disconnected));
});

test('rapid switches ramp from the current level; mute stops all fading voices',async()=>{
  const f=fixture();f.music.unlock();await settle();
  f.advance(0.2);f.music.setPlaylist('/boss.mp3');await settle();
  assert.deepEqual(f.voices[0].target.gain.events.slice(-2),[['set',0.25,0.2],['ramp',0,1]]);
  f.advance(0.4);f.music.setPlaylist('/music.mp3');await settle();
  assert.equal(f.voices.length,3);
  f.music.setActive(false);
  assert.ok(f.voices.every(voice=>voice.stopped&&voice.disconnected));
  f.music.setActive(true);assert.equal(f.voices.length,4);
  f.music.setVolume(0);assert.ok(f.voices.every(voice=>voice.stopped));
  f.music.dispose();
});

test('cancelling a pending boss track preserves the audible voice and ignores its late load',async()=>{
  let finish;
  const f=fixture(url=>url==='/a.mp3'?{duration:28}:new Promise(resolve=>{finish=resolve;}),'/a.mp3');
  f.music.unlock();await settle();f.advance(5);
  f.music.setPlaylist('/boss.mp3');await settle();f.music.setPlaylist('/a.mp3');
  finish({duration:28});await settle();
  assert.equal(f.voices.length,1);assert.equal(f.voices[0].stopAt,undefined);
  f.music.dispose();
});

test('an old track ending during loading does not advance the incoming playlist',async()=>{
  let finish;
  const f=fixture(url=>url==='/a.mp3'?{duration:28}:new Promise(resolve=>{finish=resolve;}),['/a.mp3','/b.mp3']);
  f.music.unlock();await settle();
  f.music.setPlaylist(['/boss-intro.mp3','/boss-loop.mp3']);await settle();
  f.voices[0].stopped=true;f.voices[0].onended();
  finish({duration:28,url:'/boss-intro.mp3'});await settle();
  assert.equal(f.voices.at(-1).buffer.url,'/boss-intro.mp3');
  f.music.setPlaylist([]);
  assert.equal(f.voices.at(-1).stopAt,0.8);
  f.advance(1);assert.ok(f.voices.every(voice=>voice.disconnected));
  f.music.dispose();
});

test('default music is a quiet background and boss boost is relative, smooth and reversible',async()=>{
  const f=fixture(undefined,'/game/',createGameMusic);
  const settings=readSettings({getItem:()=>null});
  f.music.setVolume(settings.music);f.music.unlock();await settle();
  const normal=f.gain.gain.value;
  assert.ok(Math.abs(normal-0.1)<1e-12);
  const boss={kind:'boss',hp:100,territory:{state:'engaged'}};
  const run={enemies:[boss],dead:false,won:false};
  f.music.updateRun(run);assert.equal(f.gain.gain.value,normal);
  f.music.setScreen('');await settle();
  assert.ok(Math.abs(f.gain.gain.value-normal*1.15)<1e-12);
  assert.equal(f.gain.gain.events.at(-1)[3],0.25);
  const eventCount=f.gain.gain.events.length;
  for(let i=0;i<10;i++)f.music.updateRun(run);
  f.music.setScreen('settings');assert.equal(f.gain.gain.events.length,eventCount);
  f.music.setScreen('catalog');assert.equal(f.gain.gain.value,normal);
  f.music.setScreen('');assert.ok(Math.abs(f.gain.gain.value-normal*1.15)<1e-12);
  boss.hp=0;f.music.updateRun(run);assert.equal(f.gain.gain.value,normal);
  f.music.dispose();
});

test('boss boost respects mute and changed user volume, including 100 percent',async()=>{
  const f=fixture(undefined,'/game/',createGameMusic);
  const run={enemies:[{kind:'boss',hp:100}],dead:false,won:false};
  f.music.setScreen('');f.music.updateRun(run);
  f.music.setVolume(0);f.music.unlock();assert.equal(f.counts().contexts,0);
  f.music.setVolume(100);f.music.unlock();await settle();
  assert.ok(Math.abs(f.gain.gain.value-0.23)<1e-12);
  f.music.setVolume(20);assert.ok(Math.abs(f.gain.gain.value-0.046)<1e-12);
  run.dead=true;f.music.updateRun(run);assert.ok(Math.abs(f.gain.gain.value-0.04)<1e-12);
  f.music.setVolume(0);run.dead=false;f.music.updateRun(run);await settle();
  assert.equal(f.gain.gain.value,0);assert.ok(f.voices.every(voice=>voice.stopped));
  f.music.dispose();
});

test('story speech ducks either gameplay playlist and restores its previous intensity',async()=>{
  const f=fixture(undefined,'/game/',createGameMusic),run={enemies:[{kind:'boss',hp:100}],dead:false,won:false};
  f.music.setScreen('');f.music.updateRun(run);f.music.unlock();await settle();
  const boss=f.gain.gain.value;f.music.setDucked(true);assert.ok(Math.abs(f.gain.gain.value-boss*.48)<1e-12);
  f.music.setDucked(false);assert.ok(Math.abs(f.gain.gain.value-boss)<1e-12);
  run.enemies=[];f.music.updateRun(run);const normal=f.gain.gain.value;
  f.music.setDucked(true);assert.ok(Math.abs(f.gain.gain.value-normal*.48)<1e-12);
  f.music.dispose();
});

test('boss music loops the 45-second intro until the fight ends',async()=>{
  const f=fixture(url=>({duration:45,url}),'/game/',createGameMusic);
  const run={time:100,enemies:[{id:1,kind:'boss',hp:100}]};
  f.music.setScreen('');f.music.unlock();await settle();
  f.music.updateRun(run);await settle();
  assert.equal(f.voices.at(-1).buffer.url,'/game/assets/audio/touch-zavorin-intro.mp3');
  assert.equal(f.voices.at(-1).offset,0);
  assert.equal(f.voices.at(-1).loop,true);
  run.time=160;f.music.updateRun(run);await settle();
  assert.match(f.voices.at(-1).buffer.url,/touch-zavorin-intro/);
  run.enemies[0].hp=0;f.music.updateRun(run);await settle();
  assert.match(f.voices.at(-1).buffer.url,/technology-sub-clair/);
  f.music.dispose();
});

test('each boss engagement starts at zero while a pause within the same encounter resumes',async()=>{
  const f=fixture(url=>({duration:45,url}),'/game/',createGameMusic);
  const boss={id:1,kind:'boss',hp:100,territory:{state:'engaged'}};
  const run={time:0,enemies:[boss]};
  f.music.setScreen('');f.music.updateRun(run);f.music.unlock();await settle();
  f.advance(12);f.music.setActive(false);f.advance(20);f.music.setActive(true);
  assert.equal(f.voices.at(-1).offset,12);
  f.advance(25);boss.territory.state='returning';f.music.updateRun(run);await settle();
  f.advance(30);boss.territory.state='engaged';run.time=20;f.music.updateRun(run);await settle();
  assert.match(f.voices.at(-1).buffer.url,/touch-zavorin-intro/);
  assert.equal(f.voices.at(-1).offset,0);
  f.advance(40);run.enemies=[{id:2,kind:'final',hp:100}];run.time=30;
  f.music.updateRun(run);await settle();
  assert.equal(f.voices.at(-1).offset,0);
  f.music.dispose();
});
