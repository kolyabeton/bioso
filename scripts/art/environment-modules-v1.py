"""Four distinct, lightweight mission/survival edge modules; reused material atlas."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from forest_sculpt_common import *

# Garden: long low terraced retaining bank, ceramic coping, drainage and roots.
for row in range(3):
 for col in range(5):
  y=(col-2)*1.12;x=(row-1)*.7;h=.25+row*.3
  block('Worn terrace masonry',(x,y,h/2),(.9,1.08,h),2,.065,(col%2-.5)*.035)
for i in range(5):
 block('Ceramic terrace coping',(1.04,(i-2)*1.12,1.02),(.34,1.06,.26),0,.07)
for y in [-2.1,2.1]:
 block('Terrace end pier',(.8,y,.85),(.6,.7,1.7),0,.11)
for i in range(6):
 a=i*.83;tube('Roots through old drainage',[(1.1,(i-2.5)*.7,.92),(.5,(i-2.5)*.7+.2,.55),(-.65,(i-2.5)*.7+.35,.12)],[.075,.06,.008])
export('environment-garden-bank-v1')

# Scrap: crushed beams, a ribbed service pipe and layered torn casing.
for i in range(7):
 o=block('Buckled industrial beam',((i%3-1)*.55,(i-3)*.6,.2+(i%2)*.2),(.23,2.2,.26),1,.045,(i%3-1)*.23)
 o.rotation_euler.x=(i%2-.5)*.18
for i in range(5):
 block('Collapsed service casing',(.3,(i-2)*.62,.7+(i%2)*.2),(1.4,.58,.19),0,.04,(i%2-.5)*.3)
for i in range(7):
 y=(i-3)*.65
 points=[(-.5+math.cos(a)*.48,y,.6+math.sin(a)*.48) for a in [j*math.pi/12 for j in range(13)]]
 tube('Exposed pipe rib',points,[.07]*len(points),1)
stone('Buried scrap footing',-.2,.2,-.15,1.2,2.6,.38,77)
export('environment-scrap-bank-v1')

# City: broken wall foundation and unequal masonry piers, not a solid box.
for i in range(5):
 block('Cracked city foundation',(0,(i-2)*1.0,.15),(1.8,.94,.3),2,.05,(i%2-.5)*.08)
for y,h in [(-2.0,2.5),(.2,1.3),(2.0,2.0)]:
 for row in range(int(h/.5)):
  block('Exposed broken wall course',(.2,y,.5+row*.45),(.55,.82,.42),2,.06,(row%2-.5)*.03)
 block('Surviving ceramic facade',(.52,y,h*.48),(.12,.64,h*.7),0,.04)
for j in range(5):
 stone('Masonry fallen into verge',-.7+(j%2)*.3,(j-2)*.85,0,.48,.5,.2+(j%3)*.15,100+j)
export('environment-city-bank-v1')

# Nursery: intertwined root cradle holding three ribbed, open seed chambers.
for j in range(3):
 y=(j-1)*1.5;r=.65 if j!=1 else .9
 for k in range(7):
  a=k*math.tau/7
  pts=[(math.cos(a)*r*.85,y+math.sin(a)*r*.7,.08),(math.cos(a)*r,y+math.sin(a)*r*.85,.6),(math.cos(a)*r*.65,y+math.sin(a)*r*.6,1.25),(math.cos(a)*r*.3,y+math.sin(a)*r*.26,1.42)]
  tube('Organic seed chamber rib',pts,[.12,.17,.14,.045],0)
 for k in range(4):
  a=k*math.tau/4;tube('Nest anchoring root',[(0,y,.7),(math.cos(a)*.7,y+math.sin(a)*.65,.15),(math.cos(a)*1.1,y+math.sin(a)*1.0,.02)],[.18,.13,.009])
 o=block('Restrained mint bioluminescence',(.05,y,.62),(.12,.2,.15),0,.04);o.data.materials.clear();o.data.materials.append(mint)
stone('Nest buried substrate',0,0,-.15,1.15,2.7,.3,323)
export('environment-nest-bank-v1')
