"""Build the Russian BIOSO lore film from current gameplay footage and story assets."""
from pathlib import Path
import subprocess, json, hashlib, textwrap

ROOT = Path.cwd()
OUT = ROOT / 'artifacts/lore-film-20260912'
FF = ROOT / 'temp/trailer-tools/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1'
MUSIC = ROOT / 'public/assets/audio/technology-sub-clair.mp3'
PICKUP = ROOT / 'public/assets/audio/approved-ui-pickup.wav'

SOURCES = {
    'intro': ROOT / 'docs/proof/forest-living-20260909/light-built-wide.mp4',
    'garden': ROOT / 'artifacts/trailer-bioso-20260910/raw/garden.mp4',
    'quarantine': ROOT / 'artifacts/trailer-bioso-20260910/raw/scrap.mp4',
    'core': ROOT / 'docs/proof/forest-living-20260909/volume-built-wide.mp4',
    'nursery': ROOT / 'artifacts/trailer-bioso-20260910/raw/city.mp4',
    'mother': ROOT / 'artifacts/trailer-bioso-20260910/raw/boss.mp4',
    'survival': ROOT / 'docs/proof/forest-living-20260909/final-wide.mp4',
}
MISSION_LABELS = {
    'garden': 'МИССИЯ I · СЛЕД ЛОВЧЕГО',
    'quarantine': 'МИССИЯ II · СЕРДЦЕ СВАЛКИ',
    'core': 'МИССИЯ III · КОРНЕВОЙ СОБОР',
    'nursery': 'МИССИЯ IV · ЗЕРКАЛЬНЫЙ СБОР',
    'mother': 'МИССИЯ V · ПАСТЫРЬ РОЯ',
    'survival': 'ФИНАЛ · ГЛАВНАЯ СЕТЬ',
}
EVIDENCE_AFTER = {
    'garden': 'garden-launch-key',
    'quarantine': 'quarantine-cargo-tag',
    'core': 'core-charred-nest',
    'nursery': 'nursery-takeover-key',
    'mother': 'mother-service-report',
}
SOURCE_DURATION = {
    'intro': 32.977,
    'garden': 10.320,
    'quarantine': 10.259,
    'core': 32.994,
    'nursery': 10.326,
    'mother': 10.330,
    'survival': 33.010,
}

