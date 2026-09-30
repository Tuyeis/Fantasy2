import sys; sys.path.insert(0, ".")
import numpy as np, sheet_cut2 as c2, sheet_cut as sc, collections
from PIL import Image
figs = c2.split_figures(Image.open('turn_swordsman/sheet_404_0.png').convert('RGB'))
arr, mask, _ = figs['front']; part, names, j, meta = sc.cut_front_like(arr, mask); print('front meta', meta)
arr, mask, x0 = figs['side']; top, bottom, neck = sc.body_landmarks(mask); print('side', top, bottom, neck, x0)
skin = np.array([240.7, 160.5, 130.3]); d = np.sqrt(((arr[:, :, :3] - skin) ** 2).sum(2)); m = mask & (d < 78)
ys, xs = np.nonzero(m)
print(sorted(collections.Counter((ys // 40 * 40).tolist()).items()))
