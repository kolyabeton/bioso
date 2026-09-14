"""Second-pass hard-surface BIOSO bosses built from the approved concepts.

This pass keeps the assets procedural and modular, but replaces the primitive
blockout language with layered armour, exposed mechanics, pistons, collars,
cables, fasteners and large independently addressable weak points.

Usage:
  blender --background --python scripts/asset-kit/bosses_v2.py -- mercury leviathan
"""

import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "blender-bosses-v2"
GLB = OUT / "glb"
RENDERS = OUT / "renders"
CONCEPTS = ROOT / "output" / "imagegen" / "boss-concepts-v1"
STYLE = ROOT / "docs" / "references" / "biomecha-style-master.png"
for folder in (OUT, GLB, RENDERS):
    folder.mkdir(parents=True, exist_ok=True)

SPECS = {
    "mercury": {"id": "boss-mercury-hunter", "title": "Ртутный Ловчий", "concept": "boss-mercury-hunter-concept-v1.png", "target": (3.9, 4.7, 2.0)},
    "leviathan": {"id": "boss-scrap-leviathan", "title": "Свалочный Левиафан", "concept": "boss-scrap-leviathan-concept-v1.png", "target": (7.1, 16.2, 6.2)},
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world = bpy.data.worlds.new("BIOSO dusk world")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.018, 0.025, 0.023, 1)
    bg.inputs["Strength"].default_value = 0.28
    return scene


def make_material(name, base, metallic, roughness, seed, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 5.5 if metallic < .3 else 12.0
    noise.inputs["Detail"].default_value = 5.0
    noise.inputs["Roughness"].default_value = .72
    noise.inputs["Distortion"].default_value = .25
    noise.noise_dimensions = "4D"
    noise.inputs["W"].default_value = seed * .037
    ramp = nodes.new("ShaderNodeValToRGB")
    dark = tuple(max(0, c * (.42 if metallic > .5 else .54)) for c in base)
    light = tuple(min(1, c * (1.16 if metallic < .5 else 1.5)) for c in base)
    ramp.color_ramp.elements[0].position = .20
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].position = .78
    ramp.color_ramp.elements[1].color = (*light, 1)
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = .18 if metallic < .3 else .28
    bump.inputs["Distance"].default_value = .08
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    if emission:
        color = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
        strength = bsdf.inputs.get("Emission Strength")
        if color: color.default_value = (*emission, 1)
        if strength: strength.default_value = 5.2
    return mat


def materials(seed):
    return {
        "ceramic": make_material("M_Ceramic_Warm_Aged", (.58, .51, .39), .08, .64, seed),
        "metal": make_material("M_Metal_Blackened", (.055, .068, .062), .86, .36, seed + 11),
        "bio": make_material("M_Bio_Tendon", (.10, .16, .105), .04, .76, seed + 23),
        "glow": make_material("M_Weakpoint_Mint", (.025, .19, .15), .18, .27, seed + 31, (.08, 1.0, .72)),
    }


def parent_keep(obj, parent):
    if not parent: return obj
    bpy.context.view_layer.update()
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world
    return obj


def empty(name, location=(0, 0, 0), parent=None, display=.18):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.empty_display_type = "ARROWS"
    obj.empty_display_size = display
    return parent_keep(obj, parent)


def finish(obj, name, mat, parent=None, bevel=0, smooth=True):
    obj.name = name
    if mat: obj.data.materials.append(mat)
    parent_keep(obj, parent)
    if obj.type == "MESH" and smooth:
        for poly in obj.data.polygons: poly.use_smooth = True
    if bevel:
        mod = obj.modifiers.new("Edge wear", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    return obj


def uv(name, loc, scale, mat, parent=None, segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=20, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent)


def ico(name, loc, scale, mat, parent=None, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, .018)


def box(name, loc, scale, mat, parent=None, rotation=(0, 0, 0), bevel=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, bevel, False)


def rod(name, a, b, radius, mat, parent=None, radius2=None, vertices=18):
    a, b = Vector(a), Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius, radius2=radius if radius2 is None else radius2, depth=delta.length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, mat, parent, .018)


def ring(name, loc, major, minor, mat, parent=None, rotation=(math.pi/2, 0, 0), segments=36):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=segments, minor_segments=10, location=loc, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent)


