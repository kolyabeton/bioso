# Organ models, 2026-09-14

15 icon-based variants authored by the requested Astra agent, registered for the
existing organ keys. Original GLBs remain available. The same `partModelId`
mapping feeds mounted equipment and instanced ground pickups.

Materials reuse the original leg-worker PBR atlas and existing olive tissue
texture. `validation.json` records binary checks including exact source texture
hashes and canonical UV windows. `assets.json` lists icon references and geometry.

`tests.txt`: 14 focused tests passed, including all 15 organs on all eight actual
chassis meshes, stable sparse slots, safe async retirement and
pickup/equip/discard identity. No gameplay stats or save keys changed.

## Current game evidence

Inspected in the muted Codex in-app browser on the real DEV game route:
`/?review=organs&organs=parasite,slime,repairGland&lang=ru&sound=0`.
Add `screen=assembly` for the normal inventory preview. Other inspected groups:
`mirrorGland,reflexNerve,returnNerve`, `commonNerve,reverseHeart,regen`,
`shield,armor,stabilizer`, `broodNode,digestion,accelerator`.

- `ground-390x844.png`: final in-game ground models and mounted equipment.
- `assembly-390x844.png`: final frontal inventory view with the three organ icons.
- `assembly-360x640.png`: narrow inventory view with existing vertical limb scroll.
- `nerve-heart-regen-ground-360x640.png`: other ground silhouettes at the smaller size.
- `runtime.json`: final loaded models with no failed or missing organ models.
- `pickup.json`: normal simulation movement collected the center cooler; side
  items remained outside its pickup radius. No direct transfer into inventory.
- `installed-after-pickup.json`: clicked the real inventory item and Install;
  cooler replaced the incubator in slot 1 and the displaced incubator moved to inventory.

Measured inventory bounds (x, y, width, height), with no horizontal overflow:
360×640 → (8, 8, 344, 624); 390×844 → (8, 8, 374, 828);
1280×720 → (445.5, 8, 389, 704). Desktop gameplay uses the full width.

The review route uses a prepared loadout and disables enemy spawning. It checks
rendering and the normal pickup/equipment path, not survival progression or balance.
