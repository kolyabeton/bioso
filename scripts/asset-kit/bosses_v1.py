"""Build the five approved BIOSO boss prototypes as reproducible Blender sources.

The script creates separate .blend and GLB files plus neutral, game-camera, and
four-angle review renders. It never publishes into public/assets or modifies the
running/frozen game.

Usage:
  blender --background --python scripts/asset-kit/bosses_v1.py -- mercury leviathan
  blender --background --python scripts/asset-kit/bosses_v1.py -- all
"""

import json
import math
import random
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "blender-bosses-v1"
GLB = OUT / "glb"
RENDERS = OUT / "renders"
CONCEPTS = ROOT / "output" / "imagegen" / "boss-concepts-v1"
STYLE = ROOT / "docs" / "references" / "biomecha-style-master.png"
OUT.mkdir(parents=True, exist_ok=True)
GLB.mkdir(parents=True, exist_ok=True)
RENDERS.mkdir(parents=True, exist_ok=True)

SPECS = {
    "mercury": {
        "id": "boss-mercury-hunter",
        "title": "Ртутный Ловчий",
        "concept": "boss-mercury-hunter-concept-v1.png",
        "size_m": [3.9, 4.4, 1.9],
    },
    "leviathan": {
        "id": "boss-scrap-leviathan",
        "title": "Свалочный Левиафан",
        "concept": "boss-scrap-leviathan-concept-v1.png",
        "size_m": [6.2, 15.8, 6.1],
    },
    "cathedral": {
        "id": "boss-root-cathedral",
        "title": "Корневой Собор",
        "concept": "boss-root-cathedral-concept-v1.png",
        "size_m": [8.2, 8.0, 10.0],
    },
    "mirror": {
        "id": "boss-mirror-collector",
        "title": "Зеркальный Сборщик",
        "concept": "boss-mirror-collector-concept-v2.png",
        "size_m": [4.4, 3.7, 4.8],
    },
    "shepherd": {
        "id": "boss-swarm-shepherd",
        "title": "Пастырь Роя",
        "concept": "boss-swarm-shepherd-concept-v1.png",
        "size_m": [6.3, 5.0, 5.7],
    },
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.image_settings.color_depth = "8"
    scene.world = bpy.data.worlds.new("Cool ambient world")
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (0.055, 0.07, 0.065, 1)
    bg.inputs["Strength"].default_value = 0.42
    return scene


def make_materials(seed):
    rng = random.Random(seed)

    def material(name, color, metallic, roughness, emission=None):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        image = bpy.data.images.new(name + " wear", width=64, height=64)
        pixels = []
        for y in range(64):
            for x in range(64):
                grain = rng.uniform(-0.06, 0.06)
                stain = math.sin(x * 0.19 + math.sin(y * 0.11)) * math.sin(y * 0.14) * 0.07
                chip = 0.42 if rng.random() < 0.012 else 1.0
                pixels.extend([max(0.0, min(1.0, (c + grain + stain) * chip)) for c in color] + [1.0])
        image.pixels = pixels
        image.pack()
        tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.image = image
        mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if emission:
            emission_color = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            emission_strength = bsdf.inputs.get("Emission Strength")
            if emission_color:
                emission_color.default_value = (*emission, 1)
            if emission_strength:
                emission_strength.default_value = 4.0
        return mat

    return {
        "ceramic": material("Weathered warm ivory ceramic", (0.64, 0.61, 0.52), 0.06, 0.78),
        "metal": material("Aged matte industrial steel", (0.075, 0.095, 0.09), 0.78, 0.55),
        "bio": material("Desaturated living tendon", (0.16, 0.20, 0.115), 0.03, 0.88),
        "glow": material("Restrained mint biolight", (0.10, 0.36, 0.30), 0.24, 0.34, (0.17, 0.92, 0.72)),
    }


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.empty_display_type = "ARROWS"
    obj.empty_display_size = 0.22
    if parent:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj


def finish(obj, name, mat, parent=None, bevel=0.0):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    if obj.type == "MESH":
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        if bevel > 0:
            modifier = obj.modifiers.new("Structural edge rounding", "BEVEL")
            modifier.width = bevel
            modifier.segments = 2
    return obj


def sphere(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent)


def uv_sphere(name, location, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent)


def box(name, location, scale, mat, parent=None, rotation=(0, 0, 0), bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent, bevel)


def cone(name, location, radius1, radius2, depth, mat, parent=None, rotation=(0, 0, 0), vertices=16):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=location, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent)


