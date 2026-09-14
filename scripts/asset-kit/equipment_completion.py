"""Distinct rigid attachments; reuse authored textured materials and keep the master packed.
blender --background --python scripts/asset-kit/equipment_completion.py
"""
import bpy, math, json
from pathlib import Path
P=Path(__file__).resolve().parents[2]
# Reuse proven mesh/material helpers without rerunning or overwriting v2 assets.
source=(P/'scripts/asset-kit/equipment_v2.py').read_text().split('# Whip:')[0]
source=source.replace("OUT=P/'output/blender-equipment-v2'", "OUT=P/'output/blender-equipment-completion'")
exec(compile(source,__file__,'exec'))
collections=[]
# All new modules use the same visible mounting ferrule, Z-down in Blender.
collar(0);sphere('Harpoon tendon receiver',(0,0,-.28),(.18,.16,.26),ceramic)
rod('Tendon shaft',(0,0,-.42),(0,0,-1.3),.065,.045,metal)
for i in range(12):
 a=i*math.tau/12;sphere('Winch rim',(.19*math.cos(a),.19*math.sin(a),-.32),(.04,.04,.065),rim)
rod('Harpoon spear',(0,0,-1.25),(0,0,-1.65),.12,0,rim)
for side in [-1,1]:rod('Back facing barb',(0,0,-1.47),(side*.23,0,-1.19),.07,.005,rim)
collections.append(export('arm-harpoon'));objects=[]
collar(0,.2);box('Hive ceramic housing',(0,0,-.45),(.64,.5,.7),ceramic,.09)
for x in [-.19,0,.19]:
 for y in [-.115,.115]:
  rod('Launch tube',(x,y,-.27),(x,y,-.91),.075,.075,metal)
  rod('Tube collar',(x,y,-.86),(x,y,-.93),.089,.089,rim)
  rod('Recessed rocket nose',(x,y,-.87),(x,y,-1.01),.053,0,bio)
box('Spine',(0,0,-.18),(.22,.22,.25),metal)
collections.append(export('arm-rocket'));objects=[]
collar(0);sphere('Parasite pump',(0,0,-.3),(.19,.17,.27),bio)
for side in [-1,1]:
 rod('Jaw actuator',(side*.1,0,-.27),(side*.22,0,-.64),.08,.065,metal)
 rod('Ivory fang',(side*.22,0,-.59),(side*.12,0,-1.1),.1,.007,ceramic)
 rod('Return vessel',(side*.06,-.13,-.12),(side*.13,-.13,-.82),.03,.023,bio)
sphere('Feeding aperture',(0,0,-.6),(.075,.08,.1),light)
collections.append(export('arm-fangs'));objects=[]
# A visibly coiled shock absorber differentiates spring from the existing running leg.
collar(0,.15);sphere('Upper bearing',(0,0,-.14),(.19,.16,.16),ceramic)
rod('Piston',(0,0,-.2),(.08,0,-.84),.06,.06,metal)
for i in range(120):
 t=i/120;u=(i+1)/120
 a=(.08*t+.13*math.cos(t*math.tau*7),.13*math.sin(t*math.tau*7),-.25-.53*t)
 b=(.08*u+.13*math.cos(u*math.tau*7),.13*math.sin(u*math.tau*7),-.25-.53*u)
 rod('Helical spring',a,b,.022,.022,rim,8)
