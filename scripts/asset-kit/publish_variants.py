from pathlib import Path
import json
P=Path(__file__).resolve().parents[2];V=P/'output/blender-variants-v1';items=json.loads((V/'variants.json').read_text());assets=[]
for v in items:
 id=v['id'];f=V/'models'/id/(id+'.glb');assets.append(dict(id=id,title=v['title'],category='variant-body' if v['kind']=='body' else 'variant-head' if v['kind']=='head' else 'variant-extra',source=v['source'],glb='/'+str(f.relative_to(P)),preview='/'+str((f.parent/'front.png').relative_to(P)),bytes=f.stat().st_size))
(V/'catalogue.json').write_text(json.dumps(dict(assets=assets),ensure_ascii=False,indent=2))
p=P/'output/meshy/kit-v1/review.js';s=p.read_text();s=s.replace("boss:'Боссы'", "boss:'Боссы','variant-body':'Корпуса · варианты','variant-head':'Головы · варианты','variant-extra':'Другие варианты'")
s=s.replace("const reviews=await fetch", "const variants=await fetch('../../blender-variants-v1/catalogue.json').then(r=>r.json());manifest.assets.push(...variants.assets);const variantMap=Object.fromEntries(variants.assets.map(a=>[a.id,a]));const reviews=await fetch")
s=s.replace("selected='player-core'", "selected=new URLSearchParams(location.search).get('asset')||'player-core'")
s=s.replace("$('download').href=repairs.includes(id)?", "$('download').href=variantMap[id]?.glb|| (repairs.includes(id)?")
s=s.replace("'./models/'+id+'/'+id+'.glb';if", "'./models/'+id+'/'+id+'.glb');if")
s=s.replace("$('message').textContent='Загрузка 3D…';", "if(variantMap[id]){$('quality').hidden=false;$('quality').textContent='Дополнительный вариант из оставшихся частей: '+variantMap[id].source+'.';}$('message').textContent='Загрузка 3D…';")
s=s.replace("picture.src=repairs.includes(a.id)?", "picture.src=variantMap[a.id]?.preview||(repairs.includes(a.id)?")
s=s.replace("'./models/'+a.id+'/preview.png';picture.alt", "'./models/'+a.id+'/preview.png');picture.alt")
s=s.replace("sub.textContent=repairs.includes(a.id)?", "sub.textContent=variantMap[a.id]?'Дополнительный вариант · GLB':repairs.includes(a.id)?")
s=s.replace("$('progress').textContent=Object.values(state.assets)", "for(const a of variants.assets)state.assets[a.id]={download:{bytes:a.bytes}};document.querySelector('.collection-title span').textContent=manifest.assets.length;$('progress').textContent=Object.values(state.assets)")
s=s.replace("+' / 52 моделей готово'", "+' / '+manifest.assets.length+' моделей готово'")
p.write_text(s)
p=P/'output/blender-repair-v1/prototype-manifest.json';m=json.loads(p.read_text());m['assets']=[a for a in m['assets'] if a['id'] not in {v['id'] for v in items}]+[dict(a,status='prototype',provenance=a['source']) for a in assets];m['total']=len(m['assets']);p.write_text(json.dumps(m,ensure_ascii=False,indent=2))
