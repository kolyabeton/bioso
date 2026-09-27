from pathlib import Path
import subprocess,json,re,wave,hashlib
import numpy as np
B=Path('artifacts/trailer-bioso-20260918');O=B/'v8';F='temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';A=Path('public/assets/audio');SR=48000

def run(args):
 r=subprocess.run([F,'-y','-v','error',*map(str,args)],capture_output=True)
 if r.returncode:raise RuntimeError(r.stderr.decode())
 return r.stdout

def dur(p):
 r=subprocess.run([F,'-i',str(p)],capture_output=True,text=True)
 s=re.search(r'Duration: (\d+):(\d+):([\d.]+)',r.stderr)
 return int(s[1])*3600+int(s[2])*60+float(s[3])

# Beetle leaves before the robot bursts.
parts=[B/'v5/parts'/f'{i:02d}.mp4' for i in range(14)];parts[8]=B/'v6/close-orbit.mp4';parts[10]=B/'v6/wide-overhead.mp4'
for name,source,start,frames in [('charge',B/'v5/parts/14.mp4',0,27),('beetle',B/'v5/parts/15.mp4',0,54),('burst',B/'v5/parts/14.mp4',1,59)]:
 p=O/(name+'.mp4')
 run(['-ss',start,'-i',source,'-an','-vf','fps=30,setpts=PTS-STARTPTS,setsar=1','-frames:v',frames,'-c:v','libx264','-preset','fast','-crf',18,p]);parts.append(p)
run(['-ss',9.7,'-i',B/'raw/fast-orbit-dense.mp4','-an','-vf','scale=1280:720,fps=30,setpts=PTS-STARTPTS,setsar=1','-frames:v',54,'-c:v','libx264','-preset','fast','-crf',18,O/'fast-battle-replacement.mp4'])
parts[12]=O/'fast-battle-replacement.mp4'
args=[]
for p in parts:args+=['-i',p]
fc=';'.join(f'[{i}:v]fps=30,settb=1/30,setpts=N,setsar=1[v{i}]' for i in range(len(parts)))+';'+''.join(f'[v{i}]' for i in range(len(parts)))+f'concat=n={len(parts)}:v=1:a=0[out]'
run([*args,'-filter_complex',fc,'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf',18,O/'picture.mp4'])
D=dur(O/'picture.mp4');N=round(D*SR);mix=np.zeros((N,2),dtype=np.float32);cache={};cues=[]
def audio(name):
 if name not in cache:cache[name]=np.frombuffer(run(['-i',A/name,'-f','f32le','-ac',2,'-ar',SR,'pipe:1']),dtype=np.float32).reshape(-1,2).copy()
 return cache[name]
def add(name,t,g,limit=None):
 x=audio(name).copy();x=x[:round(limit*SR)] if limit else x
 at=round(t*SR);length=min(len(x),N-at)
 if length<=0:return
 mix[at:at+length]+=x[:length]*g;cues.append({'file':name,'time':round(t,3),'gain':g})
# The exact boss-combat playlist from src/game-music.js.
music=audio('touch-zavorin-intro.mp3')[10*SR:10*SR+N].copy();music=np.pad(music,((0,max(0,N-len(music))),(0,0)))[:N]
time=np.arange(N)/SR;env=np.minimum(time/.4,1)*np.minimum((D-time)/.55,1)*.30
env*=np.where(time<6,.65,np.where(time>25.3,.55,1));mix+=music*env[:,None]
start=0
ed=json.load(open(B/'v5/manifest.json'))['timeline']
ed[12]['source']=str(B/'raw/fast-orbit-dense.mp4');ed[12]['sourceStart']=9.7
for i,p in enumerate(parts[:14]):
 length=dur(p);shot=ed[i]
 if shot['kind']=='ui':add('approved-ui-open.wav',start,.23,.4)
 if shot['kind']=='battle':
  # Silent footage receives edited game-asset Foley, not a live audio capture.
  for t in np.arange(.08,length-.08,.25):add('approved-player-step.wav',start+t,.18,.22)
  raw=json.load(open(Path(shot['source']).with_suffix('.json')))
  active=[]
  for t in np.arange(.12,length-.10,.27):
   nearest=min(raw['samples'],key=lambda s:abs(s['elapsed']-(shot['sourceStart']+t)))
   if nearest['shots']>0:active.append(t);add('approved-pistol.mp3',start+t,.22,.24)
  if active:
   add('approved-electric.wav',start+active[0]+.08,.25)
   if len(active)>2:add('approved-rocket.wav',start+active[-2],.22,min(.65,length-active[-2]))

 start+=length
# Hero endgame really dispatches blast/key rocket; use that same game sound.
add('approved-rocket.wav',start+2.7,.48,2.1)
# Small steps for beetle's departure, drawn from the game's step asset.
for t in np.arange(start+1.02,start+2.65,.22):add('approved-player-step.wav',t,.10,.18)
peak=float(np.max(np.abs(mix)));mix*=min(2.2,.86/max(peak,.001))
with wave.open(str(O/'soundtrack.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(mix,-1,1)*32767).astype('<i2').tobytes())
out=O/'BIOSO-trailer-v8-no-boss.mp4'
run(['-i',O/'picture.mp4','-i',O/'soundtrack.wav','-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','256k','-t',D,'-movflags','+faststart',out]);run(['-i',out,'-f','null','-'])
run(['-i',out,'-vf','fps=1,scale=320:180,tile=7x4','-frames:v',1,O/'review.jpg'])
(O/'manifest.json').write_text(json.dumps({'duration':D,'music':'touch-zavorin-intro.mp3','musicSourceStart':10,'sound':'Edited Foley from existing game assets; original capture silent','cues':cues,'cameras':['overhead close','oblique wide','oblique close','overhead wide'],'retained':['all boss shots excluded, including 20 seconds','beetle escapes before explosion','UI-battle alternation'],'fullDecode':'passed','mixPeak':float(np.max(np.abs(mix))),'sha256':hashlib.sha256(out.read_bytes()).hexdigest()},indent=2))
print('READY',out,D)
