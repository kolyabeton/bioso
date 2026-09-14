"""Rebuild approved UI samples; closing is an exact reversal of the prepared opening."""
import pathlib,wave,json,hashlib
import numpy as np
BASE=pathlib.Path(__file__).resolve().parent;ROOT=BASE.parents[1];OUT=ROOT/'public/assets/audio'
items=[
 ('click','Cassette Recorder Stop Button – Mechanical Click Sound','arunangshubanerjee',359987,'cassette-recorder-stop-button-mechanical-click-sound',.08,.26,'2025/06/14/audio_c4db741135.mp3'),
 ('open','UI Movement - Menu - Modern Interface - Window Open Small','RescopicSound',230486,'ui-movement-menu-modern-interface-window-open-small',.04,1.40,'2024/08/07/audio_ee9967f2e6.mp3'),
 ('confirm','UI Alert - Menu - Modern Interface - Confirm Small','RescopicSound',230482,'ui-alert-menu-modern-interface-confirm-small',.08,1.0,'2024/08/07/audio_6139a54d6e.mp3'),
 ('deny','UI Alert - Menu - Modern Interface - Deny Large','RescopicSound',230478,'ui-alert-menu-modern-interface-deny-large',0,.76,'2024/08/07/audio_99ca91dcaa.mp3'),
 ('organic','Wet Squelch Impact','Universfield',352302,'wet-squelch-impact',.07,.97,'2025/05/31/audio_824641adcd.mp3'),
 ('mechanical','Metal Latch Latching 2','deleted_user_7146007 (Freesound)',101976,'metal-latch-latching-2',1.29,1.99,'2022/03/24/audio_3f2e7c5c4c.mp3'),
 ('pickup','Item Pickup','UGILA (Freesound)',37089,'item-pickup',0,.40,'2022/03/10/audio_14c68034ff.mp3'),
]
def save(name,x,rate):
 p=OUT/f'approved-ui-{name}.wav'
 with wave.open(str(p),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(x.astype('<i2').tobytes())
 return p,hashlib.sha256(p.read_bytes()).hexdigest()
manifest=[]
for name,title,author,id,slug,start,end,cdn in items:
 with wave.open(str(BASE/'originals'/f'{name}.wav')) as w:
  rate=w.getframerate();data=np.frombuffer(w.readframes(w.getnframes()),'<i2').reshape(-1,w.getnchannels()).mean(axis=1)/32768
 x=data[round(start*rate):round(end*rate)];x=x-x.mean()
 for count,reverse in [(round(.003*rate),False),(round(.022*rate),True)]:
  ramp=np.linspace(0,1,count)
  if reverse:x[-count:]*=ramp[::-1]
  else:x[:count]*=ramp
 gain=min(.08/np.sqrt(np.mean(x*x)),.8/max(abs(x)));x=np.round(x*gain*32767).astype('<i2')
 if name=='open':rate*=2
 p,sha=save(name,x,rate)
 row=dict(key=name,file=p.name,title=title,author=author,source=f'https://pixabay.com/sound-effects/film-special-effects-{slug}-{id}/',download='https://cdn.pixabay.com/audio/'+cdn,license='Pixabay Content License',licenseUrl='https://pixabay.com/service/license-summary/',approved='2026-09-08',sourceStart=start,sourceEnd=end,duration=len(x)/rate,sampleRate=rate,gain=gain,sha256=sha,originalSha256=hashlib.sha256((BASE/'originals'/f'{name}.mp3').read_bytes()).hexdigest())
 if name=='open':row['playbackSpeed']=2
 manifest.append(row)
 if name=='open':
  p,sha=save('close',x[::-1],rate);manifest.append(dict(row,key='close',file=p.name,sha256=sha,processing='Exact sample reversal of approved-ui-open.wav'))
(OUT/'ui-effect-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print([(m['key'],m['duration']) for m in manifest])
