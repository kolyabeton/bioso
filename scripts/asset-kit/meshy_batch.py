"""Resumable, bounded Meshy batch. Credentials only in process memory; no POST retry after ambiguous errors."""
import argparse,base64,fcntl,hashlib,json,os,pathlib,re,struct,time,urllib.request,urllib.error
ROOT=pathlib.Path(__file__).resolve().parents[2]; OUT=ROOT/'output/meshy/kit-v1'
MAN=json.loads((OUT/'manifest.json').read_text()); STATE=OUT/'state.json'
API='https://api.meshy.ai'; END={'image':'/openapi/v1/image-to-3d','preview':'/openapi/v2/text-to-3d','refine':'/openapi/v2/text-to-3d'}
def load_key():
 key=os.environ.get('MESHY_API_KEY') or os.environ.get('MESHY_KEY')
 if key:return key
 # User explicitly authorized using their key previously entered through Terminal.
 p=pathlib.Path.home()/'.bash_history'
 keys=list(dict.fromkeys(re.findall(r'msy_[A-Za-z0-9_-]{15,}',p.read_text(errors='ignore')))) if p.exists() else []
 if not keys:raise RuntimeError('No Meshy key available')
 return keys[-1]
KEY=load_key()
def request(path,payload=None):
 req=urllib.request.Request(API+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=90) as r:return json.load(r)
def save():
 tmp=STATE.with_suffix('.tmp');tmp.write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n');tmp.replace(STATE)
def safe_error(e):
 if isinstance(e,urllib.error.HTTPError):
  try:
   raw=e.read().decode(); raw=raw.replace(KEY,'[REDACTED]');raw=re.sub(r'https?://\S+','[URL]',raw)
   return 'HTTP '+str(e.code)+' '+raw[:350]
  except Exception:return 'HTTP '+str(e.code)
 return type(e).__name__
def download(url,path):
 if not url.startswith('https://'):raise ValueError('non-HTTPS asset URL')
 # No API Authorization is sent to asset CDN.
 with urllib.request.urlopen(url,timeout=180) as r:
  tmp=path.with_suffix(path.suffix+'.part')
  with tmp.open('wb') as f:
   while True:
    chunk=r.read(1024*1024)
    if not chunk:break
    f.write(chunk)
  if path.suffix=='.glb':
   with tmp.open('rb') as f:magic,version,length=struct.unpack('<4sII',f.read(12))
   if magic!=b'glTF' or version!=2 or length!=tmp.stat().st_size:raise ValueError('Invalid GLB')
  tmp.replace(path)
def payload(asset,stage,entry):
 common=dict(target_formats=['glb'],enable_pbr=True,texture_resolution='2k')
 if stage=='refine':return dict(mode='refine',preview_task_id=entry['preview']['id'],texture_prompt=asset['texture_prompt'],**common)
 base=dict(model_type='smart-topology',ai_model='meshy-t2',topology='triangle',target_polycount=asset['target_polycount'])
 if stage=='image':
  img=(ROOT/asset['image']).read_bytes()
  return dict(image_url='data:image/png;base64,'+base64.b64encode(img).decode(),should_texture=True,**base,**common)
 return dict(mode='preview',prompt=asset['prompt'],target_formats=['glb'],**base)
def next_stage(asset,entry):
 initial='image' if asset.get('image') else 'preview'
 if initial not in entry:return initial
 if initial=='preview' and entry[initial].get('status')=='SUCCEEDED' and 'refine' not in entry:return 'refine'
 return None
