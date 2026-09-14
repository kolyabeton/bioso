"""Render a chronological lore replay from captures of the real BIOSO game UI."""
from pathlib import Path
import hashlib, json, subprocess

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/lore-film-step-by-step-20260912'
FF=ROOT/'temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
MUSIC=ROOT/'public/assets/audio/technology-sub-clair.mp3'
PICKUP=ROOT/'public/assets/audio/approved-ui-pickup.wav'
PLAN=json.loads((OUT/'step-plan.json').read_text())

def run(args):
 result=subprocess.run([str(FF),'-y','-hide_banner','-loglevel','error',*map(str,args)],capture_output=True,text=True)
 if result.returncode: raise RuntimeError(result.stderr)

parts=[]
for item in PLAN['segments']:
 frames=OUT/'frames'/item['frameDir']
 target=OUT/f"part-{item['index']:02d}.mp4"
 pattern=frames/'frame-%03d.jpg'
 vf=f"tpad=stop_mode=clone:stop_duration={item['duration']:.3f},fps=30,scale=1280:720:flags=lanczos,setsar=1,fade=t=in:st=0:d=0.16"
 duration=item['duration']
 vf+=f",fade=t=out:st={max(0,duration-.18):.3f}:d=0.18"
 if not target.exists():
  run(['-framerate',str(PLAN['fps']),'-i',pattern,'-t',f'{duration:.3f}','-an','-vf',vf,'-c:v','libx264','-preset','fast','-crf','18','-threads','2','-pix_fmt','yuv420p','-r','30',target])
 parts.append(target)

concat=OUT/'concat.txt';concat.write_text(''.join(f"file '{part}'\n" for part in parts))
background=OUT/'background.mp4';run(['-f','concat','-safe','0','-i',concat,'-an','-c:v','copy',background])
inputs=['-i',background,'-stream_loop','-1','-i',MUSIC]
audio_filters=[f"[1:a]atrim=duration={PLAN['totalDuration']:.3f},asetpts=PTS-STARTPTS,volume=.15,afade=t=in:d=0.7,afade=t=out:st={PLAN['totalDuration']-1.2:.3f}:d=1.2[music]"]
labels=['music'];input_index=2
for item in PLAN['segments']:
 if item.get('audio'):
  inputs+=['-i',ROOT/'public'/item['audio']];delay=round((item['start']+.12)*1000);label=f'voice{input_index}'
  if item.get('voice')=='robot': chain='aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=190,lowpass=f=3300,acrusher=bits=12:mix=.16,aecho=.8:.7:55:.12,acompressor=threshold=.12:ratio=2.5:attack=8:release=90,volume=1.12'
  elif item.get('voice')=='gardener': chain='aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=85,lowpass=f=7600,acompressor=threshold=.12:ratio=2:attack=12:release=110,volume=1.04'
  else: chain='aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=90,lowpass=f=9800,acompressor=threshold=.12:ratio=1.8:attack=12:release=120,volume=1.02'
  audio_filters.append(f'[{input_index}:a]{chain},adelay={delay}:all=1[{label}]');labels.append(label);input_index+=1
 elif item['kind']=='evidence':
  inputs+=['-i',PICKUP];delay=round(item['start']*1000);label=f'pickup{input_index}'
  audio_filters.append(f'[{input_index}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=.28,adelay={delay}:all=1[{label}]');labels.append(label);input_index+=1
audio_filters.append(''.join(f'[{label}]' for label in labels)+f'amix=inputs={len(labels)}:duration=first:normalize=0,alimiter=limit=.92:level=false:latency=true[a]')
final=OUT/'BIOSO-lore-dialogue-RU.mp4'
run([*inputs,'-filter_complex',';'.join(audio_filters),'-map','0:v','-map','[a]','-t',f"{PLAN['totalDuration']:.3f}",'-r','30','-c:v','libx264','-preset','fast','-crf','18','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-movflags','+faststart','-metadata','title=BIOSO — Лор по шагам','-metadata','comment=Chronological replay captured from the real in-game story interface.',final])
run(['-ss','12','-i',final,'-frames:v','1',OUT/'poster.jpg'])
run(['-i',final,'-vf',f"fps=1/{PLAN['totalDuration']/12:.6f},scale=240:-2,tile=3x4",'-frames:v','1',OUT/'contact-sheet.jpg'])
run(['-i',final,'-f','null','-'])
manifest={**PLAN,'file':final.name,'resolution':'1280x720 (real wide game viewport with the portrait mission stage)','sha256':hashlib.sha256(final.read_bytes()).hexdigest(),'capture':'Codex in-app browser; real game route, HUD, 3D renderer, story-radio component and chronological mission rooms.'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for part in parts: part.unlink()
background.unlink()
print(f"DONE {PLAN['totalDuration']:.3f}s {final} {final.stat().st_size} bytes")