def cylinder(name, loc, radius, depth, mat, parent=None, rotation=(math.pi/2, 0, 0), vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent, .025)


def cable(name, points, radius, mat, parent=None):
    curve = bpy.data.curves.new(name + "Curve", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for bp, point in zip(spline.bezier_points, points):
        bp.co = point
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    curve.materials.append(mat)
    return parent_keep(obj, parent)


def prism(name, outline, z0, z1, mat, parent=None, bevel=.04):
    verts=[(x,y,z) for z in (z0,z1) for x,y in outline]
    n=len(outline)
    faces=[tuple(range(n)),tuple(range(n,2*n))]
    for i in range(n): faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
    mesh=bpy.data.meshes.new(name+"Mesh")
    mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.scene.collection.objects.link(obj)
    return finish(obj,name,mat,parent,bevel,False)


def bolt(name, loc, radius, mat, parent=None, rotation=(math.pi/2,0,0)):
    return cylinder(name,loc,radius,radius*.55,mat,parent,rotation,vertices=12)


def armour_segment(prefix, a, b, width, depth, mat, parent, offset=(0,0,0)):
    a,b=Vector(a),Vector(b);mid=(a+b)/2+Vector(offset);delta=b-a
    obj=box(prefix,mid,(width,depth,delta.length*.34),mat,parent,bevel=min(width,depth)*.18)
    obj.rotation_euler=delta.to_track_quat("Z","Y").to_euler()
    return obj


def mechanical_leg(prefix, hip, knee, ankle, toe, mats, parent, size):
    pivot=empty(prefix+"_HipPivot",hip,parent,.24)
    ring(prefix+"_HipCollar",hip,size*1.35,size*.32,mats["metal"],pivot,(0,math.pi/2,0))
    rod(prefix+"_Femur",hip,knee,size*.55,mats["metal"],pivot)
    rod(prefix+"_FemurPiston",Vector(hip)+Vector((0,.07,.05)),Vector(knee)+Vector((0,.07,.05)),size*.20,mats["ceramic"],pivot)
    armour_segment(prefix+"_FemurPlate",hip,knee,size*1.35,size*.62,mats["ceramic"],pivot,(0,-size*.25,size*.4))
    ring(prefix+"_KneeCollar",knee,size*1.15,size*.28,mats["metal"],pivot,(0,math.pi/2,0))
    bolt(prefix+"_KneeBoltA",Vector(knee)+Vector((size*1.2,0,0)),size*.42,mats["ceramic"],pivot,(0,math.pi/2,0))
    bolt(prefix+"_KneeBoltB",Vector(knee)-Vector((size*1.2,0,0)),size*.42,mats["ceramic"],pivot,(0,math.pi/2,0))
    rod(prefix+"_Tibia",knee,ankle,size*.48,mats["metal"],pivot)
    rod(prefix+"_TibiaRailA",Vector(knee)+Vector((size*.42,0,0)),Vector(ankle)+Vector((size*.32,0,0)),size*.15,mats["metal"],pivot)
    rod(prefix+"_TibiaRailB",Vector(knee)-Vector((size*.42,0,0)),Vector(ankle)-Vector((size*.32,0,0)),size*.15,mats["metal"],pivot)
    armour_segment(prefix+"_TibiaPlate",knee,ankle,size*1.12,size*.58,mats["ceramic"],pivot,(0,-size*.18,size*.22))
    ring(prefix+"_AnkleCollar",ankle,size*.78,size*.22,mats["metal"],pivot,(0,math.pi/2,0))
    rod(prefix+"_Foot",ankle,toe,size*.35,mats["metal"],pivot,radius2=size*.16)
    forward=(Vector(toe)-Vector(ankle)).normalized()
    side=Vector((-forward.y,forward.x,0))
    for i,spread in enumerate((-.58,0,.58)):
        tip=Vector(toe)+forward*size*2.2+side*spread*size*1.6
        rod(prefix+f"_Toe_{i+1}",toe,tip,size*.20,mats["metal"],pivot,radius2=.018)
    return pivot


def build_mercury(m):
    root=empty("boss-mercury-hunter")
    root["forward"]="local -Z after glTF Y-up export";root["game_length_m"]=4.7;root["version"]="v2-hard-surface"
    body=empty("BodyPivot",(0,0,1.08),root)
    uv("Internal_Tendon_Cage",(0,-.10,1.08),(.57,1.47,.40),m["bio"],body)
    rod("Central_Spine",(0,-1.48,1.25),(0,1.42,1.25),.20,m["metal"],body)
    for x in (-.34,.34): rod("Spine_Rail",(x,-1.32,1.12),(x,1.28,1.12),.085,m["metal"],body)
    for i,y in enumerate((-1.22,-.72,-.22,.28,.78,1.20)):
        ring(f"Spine_Collar_{i+1:02d}",(0,y,1.25),.36,.07,m["metal"],body)
        if i<5:
            cylinder(f"WeakPoint_Capacitor_{i+1:02d}",(0,y+.25,1.25),.245,.34,m["glow"],body)
        for side in (-1,1):
            x=side*.42
            box(f"BackPlate_{i:02d}_{'L' if side<0 else 'R'}",(x,y,1.42),(.40,.33,.105),m["ceramic"],body,(0,side*.12,side*.16),.055)
            bolt("PanelFastener",(side*.67,y-.18,1.44),.045,m["metal"],body,(0,0,0))
    for side in (-1,1):
        cable("HydraulicBundle",[(side*.24,-1.35,1.0),(side*.48,-.25,.78),(side*.30,1.25,.96)],.045,m["metal"],body)
        cable("LivingNerve",[(side*.10,-1.4,1.08),(side*.30,-.1,.68),(side*.12,1.36,.84)],.038,m["bio"],body)
    head=empty("HeadPivot",(0,1.35,1.03),body,.28)
    prism("Head_Ceramic_Wedge",[(-.58,1.12),(.58,1.12),(.48,2.05),(.20,2.42),(-.20,2.42),(-.48,2.05)],.72,1.24,m["ceramic"],head,.07)
    prism("Head_Underslung_Jaw",[(-.34,1.45),(.34,1.45),(.22,2.35),(0,2.56),(-.22,2.35)],.55,.78,m["metal"],head,.035)
    uv("WeakPoint_Optic",(0,2.36,1.00),(.21,.10,.13),m["glow"],head)
    ring("OpticCollar",(0,2.25,1.00),.27,.055,m["metal"],head)
    for side in (-1,1):
        ring("BladeShoulder",(side*.54,1.54,.83),.22,.06,m["metal"],head,(0,math.pi/2,0))
        rod("BladeActuator",(side*.54,1.52,.84),(side*.70,2.05,.52),.09,m["metal"],head,radius2=.06)
        outline=[(side*.45,1.68),(side*.82,1.92),(side*.95,2.82),(side*.82,3.18),(side*.63,2.30)]
        if side<0: outline=list(reversed(outline))
        prism("DashBlade_L" if side<0 else "DashBlade_R",outline,.28,.49,m["metal"],head,.035)
        strip=[(side*.52,1.80),(side*.72,1.98),(side*.78,2.48),(side*.66,2.36)]
        if side<0: strip=list(reversed(strip))
        prism("BladeCeramicInlay",strip,.48,.53,m["ceramic"],head,.025)
    for pair,y in enumerate((-1.08,-.14,.80)):
        for side in (-1,1):
            hip=(side*.48,y,1.08);knee=(side*(1.00+.09*pair),y+.08, .66);ankle=(side*1.28,y+.24,.19);toe=(side*1.30,y+.42,.07)
            mechanical_leg(f"Leg_{pair+1}_{'L' if side<0 else 'R'}",hip,knee,ankle,toe,m,body,.13)
    return root


def hull_panel(name, x, y, z, scale, side, mats, parent, tilt=0):
    panel=box(name,(x,y,z),scale,mats["ceramic"],parent,(tilt,side*.11,side*.12),min(scale)*.12)
    for sy in (-.34,.34): bolt(name+"_Bolt",(x+side*scale[0]*.76,y+sy*scale[1],z+scale[2]*.94),.075,mats["metal"],parent,(0,0,0))
    return panel


def build_leviathan(m):
    root=empty("boss-scrap-leviathan")
    root["forward"]="local -Z after glTF Y-up export";root["game_length_m"]=16.2;root["version"]="v2-hard-surface"
    body=empty("BodyPivot",(0,0,3.25),root)
    centers=(-4.65,-1.55,1.55,4.65)
    sections=[]
    for i,y in enumerate(centers):
        pivot=empty(f"HullSection_{i+1}_Pivot",(0,y,3.25),body,.42);sections.append(pivot)
        uv("InternalHull",(0,y,3.05),(2.30,1.72,1.54),m["metal"],pivot,36)
        uv("OrganicSuspension",(0,y,2.92),(1.82,1.56,1.34),m["bio"],pivot,28)
        for band in (-1.15,0,1.15): ring("HullRib",(0,y+band,3.14),2.05,.13,m["metal"],pivot)
        for side in (-1,1):
            hull_panel("CeramicHullUpper",side*.76,y,4.62,(1.02,.73,.24),side,m,pivot,side*.04)
            hull_panel("CeramicHullFront",side*2.02,y+.72,3.64,(.40,.58,.72),side,m,pivot,side*.12)
            hull_panel("CeramicHullRear",side*2.02,y-.72,3.64,(.40,.58,.72),side,m,pivot,-side*.12)
            cylinder("VentStack",(side*1.22,y-.16,4.78),.18,.72,m["metal"],pivot,(0,0,0))
            box("VentGlow",(side*1.22,y-.34,4.80),(.075,.05,.25),m["glow"],pivot,bevel=.02)
            cable("HullPipe",[(side*1.78,y-1.25,3.10),(side*2.10,y,2.80),(side*1.72,y+1.28,3.20)],.075,m["metal"],pivot)
        # One exposed reactor per section breaks the caterpillar symmetry and
        # remains readable from the portrait gameplay camera.
        reactor_side=-1 if i%2==0 else 1
        reactor=empty(f"WeakPoint_SideReactor_{i+1}",(reactor_side*2.28,y+.12,3.12),pivot,.30)
        uv("ReactorCore",(reactor_side*2.32,y+.12,3.12),(.34,.58,.34),m["glow"],reactor,28)
        ring("ReactorGuard",(reactor_side*2.30,y+.12,3.12),.49,.09,m["metal"],reactor,(0,math.pi/2,0))
        for zoff in (-.43,.43):
            rod("ReactorBrace",(reactor_side*2.16,y-.38,3.12+zoff),(reactor_side*2.16,y+.62,3.12+zoff),.07,m["metal"],reactor)
        # Salvaged plates are intentionally mismatched, but large enough to
        # read as armour rather than surface decoration.
        scrap_side=1 if i in (0,3) else -1
        box(f"SalvagePlate_{i+1}",(scrap_side*.34,y-.18,5.02),(.82,.96,.10),m["ceramic"],pivot,(0,scrap_side*.08,scrap_side*.14),.10)
        box(f"SalvageBracket_{i+1}",(scrap_side*1.44,y+.42,4.50),(.18,.78,.32),m["metal"],pivot,(scrap_side*.12,0,scrap_side*.18),.05)
    for i in range(len(sections)-1):
        y0,y1=centers[i],centers[i+1]
        for side in (-1,1):
            rod("SectionFlexure",(side*1.35,y0+1.40,3.05),(side*1.35,y1-1.40,3.05),.22,m["bio"],body)
            rod("SectionHydraulic",(side*.78,y0+1.38,3.62),(side*.78,y1-1.38,3.62),.12,m["ceramic"],body)
        ring("ArticulationCollar",(0,(y0+y1)/2,3.14),1.88,.18,m["metal"],body)
    heart=empty("WeakPoint_UndersideHeart",(0,-.15,1.72),body,.50)
    uv("HeartCore",(0,-.15,1.62),(.86,.72,.95),m["glow"],heart,36)
    for i,a in enumerate((0,math.pi/2,math.pi,math.pi*1.5)):
        x,z=math.cos(a)*.92,1.66+math.sin(a)*.78
        rod("HeartRib",(x*.55,-.15,z),(x,-.15,z),.10,m["metal"],heart)
    for side in (-1,1): hull_panel("HeartArmour",side*.92,-.15,1.86,(.30,.74,.76),side,m,heart)
    for pair,y in enumerate((-5.35,-2.05,1.25,4.55)):
        section=sections[min(3,max(0,round((y-centers[0])/(centers[1]-centers[0]))))]
        for side in (-1,1):
            hip=(side*1.78,y,3.05);knee=(side*2.75,y+.16,2.08);ankle=(side*3.12,y+.42,.55);toe=(side*3.12,y+.74,.12)
            leg=mechanical_leg(f"DestroyableLeg_{pair+1}_{'L' if side<0 else 'R'}",hip,knee,ankle,toe,m,section,.29);leg["destructible"]=True
    head=empty("SalvageRamPivot",(0,6.2,2.95),sections[-1],.50)
    uv("RamSkull",(0,6.25,3.00),(1.54,1.36,1.15),m["metal"],head,32)
    prism("RamForeheadArmour",[(-1.28,5.80),(1.28,5.80),(1.12,7.12),(.58,7.62),(-.58,7.62),(-1.12,7.12)],3.48,4.18,m["ceramic"],head,.11)
    box("RamImpactBeam",(0,7.38,3.22),(1.58,.24,.25),m["metal"],head,(0,0,0),.07)
    uv("WeakPoint_CommandCore",(0,7.20,3.78),(.38,.20,.28),m["glow"],head,28)
    ring("CommandCoreGuard",(0,7.04,3.78),.46,.09,m["metal"],head)
    for side in (-1,1):
        hull_panel("RamCheek",side*.82,6.35,3.50,(.74,.82,.48),side,m,head)
        ring("JawJoint",(side*1.12,6.62,2.78),.30,.085,m["metal"],head,(0,math.pi/2,0))
        rod("JawActuator",(side*.72,6.10,2.92),(side*1.18,6.92,2.48),.16,m["ceramic"],head,radius2=.11)
        outline=[(side*.62,6.48),(side*1.28,6.84),(side*1.46,7.65),(side*1.10,8.02),(side*.92,7.18)]
        if side<0: outline=list(reversed(outline))
        prism("CrushingJaw_L" if side<0 else "CrushingJaw_R",outline,1.72,2.72,m["metal"],head,.07)
        for tooth in range(3):
            yy=7.18+tooth*.24
            outline=[(side*.95,yy),(side*1.28,yy+.05),(side*1.03,yy+.34)]
            if side<0: outline=list(reversed(outline))
            prism("JawTooth",outline,1.60,1.88,m["ceramic"],head,.025)
    cable("JawTendon",[(-.82,6.02,2.42),(0,7.22,2.05),(.82,6.02,2.42)],.11,m["bio"],head)
    return root


BUILDERS={"mercury":build_mercury,"leviathan":build_leviathan}


def bounds(root):
    bpy.context.view_layer.update()
    meshes=[o for o in [root,*root.children_recursive] if o.type=="MESH"]
    corners=[o.matrix_world@Vector(c) for o in meshes for c in o.bound_box]
    low=Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    high=Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    return low,high


def pack_refs(scene,spec):
    for path in (STYLE,CONCEPTS/spec["concept"]):
        image=bpy.data.images.load(str(path));image.pack()
    scene["style_reference"]="docs/references/biomecha-style-master.png"
    scene["concept_reference"]="output/imagegen/boss-concepts-v1/"+spec["concept"]
    scene["asset_status"]="v2-review-not-published"
    scene["coordinate_contract"]="metres; Blender Z-up; GLB Y-up; local -Z forward"


def review_scene(scene,root):
    low,high=bounds(root);center=(low+high)/2;span=max(high-low);floor_z=low.z-.035
    bpy.ops.mesh.primitive_plane_add(size=max(30,span*3),location=(center.x,center.y,floor_z))
    floor=bpy.context.object;floor.name="REVIEW_ONLY_Floor"
    fm=bpy.data.materials.new("REVIEW_ONLY_Stone");fm.diffuse_color=(.055,.065,.058,1);fm.roughness=.9;floor.data.materials.append(fm)
    for kind,loc,color,energy,size in (
        ("AREA",(center.x-span*.65,center.y+span*.65,high.z+span*.75),(1,.72,.44),span*230,span*.75),
        ("AREA",(center.x+span*.8,center.y-span*.40,center.z+span*.30),(.28,.65,.70),span*150,span*.60),
        ("AREA",(center.x,center.y-span*.15,high.z+span*.25),(.82,.92,.80),span*90,span*.45)):
        bpy.ops.object.light_add(type=kind,location=loc);light=bpy.context.object;light.name="REVIEW_ONLY_Light";light.data.energy=energy;light.data.shape="DISK";light.data.size=size;light.data.color=color;light.rotation_euler=(center-light.location).to_track_quat("-Z","Y").to_euler()
    camera_data=bpy.data.cameras.new("REVIEW_ONLY_Camera");camera=bpy.data.objects.new("REVIEW_ONLY_Camera",camera_data);scene.collection.objects.link(camera);scene.camera=camera;camera.data.type="ORTHO"
    return camera,center,span


def aim(camera,center,span,angle,game=False):
    if game:
        camera.location=center+Vector((span*.62,span*.72,span*1.08));camera.data.ortho_scale=span*1.28
    else:
        camera.location=center+Vector((math.sin(angle)*span*1.0,math.cos(angle)*span*1.0,span*.55));camera.data.ortho_scale=span*1.17
    camera.rotation_euler=(center-camera.location).to_track_quat("-Z","Y").to_euler()


def export(key):
    spec=SPECS[key];scene=reset();m=materials(1201+(0 if key=="mercury" else 131));root=BUILDERS[key](m);pack_refs(scene,spec)
    low,high=bounds(root);actual=high-low;root["bounds_m"]=[round(v,3) for v in actual]
    root["asset_id"]=spec["id"];root["title_ru"]=spec["title"]
    bpy.ops.object.select_all(action="DESELECT");root.select_set(True)
    for obj in root.children_recursive: obj.select_set(True)
    bpy.context.view_layer.objects.active=root
    glb=GLB/f"{spec['id']}.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format="GLB",use_selection=True,export_apply=False,export_yup=True,export_animations=False,export_cameras=False,export_lights=False)
    camera,center,span=review_scene(scene,root);folder=RENDERS/spec["id"];(folder/"turntable").mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x=900;scene.render.resolution_y=900;aim(camera,center,span,math.radians(32));scene.render.filepath=str(folder/"neutral.png");bpy.ops.render.render(write_still=True)
    scene.render.resolution_x=520;scene.render.resolution_y=520
    for deg in (0,90,180,270): aim(camera,center,span,math.radians(deg));scene.render.filepath=str(folder/"turntable"/f"turn-{deg:03d}.png");bpy.ops.render.render(write_still=True)
    scene.render.resolution_x=576;scene.render.resolution_y=1024;aim(camera,center,span,0,True);scene.render.filepath=str(folder/"game-camera.png");bpy.ops.render.render(write_still=True)
    blend=OUT/f"{spec['id']}.blend";bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    meshes=[o for o in [root,*root.children_recursive] if o.type=="MESH"]
    for o in meshes:o.data.calc_loop_triangles()
    return {**spec,"blend":str(blend.relative_to(ROOT)),"glb":str(glb.relative_to(ROOT)),"neutral":str((folder/'neutral.png').relative_to(ROOT)),"game_camera":str((folder/'game-camera.png').relative_to(ROOT)),"bounds_m":[round(v,3) for v in actual],"objects":len(root.children_recursive),"triangles":sum(len(o.data.loop_triangles) for o in meshes),"materials":4,"status":"v2-review-not-published"}


def main():
    args=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else list(SPECS)
    keys=list(SPECS) if not args or "all" in args else args
    unknown=[k for k in keys if k not in SPECS]
    if unknown: raise SystemExit("Unknown boss keys: "+", ".join(unknown))
    items=[]
    for key in keys:
        print("BUILDING_V2",key,flush=True);item=export(key);items.append(item);print("BUILT_V2",item["id"],item["bounds_m"],item["triangles"],flush=True)
    manifest_path=OUT/"manifest.json"
    previous={}
    if manifest_path.exists():
        previous={item["id"]:item for item in json.loads(manifest_path.read_text()).get("assets",[])}
    previous.update({item["id"]:item for item in items})
    ordered=[previous[spec["id"]] for spec in SPECS.values() if spec["id"] in previous]
    manifest_path.write_text(json.dumps({"version":2,"published":False,"assets":ordered},ensure_ascii=False,indent=2)+"\n")
    print("BOSSES_V2_COMPLETE",len(items),flush=True)


if __name__=="__main__":main()
