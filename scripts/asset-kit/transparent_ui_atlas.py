"""Create an alpha-only derivative of the canonical atlas; never repaint RGB pixels."""
from pathlib import Path
import os
os.environ.setdefault('OMP_NUM_THREADS', '2')
import numpy as np
from PIL import Image
from rembg import new_session, remove

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/assets/ui/parts-atlas.png'
DESTINATION = ROOT / 'public/assets/ui/parts-atlas-transparent-v1.png'
ROWS = [0, 250, 510, 735, 970, 1254]

def main():
    if DESTINATION.exists():
        raise SystemExit(f'Refusing to overwrite {DESTINATION}')
    source = Image.open(SOURCE).convert('RGB')
    session = new_session('u2net', providers=['CPUExecutionProvider'])
    alpha = Image.new('L', source.size, 0)
    for row in range(5):
        for col in range(5):
            box = (round(col * 250.8), ROWS[row], round((col + 1) * 250.8), ROWS[row + 1])
            tile = source.crop(box)
            mask = remove(tile, session=session, only_mask=True, post_process_mask=True)
            alpha.paste(mask.convert('L'), box[:2])
            print(f'Masked {row * 5 + col + 1}/25', flush=True)
    result = source.convert('RGBA')
    result.putalpha(alpha)
    assert np.array_equal(np.array(result)[:, :, :3], np.array(source))
    result.save(DESTINATION)
    print(DESTINATION)

if __name__ == '__main__':
    main()
