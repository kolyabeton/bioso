# -*- coding: utf-8 -*-
from pathlib import Path
import subprocess,json,math,zipfile
B=Path('artifacts/trailer-bioso-20260918');O=B/'v2';F='temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1';REF=Path('/Users/serg/Downloads/BIOSO-trailer-EN-16x9.mp4')
def run(a):
 r=subprocess.run([F,'-y','-v','error',*map(str,a)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
def montage(edit,out):
 args=[];filters=[]
 for i,(src,start,duration,zoom) in enumerate(edit):
  args+=['-ss',start,'-t',duration,'-i',src];vf='crop=960:540,scale=1280:720:flags=lanczos,' if zoom else 'scale=1280:720,'
  filters.append(f'[{i}:v]{vf}fps=30,setsar=1,setpts=PTS-STARTPTS[v{i}]')
 filters.append(''.join(f'[v{i}]' for i in range(len(edit)))+f'concat=n={len(edit)}:v=1:a=0[out]')
 run([*args,'-filter_complex',';'.join(filters),'-map','[out]','-an','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out]);run(['-i',out,'-f','null','-'])
checks=[]
for n in ['fast-overhead-dense','fast-orbit-dense','fast-cockpit','boss-leviathan','hero-explosion']:
 start=6 if n=='hero-explosion' else 1
 run(['-ss',start,'-i',B/'raw'/f'{n}.mp4','-t',10,'-an','-vf','fps=30,setsar=1','-c:v','libx264','-preset','fast','-crf',18,'-pix_fmt','yuv420p','-movflags','+faststart',O/'clips'/f'{n}.mp4']);run(['-i',O/'clips'/f'{n}.mp4','-f','null','-'])
 proof=json.load(open(B/'raw'/f'{n}.json'));p=[x['player'] for x in proof['samples']]
 checks.append({'clip':n,'errors':proof['errors'],'assetErrors':proof['current']['assetErrors'],'minFps':min(x['fps'] for x in proof['samples']),'travelMeters':round(sum(math.hypot(b['x']-a['x'],b['z']-a['z']) for a,b in zip(p,p[1:])),1),'speed':proof['current']['stats']['speed'],'learned':proof['current']['learned'],'route':proof['route'],'decode':'passed'})
raw=lambda n:B/'raw'/f'{n}.mp4'
combat=[(raw('fast-overhead-dense'),1,4,True),(raw('fast-orbit-dense'),.5,3,False),(raw('fast-cockpit'),0,1.5,False),(raw('boss-leviathan'),4,4,True),(raw('hero-explosion'),8,7,True)]
montage(combat,O/'BIOSO-fast-combat-preview.mp4')
edit=[(REF,0,1.5,False),(raw('fast-overhead-dense'),1,3,True),(REF,3.5,3.5,False),(raw('fast-orbit-dense'),.5,2.5,False),(REF,9.5,4,False),(raw('fast-overhead-dense'),8,2.5,True),(REF,16,3.733333,False),(raw('fast-cockpit'),0,1.5,False),(raw('boss-leviathan'),4,3.5,True),(raw('hero-explosion'),8,7,True)]
montage(edit,O/'BIOSO-trailer-multicam-draft.mp4')
run(['-ss',5,'-i',O/'BIOSO-fast-combat-preview.mp4','-frames:v',1,O/'poster.jpg'])
run(['-i',O/'BIOSO-trailer-multicam-draft.mp4','-vf','fps=1/2.5,scale=320:180,tile=4x4','-frames:v',1,O/'contact-sheet.jpg'])
(O/'verification.json').write_text(json.dumps(checks,indent=2))
(O/'README.md').write_text('''# BIOSO — быстрый бой и разные камеры\n\nBIOSO-trailer-multicam-draft.mp4 — черновик около 33 секунд: интерфейс из предоставленного ролика, новые быстрые бои, боковой облёт, короткая вставка из кабины, Левиафан и финальный взрыв. Без звука, вступление и финальный жучок Runway ещё не добавлены.\n\nBIOSO-fast-combat-preview.mp4 — только игровые кадры, 19,5 секунды.\n\nКлип city-fire исключён по замечанию пользователя. В новых записях нет веток fire/cold и эффекта горения. Вспышки оружия и взрывы дронов — действующие эффекты игры.\n\nБыстрый бег записан на существующих Универсалах V с пятью улучшениями скорости и тремя уровнями Лёгкого шага. Скорость 15,12 м/с; без ускорения воспроизведения или телепортации. Неуязвимость и пополнение толп применены для постановки. Все камеры работают только в локальном сервере записи через преобразование исходника в памяти. Основная игра и отдельный старый тест кабины не изменены. Кабина и облёт — постановочные ракурсы, не доступные игровые режимы.\n\nКадры интерфейса из /Users/serg/Downloads/BIOSO-trailer-EN-16x9.mp4, совпадающего с предыдущим v3 по SHA-256. Все видео полностью декодированы; JS/ресурсные ошибки и фактическое движение — verification.json.\n''')
files=[*sorted((O/'clips').glob('*.mp4')),O/'BIOSO-fast-combat-preview.mp4',O/'BIOSO-trailer-multicam-draft.mp4',O/'README.md',O/'verification.json']
with zipfile.ZipFile(O/'BIOSO-footage-v2.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,p.relative_to(O))
with zipfile.ZipFile(O/'BIOSO-footage-v2.zip') as z:assert z.testzip() is None
print(json.dumps(checks,indent=2));print('DRAFT READY')
