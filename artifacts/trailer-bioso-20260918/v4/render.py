# -*- coding: utf-8 -*-
from pathlib import Path
import subprocess,json,hashlib
B=Path('artifacts/trailer-bioso-20260918');O=B/'v4';F='temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';REF=Path('/Users/serg/Downloads/BIOSO-trailer-EN-16x9.mp4')
def run(a):
 r=subprocess.run([F,'-y','-v','error',*map(str,a)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
def raw(n):return B/'raw'/f'{n}.mp4'
wide='crop=960:540,scale=1280:720:flags=lanczos'
full='scale=1280:720:flags=lanczos'
edit=[
 ('intro',B/'kling/kling-intro-6s.mp4',0,6,'crop=1580:888:0:140,scale=1280:720:flags=lanczos'),
 ('ui',REF,0,0.5,full),
 ('battle',raw('fast-overhead-dense'),1,1.5,wide),
 ('ui',REF,3.5,1.2,full),
 ('battle',raw('fast-orbit-dense'),0.5,1.3,full),
 ('ui',REF,5.5,1,full),
 ('battle',raw('fast-overhead-dense'),4,1.5,wide),
 ('ui',REF,9.5,1.2,full),
 ('battle',raw('boss-open-map'),1,1.8,full),
 ('ui',REF,11.5,1.3,full),
 ('battle',raw('fast-overhead-dense'),8,1.5,wide),
 ('ui',REF,16,1.2,full),
 ('battle',raw('boss-open-map'),7,1.8,full),
 ('ui',REF,18,1.2,full),
 ('explosion',raw('hero-explosion'),10,3,wide),
 ('ending',B/'kling/kling-ending-first-2s.mp4',0,2,'crop=1776:1000:72:0,scale=1280:720:flags=lanczos'),
]
assert abs(sum(row[3] for row in edit)-28)<1e-6

args=[];filters=[];timeline=[];at=0
for i,(kind,src,start,d,vf) in enumerate(edit):
 args+=['-ss',start,'-t',d,'-i',src]
 filters.append(f'[{i}:v]{vf},fps=30,setsar=1,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.2,trim=end_frame={round(d*30)}[v{i}]')
 timeline.append({'kind':kind,'source':str(src),'sourceStart':start,'start':at,'duration':d,'filter':vf});at+=d
filters.append(''.join(f'[v{i}]' for i in range(len(edit)))+f'concat=n={len(edit)}:v=1:a=0,tpad=stop_mode=clone:stop_duration=1,trim=duration=28,fps=30[out]')
final=O/'BIOSO-trailer-28s.mp4'
run([*args,'-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',final])
run(['-i',final,'-f','null','-'])
run(['-ss',16,'-i',final,'-frames:v',1,O/'poster.jpg'])
run(['-i',final,'-vf',f'fps=1/{at/20},scale=320:180,tile=4x5','-frames:v',1,O/'contact-sheet.jpg'])
for k,src,_,_,_ in edit:
 if k=='battle':assert 'cockpit' not in str(src) and 'boss-leviathan' not in str(src) and 'city-fire' not in str(src)
center=edit[2:14];assert all(a[0]!=b[0] for a,b in zip(center,center[1:]))
proof=json.load(open(B/'raw/boss-open-map.json'));assert not proof['errors'] and not proof['current']['assetErrors']
(O/'manifest.json').write_text(json.dumps({'duration':at,'size':[1280,720],'fps':30,'audio':'silent draft','timeline':timeline,'changes':['6s Kling intro after first-second trim','No cockpit shot','New boss capture on open survival map without mission fences','Battle/UI alternation','2s Kling ending','Kling watermark outside cropped 16:9 composition'],'bossProof':{'route':proof['route'],'errors':proof['errors'],'assetErrors':proof['current']['assetErrors'],'minFps':min(x['fps'] for x in proof['samples'])},'fullDecode':'passed','sha256':hashlib.sha256(final.read_bytes()).hexdigest()},indent=2))
print('READY',round(at,2),final)
