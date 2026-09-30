import sys; sys.path.insert(0, ".")
import numpy as np, weapon_cut as wc
arr = wc.largest(wc.cutout("weapons/mage_staff_1.png"))
a = arr[:, :, 3] > 30
rows = np.nonzero(a.any(axis=1))[0]; w = a.sum(axis=1)
print(rows[0], rows[-1], [int(w[y]) for y in range(rows[0], rows[-1], 40)])