def collect(asset,entry,stage,data):
 if stage=='preview':return
 folder=OUT/'models'/asset['id'];folder.mkdir(parents=True,exist_ok=True)
 file=folder/(asset['id']+'.glb')
 if not file.exists():download(data['model_urls']['glb'],file)
 thumb=data.get('thumbnail_url')
 if thumb and not (folder/'preview.png').exists():download(thumb,folder/'preview.png')
 entry['download']={'file':str(file.relative_to(ROOT)),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
 print('DOWNLOADED',asset['id'],file.stat().st_size,flush=True)
parser=argparse.ArgumentParser();parser.add_argument('--run',action='store_true');args=parser.parse_args()
OUT.mkdir(parents=True,exist_ok=True)
lock=(OUT/'worker.lock').open('w');fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
state=json.loads(STATE.read_text()) if STATE.exists() else {'assets':{},'planned_max_credits':780,'started_at':time.time()}
balance=request('/openapi/v1/balance')['balance'];print('BALANCE',balance,flush=True)
if not args.run:raise SystemExit(0)
state.setdefault('initial_balance',balance);save()
if not state['assets'] and balance<780:raise SystemExit('Insufficient credits for complete batch')
for a in MAN['assets']:state['assets'].setdefault(a['id'],{})
# Interrupted POST intents require manual reconciliation; never replay them.
if any(v.get('status') in ['SUBMITTING','UNKNOWN'] for e in state['assets'].values() for v in e.values() if isinstance(v,dict)):raise SystemExit('Uncertain POST requires reconciliation')
while True:
 for a in MAN['assets']:
  e=state['assets'][a['id']]
  for stage in ('image','preview','refine'):
   t=e.get(stage)
   if not t or not t.get('id') or t.get('status') in ['FAILED','CANCELED']:continue
   if t.get('status')=='SUCCEEDED' and (stage=='preview' or e.get('download')):continue
   try:
    data=request(END[stage]+'/'+t['id']);old=t.get('status');t.update(status=data['status'],progress=data.get('progress',0),consumed_credits=data.get('consumed_credits'))
    if (data.get('task_error') or {}).get('message'):t['error']=data['task_error']['message'].replace(KEY,'[REDACTED]')[:300]
    if old!=t['status']:print(a['id'],stage,t['status'],flush=True)
    if t['status']=='SUCCEEDED':collect(a,e,stage,data)
    save()
   except Exception as ex:print('POLL/DOWNLOAD',a['id'],safe_error(ex),flush=True)
 active=sum(t.get('status') in ['PENDING','IN_PROGRESS','SUBMITTING'] for e in state['assets'].values() for t in e.values() if isinstance(t,dict))
 for a in MAN['assets']:
  if active>=52:break
  e=state['assets'][a['id']];stage=next_stage(a,e)
  if stage is None:continue
  # Save intent before transmission. A crash or ambiguous error cannot cause duplicate spending.
  body=payload(a,stage,e);e[stage]={'status':'SUBMITTING','submitted_at':time.time()};save()
  try:
   result=request(END[stage],body);tid=result.get('result')
   if not isinstance(tid,str) or not tid:raise ValueError('Missing task ID')
   e[stage].update(id=tid,status='PENDING');save();active+=1
   print('SUBMITTED',a['id'],stage,tid,flush=True)
  except urllib.error.HTTPError as ex:
   err=safe_error(ex)
   if ex.code==429:
    del e[stage];save();print('QUEUE_FULL',flush=True);break
   if 400<=ex.code<500:e[stage].update(status='REJECTED',error=err)
   else:e[stage].update(status='UNKNOWN',error=err)
   save();raise SystemExit(err)
  except Exception as ex:
   e[stage].update(status='UNKNOWN',error=safe_error(ex));save();raise SystemExit('Ambiguous POST; stopped without retry')
  time.sleep(.2)
 completed=sum(bool(e.get('download')) for e in state['assets'].values())
 failed=sum(any(t.get('status') in ['FAILED','CANCELED','REJECTED'] for t in e.values() if isinstance(t,dict)) for e in state['assets'].values())
 print('PROGRESS',completed,'/52; active',active,'failed',failed,flush=True)
 if completed+failed==52:
  state['finished_at']=time.time();state['final_balance']=request('/openapi/v1/balance')['balance'];save();break
 time.sleep(15)
print('FINISHED',completed,'models;',failed,'failed;',state.get('final_balance'),'credits remaining',flush=True)
