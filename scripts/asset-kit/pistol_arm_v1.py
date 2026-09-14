"""Build the compact pistol-arm GLB used by the survival starter weapon.

Run with:
  blender --background --python scripts/asset-kit/pistol_arm_v1.py
"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector

PROJECT = Path(__file__).resolve().parents[2]
KIT = PROJECT / "public/assets/kit"
OUT = PROJECT / "output/blender-pistol-arm-v1"
OUT.mkdir(parents=True, exist_ok=True)
KIT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
rng = random.Random(91026)


def material(name, color, metal=0.0, rough=0.72, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Roughness"].default_value = rough
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 2.4
    image = bpy.data.images.new(name + " wear", width=128, height=128)
    pixels = []
    for y in range(128):
        for x in range(128):
            grain = rng.uniform(-0.055, 0.055)
            stain = math.sin(x * 0.081 + math.sin(y * 0.057) * 2) * math.sin(y * 0.093) * 0.075
            chip = 0.42 if rng.random() < 0.012 else 1
            pixels.extend([max(0, min(1, (channel + grain + stain) * chip)) for channel in color] + [1])
    image.pixels = pixels
    image.pack()
    texture = mat.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    mat.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


ceramic = material("Worn warm ivory ceramic", (0.68, 0.66, 0.57), 0.08, 0.8)
steel = material("Oxidised dark steel", (0.095, 0.12, 0.115), 0.76, 0.58)
collar = material("Patinated collar", (0.24, 0.225, 0.16), 0.68, 0.7)
tendon = material("Olive tendon sheath", (0.16, 0.205, 0.12), 0.04, 0.9)
mint = material("Restrained mint optic", (0.18, 0.48, 0.4), 0.25, 0.34, (0.16, 0.8, 0.66))

root = bpy.data.objects.new("arm-pistol-v1", None)
bpy.context.scene.collection.objects.link(root)
objects = []


def finish(obj, name, mat, parent=root):
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    objects.append(obj)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def sphere(name, location, scale, mat, parent=root):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent)


def rod(name, start, end, radius_start, radius_end, mat, vertices=20, parent=root):
    start, end = Vector(start), Vector(end)
    direction = end - start
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_start,
        radius2=radius_end,
        depth=direction.length,
        location=(start + end) / 2,
    )
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, mat, parent)


def box(name, location, scale, mat, bevel=0.035, parent=root):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Machined rounded edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish(obj, name, mat, parent)


def torus(name, location, major, minor, mat, parent=root):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=32,
        minor_segments=10,
        location=location,
    )
    return finish(bpy.context.object, name, mat, parent)


# Shoulder socket and upper arm: this is visibly a limb attachment, not a gun grip.
rod("Shoulder socket", (0, 0, 0.09), (0, 0, -0.09), 0.24, 0.24, steel, 28)
torus("Shoulder retaining collar", (0, 0, 0), 0.245, 0.052, collar)
for index in range(8):
    angle = index * math.tau / 8
    sphere(
        "Shoulder recessed fastener",
        (0.245 * math.cos(angle), 0.245 * math.sin(angle), 0),
        (0.022, 0.022, 0.03),
        steel,
    )
rod("Upper arm core", (0, 0, -0.08), (0.035, 0, -0.55), 0.18, 0.145, steel)
box("Upper ceramic shell left", (-0.12, 0, -0.31), (0.13, 0.255, 0.42), ceramic, 0.055)
box("Upper ceramic shell right", (0.13, 0.015, -0.29), (0.12, 0.23, 0.36), ceramic, 0.05)

# The elbow and exposed tendons make the module read as an articulated arm.
sphere("Elbow bearing", (0.035, 0, -0.62), (0.245, 0.22, 0.235), steel)
torus("Elbow ceramic guard", (0.035, 0, -0.62), 0.205, 0.043, ceramic)
rod("Elbow hinge axle", (-0.29, 0, -0.62), (0.29, 0, -0.62), 0.105, 0.105, steel, 24)
for side in (-1, 1):
    sphere("Elbow side cap", (side * 0.3, 0, -0.62), (0.055, 0.16, 0.16), collar)
for side in (-1, 1):
    rod(
        "Recoil tendon",
        (side * 0.105, -0.13, -0.45),
        (side * 0.15, -0.13, -1.22),
        0.035,
        0.027,
        tendon,
        14,
    )

# A broad integrated forearm encloses the five-shot chamber.
rod("Forearm pressure vessel", (0.03, 0, -0.68), (0, 0, -1.32), 0.165, 0.205, steel, 28)
box("Forearm ceramic shell left", (-0.17, 0, -0.98), (0.16, 0.31, 0.57), ceramic, 0.065)
box("Forearm ceramic shell right", (0.17, 0.015, -1.0), (0.14, 0.285, 0.5), ceramic, 0.06)
for z in (-0.83, -0.98, -1.13):
    box("Forearm cooling vent", (-0.284, -0.02, z), (0.018, 0.17, 0.035), steel, 0.008)

# The slide is a named transform animated by the runtime on every shot.
slide = bpy.data.objects.new("pistol-slide", None)
bpy.context.scene.collection.objects.link(slide)
slide.parent = root
box("Pistol slide ceramic jacket", (0, 0, -1.37), (0.29, 0.29, 0.36), ceramic, 0.06, slide)
box("Pistol slide dark rail", (0, -0.22, -1.39), (0.19, 0.075, 0.35), steel, 0.022, slide)
sphere("Pistol status optic", (-0.305, -0.045, -1.35), (0.025, 0.05, 0.025), mint, slide)

breech = bpy.data.objects.new("pistol-breech", None)
bpy.context.scene.collection.objects.link(breech)
breech.parent = root
rod("Five shot breech cylinder", (0, 0, -1.2), (0, 0, -1.55), 0.145, 0.145, steel, 28, breech)
for index in range(5):
    angle = index * math.tau / 5
    rod(
        "Five shot chamber recess",
        (0.112 * math.cos(angle), 0.112 * math.sin(angle), -1.27),
        (0.112 * math.cos(angle), 0.112 * math.sin(angle), -1.48),
        0.022,
        0.022,
        collar,
        10,
        breech,
    )
rod("Integrated short barrel", (0, 0, -1.48), (0, 0, -1.72), 0.125, 0.11, steel, 28)
muzzle = bpy.data.objects.new("pistol-muzzle", None)
bpy.context.scene.collection.objects.link(muzzle)
muzzle.location = (0, 0, -1.71)
muzzle.parent = root
torus("Muzzle retaining ring", (0, 0, 0), 0.12, 0.035, collar, muzzle)
rod("Muzzle bore", (0, 0, -1.65), (0, 0, -1.735), 0.074, 0.074, steel, 24)

# A restrained elbow angle separates upper arm and gun-forearm silhouettes.
forearm_rig = bpy.data.objects.new("pistol-forearm", None)
bpy.context.scene.collection.objects.link(forearm_rig)
forearm_rig.location = (0, 0, -0.62)
forearm_rig.parent = root
bpy.context.view_layer.update()
for obj in objects:
    if obj.parent == root and obj.location.z < -0.64:
        world = obj.matrix_world.copy()
        obj.parent = forearm_rig
        obj.matrix_parent_inverse = forearm_rig.matrix_world.inverted()
        obj.matrix_world = world
slide_world = slide.matrix_world.copy()
slide.parent = forearm_rig
slide.matrix_parent_inverse = forearm_rig.matrix_world.inverted()
slide.matrix_world = slide_world
for rig in (breech, muzzle):
    world = rig.matrix_world.copy()
    rig.parent = forearm_rig
    rig.matrix_parent_inverse = forearm_rig.matrix_world.inverted()
    rig.matrix_world = world
forearm_rig.rotation_euler.y = math.radians(-24)


def join_meshes(parent, name):
    global objects
    meshes = [obj for obj in objects if obj.parent == parent and obj.type == "MESH"]
    if len(meshes) < 2:
        if meshes:
            meshes[0].name = name
        return
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    objects = [obj for obj in objects if obj not in meshes] + [joined]


join_meshes(root, "Pistol arm upper assembly")
join_meshes(forearm_rig, "Pistol arm forearm assembly")
join_meshes(slide, "Pistol slide geometry")
join_meshes(breech, "Five shot breech geometry")

# Export rigid named pieces so the slide and breech can animate independently.
bpy.ops.object.select_all(action="DESELECT")
for obj in [root, forearm_rig, slide, breech, muzzle, *objects]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
model_path = KIT / "arm-pistol-v1.glb"
bpy.ops.export_scene.gltf(
    filepath=str(model_path),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
)

# Keep the authoritative reference embedded in the editable Blender source.
reference = bpy.data.images.load(str(PROJECT / "docs/references/biomecha-style-master.png"))
reference.pack()
bpy.context.scene["style_reference"] = "docs/references/biomecha-style-master.png"

# Render a deterministic offline review image from the exact exported geometry.
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new("Cool ambient world")
scene.world.color = (0.1, 0.13, 0.14)


def area_light(name, location, energy, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, -0.75)) - light.location).to_track_quat("-Z", "Y").to_euler()


area_light("Warm upper left", (-3.5, -4.5, 4.5), 650, 4.2, (1, 0.84, 0.67))
area_light("Cool fill", (3.5, 1.5, 2), 300, 5, (0.58, 0.76, 1))
camera_data = bpy.data.cameras.new("Pistol arm review camera")
camera = bpy.data.objects.new("Pistol arm review camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
root.rotation_euler.x = -math.pi / 2
bpy.context.view_layer.update()
coords = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
low = Vector(tuple(min(value[index] for value in coords) for index in range(3)))
high = Vector(tuple(max(value[index] for value in coords) for index in range(3)))
center = (low + high) / 2
size = max(high - low)
camera.location = center + Vector((5.2, -2.8, 2.1)) * size
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.ortho_scale = size * 1.34
scene.render.filepath = str(OUT / "pistol-arm-v1-preview.png")
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "pistol-arm-v1.blend"))

manifest_path = KIT / "manifest.json"
manifest = json.loads(manifest_path.read_text())
by_id = {item["id"]: item for item in manifest}
by_id["arm-pistol-v1"] = {
    "id": "arm-pistol-v1",
    "file": "arm-pistol-v1.glb",
    "bytes": model_path.stat().st_size,
}
manifest_path.write_text(json.dumps(list(by_id.values()), indent=2) + "\n")
print("PISTOL_ARM_V1_COMPLETE", model_path.stat().st_size, flush=True)
