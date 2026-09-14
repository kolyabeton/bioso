import {copyFileSync,existsSync,mkdtempSync,mkdirSync,readFileSync,renameSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {STORY_CUES} from '../src/story-cues.js';

const output=resolve('public/assets/audio/story'),englishOutput=join(output,'en');mkdirSync(englishOutput,{recursive:true});
const backup=resolve('artifacts/story-voices-20260912/backup-before-cast-pass');mkdirSync(backup,{recursive:true});
const bundled=resolve('temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1');
const ffmpeg=process.env.FFMPEG||bundled;
const temporary=mkdtempSync(join(tmpdir(),'bioso-story-voice-'));
const pitch=(factor)=>`asetrate=22050*${factor},aresample=48000,atempo=${(1/factor).toFixed(7)}`;
const translations=JSON.parse(readFileSync(resolve('src/i18n/en.json'),'utf8'));
const russianCast={
  child:{voice:'Milena',rate:164,filter:'highpass=f=90,lowpass=f=9800,equalizer=f=250:t=q:w=1.1:g=1.2,equalizer=f=3600:t=q:w=1.2:g=-2.2,deesser=i=.34:m=.48:f=.47,acompressor=threshold=.11:ratio=1.8:attack=18:release=180,loudnorm=I=-18:LRA=7:TP=-2,aresample=48000'},
  gardener:{rate:145,pbas:34,pmod:14,filter:`${pitch(.86)},highpass=f=75,lowpass=f=7200,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3300:t=q:w=1:g=-2,deesser=i=.3:m=.45:f=.47,aecho=.8:.65:23:.025,acompressor=threshold=.11:ratio=2:attack=18:release=180,loudnorm=I=-18:LRA=6:TP=-2`},
  hunter:{rate:168,pbas:32,pmod:8,filter:`${pitch(.96)},highpass=f=230,lowpass=f=4200,acrusher=bits=13:mix=.12,aecho=.8:.55:34:.055,acompressor=threshold=.1:ratio=2.7:attack=7:release=75,loudnorm=I=-18:LRA=4:TP=-2`},
  leviathan:{rate:124,pbas:25,pmod:5,filter:`${pitch(.74)},highpass=f=65,lowpass=f=2450,equalizer=f=115:t=q:w=1:g=4,acrusher=bits=11:mix=.2,aecho=.8:.65:76:.14,acompressor=threshold=.09:ratio=3:attack=12:release=120,loudnorm=I=-18:LRA=4:TP=-2`},
  cathedral:{rate:130,pbas:28,pmod:11,filter:`${pitch(.82)},highpass=f=85,lowpass=f=3300,equalizer=f=145:t=q:w=1:g=3,aecho=.8:.7:84|151:.12|.06,acompressor=threshold=.1:ratio=2.5:attack=14:release=150,loudnorm=I=-18:LRA=5:TP=-2`},
  collector:{rate:158,pbas:38,pmod:19,filter:`${pitch(1.02)},highpass=f=280,lowpass=f=4800,aecho=.8:.64:29|61:.11|.07,acrusher=bits=14:mix=.08,acompressor=threshold=.11:ratio=2.2:attack=8:release=85,loudnorm=I=-18:LRA=5:TP=-2`},
  shepherd:{rate:141,pbas:31,pmod:3,filter:`${pitch(.88)},highpass=f=180,lowpass=f=2900,tremolo=f=17:d=.11,acrusher=bits=12:mix=.17,aecho=.8:.58:25:.07,acompressor=threshold=.1:ratio=2.8:attack=6:release=72,loudnorm=I=-18:LRA=3:TP=-2`},
  mother:{rate:126,pbas:25,pmod:7,filter:`${pitch(.76)},highpass=f=60,lowpass=f=3500,equalizer=f=120:t=q:w=1:g=3.5,aecho=.8:.72:116|193:.13|.07,acompressor=threshold=.09:ratio=2.6:attack=16:release=170,loudnorm=I=-18:LRA=5:TP=-2`},
};
for(const profile of Object.values(russianCast))profile.voice??='Milena';
const englishCast={
  child:{...russianCast.child,voice:'Flo (English (US))',rate:158},
  gardener:{...russianCast.gardener,voice:'Daniel',rate:148,pbas:null,pmod:null},
  hunter:{...russianCast.hunter,voice:'Reed (English (US))',rate:170,pbas:null,pmod:null},
  leviathan:{...russianCast.leviathan,voice:'Ralph',rate:126,pbas:null,pmod:null},
  cathedral:{...russianCast.cathedral,voice:'Albert',rate:132,pbas:null,pmod:null},
  collector:{...russianCast.collector,voice:'Samantha',rate:160,pbas:null,pmod:null},
  shepherd:{...russianCast.shepherd,voice:'Eddy (English (US))',rate:143,pbas:null,pmod:null},
  mother:{...russianCast.mother,voice:'Moira',rate:128,pbas:null,pmod:null},
};

const run=(command,args,label)=>{const result=spawnSync(command,args,{stdio:'inherit'});if(result.status!==0)throw new Error(`${label} failed`);};
try{
  for(const locale of [{id:'ru',cast:russianCast,directory:output},{id:'en',cast:englishCast,directory:englishOutput}])for(const cue of STORY_CUES){
    const profile=locale.cast[cue.voice==='robot'?cue.voiceProfile:cue.voice];if(!profile)continue;
    const text=locale.id==='en'?translations[cue.text]:cue.text;if(!text)throw new Error(`Missing English dialogue: ${cue.id}`);
    const source=join(temporary,`${locale.id}-${cue.id}.aiff`),target=join(temporary,`${locale.id}-${cue.id}.m4a`),current=join(locale.directory,`${cue.id}.m4a`);
    if(locale.id==='ru'&&existsSync(current)&&!existsSync(join(backup,`${cue.id}.m4a`)))copyFileSync(current,join(backup,`${cue.id}.m4a`));
    const markup=profile.pbas==null?text:`[[pbas ${profile.pbas}]][[pmod ${profile.pmod}]]${text}`;
    run('/usr/bin/say',['-v',profile.voice,'-r',String(profile.rate),'-o',source,markup],`${locale.id}:${cue.id}`);
    const speaker=locale.id==='en'?(translations[cue.speaker]||cue.speaker):cue.speaker;
    run(ffmpeg,['-y','-hide_banner','-loglevel','error','-i',source,'-af',profile.filter,'-ar','48000','-ac','1','-c:a','aac','-b:a','128k','-metadata',`title=${speaker} — ${cue.id}`,target],`${locale.id}:${cue.id}`);
    if(statSync(target).size<4096)throw new Error(`Voice generation failed: ${locale.id}:${cue.id}`);
    renameSync(target,current);console.log(`${locale.id} · ${speaker}: ${cue.id}`);
  }
  const interference=join(temporary,'radio-interference.m4a');
  run(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','anoisesrc=color=pink:amplitude=.18:sample_rate=48000:duration=11','-f','lavfi','-i','sine=frequency=63:sample_rate=48000:duration=11','-f','lavfi','-i','sine=frequency=1760:sample_rate=48000:duration=11','-filter_complex','[0:a]highpass=f=430,lowpass=f=5300,volume=.75[n];[1:a]volume=.16[h];[2:a]tremolo=f=.43:d=.97,highpass=f=1100,volume=.05[s];[n][h][s]amix=inputs=3:normalize=0,loudnorm=I=-20:LRA=4:TP=-4[out]','-map','[out]','-ar','48000','-ac','1','-c:a','aac','-b:a','96k',interference],'radio interference');
  renameSync(interference,join(output,'radio-interference.m4a'));
}finally{rmSync(temporary,{recursive:true,force:true});}