def run(args, *, capture=False):
    result = subprocess.run([str(FF), '-y', '-hide_banner', '-loglevel', 'error', *map(str, args)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout if capture else None

def duration(path):
    raw = subprocess.check_output(['mdls', '-raw', '-name', 'kMDItemDurationSeconds', str(path)]).decode().replace('\x00', '').strip()
    return float(raw)

def project_story():
    js = """
import {STORY_CUES} from './src/story-cues.js';
import {STORY_EVIDENCE} from './src/story-evidence.js';
console.log(JSON.stringify({
 cues: STORY_CUES.map(({id,mission,speaker,text,audio,voice})=>({id,mission,speaker,text,audio,voice})),
 evidence: STORY_EVIDENCE.map(({id,mission,title,text,thought})=>({id,mission,title,text,thought}))
}));
"""
    return json.loads(subprocess.check_output(['node', '--input-type=module', '-e', js], cwd=ROOT))

def ass_time(seconds):
    centis = round(seconds * 100)
    return f'{centis // 360000}:{(centis // 6000) % 60:02d}:{(centis // 100) % 60:02d}.{centis % 100:02d}'

def ass_escape(value):
    return value.replace('\\', r'\\').replace('{', r'\{').replace('}', r'\}')

def wrap(value, width):
    return r'\N'.join(ass_escape(line) for line in textwrap.wrap(value, width=width, break_long_words=False, break_on_hyphens=False))

story = project_story()
evidence = {item['id']: item for item in story['evidence']}
timeline = []
voice_tracks = []
at = 0.0

def append(kind, mission, seconds, speaker, text, *, voice=None, audio=None, label=None):
    global at
    entry = {'kind': kind, 'mission': mission, 'start': at, 'duration': seconds, 'speaker': speaker, 'text': text, 'label': label or kind.upper()}
    timeline.append(entry)
    if audio:
        voice_tracks.append({'start': at + .10, 'audio': ROOT / 'public' / audio, 'voice': voice, 'id': Path(audio).stem})
    at += seconds

append('intro', 'intro', 4.0, 'BIOSO · ЛОР БЕЗ ПРОХОЖДЕНИЯ', 'Люди просят открыть шлюзы. Машины уверены: это снова уничтожит Землю.', label='АРХИВ')
last_mission = None
for cue in story['cues']:
    if last_mission and cue['mission'] != last_mission and last_mission in EVIDENCE_AFTER:
        item = evidence[EVIDENCE_AFTER[last_mission]]
        body = item['text'] + (f"  [Садовник] {item['thought']}" if item['thought'] else '')
        append('evidence', last_mission, 4.6, f"УЛИКА · {item['title']}", body, label='АРХИВ')
    audio_path = ROOT / 'public' / cue['audio']
    append('dialogue', cue['mission'], duration(audio_path) + .35, cue['speaker'], cue['text'], voice=cue['voice'], audio=cue['audio'], label='РАДИО')
    last_mission = cue['mission']
if last_mission in EVIDENCE_AFTER:
    item = evidence[EVIDENCE_AFTER[last_mission]]
    body = item['text'] + (f"  [Садовник] {item['thought']}" if item['thought'] else '')
    append('evidence', last_mission, 4.6, f"УЛИКА · {item['title']}", body, label='АРХИВ')
append('final', 'survival', 6.0, 'РЕШЕНИЕ ОСТАЁТСЯ ЗА САДОВНИКОМ', 'Машины правы в диагнозе — и страшны в приговоре. Люди имеют право жить — но не доказали, что не повторят войну.', label='ДУША')
TOTAL = at

OUT.mkdir(parents=True, exist_ok=True)
parts = []
cursors = {key: 0.0 for key in SOURCES}
for index, entry in enumerate(timeline):
    source_key = entry['mission'] if entry['mission'] in SOURCES else 'intro'
    source = SOURCES[source_key]
    source_duration = SOURCE_DURATION[source_key]
    clip_duration = round(entry['duration'] * 30) / 30
    max_start = max(.1, source_duration - min(clip_duration, source_duration) - .1)
    start = cursors[source_key] % max_start
    cursors[source_key] += clip_duration * .71 + .9
    target = OUT / f'part-{index:02d}.mp4'
    vf = 'fps=30,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1,eq=contrast=1.025:saturation=.94:brightness=-.015'
    if index == 0:
        vf += ',fade=t=in:st=0:d=0.35'
    if index == len(timeline) - 1:
        vf += f',fade=t=out:st={max(0, clip_duration-.8)}:d=0.8'
    run(['-stream_loop', '-1', '-ss', f'{start:.3f}', '-i', source, '-t', f'{clip_duration:.3f}', '-an', '-vf', vf,
         '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-threads', '2', '-pix_fmt', 'yuv420p', '-r', '30', target])
    parts.append(target)
    entry['source'] = str(source.relative_to(ROOT))
    entry['sourceStart'] = round(start, 3)
    print(f'{index + 1}/{len(timeline)} {entry["kind"]} {entry["mission"]}', flush=True)

concat = OUT / 'concat.txt'
concat.write_text(''.join(f"file '{part}'\n" for part in parts))
background = OUT / 'background.mp4'
run(['-f', 'concat', '-safe', '0', '-i', concat, '-an', '-c:v', 'copy', background])

ass = OUT / 'lore.ass'
header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Label,Arial,16,&H00B6D9C8,&H00B6D9C8,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,0,0,5,0,0,0,1
Style: Speaker,Arial,23,&H0079B89D,&H0079B89D,&H00000000,&H00000000,1,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: Body,Arial,29,&H00ECEDE7,&H00ECEDE7,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Evidence,Arial,24,&H00E9E6DA,&H00E9E6DA,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
events = []
for entry in timeline:
    start, end = ass_time(entry['start']), ass_time(entry['start'] + entry['duration'] - .04)
    mission = MISSION_LABELS.get(entry['mission'], '')
    mission_lines = mission.split(' · ', 1) if mission else []
    label_parts = [entry['label'], *mission_lines]
    label = r'\N'.join(ass_escape(part) for part in label_parts)
    events.append(f"Dialogue: 0,{start},{end},Label,,0,0,0,,{{\\pos(112,611)}}{label}")
    events.append(f"Dialogue: 0,{start},{end},Speaker,,0,0,0,,{{\\pos(254,538)}}{ass_escape(entry['speaker']).upper()}")
    style = 'Evidence' if entry['kind'] in ('evidence', 'intro', 'final') else 'Body'
    width = 75 if style == 'Evidence' else 59
    events.append(f"Dialogue: 0,{start},{end},{style},,0,0,0,,{{\\pos(254,578)}}{wrap(entry['text'], width)}")
ass.write_text(header + '\n'.join(events) + '\n')

inputs = ['-i', background, '-stream_loop', '-1', '-i', MUSIC]
audio_filters = [f'[1:a]atrim=duration={TOTAL:.3f},asetpts=PTS-STARTPTS,volume=.17,afade=t=in:d=0.7,afade=t=out:st={TOTAL-1.2:.3f}:d=1.2[music]']
mix_labels = ['music']
for input_index, track in enumerate(voice_tracks, start=2):
    inputs += ['-i', track['audio']]
    delay = round(track['start'] * 1000)
    if track['voice'] == 'robot':
        chain = 'aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=190,lowpass=f=3300,acrusher=bits=12:mix=.16,aecho=.8:.7:55:.12,acompressor=threshold=.12:ratio=2.5:attack=8:release=90,volume=1.12'
    else:
        chain = 'aformat=sample_rates=48000:channel_layouts=stereo,highpass=f=110,acompressor=threshold=.12:ratio=2:attack=8:release=80,volume=1.05'
    label = f'voice{input_index}'
    audio_filters.append(f'[{input_index}:a]{chain},adelay={delay}:all=1[{label}]')
    mix_labels.append(label)
pickup_start_index = 2 + len(voice_tracks)
for offset, entry in enumerate([item for item in timeline if item['kind'] == 'evidence']):
    input_index = pickup_start_index + offset
    inputs += ['-i', PICKUP]
    label = f'pickup{input_index}'
    audio_filters.append(f'[{input_index}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=.32,adelay={round(entry["start"]*1000)}:all=1[{label}]')
    mix_labels.append(label)
audio_filters.append(''.join(f'[{label}]' for label in mix_labels) + f'amix=inputs={len(mix_labels)}:duration=first:normalize=0,alimiter=limit=.92:level=false:latency=true[a]')

video_filter = (
    "[0:v]drawbox=x=0:y=516:w=iw:h=204:color=0x071311@0.90:t=fill,"
    "drawbox=x=0:y=516:w=iw:h=3:color=0xb69a58@0.95:t=fill,"
    "drawbox=x=225:y=536:w=1:h=156:color=0x8aa897@0.42:t=fill,"
    f"ass='{ass.relative_to(ROOT)}'[v]"
)
final = OUT / 'BIOSO-lore-film-RU-16x9.mp4'
run([*inputs, '-filter_complex', video_filter + ';' + ';'.join(audio_filters), '-map', '[v]', '-map', '[a]', '-t', f'{TOTAL:.3f}',
     '-fps_mode', 'cfr', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-threads', '2', '-pix_fmt', 'yuv420p',
     '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
     '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart',
     '-metadata', 'title=BIOSO — Лор без прохождения',
     '-metadata', 'comment=Current in-game story voices, evidence and gameplay footage. No external narration.', final])
run(['-ss', '10', '-i', final, '-frames:v', '1', OUT / 'poster.jpg'])
run(['-i', final, '-vf', f'fps=1/{TOTAL/12:.6f},scale=384:216,tile=4x3', '-frames:v', '1', OUT / 'contact-sheet.jpg'])
run(['-i', final, '-f', 'null', '-'])

manifest = {
    'file': final.name,
    'duration': round(TOTAL, 3),
    'resolution': [1280, 720],
    'fps': 30,
    'language': 'Russian',
    'storySource': ['src/story-cues.js', 'src/story-evidence.js'],
    'voices': 'Current child and Keeper story assets; Keeper clips receive the same radio-like band limit, distortion and echo treatment in the film mix.',
    'music': 'public/assets/audio/technology-sub-clair.mp3 at dialogue-safe level',
    'footage': sorted({entry['source'] for entry in timeline}),
    'timeline': timeline,
    'sha256': hashlib.sha256(final.read_bytes()).hexdigest(),
}
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
for part in parts:
    part.unlink()
background.unlink()
print(f'DONE {TOTAL:.3f}s {final} {final.stat().st_size} bytes', flush=True)
