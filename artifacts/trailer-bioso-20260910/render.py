"""Sequential, reproducible 30-second BIOSO trailer edit. Run from project root."""
from pathlib import Path
import subprocess,json,sys,hashlib
import imageio_ffmpeg

ROOT=Path.cwd(); OUT=ROOT/'artifacts/trailer-bioso-20260910'; FF=imageio_ffmpeg.get_ffmpeg_exe()
FONT='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
BLACK='/System/Library/Fonts/Supplemental/Arial Black.ttf'
SHOTS=[
 ('city',2,2,1.18,''),
 ('garden',1,3,1.12,'СОБЕРИ СЕБЯ'),
 ('scrap',1,2.5,1.22,''),
 ('city',4.5,2.5,1.12,'СТАНЬ СИЛЬНЕЕ'),
 ('boss',1.3,4,1.02,'ВЫЗОВ ПРИНЯТ'),
 ('garden',5,3,1.28,''),
 ('scrap',4,2,1.16,''),
 ('city',7,2,1.25,'ВЫЖИВИ'),
 ('boss',6,1,1.08,''),
 ('garden',8,.5,1.3,''),
 ('scrap',7,.5,1.3,''),
 ('city',8,.5,1.3,''),
 ('boss',7,.5,1.05,''),
 ('scrap',6,3,1.2,''),
]

def run(args):
 p=subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*map(str,args)],capture_output=True,text=True)
 if p.returncode: raise RuntimeError(p.stderr)

def title(text,size=48,y=595):
 return f"drawtext=fontfile='{FONT}':text='{text}':fontsize={size}:fontcolor=0xf3efe1:x=(w-tw)/2:y={y}:shadowcolor=black@0.8:shadowx=0:shadowy=3"

parts=[]; timeline=[]; at=0
for i,(name,start,duration,zoom,label) in enumerate(SHOTS):
 target=OUT/f'edit-{i:02d}.mp4';parts.append(target)
 # Reframe recorded footage, preserving source speed and synchronized game audio.
 w=int(1280/zoom)//2*2;h=int(720/zoom)//2*2
 vf=f'fps=30,crop={w}:{h},scale=1280:720:flags=lanczos,setsar=1,eq=contrast=1.035:saturation=1.035'
 if label:vf+=",drawbox=x=0:y=562:w=iw:h=158:color=0x0b1715@0.72:t=fill,"+title(label)
 if i==0:vf+=',fade=t=in:st=0:d=0.10'
 run(['-ss',start,'-i',OUT/'raw'/f'{name}.mp4','-t',duration,'-vf',vf,'-af','aresample=48000,afade=t=in:st=0:d=0.012,apad','-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2',target])
 timeline.append({'source':name,'sourceStart':start,'start':at,'duration':duration,'label':label,'speed':1});at+=duration
 print(f'Encoded {i+1}/{len(SHOTS)+1}: {name}',flush=True)

end=OUT/'edit-14.mp4';parts.append(end)
art=ROOT/'artifacts/store-kit-20260909/key-art/bioso-root-cathedral-swarm-wide-v1.png'
vf="scale=1344:756,crop=1280:720:x='32+6*sin(t)':y=18,drawbox=x=0:y=0:w=iw:h=ih:color=0x081410@0.63:t=fill"
vf+=f",drawtext=fontfile='{BLACK}':text='BIOSO':fontsize=154:fontcolor=0xf4efdc:x=(w-tw)/2:y=225:shadowcolor=black@0.5:shadowy=4"
vf+=',drawbox=x=505:y=417:w=270:h=3:color=0x94c9b4:t=fill,'+title('СОБИРАЙ. ЭВОЛЮЦИОНИРУЙ. ВЫЖИВАЙ.',25,452)
vf+=",drawtext=fontfile='"+FONT+"':text='ВХОДИ В БОЙ':fontsize=20:fontcolor=0xc5d4c9:x=(w-tw)/2:y=553,fade=t=in:st=0:d=0.12,fade=t=out:st=2.65:d=0.35"
run(['-loop','1','-framerate','30','-i',art,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','3','-vf',vf,'-c:v','libx264','-preset','fast','-crf','20','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k',end])
timeline.append({'source':str(art.relative_to(ROOT)),'type':'existing promotional key art end card','start':27,'duration':3})
concat=OUT/'concat.txt';concat.write_text(''.join("file '"+str(p)+"'\n" for p in parts))
final=OUT/'BIOSO-trailer-30s-16x9.mp4'
# Source game audio stays in sync; selected boss music is continuous across every cut.
filters='[0:a]volume=1.5[sfx];[1:a]atrim=duration=30,asetpts=PTS-STARTPTS,volume=0.66,afade=t=in:st=0:d=0.12,afade=t=out:st=28.7:d=1.3[music];[sfx][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.92:level=false:latency=true[a]'
run(['-f','concat','-safe','0','-i',concat,'-ss','12','-i',ROOT/'public/assets/audio/touch-zavorin.mp3','-filter_complex',filters,'-map','0:v','-map','[a]','-t','30','-vf','fps=30','-c:v','libx264','-preset','fast','-crf','19','-threads','2','-c:a','aac','-b:a','256k','-ar','48000','-movflags','+faststart','-metadata','title=BIOSO — Gameplay Trailer','-metadata','comment=Staged in-engine gameplay. Boss music: 105 Касание by Владислав Заворин. Existing game sound effects.',final])
run(['-ss','28','-i',final,'-frames:v','1',OUT/'poster.jpg'])
run(['-i',final,'-vf','fps=1/2.5,scale=384:216,tile=4x3','-frames:v','1',OUT/'contact-sheet.jpg'])
run(['-i',final,'-f','null','-'])
manifest={'file':final.name,'duration':30,'resolution':[1280,720],'fps':30,'reference':'https://www.youtube.com/watch?v=bYb-tJCKLcI','footage':'Fresh staged scenes in current BIOSO engine; granted loadouts, learned abilities, invulnerability, replenished mobs. No production source edits. Native game audio captured synchronously.','music':{'file':'public/assets/audio/touch-zavorin.mp3','role':'Verified boss fight track in src/game-music.js','offset':12,'source':'public/assets/audio/CREDITS.md'},'timeline':timeline,'sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for p in parts:p.unlink()
print('DONE',final,final.stat().st_size,flush=True)