sphere('Ankle',(.08,0,-.85),(.15,.14,.12),metal)
box('Split ceramic foot',(.08,-.1,-.98),(.34,.5,.14),ceramic)
collections.append(export('leg-spring'));objects=[]
# Internal organs have distinct portable meshes; they remain inside the chassis when equipped.
organ_shapes={'mirrorGland':'mirror','returnNerve':'nerve','slime':'sack','parasite':'eggs','commonNerve':'hub','reverseHeart':'heart','regen':'vials','shield':'coil','armor':'plates','stabilizer':'gyro','digestion':'stomach','accelerator':'turbine'}
for key,shape in organ_shapes.items():
 collar(0,.14);sphere('Sealed organ cartridge',(0,0,-.3),(.24,.18,.27),metal)
 if shape in ['sack','stomach','heart','eggs','mouth']:
  n=3 if shape=='eggs' else 2 if shape=='heart' else 1
  for i in range(n):sphere(shape,(.16*math.sin(i*math.tau/n),-.08,-.35+.12*math.cos(i*math.tau/n)),(.2 if n==1 else .12,.16,.22 if n==1 else .13),bio)
  if shape=='stomach':
   sphere('Lower digestion chamber',(0,0,-.64),(.17,.16,.22),bio)
   rod('Outlet duct',(0,0,-.68),(.24,0,-.78),.08,.055,metal)
  if shape=='mouth':
   for i in range(8):
    a=i*math.tau/8;rod('Intake tooth',(.15*math.cos(a),-.23,-.35+.15*math.sin(a)),(.09*math.cos(a),-.27,-.35+.09*math.sin(a)),.025,.002,ceramic)
 elif shape in ['nerve','hub']:
  for i in range(3 if shape=='nerve' else 6):
   a=i*math.tau/(3 if shape=='nerve' else 6);rod('Nerve trunk',(0,0,-.3),(.32*math.cos(a),0,-.3+.25*math.sin(a)),.033,.018,bio);sphere('Synaptic terminal',(.32*math.cos(a),0,-.3+.25*math.sin(a)),(.055,.065,.055),light)
 elif shape=='plates':
  for i in range(3):box('Stacked armour lamella',(0,-.14-i*.045,-.23-i*.1),(.44,.07,.22),ceramic)
 elif shape=='vials':
  for x in [-.15,0,.15]:rod('Regenerative vial',(x,-.17,-.15),(x,-.17,-.53),.055,.055,bio);sphere('Vial cap',(x,-.17,-.14),(.06,.06,.035),ceramic)
 elif shape=='mirror':box('Reflective ceramic face',(0,-.18,-.3),(.36,.07,.4),ceramic);sphere('Reflector eye',(0,-.23,-.3),(.1,.025,.1),light)
 else:
  for i in range(12):
   a=i*math.tau/12;sphere(shape,(.25*math.cos(a),-.12,-.3+.25*math.sin(a)),(.06,.08,.04),rim)
  if shape=='turbine':
   for i in range(6):
    a=i*math.tau/6;rod('Turbine vane',(0,-.2,-.3),(.2*math.cos(a),-.2,-.3+.2*math.sin(a)),.025,.045,ceramic)
  else:
   sphere('Central optic',(0,-.2,-.3),(.1,.055,.1),light)
   if shape=='gyro':
    rod('Gyroscope horizontal axis',(-.34,0,-.3),(.34,0,-.3),.025,.025,ceramic)
    rod('Gyroscope vertical axis',(0,0,.04),(0,0,-.64),.025,.025,ceramic)
   else:
    for x in [-.17,.17]:box('Shield field plate',(x,-.18,-.3),(.1,.06,.4),ceramic)
 collections.append(export('organ-'+key));objects=[]
ref=bpy.data.images.load(str(P/'docs/references/biomecha-style-master.png'));ref.pack()
bpy.context.scene['style_reference']='docs/references/biomecha-style-master.png'
# Arrange editable modules apart in the source file; exports retain local mount coordinates.
for i,col in enumerate(collections):
 for o in col.objects:o.location.x+=(i%6)*2;o.location.y+=(i//6)*2
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'equipment-completion.blend'))
manifest=json.loads((KIT/'manifest.json').read_text());byid={a['id']:a for a in manifest}
for col in collections:
 id=col.name;byid[id]={'id':id,'file':id+'.glb','bytes':(KIT/(id+'.glb')).stat().st_size}
(KIT/'manifest.json').write_text(json.dumps(list(byid.values()),indent=2)+'\n')
print('EQUIPMENT_COMPLETION',len(collections),flush=True)
