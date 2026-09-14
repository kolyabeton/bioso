"""English BIOSO trailer: real design system, logo and varied game scenes."""
from pathlib import Path
import subprocess,json,hashlib
import imageio_ffmpeg
ROOT=Path.cwd();BASE=ROOT/'artifacts/trailer-bioso-20260910';OUT=BASE/'v3';FF=imageio_ffmpeg.get_ffmpeg_exe()
# kind, source, source in-point, duration. UI cuts show actual before/after actions.
EDIT=[
 ('ui','desktop-home-a',0,1.5),('video','garden',1,2),
 ('ui','inventory-a',0,2),('ui','inventory-c',0,1.5),
 ('video','scrap',1,2.5),('ui','level-a',0,2),
 ('ui','skills-b',0,2),('video','city',3,2.5),
 ('ui','map-b',0,2),('ui','home-b',0,1.75),
 ('video','boss',5.5,2.5),
]
assert len({name for _,name,_,_ in EDIT})==len(EDIT), 'Repeated source'

def run(args):
 r=subprocess.run([FF,'-y','-hide_banner','-loglevel','error',*map(str,args)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)

parts=[];timeline=[];at=0;ui_sounds=[]
for i,(kind,name,start,duration) in enumerate(EDIT):
 # Round shot lengths to whole video frames and audio samples.
 duration=round(duration*30)/30
 out=OUT/f'part-{i:02d}.mp4';parts.append(out)
 source=BASE/'raw'/(name+('.mp4' if kind=='video' else '.png'))
 if kind=='video':
  inputs=['-ss',start,'-i',source];vf='fps=30,crop=1164:654,scale=1280:720:flags=lanczos,setsar=1';af='aresample=48000,afade=t=in:d=0.01,apad'
 else:
  inputs=['-loop','1','-framerate','30','-i',source,'-f','lavfi','-i','anullsrc=r=48000:cl=stereo'];vf='scale=1280:720,setsar=1';af='anull'
  if i not in (0,len(EDIT)-1):ui_sounds.append({'at':at,'file':'approved-ui-confirm.wav' if name=='inventory-c' else 'approved-ui-click.wav' if name in ('skills-b','map-b','inventory-b') else 'approved-ui-open.wav'})
 if i==0:vf+=',fade=t=in:st=0:d=0.12'
 if i==len(EDIT)-1:vf+=f',fade=t=out:st={duration-.12}:d=0.12'
 run([*inputs,'-t',duration,'-vf',vf,'-af',af,'-c:v','libx264','-preset','fast','-crf','18','-threads','2','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','192k','-ac','2','-ar','48000',out])
 timeline.append({'type':kind,'source':str(source.relative_to(ROOT)),'sourceStart':start,'start':at,'duration':duration});at+=duration
 print(f'{i+1}/{len(EDIT)} {kind} {name}',flush=True)

listing=OUT/'concat.txt';listing.write_text(''.join("file '"+str(p)+"'\nduration "+str(t['duration'])+"\n" for p,t in zip(parts,timeline)))
inputs=['-f','concat','-safe','0','-i',listing,'-ss','12','-i',ROOT/'public/assets/audio/touch-zavorin.mp3']
filters=[f'[0:a]volume=1.5[sfx]',f'[1:a]atrim=duration={at},asetpts=PTS-STARTPTS,volume=0.66,afade=t=in:d=0.12,afade=t=out:st={at-.3}:d=0.3[music]'];labels=['sfx','music']
for i,cue in enumerate(ui_sounds,2):
 inputs+=['-i',ROOT/'public/assets/audio'/cue['file']];label='u'+str(i);labels.append(label)
 filters.append(f'[{i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.4,adelay={round(cue["at"]*1000)}:all=1[{label}]')
filters.append(''.join('['+s+']' for s in labels)+f'amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=.92:level=false:latency=true[a]')
final=OUT/'BIOSO-trailer-EN-16x9.mp4'
run([*inputs,'-filter_complex',';'.join(filters),'-map','0:v','-map','[a]','-t',at,'-vf','fps=30,scale=out_range=tv:out_color_matrix=bt709,format=yuv420p','-fps_mode','cfr','-r','30','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-c:a','aac','-b:a','256k','-ar','48000','-movflags','+faststart','-metadata','title=BIOSO — Build. Evolve. Survive.','-metadata','comment=English game UI and original bioso wordmark. Boss music and game sound effects. Staged footage and native UI captures.',final])
run(['-ss',.7,'-i',final,'-frames:v','1',OUT/'poster.jpg'])
run(['-i',final,'-vf',f'fps=1/{at/12},scale=384:216,tile=4x3','-frames:v','1',OUT/'contact-sheet.jpg'])
run(['-i',final,'-f','null','-'])
manifest={'file':final.name,'duration':at,'fps':30,'dimensions':[1280,720],'language':'English','logo':'public/assets/ui/bioso-wordmark-v1.png, captured in current desktop home menu','desktopBackground':'public/assets/ui/menu-art-desktop-v1.png; verified computed style on 1280x720 live route','revision':'No repeated source shots. Removed recap sequence, duplicate map/tree states and closing menu. Short ending on boss footage.','designSystem':'Unmodified shipped UI: src/ui/tokens.css, components.css, ceramic-theme.css, Onest font. Native screenshots preserve the original dialog sizes and layout. No custom captions.','music':'public/assets/audio/touch-zavorin.mp3, boss battle track verified in src/game-music.js','uiAudio':ui_sounds,'timeline':timeline,'method':'Staged in-engine combat footage with synced source audio, intercut with native screenshots of actual UI interactions. Granted equipment, skills, invulnerability and explored map. UI upgrade actually executed: damage 6.3 to 7.1, biomass 1200 to 1188.','sha256':hashlib.sha256(final.read_bytes()).hexdigest()}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for p in parts:p.unlink()
print('DONE',at,final,flush=True)
