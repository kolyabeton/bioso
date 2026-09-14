import {execFileSync} from 'node:child_process';
import {copyFileSync,existsSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {STORY_CUES} from '../../src/story-cues.js';

const root=resolve(import.meta.dirname,'../..');
const ffmpeg=resolve(root,'temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1');
const audioDir=resolve(root,'public/assets/audio/story');
const backupDir=resolve(root,'artifacts/lore-film-step-by-step-20260912/voice-backup-before-soft-girl');
const tempDir=resolve(root,'artifacts/lore-film-step-by-step-20260912/voice-source-aiff');
mkdirSync(backupDir,{recursive:true});mkdirSync(tempDir,{recursive:true});

const profiles={
  child:{rate:'164',filter:'highpass=f=90,lowpass=f=9800,equalizer=f=250:t=q:w=1.1:g=1.2,equalizer=f=3600:t=q:w=1.2:g=-2.2,deesser=i=.34:m=.48:f=.47,acompressor=threshold=.11:ratio=1.8:attack=18:release=180,loudnorm=I=-18:LRA=7:TP=-2,aresample=48000'},
  gardener:{rate:'150',filter:'asetrate=22050*.92,aresample=48000,atempo=1.0869565,highpass=f=80,lowpass=f=7600,equalizer=f=180:t=q:w=1:g=1.8,equalizer=f=3200:t=q:w=1:g=-1.6,deesser=i=.28:m=.42:f=.48,aecho=.8:.62:24:.035,acompressor=threshold=.11:ratio=2:attack=20:release=190,loudnorm=I=-18:LRA=6:TP=-2'},
};

for(const cue of STORY_CUES.filter(item=>profiles[item.voice])){
  const target=resolve(audioDir,`${cue.id}.m4a`),source=resolve(tempDir,`${cue.id}.aiff`),profile=profiles[cue.voice];
  if(cue.voice==='child'&&existsSync(target)&&!existsSync(resolve(backupDir,`${cue.id}.m4a`)))copyFileSync(target,resolve(backupDir,`${cue.id}.m4a`));
  execFileSync('say',['-v','Milena','-r',profile.rate,'-o',source,cue.text]);
  execFileSync(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',source,'-af',profile.filter,'-ar','48000','-ac','1','-c:a','aac','-b:a','128k','-metadata',`title=${cue.speaker} — ${cue.id}`,target]);
  rmSync(source);
  console.log(`${cue.voice.padEnd(8)} ${cue.id}`);
}
