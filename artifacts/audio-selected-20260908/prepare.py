"""Rebuild the six approved WAV effects from decoded original WAV files."""
import pathlib, wave, json, hashlib
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=pathlib.Path(__file__).resolve().parent
items=[
 ('shield','hammer','Sword Slash With Metal Shield Impact','DavidDumaisAudio',185433,'sword-slash-with-metal-shield-impact',.20,1.25,.12),
 ('claws','claws','Sword Blade Slicing Flesh','Universfield',352708,'sword-blade-slicing-flesh',.12,.72,.12),
 ('drill','drill','Drill spinning in open air','neuroxik (Freesound)',33575,'drill-spinning-in-open-air',1.65,2.25,.10),
 ('harpoon','harpoon','Crossbow Firing','GameWithBepis (Freesound)',95020,'crossbow-firing',0,.70,.12),
 ('electric','arc','Electric Sparks','kev_durr (Freesound)',6130,'electric-sparks',.10,.42,.07),
 ('rocket','rocket','HQ Explosion','Quaker540 (Freesound)',6288,'hq-explosion',0,2.80,.12),
]
manifest=[]
for name,key,title,author,id,slug,start,end,rms in items:
 source=BASE/'originals'/f'{name}.wav'
 with wave.open(str(source)) as w:
  rate=w.getframerate();channels=w.getnchannels();data=np.frombuffer(w.readframes(w.getnframes()),'<i2').reshape(-1,channels).astype(np.float64)/32768
 x=data[round(start*rate):round(end*rate)].mean(axis=1);x-=x.mean()
 # Keep original sample rates; mono SFX with short click-free edges.
 for duration,reverse in [(.003,False),(.035 if name=='electric' else .018,True)]:
  n=round(duration*rate);ramp=np.linspace(0,1,n)
  if reverse:x[-n:]*=ramp[::-1]
  else:x[:n]*=ramp
 gain=min(rms/np.sqrt(np.mean(x*x)),.85/max(abs(x)))
 x*=gain
 out=ROOT/'public/assets/audio'/f'approved-{name}.wav'
 with wave.open(str(out),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.round(x*32767).astype('<i2').tobytes())
 manifest.append(dict(key=key,file=out.name,title=title,author=author,source=f'https://pixabay.com/sound-effects/film-special-effects-{slug}-{id}/',license='Pixabay Content License',licenseUrl='https://pixabay.com/service/license-summary/',approved='2026-09-08',sourceStart=start,sourceEnd=end,duration=len(x)/rate,sampleRate=rate,gain=gain,peak=float(max(abs(x))),sha256=hashlib.sha256(out.read_bytes()).hexdigest(),originalSha256=hashlib.sha256((BASE/'originals'/f'{name}.mp3').read_bytes()).hexdigest()))
(ROOT/'public/assets/audio/effect-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print([(m['file'],m['duration'],round(m['peak'],3)) for m in manifest])
