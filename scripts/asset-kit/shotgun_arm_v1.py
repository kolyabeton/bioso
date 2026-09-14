"""Build the dedicated five-bore shotgun arm and its inventory render."""
import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT = Path(__file__).resolve().parents[2]
KIT = PROJECT / "public/assets/kit"
ITEMS = PROJECT / "public/assets/ui/items"
OUT = PROJECT / "output/blender-shotgun-arm-v1"
for folder in (KIT, ITEMS, OUT):
    folder.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0.0, roughness=0.72, emission=None):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    bsdf = value.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    image = bpy.data.images.new(name + " texture", width=8, height=8)
    pixels = []
    for y in range(8):
        for x in range(8):
            wear = 0.84 + 0.12 * ((x * 3 + y * 5) % 7) / 6
            pixels.extend([min(1, channel * wear) for channel in color] + [1])
    image.pixels = pixels
    image.pack()
    texture = value.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    value.node_tree.links.new(texture.outputs["Color"], bsdf.inputs["Base Color"])
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = 1.8
    return value


ceramic = material("Worn ivory ceramic shell", (0.52, 0.50, 0.42), 0.08, 0.82)
steel = material("Oxidised shotgun steel", (0.07, 0.09, 0.085), 0.72, 0.55)
bronze = material("Patinated bronze collar", (0.26, 0.21, 0.12), 0.63, 0.68)
tendon = material("Olive tendon bundle", (0.12, 0.18, 0.09), 0.02, 0.92)
glow = material("Amber chamber glow", (0.36, 0.20, 0.055), 0.1, 0.38, (0.95, 0.42, 0.08))

root = bpy.data.objects.new("arm-shotgun-v1", None)
bpy.context.scene.collection.objects.link(root)
meshes = []


def finish(obj, name, mat):
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = root
    meshes.append(obj)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def rod(name, start, end, radius_a, radius_b, mat, vertices=20):
    a, b = Vector(start), Vector(end)
    direction = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius_a, radius2=radius_b,
                                   depth=direction.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    return finish(obj, name, mat)


def sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat)


def box(name, location, scale, mat, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Rounded wear edges", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    return finish(obj, name, mat)


def torus(name, location, major, minor, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                    major_segments=24, minor_segments=8,
                                    location=location, rotation=rotation)
    return finish(bpy.context.object, name, mat)


# Shoulder, elbow and tendons keep the weapon visibly integrated into a living arm.
rod("Shoulder socket", (0, 0, 0.08), (0, 0, -0.16), 0.24, 0.24, steel, 28)
torus("Ceramic shoulder collar", (0, 0, 0), 0.245, 0.055, ceramic)
rod("Upper arm core", (0, 0, -0.1), (0.02, 0, -0.60), 0.18, 0.14, steel, 24)
box("Upper shell left", (-0.12, 0, -0.34), (0.13, 0.24, 0.42), ceramic, 0.055)
box("Upper shell right", (0.13, 0.01, -0.34), (0.12, 0.22, 0.38), ceramic, 0.05)
sphere("Elbow bearing", (0.02, 0, -0.66), (0.24, 0.21, 0.22), steel)
rod("Elbow axle", (-0.29, 0, -0.66), (0.29, 0, -0.66), 0.095, 0.095, bronze, 24)
for side in (-1, 1):
    rod("Recoil tendon", (side * 0.1, -0.13, -0.45), (side * 0.16, -0.13, -1.34),
        0.032, 0.024, tendon, 12)

# A broad two-charge chamber feeds five short, clearly separated bores.
rod("Shotgun forearm", (0.02, 0, -0.68), (0, 0, -1.30), 0.19, 0.26, steel, 28)
box("Shotgun ceramic shroud", (0, 0.02, -1.08), (0.35, 0.31, 0.48), ceramic, 0.075)
for side in (-1, 1):
    sphere("Twin charge chamber", (side * 0.18, -0.26, -1.11), (0.12, 0.09, 0.22), glow)

bores = [(-0.17, 0.10), (0, 0.16), (0.17, 0.10), (-0.085, -0.08), (0.085, -0.08)]
for index, (x, y) in enumerate(bores, 1):
    rod(f"Barrel {index}", (x, y, -1.28), (x * 1.08, y * 1.08, -1.72), 0.095, 0.075, steel, 24)
    torus(f"Muzzle ring {index}", (x * 1.08, y * 1.08, -1.72), 0.078, 0.022, bronze)

box("Lower recoil brace", (0, 0.24, -1.29), (0.24, 0.075, 0.42), steel, 0.025)

bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
model_path = KIT / "arm-shotgun-v1.glb"
bpy.ops.export_scene.gltf(filepath=str(model_path), export_format="GLB", use_selection=True, export_apply=True)

# Deterministic transparent inventory art from the exact runtime geometry.
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 640
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.world = bpy.data.worlds.new("Shotgun preview world")
scene.world.color = (0.06, 0.08, 0.075)


def area_light(name, location, energy, size, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    scene.collection.objects.link(light)
    light.location = location
    light.rotation_euler = (Vector((0, 0, -0.8)) - light.location).to_track_quat("-Z", "Y").to_euler()


area_light("Warm key", (-3.5, -4.5, 4.5), 700, 4.0, (1, 0.78, 0.55))
area_light("Cool edge", (3.5, 1.5, 2.5), 380, 4.5, (0.55, 0.78, 1))
camera_data = bpy.data.cameras.new("Shotgun inventory camera")
camera = bpy.data.objects.new("Shotgun inventory camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = "ORTHO"
root.rotation_euler.x = -math.pi / 2
bpy.context.view_layer.update()
coords = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
low = Vector(tuple(min(point[index] for point in coords) for index in range(3)))
high = Vector(tuple(max(point[index] for point in coords) for index in range(3)))
center = (low + high) / 2
size = max(high - low)
camera.location = center + Vector((5.0, -3.3, 2.5)) * size
camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.ortho_scale = size * 1.35
scene.render.filepath = str(ITEMS / "shotgun-arm-v1.png")
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "shotgun-arm-v1.blend"))
print("SHOTGUN_ARM_V1_COMPLETE", model_path.stat().st_size, flush=True)
