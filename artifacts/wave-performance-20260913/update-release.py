import json,plistlib,pathlib,shutil,subprocess,hashlib,re,time,urllib.request,os
root=pathlib.Path('/Users/serg/Documents/ChatGPT/Biomecha')
proof=root/'artifacts/wave-performance-20260913'
log=(proof/'export.log').read_text();export=json.loads(log[log.rfind('\n{\n  "archive"')+1:])
stamp=pathlib.Path(export['outDir']).parent.name.removeprefix('bioso-')+'-unlocked'
base=pathlib.Path('/Users/serg/Library/Application Support/bioso-play')
previous=pathlib.Path('/Users/serg/Library/LaunchAgents/local.bioso.frozen.20260913T133351Z-unlocked.plist')
config=plistlib.loads(previous.read_bytes());old_label=config['Label'];old_dir=config['WorkingDirectory']
subprocess.run(['launchctl','print',f'gui/{os.getuid()}/{old_label}'],stdout=subprocess.DEVNULL,check=True)
release=base/'releases'/stamp;assert not release.exists()
shutil.copytree(export['outDir'],release)
index=(release/'index.html').read_text();bundle=re.search(r'<script[^>]+src="([^"]+\.js)"',index).group(1)
bundle_bytes=(release/bundle.removeprefix('./')).read_bytes();sha=hashlib.sha256(bundle_bytes).hexdigest()
assert b'bioso.unlocked.v1' in b''.join(f.read_bytes() for f in (release/'assets').glob('*.js'))
assert (root/'src/obstacle-index.js').is_file()
label='local.bioso.frozen.'+stamp
service=previous.parent/(label+'.plist');assert not service.exists()
config['Label']=label;config['WorkingDirectory']=str(release);config['ProgramArguments'][-1]=str(release)
config['StandardOutPath']=str(base/'logs'/(label+'.out.log'));config['StandardErrorPath']=str(base/'logs'/(label+'.err.log'))
service.write_bytes(plistlib.dumps(config));subprocess.run(['plutil','-lint',str(service)],check=True)
disabled=previous.with_suffix('.plist.disabled');assert not disabled.exists()
record={'url':'http://127.0.0.1:5194/','previousRelease':old_dir,'previousService':str(previous),'release':str(release),'service':str(service),'bundle':bundle,'bundleSha256':sha,'export':export}
(proof/'release-5194.json').write_text(json.dumps(record,indent=2))
subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}/{old_label}'],check=True);previous.rename(disabled)
try:
 subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(service)],check=True)
 for attempt in range(30):
  try:
   served=urllib.request.urlopen(record['url']+bundle.removeprefix('./'),timeout=2).read()
   assert hashlib.sha256(served).hexdigest()==sha
   actual=urllib.request.urlopen(record['url'],timeout=2).read().decode();assert bundle in actual
   break
  except Exception:
   if attempt==29:raise
   time.sleep(.2)
except Exception:
 subprocess.run(['launchctl','bootout',f'gui/{os.getuid()}/{label}'],check=False)
 disabled.rename(previous);subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(previous)],check=True)
 raise
record['httpVerified']=True;record['servedBundleSha256']=hashlib.sha256(served).hexdigest()
(proof/'release-5194.json').write_text(json.dumps(record,indent=2));print(json.dumps(record,indent=2))
