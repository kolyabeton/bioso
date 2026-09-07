import json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
style='Solarpunk biomechanical game asset. Sculpted seed-shaped ivory ceramic armour, fitted panel seams, aged bronze rims, dark mechanical joints, small inset jade energy windows. Elegant substantial curved forms, gently worn, realistic materials, readable isometric silhouette. '
texture='Warm aged ivory matte ceramic plates with subtle chipped edges and fine surface pores, tarnished bronze borders and recessed fasteners, dark graphite mechanisms, restrained jade-green energy glass. Subtle dirt in seams. Cohesive premium painterly-realistic solarpunk, no painted lighting, no text or logos.'
rows=[]
def add(cat,id,title,shape,poly=8000):
 p=style+shape+' One isolated asset only, no ground, base, scene, other objects or text.'
 assert len(p)<=800,(id,len(p))
 rows.append(dict(id=id,category=cat,title=title,prompt=p,texture_prompt=texture,target_polycount=poly))
add('player','player-core','Ядро игрока','Elongated enclosed egg hull, round jade top reactor, low front optical eye, rear vent, flush mounting collars. No arms or legs.',12000)
rows[-1]['image']='output/imagegen/player-core-v1/player-core-v1.png'
for id,title,shape in [
('biped','Двуногое','Upright nonhumanoid seed torso standing on exactly two reverse-jointed mechanical legs. Broad feet, compact hip, empty arm collars, small optical eye. No arms or weapons.'),
('quadruped','Четвероногое','Low elongated beetle torso on exactly four widely spaced bent mechanical legs with pointed feet. Clearly separated legs, round side arm collars, no weapons.'),
('crawler','Ползающее','Flattened trilobite hull with overlapping longitudinal armour segments and six short spread mechanical walking legs. Very low stance, broad wedge front. No weapons.'),
('flyer','Летающее','Dragonfly-like floating seed chassis with exactly two broad translucent green membrane wings on bronze spars. A short tapered tail and small tucked landing hooks. No stand.'),
('serpent','Змеевидное','Continuous limbless mechanical serpent body gently S-curved horizontally. Eight chunky overlapping ceramic vertebral segments, tapered tail, blunt optical head. No legs, no coils touching.'),
('plant','Растение','Rooted mechanical plant anatomy: thick articulated central stem, three broad ceramic leaf blades, radial gripping root feet and closed seed pod torso with side attachment collars. No pot.')]:add('anatomy','anatomy-'+id,title,shape,12000)
for id,title,shape in [
('arm-claw','Рука-жнец','One detachable robotic utility arm with circular shoulder coupler, short jointed shaft and two opposed crescent harvesting jaws. Green lens in wrist. No body.'),
('arm-seed','Семенная пушка','One detachable robot arm with circular shoulder coupler, elbow and compact cylindrical ceramic seed-projector, bronze muzzle and small green chamber. No body.'),
('arm-drill','Бур','One detachable robot arm with circular root coupler, short reinforced elbow and substantial spiral conical metal drill bit in a ceramic motor sleeve. No body.'),
('arm-arc','Дуговая вилка','One detachable robot arm with shoulder coupler, short articulated shaft, green induction coil and two thick curved conductive fork prongs. No effects or body.'),
('arm-shield','Щитовая рука','One detachable short robot arm with round shoulder coupler and broad convex oval ceramic shield with bronze rim and a small jade centre inset. No body.'),
('arm-siphon','Сифон','One detachable robot arm with round shoulder coupler, curved reinforced tube and trumpet-shaped bronze suction nozzle, ceramic tank sleeve. No body.'),
('head-optic','Голова-оптик','One detachable compact beetle-like sensor head with single large green lens, ivory brow armour, bronze surround and short cylindrical neck plug. No torso.'),
('head-mandible','Голова с жвалами','One detachable low wedge-shaped insect robot head with two thick bronze mandibles, paired recessed green eyes, ivory forehead and cylindrical neck plug. No torso.'),
('head-crown','Голова-корона','One detachable seed-shaped robot head crowned by three thick petal-like ceramic antenna fins. Central narrow jade optic and cylindrical neck plug. No torso.'),
('sensor-eye','Глаз-сенсор','One detachable small camera sensor module: concentric bronze lens housing with recessed jade optical glass, ivory protective half hood, short round mounting plug.'),
('sensor-antenna','Антенна','One detachable compact double-pronged bronze antenna on an ivory ceramic swivel base with round mounting plug. Thick rounded prongs, green ceramic tips.'),
('sensor-dish','Сенсор-тарелка','One detachable shallow concave ivory parabolic sensor dish, bronze rim, small central green receiver, compact pivot and round mounting plug.'),
('leg-walker','Шагающая нога','One complete detachable mechanical walking leg, hip coupler, ceramic upper armour, exposed round knee, angled slender shin and pointed stabilizing foot. Bent neutral pose.'),
('leg-jumper','Прыжковая нога','One detachable reverse-jointed jumping leg with large ceramic thigh, bronze piston spring between knee and ankle, broad three-toed mechanical foot and hip coupler.'),
('leg-climber','Цепкая нога','One detachable compact climbing leg: round hip connector, two articulated ceramic segments and three opposed thick bronze gripping toes. No body.'),
('leg-root','Корневая опора','One detachable rootlike robotic support leg, short ceramic stem, bronze flex joints, three spreading woody mechanical gripping roots, round top mounting coupler.'),
('shell-elytra','Панцирь-надкрылье','One detachable elongated convex beetle elytron armour plate, ivory ceramic, bronze edge, small recessed fastening holes underneath. Hollow concave underside. No creature.'),
('shell-dome','Купольный панцирь','One detachable low hemispherical armour cap assembled from six fitted ivory plates with bronze seams and a small jade centre. Hollow underside with mounting rim. No creature.'),
('shell-spine','Спинной панцирь','One detachable dorsal armour strip with three overlapping ivory ceramic plates and three short bronze protective fins. Curved saddle underside with mounting feet.'),
('tail-counterweight','Хвост-балансир','One detachable mechanical balancing tail, round base connector, five tapering ceramic armoured segments, compact bronze counterweight tip. Gentle horizontal curve.'),
('tail-stinger','Хвост-жало','One detachable scorpion-like mechanical tail, round base connector, four thick articulated ceramic segments curving upward, jade injector capsule and short bronze stinger.'),
('organ-reactor','Реактор','One removable cylindrical organ cartridge, jade glass energy chamber inside a bronze cage, ivory ceramic end caps, flush connection terminals. No body or stand.'),
('organ-digester','Пищеварительный орган','One removable plump oval biomechanical digestion organ, ribbed bronze shell, small olive glass window, ivory ceramic service cap and two short recessed pipe connectors.'),
('organ-capacitor','Конденсатор','One removable compact spherical capacitor organ, fitted hexagonal ivory ceramic panels, bronze seams, three small jade windows and one round mounting terminal.')]:add('module',id,title,shape,6000)
for id,title,shape in [
('wall-straight','Прямая стена','One thick straight ruined garden wall segment, flat mating ends, pale curved ceramic cladding over aged limestone blocks, bronze cap, sparse moss along bottom.'),
('wall-corner','Угол стены','One L-shaped ruined garden wall corner, thick pale ceramic outer cladding, aged limestone inner structure, bronze cap, sparse moss, flat mating ends.'),
('arch','Арка','One freestanding solarpunk gateway arch, two chunky curved ivory ceramic pillars joined by a broad rounded arch, bronze trims, stone feet, sparse trailing vines.'),
('pillar','Колонна','One tall tapering ceramic support pillar with broad limestone foot, inset bronze vertical ribs, circular connection cap at top and sparse moss.'),
('stairs','Лестница','One broad flight of six worn limestone garden steps with low ceramic side cheeks and bronze edge strips, flat top and bottom landings. Sparse moss in seams.'),
('terrace','Террасная плита','One thick square terrace floor module, irregular fitted worn limestone paving surface, clean vertical modular edges, subtle cracks and moss, no walls.'),
('bridge','Мост','One short straight garden bridge segment with stone deck, low curved ivory ceramic side rails, bronze structural ribs, matching flat ends, no water.'),
('planter','Крупная клумба','One large empty oval raised garden planter, aged limestone base and ivory ceramic rim with bronze bands, recessed visible soil interior, no plants.'),
('turbine','Ветряк','One complete solarpunk wind turbine: tall gently tapering ivory mast, bronze nacelle, exactly three long elegant blades, small round stone foot. No surrounding scene.'),
('solar-panel','Солнечная установка','One tilted rectangular dark blue photovoltaic panel array on a sturdy bronze A-frame, ivory ceramic hinges and small masonry mounting feet. Clear cell grid.'),
('cistern','Цистерна','One squat cylindrical ceramic water cistern, bronze circular lid, vertical ribs, recessed service hatch and short side pipe, weathered stone footing.'),
('gate','Ворота','One closed monumental double garden gate, two thick rounded ivory leaves with bronze frames and a central jade lock, integrated ceramic side posts.')]:add('architecture','arch-'+id,title,shape,10000)
planttex='Natural muted olive and sage green leaves, warm ochre dry tips, soft dark brown bark and stems, mossy surfaces, sparse jade bioluminescent accents. Painterly-realistic solarpunk garden vegetation. No ceramic coating on leaves, no painted lighting, no text.'
for id,title,shape in [
('grass','Трава','One dense tuft of robust curved olive grass blades of varied heights, compact bare root base, no soil island or pot.'),
('fern','Папоротник','One fern cluster with five arching fronds and many broad paired leaflets, tight root centre, natural readable layered silhouette, no pot.'),
('shrub','Кустарник','One low rounded shrub cluster with visible branching stems and dense rounded olive leaves, a few tiny ochre seed buds. No pot or terrain.'),
('vine','Лиана','One draping climbing vine cluster with three branching flexible stems and broad heart-shaped leaves, arranged downwards, no wall, support or pot.'),
('moss','Мох','One irregular low cushion of dense moss with tiny clustered rounded leafy shoots, softly raised centre, compact connected root mat, no rock or terrain.'),
('seedpod','Светящиеся стручки','One small rooted plant cluster with three thick curved stems, broad sage leaves and hanging translucent jade seed pods inside protective woody sepals. No pot.')]:
 add('vegetation','veg-'+id,title,shape,8000);rows[-1]['prompt']=shape+' Natural organic solarpunk garden vegetation, muted olive green, sculpted realistic broad forms readable in isometric view. One isolated vegetation cluster, no backdrop, no text.';rows[-1]['texture_prompt']=planttex
for id,title,shape in [
('warden','Ядро босса «Страж»','One massive squat fortress-beetle core without limbs, layered broad ivory armour, deep bronze circular side sockets, three recessed jade reactor windows, heavy shieldlike front brow.'),
('orchid','Ядро босса «Орхидея»','One large upright biomechanical seed-pod boss core without limbs: six thick curled ivory ceramic petal shields surrounding a recessed jade heart, bronze ribbed stem base and round side sockets.'),
('leviathan','Ядро босса «Левиафан»','One long imposing serpentine boss core without limbs or tail: three overlapping thick ceramic hull sections, broad angular optical prow, bronze structural ribs, paired jade vents and large end coupling.')]:add('boss','boss-'+id,title,shape,15000)
assert len(rows)==52
out=ROOT/'output/meshy/kit-v1';out.mkdir(parents=True,exist_ok=True)
(out/'manifest.json').write_text(json.dumps({'version':1,'model':'meshy-t2','estimated_credits':780,'assets':rows},ensure_ascii=False,indent=2)+'\n')
print('Manifest:',len(rows),'assets')