def rod(name, a, b, radius, mat, parent=None, radius2=None, vertices=14):
    a = Vector(a)
    b = Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius,
        radius2=radius if radius2 is None else radius2,
        depth=delta.length,
        location=(a + b) / 2,
    )
    obj = bpy.context.object
    obj.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, mat, parent)


def torus(name, location, major, minor, mat, parent=None, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=28,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    return finish(bpy.context.object, name, mat, parent)


def plate(name, location, scale, mat, parent=None, rotation=(0, 0, 0)):
    obj = sphere(name, location, scale, mat, parent)
    obj.rotation_euler = rotation
    return obj


def jointed_leg(prefix, hip, knee, ankle, foot, mats, parent, thickness=0.13):
    pivot = empty(prefix + "_HipPivot", hip, parent)
    rod(prefix + "_UpperStrut", hip, knee, thickness * 1.15, mats["metal"], pivot)
    plate(prefix + "_UpperArmour", Vector(hip).lerp(Vector(knee), 0.48), (thickness * 2.2, thickness * 2.8, thickness * 3.7), mats["ceramic"], pivot)
    sphere(prefix + "_KneeJoint", knee, (thickness * 1.55,) * 3, mats["metal"], pivot)
    rod(prefix + "_LowerStrut", knee, ankle, thickness, mats["metal"], pivot)
    plate(prefix + "_LowerArmour", Vector(knee).lerp(Vector(ankle), 0.55), (thickness * 1.9, thickness * 2.3, thickness * 3.0), mats["ceramic"], pivot)
    sphere(prefix + "_AnkleJoint", ankle, (thickness * 1.25,) * 3, mats["metal"], pivot)
    rod(prefix + "_Foot", ankle, foot, thickness * 0.8, mats["metal"], pivot, radius2=thickness * 0.45)
    for side in (-1, 0, 1):
        toe = Vector(foot) + Vector((side * thickness * 1.3, thickness * 2.0, -thickness * 0.15))
        rod(prefix + f"_Toe_{side + 2}", foot, toe, thickness * 0.36, mats["metal"], pivot, radius2=0.015)
    return pivot


def add_armour_band(prefix, center, scale, mats, parent, count=6):
    for index in range(count):
        angle = index * math.tau / count
        location = Vector(center) + Vector((math.cos(angle) * scale[0], math.sin(angle) * scale[1], 0))
        plate(prefix + f"_{index + 1:02d}", location, (scale[0] * 0.44, scale[1] * 0.24, scale[2]), mats["ceramic"], parent, (0, 0, angle))


def build_mercury(m):
    root = empty("Root")
    root["forward"] = "Blender +Y exports as glTF local -Z"
    root["game_length_m"] = 4.0
    body = empty("BodyPivot", (0, 0, 1.05), root)
    uv_sphere("TendonChassis", (0, -0.15, 1.05), (0.54, 1.52, 0.42), m["bio"], body)
    for y, width in [(-1.05, 0.53), (-0.35, 0.60), (0.38, 0.57), (1.00, 0.47)]:
        plate("SplitCeramicBackPlate", (0, y, 1.30), (width, 0.42, 0.22), m["ceramic"], body)
    head = empty("HeadPivot", (0, 1.56, 0.98), body)
    cone("WedgeHead", (0, 1.72, 0.96), 0.48, 0.05, 1.25, m["ceramic"], head, (math.pi / 2, 0, 0), 6)
    uv_sphere("Optic", (0, 2.16, 0.96), (0.20, 0.10, 0.12), m["glow"], head)
    spine = empty("WeakPoint_SpinalCapacitor", (0, -0.1, 1.49), body)
    for index, y in enumerate([-0.92, -0.48, -0.04, 0.40, 0.84]):
        uv_sphere(f"Capacitor_{index + 1:02d}", (0, y, 1.52), (0.19, 0.24, 0.15), m["glow"], spine)
        torus(f"CapacitorCollar_{index + 1:02d}", (0, y, 1.52), 0.25, 0.045, m["metal"], spine, (math.pi / 2, 0, 0))
    for pair, y in enumerate([-0.9, 0.0, 0.92]):
        for side in (-1, 1):
            hip = (side * 0.45, y, 1.12)
            knee = (side * (1.05 + 0.08 * pair), y + (0.10 if pair == 1 else -0.04), 0.68)
            ankle = (side * 1.20, y + (0.32 if pair == 0 else -0.18), 0.20)
            foot = (side * 1.17, y + 0.42, 0.08)
            jointed_leg(f"Leg_{pair + 1}_{'L' if side < 0 else 'R'}", hip, knee, ankle, foot, m, body, 0.12)
    for side in (-1, 1):
        blade = empty("Blade_L" if side < 0 else "Blade_R", (side * 0.43, 1.48, 0.75), head)
        rod("BladeActuator", (side * 0.43, 1.45, 0.78), (side * 0.65, 2.02, 0.42), 0.105, m["metal"], blade, radius2=0.07)
        cone("DashBlade", (side * 0.72, 2.42, 0.26), 0.16, 0.015, 1.20, m["metal"], blade, (math.pi / 2, 0, side * 0.12), 4)
        plate("BladeCeramicGuard", (side * 0.54, 1.82, 0.64), (0.19, 0.42, 0.12), m["ceramic"], blade)
    return root


def build_leviathan(m):
    root = empty("Root")
    root["forward"] = "Blender +Y exports as glTF local -Z"
    root["game_length_m"] = 16.0
    body = empty("BodyPivot", (0, 0, 3.15), root)
    sections = []
    for index, y in enumerate([-4.35, 0, 4.30]):
        section = empty(f"HullSection_{index + 1}_Pivot", (0, y, 3.25), body)
        sections.append(section)
        uv_sphere("StructuralHull", (0, y, 3.20), (2.45 if index == 1 else 2.18, 2.65, 1.78), m["metal"], section)
        for side in (-1, 1):
            plate("CeramicHullPlate", (side * 1.20, y, 4.05), (1.28, 2.22, 0.60), m["ceramic"], section, (0, side * 0.11, side * 0.08))
        for band_y in (-1.42, 0, 1.42):
            torus("StructuralRib", (0, y + band_y, 3.18), 2.05, 0.15, m["metal"], section, (math.pi / 2, 0, 0))
        uv_sphere("Vent_L", (-1.80, y + 0.15, 3.48), (0.20, 0.34, 0.42), m["glow"], section)
        uv_sphere("Vent_R", (1.80, y + 0.15, 3.48), (0.20, 0.34, 0.42), m["glow"], section)
    for a, b in zip(sections, sections[1:]):
        for side in (-1, 1):
            rod("HullFlexure", (side * 1.45, a.location.y + 2.10, 3.15), (side * 1.45, b.location.y - 2.10, 3.15), 0.25, m["bio"], body)
    heart = empty("WeakPoint_UndersideHeart", (0, 0.15, 1.75), sections[1])
    uv_sphere("HeartCore", (0, 0.15, 1.70), (0.80, 0.58, 0.90), m["glow"], heart)
    for side in (-1, 1):
        plate("HeartArmourRib", (side * 0.86, 0.15, 1.85), (0.34, 0.95, 0.85), m["ceramic"], heart, (0, side * 0.18, 0))
    for pair, y in enumerate([-4.65, -1.62, 1.62, 4.50]):
        section = sections[min(2, pair // 2 + (1 if pair == 2 else 0))]
        for side in (-1, 1):
            hip = (side * 1.70, y, 3.05)
            knee = (side * 2.75, y + (0.26 if pair % 2 else -0.18), 2.05)
            ankle = (side * 2.95, y + 0.58, 0.52)
            foot = (side * 2.92, y + 0.82, 0.12)
            pivot = jointed_leg(f"DestroyableLeg_{pair + 1}_{'L' if side < 0 else 'R'}", hip, knee, ankle, foot, m, section, 0.27)
            pivot["destructible"] = True
    head = empty("SalvageRamPivot", (0, 6.20, 2.70), sections[2])
    rod("RamSpine", (0, 5.25, 2.80), (0, 6.80, 2.60), 0.42, m["metal"], head, radius2=0.27)
    for side in (-1, 1):
        claw = empty("SalvageClaw_L" if side < 0 else "SalvageClaw_R", (side * 0.62, 6.70, 2.62), head)
        rod("ClawBase", (side * 0.55, 6.35, 2.65), (side * 0.92, 7.05, 2.50), 0.23, m["metal"], claw, radius2=0.14)
        cone("CrushingTip", (side * 1.00, 7.45, 2.38), 0.22, 0.02, 0.95, m["metal"], claw, (math.pi / 2, 0, side * 0.20), 5)
        plate("ClawCeramicGuard", (side * 0.72, 6.72, 2.82), (0.38, 0.70, 0.25), m["ceramic"], claw)
    return root


def build_cathedral(m):
    root = empty("Root")
    root["forward"] = "Blender +Y exports as glTF local -Z"
    trunk = empty("BodyPivot", (0, 0, 0), root)
    for index, z in enumerate([1.2, 2.8, 4.5, 6.2, 7.8]):
        radius = 1.32 - index * 0.12
        cone("TrunkSegment", (0, 0, z), radius, radius * 0.82, 2.0, m["bio"], trunk, (0, 0, index * 0.17), 12)
        for side in (-1, 1):
            plate("TrunkCeramicRib", (side * radius * 0.78, 0.12, z + 0.08), (0.42, 0.75, 0.82), m["ceramic"], trunk, (0, side * 0.12, side * 0.10))
    heart = empty("WeakPoint_CentralHeart", (0, 1.08, 5.20), trunk)
    uv_sphere("HeartCore", (0, 1.18, 5.20), (0.74, 0.30, 0.82), m["glow"], heart)
    torus("HeartCollar", (0, 1.04, 5.20), 0.92, 0.16, m["metal"], heart, (math.pi / 2, 0, 0))
    for index, angle in enumerate([math.radians(90), math.radians(210), math.radians(330)]):
        direction = Vector((math.cos(angle), math.sin(angle), 0))
        node_pos = direction * 3.25
        pivot = empty(f"DestroyableRootNode_{index + 1}", (*node_pos.xy, 0.62), root)
        pivot["destructible"] = True
        rod("RootTendon", (direction.x * 0.65, direction.y * 0.65, 1.15), (*node_pos.xy, 0.55), 0.32, m["bio"], pivot, radius2=0.46)
        uv_sphere("FeedingNode", (*node_pos.xy, 0.62), (0.78, 0.78, 0.70), m["metal"], pivot)
        for petal in range(4):
            a = petal * math.tau / 4
            plate("NodeCeramicPetal", (node_pos.x + math.cos(a) * 0.62, node_pos.y + math.sin(a) * 0.62, 0.78), (0.42, 0.28, 0.34), m["ceramic"], pivot, (0, 0, a))
        uv_sphere("NodeBiolight", (*node_pos.xy, 0.72), (0.31, 0.31, 0.30), m["glow"], pivot)
    for index, angle in enumerate([0.25, 1.42, 2.64, 3.85, 5.10]):
        end = Vector((math.cos(angle) * 2.35, math.sin(angle) * 2.35, 8.6 + 0.6 * math.sin(angle * 2)))
        start = Vector((math.cos(angle) * 0.75, math.sin(angle) * 0.75, 6.9))
        branch = empty(f"SeedBell_{index + 1}_Pivot", start, trunk)
        rod("SeedBellStem", start, end, 0.20, m["bio"], branch, radius2=0.12)
        cone("SeedBellShell", end + Vector((0, 0, 0.30)), 0.62, 0.20, 1.25, m["ceramic"], branch, vertices=8)
        uv_sphere("SeedBellGlow", end + Vector((0, 0, -0.22)), (0.28, 0.28, 0.35), m["glow"], branch)
    for angle in [0.2, 0.9, 1.8, 2.8, 3.7, 4.6, 5.5]:
        start = Vector((math.cos(angle) * 0.5, math.sin(angle) * 0.5, 0.8))
        end = Vector((math.cos(angle) * 4.0, math.sin(angle) * 4.0, 0.10))
        rod("ArticulatedRoot", start, end, 0.28, m["metal"], root, radius2=0.12)
        for t in (0.38, 0.68):
            p = start.lerp(end, t)
            plate("RootArmour", p, (0.38, 0.65, 0.22), m["ceramic"], root, (0, 0, angle))
    return root


def build_mirror(m):
    root = empty("Root")
    root["forward"] = "Blender +Y exports as glTF local -Z"
    base = empty("QuadBasePivot", (0, 0, 0.72), root)
    uv_sphere("SurgicalBase", (0, 0, 0.72), (1.20, 1.02, 0.50), m["metal"], base)
    for index, (x, y) in enumerate([(-0.8, -0.55), (0.8, -0.55), (-0.8, 0.55), (0.8, 0.55)]):
        hip = (x, y, 0.78)
        knee = (x * 1.65, y * 1.55, 0.48)
        ankle = (x * 1.82, y * 1.72, 0.18)
        foot = (x * 1.90, y * 1.94, 0.08)
        jointed_leg(f"SupportLeg_{index + 1}", hip, knee, ankle, foot, m, base, 0.14)
    frame = empty("OperatingFramePivot", (0, 0, 1.05), base)
    rod("MemorySpineHousing", (0, 0, 1.02), (0, 0, 4.20), 0.34, m["metal"], frame)
    for index, z in enumerate([1.35, 1.80, 2.25, 2.70, 3.15, 3.60, 4.05]):
        uv_sphere(f"MemoryCell_{index + 1:02d}", (0, 0.16, z), (0.23, 0.20, 0.22), m["glow"], frame)
    mirror = empty("WeakPoint_OpticalMirror", (0, 0.58, 3.05), frame)
    torus("MirrorRetainingRing", (0, 0.62, 3.05), 1.02, 0.18, m["metal"], mirror, (math.pi / 2, 0, 0))
    uv_sphere("SmokyMirror", (0, 0.69, 3.05), (0.88, 0.15, 0.88), m["glow"], mirror)
    for side in (-1, 1):
        plate("SplitUpperArmour", (side * 0.66, 0.0, 4.08), (0.68, 0.62, 0.32), m["ceramic"], frame, (0, side * 0.22, side * 0.12))
        rail = empty("SocketRail_L" if side < 0 else "SocketRail_R", (side * 0.95, 0.10, 3.20), frame)
        rod("LinearRail", (side * 0.68, 0.05, 3.35), (side * 1.60, 0.34, 2.78), 0.16, m["metal"], rail)
        socket = empty("WeaponSocket_L" if side < 0 else "WeaponSocket_R", (side * 1.62, 0.43, 2.76), rail)
        torus("EmptyUniversalSocket", (side * 1.62, 0.48, 2.76), 0.42, 0.11, m["metal"], socket, (math.pi / 2, 0, 0))
        for petal in range(3):
            a = petal * math.tau / 3
            plate("SocketClampPetal", (side * 1.62 + math.cos(a) * 0.45, 0.48, 2.76 + math.sin(a) * 0.45), (0.19, 0.12, 0.29), m["ceramic"], socket, (0, 0, -a))
    return root


def build_shepherd(m):
    root = empty("Root")
    root["forward"] = "Blender +Y exports as glTF local -Z"
    body = empty("BodyPivot", (0, 0, 4.25), root)
    uv_sphere("LiftMembrane", (0, 0, 4.30), (2.52, 1.86, 0.86), m["bio"], body)
    torus("ControlRing", (0, 0, 4.18), 1.70, 0.20, m["metal"], body, (0, 0, 0))
    for index, angle in enumerate([0.12, 1.36, 2.62, 3.86, 5.18]):
        location = (math.cos(angle) * 1.68, math.sin(angle) * 1.18, 4.70 + 0.08 * math.sin(angle))
        plate("ShellPetal", location, (1.06, 0.72, 0.32), m["ceramic"], body, (0.10 * math.sin(angle), 0.08 * math.cos(angle), angle))
    for index, angle in enumerate([math.radians(90), math.radians(210), math.radians(330)]):
        location = (math.cos(angle) * 1.73, math.sin(angle) * 1.28, 4.32)
        node = empty(f"CommandNode_{index + 1}", location, body)
        uv_sphere("CommandBiolight", location, (0.30, 0.24, 0.30), m["glow"], node)
        torus("CommandCollar", location, 0.36, 0.08, m["metal"], node, (math.pi / 2, 0, 0))
    core = empty("WeakPoint_UndersideCore", (0, 0.25, 3.42), body)
    uv_sphere("UndersideCore", (0, 0.25, 3.38), (0.62, 0.52, 0.72), m["glow"], core)
    for side in (-1, 1):
        plate("CoreShell", (side * 0.62, 0.20, 3.48), (0.34, 0.64, 0.76), m["ceramic"], core, (0, side * 0.18, 0))
    for index, angle in enumerate([0.45, 2.30, 3.98, 5.58]):
        start = Vector((math.cos(angle) * 1.62, math.sin(angle) * 1.20, 4.08))
        mid = Vector((math.cos(angle) * 2.05, math.sin(angle) * 1.62, 2.10))
        foot = Vector((math.cos(angle) * 2.35, math.sin(angle) * 2.00, 0.12))
        pivot = empty(f"GroundTendril_{index + 1}_Pivot", start, body)
        rod("TendrilUpper", start, mid, 0.12, m["metal"], pivot, radius2=0.10)
        sphere("TendrilJoint", mid, (0.19, 0.19, 0.19), m["metal"], pivot)
        rod("TendrilLower", mid, foot, 0.10, m["metal"], pivot, radius2=0.06)
        for claw in (-1, 0, 1):
            tip = foot + Vector((math.cos(angle + claw * 0.34) * 0.38, math.sin(angle + claw * 0.34) * 0.38, -0.04))
            rod("GroundClaw", foot, tip, 0.06, m["metal"], pivot, radius2=0.015)
    return root


BUILDERS = {
    "mercury": build_mercury,
    "leviathan": build_leviathan,
    "cathedral": build_cathedral,
    "mirror": build_mirror,
    "shepherd": build_shepherd,
}


def model_bounds(root):
    bpy.context.view_layer.update()
    meshes = [obj for obj in [root, *root.children_recursive] if obj.type == "MESH"]
    corners = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    low = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
    return low, high


def add_review_scene(scene, root, asset_id):
    low, high = model_bounds(root)
    center = (low + high) / 2
    span = max(high - low)
    floor_z = low.z - 0.04
    bpy.ops.mesh.primitive_plane_add(size=max(30, span * 3), location=(center.x, center.y, floor_z))
    floor = bpy.context.object
    floor.name = "REVIEW_ONLY_Floor"
    floor_mat = bpy.data.materials.new("REVIEW_ONLY_Fractured gray ground")
    floor_mat.diffuse_color = (0.13, 0.145, 0.13, 1)
    floor.data.materials.append(floor_mat)
    bpy.ops.object.light_add(type="AREA", location=(center.x - span * 0.8, center.y + span * 0.7, high.z + span * 0.9))
    key = bpy.context.object
    key.name = "REVIEW_ONLY_Warm upper left"
    key.data.energy = max(900, span * 190)
    key.data.shape = "DISK"
    key.data.size = span * 0.9
    key.data.color = (1.0, 0.78, 0.56)
    key.rotation_euler = (center - key.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.light_add(type="AREA", location=(center.x + span, center.y - span * 0.4, center.z + span * 0.4))
    fill = bpy.context.object
    fill.name = "REVIEW_ONLY_Cool fill"
    fill.data.energy = max(650, span * 120)
    fill.data.size = span
    fill.data.color = (0.48, 0.68, 0.86)
    fill.rotation_euler = (center - fill.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("REVIEW_ONLY_Camera")
    camera = bpy.data.objects.new("REVIEW_ONLY_Camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera_data.type = "ORTHO"
    return camera, center, span, floor


def point_camera(camera, center, span, angle, game=False):
    if game:
        offset = Vector((span * 0.58, span * 0.82, span * 1.05))
        camera.data.ortho_scale = span * 1.34
    else:
        offset = Vector((math.sin(angle) * span * 1.05, math.cos(angle) * span * 1.05, span * 0.62))
        camera.data.ortho_scale = span * 1.22
    camera.location = center + offset
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()


def pack_references(scene, spec):
    for path in [STYLE, CONCEPTS / spec["concept"]]:
        image = bpy.data.images.load(str(path))
        image.pack()
    scene["style_reference"] = "docs/references/biomecha-style-master.png"
    scene["concept_reference"] = "output/imagegen/boss-concepts-v1/" + spec["concept"]
    scene["asset_status"] = "prototype-not-published"
    scene["coordinate_contract"] = "metres; Blender Z-up; GLB Y-up; local -Z forward"


def export_asset(key):
    spec = SPECS[key]
    scene = reset()
    mats = make_materials(709 + list(SPECS).index(key) * 101)
    root = BUILDERS[key](mats)
    root.name = spec["id"]
    root["asset_id"] = spec["id"]
    root["title_ru"] = spec["title"]
    root["prototype"] = True
    pack_references(scene, spec)
    low, high = model_bounds(root)
    actual = [round(high.x - low.x, 3), round(high.y - low.y, 3), round(high.z - low.z, 3)]
    root["bounds_m"] = actual

    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    glb_path = GLB / f"{spec['id']}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb_path),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
    )

    camera, center, span, floor = add_review_scene(scene, root, spec["id"])
    asset_render_dir = RENDERS / spec["id"]
    turn_dir = asset_render_dir / "turntable"
    turn_dir.mkdir(parents=True, exist_ok=True)
    point_camera(camera, center, span, math.radians(28))
    scene.render.resolution_x = 1100
    scene.render.resolution_y = 1100
    scene.render.filepath = str(asset_render_dir / "neutral.png")
    bpy.ops.render.render(write_still=True)
    for degrees in (0, 90, 180, 270):
        point_camera(camera, center, span, math.radians(degrees))
        scene.render.resolution_x = 640
        scene.render.resolution_y = 640
        scene.render.filepath = str(turn_dir / f"turn-{degrees:03d}.png")
        bpy.ops.render.render(write_still=True)
    point_camera(camera, center, span, 0, game=True)
    scene.render.resolution_x = 720
    scene.render.resolution_y = 1280
    scene.render.filepath = str(asset_render_dir / "game-camera.png")
    bpy.ops.render.render(write_still=True)

    blend_path = OUT / f"{spec['id']}.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    meshes = [obj for obj in [root, *root.children_recursive] if obj.type == "MESH"]
    triangles = 0
    vertices = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        vertices += len(obj.data.vertices)
    return {
        **spec,
        "blend": str(blend_path.relative_to(ROOT)),
        "glb": str(glb_path.relative_to(ROOT)),
        "neutral": str((asset_render_dir / "neutral.png").relative_to(ROOT)),
        "game_camera": str((asset_render_dir / "game-camera.png").relative_to(ROOT)),
        "turntable": [str((turn_dir / f"turn-{degrees:03d}.png").relative_to(ROOT)) for degrees in (0, 90, 180, 270)],
        "actual_bounds_m": actual,
        "vertices": vertices,
        "triangles": triangles,
        "materials": 4,
        "status": "prototype-not-published",
    }


def build_drone():
    key = "shepherd"
    scene = reset()
    mats = make_materials(1709)
    root = empty("enemy-swarm-drone")
    root["forward"] = "Blender +Y exports as glTF local -Z"
    root["game_width_m"] = 0.6
    body = empty("BodyPivot", (0, 0, 0.32), root)
    uv_sphere("DroneCore", (0, 0, 0.32), (0.21, 0.26, 0.20), mats["glow"], body)
    for side in (-1, 1):
        plate("DroneWing", (side * 0.23, -0.01, 0.36), (0.24, 0.18, 0.07), mats["ceramic"], body, (0, side * 0.22, side * 0.18))
        rod("WingHinge", (side * 0.10, 0, 0.34), (side * 0.26, 0, 0.38), 0.035, mats["metal"], body)
    cone("DroneStinger", (0, -0.30, 0.24), 0.07, 0.01, 0.38, mats["metal"], body, (math.pi / 2, 0, 0), 8)
    pack_references(scene, SPECS[key])
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for obj in root.children_recursive:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    path = GLB / "enemy-swarm-drone.glb"
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True, export_yup=True, export_animations=False, export_cameras=False, export_lights=False)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "enemy-swarm-drone.blend"))
    return {"id": "enemy-swarm-drone", "title": "Дрон Пастыря", "blend": str((OUT / "enemy-swarm-drone.blend").relative_to(ROOT)), "glb": str(path.relative_to(ROOT)), "status": "prototype-not-published"}


def main():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else ["all"]
    keys = list(SPECS) if not args or "all" in args else args
    unknown = [key for key in keys if key not in SPECS]
    if unknown:
        raise SystemExit("Unknown boss keys: " + ", ".join(unknown))
    manifest_path = OUT / "manifest.json"
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"version": 1, "assets": []}
    by_id = {item["id"]: item for item in previous.get("assets", [])}
    for key in keys:
        print("BUILDING", key, flush=True)
        result = export_asset(key)
        by_id[result["id"]] = result
        print("BUILT", result["id"], result["actual_bounds_m"], result["triangles"], flush=True)
    if "shepherd" in keys:
        drone = build_drone()
        by_id[drone["id"]] = drone
    manifest = {
        "version": 1,
        "style_reference": "docs/references/biomecha-style-master.png",
        "published": False,
        "assets": list(by_id.values()),
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print("BOSSES_V1_COMPLETE", len(keys), flush=True)


if __name__ == "__main__":
    main()
