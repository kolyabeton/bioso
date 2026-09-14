"""Extract the neutral baked checkerboard from approved organ illustrations."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2]
source = root / 'output/imagegen/organs-20260907'
target = root / 'public/assets/ui/organs'
proof = root / 'proof/organs-icons'
proof.mkdir(parents=True, exist_ok=True)
ids = ['return-nerve', 'slime-sac', 'parasite-womb', 'common-nerve', 'reverse-heart']
preview = Image.new('RGB', (1536, 1080), '#192e2e')
for i, name in enumerate(ids):
    im = Image.open(source / f'{name}.png').convert('RGBA')
    arr = np.array(im)
    if arr[:, :, 3].min() == 255:
        rgb = arr[:, :, :3]
        lo = rgb.min(axis=2).astype(float)
        spread = rgb.max(axis=2).astype(float) - lo
        neutral = ((lo > 210) & (spread < 12)).astype('uint8')
        count, labels, stats, _ = cv2.connectedComponentsWithStats(neutral, 8)
        border_ids = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
        bg = np.isin(labels, border_ids[border_ids != 0])
        # Refine only the object boundary; definite warm ceramic stays foreground.
        fg = (~bg).astype('uint8')
        count, labels, stats, _ = cv2.connectedComponentsWithStats(fg, 8)
        fg = (labels == (1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]))).astype('uint8')
        kernel = np.ones((3, 3), np.uint8)
        mask = np.full(fg.shape, cv2.GC_BGD, np.uint8)
        mask[cv2.dilate(fg, kernel, iterations=5) > 0] = cv2.GC_PR_BGD
        mask[fg > 0] = cv2.GC_PR_FGD
        mask[cv2.erode(fg, kernel, iterations=2) > 0] = cv2.GC_FGD
        cv2.grabCut(rgb, mask, None, np.zeros((1, 65)), np.zeros((1, 65)), 3, cv2.GC_INIT_WITH_MASK)
        alpha = np.isin(mask, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype('uint8') * 255
        alpha = cv2.GaussianBlur(alpha, (3, 3), .5)
        arr[:, :, 3] = alpha
        arr[alpha == 0, :3] = 0
        im = Image.fromarray(arr)
    im.thumbnail((512, 512), Image.Resampling.LANCZOS)
    im.save(target / f'{name}-v2.png', optimize=True)
    tile = Image.new('RGBA', (512, 512))
    tile.alpha_composite(im, ((512-im.width)//2, (512-im.height)//2))
    preview.paste(tile, ((i % 3)*512, (i // 3)*540), tile)
    ImageDraw.Draw(preview).text(((i % 3)*512+18, (i // 3)*540+515), name, fill='white')
    print(name, im.size, 'alpha range', im.getchannel('A').getextrema())
preview.save(proof / 'transparent-icons-review.jpg')
