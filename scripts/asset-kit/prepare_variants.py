from pathlib import Path
import json
P=Path(__file__).resolve().parents[2];D=P/'output/blender-repair-v1';V=P/'output/blender-variants-v1';V.mkdir(exist_ok=True)
used={r['id']:set(r['components']) for f in ['repairs.json','module-repairs.json'] for r in json.loads((D/f).read_text())}
def pick(source,rule):
 return [i for i,c in enumerate(json.loads((D/(source+'-components.json')).read_text())) if i not in used[source] and rule(i,c['min'],c['max'])]
variants=[]
def add(id,title,source,rule,kind):variants.append(dict(id=id,title=title,source=source,components=pick(source,rule),kind=kind))
add('body-worker','Корпус «Рабочий»','arm-claw',lambda i,l,h:l[0]>-.49 and h[0]<.53,'body')
add('body-scout','Корпус «Разведчик»','arm-seed',lambda i,l,h:i in [0,2,46,48],'body')
add('body-heavy','Корпус «Тяжёлый»','arm-drill',lambda i,l,h:i in [0,10,32,36,37,38,39,41,42,43,44],'body')
add('body-guard','Корпус «Гвардеец»','arm-shield',lambda i,l,h:i in [0,9,10,15,19,20,43,44,45,46,47,48],'body')
add('body-jade','Корпус «Нефрит»','head-optic',lambda i,l,h:i in [0,14,15,17,23,27,29],'body')
add('body-carapace','Корпус «Хитин»','head-mandible',lambda i,l,h:i in [1,3,16,27],'body')
add('body-pod','Корпус «Капсула»','sensor-dish',lambda i,l,h:i in [0,1,2,4,19] or (l[0]>-.65 and h[0]<.65 and h[2]<-.35),'body')
add('body-seed','Корпус «Семя»','leg-climber',lambda i,l,h:i in [0,1,2,3,32,37,38,39] or l[2]>.25,'body')
add('head-worker','Голова «Рабочий»','arm-seed',lambda i,l,h:i in [1,42,43],'head')
add('head-driller','Голова «Бурильщик»','arm-drill',lambda i,l,h:i in [1,4,15,29,30,35],'head')
add('head-sentinel','Голова «Дозорный»','arm-shield',lambda i,l,h:i in [1,21,25,27],'head')
add('head-knight','Голова «Рыцарь»','shell-spine',lambda i,l,h:i in [0,12] or l[2]>.88,'head')
add('shoulder-jade','Наплечник «Нефрит»','head-optic',lambda i,l,h:i in [6,7],'shell')
add('shoulder-ivory','Наплечник «Керамика»','arm-seed',lambda i,l,h:i in [5,13,14],'shell')
add('leg-worker','Нога «Рабочий»','arm-seed',lambda i,l,h:i in [7,9,17,25,27,31,44,47],'leg')
add('leg-guard','Нога «Гвардеец»','arm-shield',lambda i,l,h:i in [8,18,41],'leg')
(V/'variants.json').write_text(json.dumps(variants,ensure_ascii=False,indent=2))
s=(P/'scripts/asset-kit/extract_weapons.py').read_text();a=s.index('configs={');b=s.index(' obj=next',a)
s=s[:a]+'''D=P/'output/blender-repair-v1';O=P/'output/blender-variants-v1'
variants=json.loads((O/'variants.json').read_text())
for variant in variants:
 id=variant['id'];selected=variant['components'];pivot=(0,0,0);note='Prototype variant extracted from '+variant['source']
 bpy.ops.wm.open_mainfile(filepath=str(D/(variant['source']+'-source.blend')))
'''+s[b:]
s=s.replace("for v in mesh.vertices:v.co-=Vector(pivot)","""pivot=Vector(((min(v.co.x for v in mesh.vertices)+max(v.co.x for v in mesh.vertices))*.5,(min(v.co.y for v in mesh.vertices)+max(v.co.y for v in mesh.vertices))*.5,min(v.co.z for v in mesh.vertices)))
 for v in mesh.vertices:v.co-=pivot""")
s=s.replace("obj['source_asset']=id", "obj['source_asset']=variant['source']")
s=s.replace("dict(id=id,note=note,components=selected", "dict(id=id,title=variant['title'],source=variant['source'],kind=variant['kind'],note=note,components=selected")
(P/'scripts/asset-kit/extract_variants.py').write_text(s)
print(len(variants),'variants',[(v['id'],len(v['components'])) for v in variants])
