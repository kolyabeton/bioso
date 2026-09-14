"""Remove the generated neutral checkerboard and pack the four landscape cutouts.

Explicitly authorized local PNG processing, 2026-09-08. No image resynthesis.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'docs/art/landscape-camera-20260908'
SOURCE = ART / 'decor-overhead-draft.png'
DEST = ROOT / 'public/assets/biomes/decor-atlas-v4.png'
rgb = np.asarray(Image.open(SOURCE).convert('RGB')).astype(np.float32)
# This source's checkerboard is cool neutral gray/white; the ceramic is warm.
spread = rgb.max(axis=2) - rgb.min(axis=2)
neutral = (spread < 18) & (rgb[:, :, 2] >= rgb[:, :, 0] - 3) & (rgb.min(axis=2) > 167)
labels, count = ndi.label(neutral)
sizes = np.bincount(labels.ravel())
background = neutral & (sizes[labels] >= 3)
foreground = ~background
# Discard isolated background compression noise without deleting fine connected foliage.
labels, count = ndi.label(foreground)
sizes = np.bincount(labels.ravel())
foreground &= sizes[labels] >= 5
large = foreground & (sizes[labels] >= 150)
foreground &= ndi.binary_dilation(large, iterations=3)
distance = ndi.distance_transform_edt(foreground)
# The old binary color key retained warm antialiased white matte around leaves.
# Solve the edge mixture C = alpha*F + (1-alpha)*B, using uncontaminated nearby
# material for F. A wider trimap catches multi-pixel white flecks, including holes
# between branches; protected interiors retain ceramic highlights and roof detail.
interior = (distance >= 6) & ((rgb.min(axis=2) < 155) | (spread > 65))
_, nearest = ndi.distance_transform_edt(~interior, return_indices=True)
material = rgb[nearest[0], nearest[1]]
backdrop = np.array([242., 242., 244.], dtype=np.float32)
direction = material - backdrop
mixture = np.sum((rgb-backdrop)*direction, axis=2) / np.maximum(1, np.sum(direction*direction, axis=2))
edge = foreground & (distance < 6)
alpha = foreground.astype(np.float32)
edge_alpha = np.clip((mixture - .24) / .70, 0, 1)
alpha[edge] = edge_alpha[edge]
# Unmix the matte while retaining leaf/metal texture; use the local material only
# to stabilize nearly transparent pixels, not to paint over every fine edge.
t = np.clip(mixture, .08, 1)[:, :, None]
unmixed = np.clip((rgb - (1-t)*backdrop) / t, 0, 255)
stability = np.clip((.6-t)/.4, 0, 1)
unmixed = unmixed*(1-stability) + material*stability
rgb[edge] = unmixed[edge]
alpha = ndi.gaussian_filter(alpha, sigma=.35)
alpha[~foreground] = 0
alpha[alpha < .12] = 0
rgba = np.dstack((rgb.astype(np.uint8), np.rint(alpha * 255).astype(np.uint8)))
rgba[alpha == 0] = 0
cutout = Image.fromarray(rgba)
atlas = Image.new('RGBA', (1536, 1024))
report = {'source': str(SOURCE.relative_to(ROOT)), 'size': [1536, 1024], 'cells': []}
# The generator put the row gutter at y=579, not the required y=512.
for i, (name, box) in enumerate([
    ('gardens', (0, 0, 768, 579)), ('forest', (768, 0, 1536, 579)),
    ('city', (0, 579, 768, 1024)), ('scrapyard', (768, 579, 1536, 1024)),
]):
    sprite = cutout.crop(box)
    sprite = sprite.crop(sprite.getbbox())
    scale = min(688 / sprite.width, 464 / sprite.height)
    sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.LANCZOS)
    x, y = i % 2 * 768 + (768 - sprite.width) // 2, i // 2 * 512 + 488 - sprite.height
    atlas.paste(sprite, (x, y))
    sprite.save(ART / f'{name}-cutout.png')
    report['cells'].append({'name': name, 'sourceBox': box, 'targetBox': [x, y, x + sprite.width, y + sprite.height]})
atlas.save(DEST, optimize=True)
a = np.asarray(atlas.getchannel('A'))
assert not a[508:516].any() and not a[:, 764:772].any(), 'Atlas cell bleed'
assert all(not a[e].any() for e in [0, -1]), 'Outer edge bleed'
assert not a[:, 0].any() and not a[:, -1].any(), 'Outer edge bleed'
report.update(transparentPixels=int((a == 0).sum()), partialAlphaPixels=int(((a > 0) & (a < 255)).sum()), opaquePixels=int((a == 255).sum()))
(ART / 'alpha-report.json').write_text(json.dumps(report, indent=2) + '\n')
# Dark-ground proof makes checkerboard residue and bright edge halos conspicuous.
preview = Image.new('RGBA', atlas.size, '#283129')
preview.alpha_composite(atlas)
preview.convert('RGB').save(ART / 'atlas-on-dark-ground.jpg', quality=93)
print(json.dumps(report, indent=2))
