# -*- coding: utf-8 -*-
import subprocess,json,hashlib
from pathlib import Path
B=Path('artifacts/trailer-bioso-20260918');O=B/'v5';F='temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
def run(args):
 r=subprocess.run([F,'-y','-v','error',*map(str,args)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
ed=json.load(open(B/'v4/manifest.json'))['timeline']
ed[8]['source']=str(B/'raw/fast-orbit-dense.mp4');ed[8]['sourceStart']=8;ed[8]['filter']='scale=1280:720:flags=lanczos'
parts=[]
for i,shot in enumerate(ed):
 p=O/'parts'/f'{i:02d}.mp4';parts.append(p)
 vf=shot['filter']+',fps=30,setpts=PTS-STARTPTS,setsar=1,tpad=stop_mode=clone:stop_duration=1'
 if p.exists():continue
 run(['-ss',shot['sourceStart'],'-i',shot['source'],'-an','-vf',vf,'-frames:v',round(shot['duration']*30),'-r',30,'-fps_mode','cfr','-c:v','libx264','-preset','fast','-crf',18,'-pix_fmt','yuv420p',p])
 print(i,flush=True)
ending=O/'parts/ending-transition.mp4'
run(['-i',parts[-2],'-i',parts[-1],'-filter_complex','[0:v]setpts=PTS-STARTPTS,fps=30[a];[1:v]setpts=PTS-STARTPTS,fps=30[b];[a][b]xfade=transition=fade:duration=0.3:offset=2.7,format=yuv420p[v]','-map','[v]','-an','-r',30,'-fps_mode','cfr','-c:v','libx264','-preset','fast','-crf',18,ending])
listing=O/'concat.txt';listing.write_text(''.join("file '"+str(p.resolve())+"'\n" for p in [*parts[:-2],ending]))
final=O/'BIOSO-trailer-v5.mp4';run(['-f','concat','-safe',0,'-i',listing,'-c','copy','-movflags','+faststart',final]);run(['-i',final,'-f','null','-'])
run(['-ss',13.8,'-i',final,'-t',2.5,'-vf','fps=4,scale=320:180,tile=5x2','-frames:v',1,O/'replacement-review.jpg'])
run(['-ss',25,'-i',final,'-vf','fps=4,scale=320:180,tile=4x3','-frames:v',1,O/'transition-review.jpg'])
(O/'manifest.json').write_text(json.dumps({'timeline':ed,'changes':['First boss shot replaced by fast side-camera movement','Crossfade from explosion to running beetle: 0.3s'],'audio':'silent draft','fullDecode':'passed','sha256':hashlib.sha256(final.read_bytes()).hexdigest()},indent=2))
print('READY',final)
