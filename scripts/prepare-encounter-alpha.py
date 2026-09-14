"""Recover real RGBA from the three generated near-white checkerboard sources.

Preserves source dimensions, placement, camera and solid material highlights.
Local image processing authorized in the landscape-generation review.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
PROOF = ROOT / 'docs/proof/generated-asset-audit-20260908'
records = []
sheet = Image.new('RGB', (960, 400), '#20271f')
draw = ImageDraw.Draw(sheet)
for index, name in enumerate(['nursery', 'slab', 'membrane']):
    source = ROOT / f'public/assets/encounters/{name}-v1.png'
    target = ROOT / f'public/assets/encounters/{name}-v2.png'
    rgb = np.array(Image.open(source).convert('RGB'), dtype=np.float32)
    spread = rgb.max(axis=2) - rgb.min(axis=2)
    neutral = (rgb.min(axis=2) > 215) & (spread < 16)
    labels, _ = ndi.label(neutral)
    counts = np.bincount(labels.ravel())
    background = neutral & (counts[labels] >= 16)
    foreground = ~background
    labels, _ = ndi.label(foreground)
    counts = np.bincount(labels.ravel())
    foreground &= counts[labels] >= 10
    large = foreground & (counts[labels] >= 150)
    foreground &= ndi.binary_dilation(large, iterations=2)
    distance = ndi.distance_transform_edt(foreground)
    interior = distance >= 4
    _, nearest = ndi.distance_transform_edt(~interior, return_indices=True)
    material = rgb[nearest[0], nearest[1]]
    backdrop = np.array([248., 248., 249.])
    direction = material-backdrop
    mixture = np.sum((rgb-backdrop)*direction, axis=2)/np.maximum(1,np.sum(direction*direction, axis=2))
    edge = foreground & ~interior
    alpha = foreground.astype(np.float32)
    alpha[edge] = np.clip((mixture[edge]-.08)/.88, 0, 1)
    t = np.clip(mixture, .08, 1)[:, :, None]
    unmixed = np.clip((rgb-(1-t)*backdrop)/t, 0, 255)
    stability = np.clip((.5-t)/.4, 0, 1)
    unmixed = unmixed*(1-stability)+material*stability
    rgb[edge] = unmixed[edge]
    alpha = ndi.gaussian_filter(alpha, sigma=.3)
    alpha[~foreground] = 0
    alpha[alpha < .08] = 0
    pixels = np.dstack((rgb.astype(np.uint8), np.rint(alpha*255).astype(np.uint8)))
    pixels[alpha == 0] = 0
    image = Image.fromarray(pixels)
    image.save(target, optimize=True)
    assert image.size == Image.open(source).size
    assert not pixels[[0,-1],:,3].any() and not pixels[:,[0,-1],3].any()
    records.append({'source':str(source.relative_to(ROOT)), 'target':str(target.relative_to(ROOT)), 'size':image.size, 'transparentPixels':int((alpha==0).sum()), 'opaquePixels':int((alpha==1).sum()), 'partialPixels':int(((alpha>0)&(alpha<1)).sum())})
    image.thumbnail((300,350),Image.Resampling.LANCZOS)
    sheet.paste(image,(index*320+(320-image.width)//2,10),image)
    draw.text((index*320+20,365),name+' / RGBA',fill='#e3e8dc')
PROOF.mkdir(parents=True, exist_ok=True)
sheet.save(PROOF/'encounters-cleaned.jpg',quality=94)
(PROOF/'encounter-alpha.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records,indent=2))
