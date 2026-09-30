"""Building / prop art: background removal, main object only, trimmed and resized.
usage: building_cut.py <src.png> <out.png> <width> [--general]"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import new_session, remove

src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
if "--bgdist" in sys.argv:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from weapon_cut import colour_cut
    arr = colour_cut(src)
else:
    session = new_session("isnet-general-use" if "--general" in sys.argv else "isnet-anime")
    arr = np.array(remove(Image.open(src).convert("RGB"), session=session)).astype(np.float32)
a = arr[:, :, 3]
a[a < 40] = 0
solid = a > 120
lab, n = ndimage.label(solid)
if n > 1:
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    main = lab == (int(np.argmax(sizes)) + 1)
    near = ndimage.binary_dilation(main, iterations=6)
    keep = np.unique(lab[near & solid]); keep = keep[keep > 0]
    region = ndimage.binary_dilation(np.isin(lab, keep), iterations=3)
    arr[~region, 3] = 0
if "--fill" in sys.argv:
    # Light details inside the silhouette (white flowers) look like background: everything enclosed is opaque.
    inside = ndimage.binary_fill_holes(ndimage.binary_closing(arr[:, :, 3] > 60, iterations=3))
    arr[inside, 3] = 255
img = Image.fromarray(arr.clip(0, 255).astype(np.uint8))
img = img.crop(img.getbbox())
img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
img.save(out)
print(out, img.size)
