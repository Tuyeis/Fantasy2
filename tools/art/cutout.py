"""Remove background (isnet-anime), clean faint alpha, crop to content, resize to a fixed height."""
import sys
import numpy as np
from PIL import Image
from rembg import remove, new_session

def cutout(src, dst, height=512, session=None):
    session = session or new_session("isnet-anime")
    im = Image.open(src).convert("RGB")
    out = remove(im, session=session)
    arr = np.array(out)
    a = arr[:, :, 3].astype(np.float32)
    a[a < 40] = 0
    a = np.clip((a - 40) / (215 - 40) * 255, 0, 255)
    arr[:, :, 3] = a.astype(np.uint8)
    out = Image.fromarray(arr)
    out = out.crop(out.getbbox())
    scale = height / out.height
    out = out.resize((max(1, round(out.width * scale)), height), Image.LANCZOS)
    out.save(dst)
    return out.size

if __name__ == "__main__":
    print(cutout(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 512))
