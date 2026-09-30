import sys; sys.path.insert(0, ".")
import numpy as np, sheet_cut2 as c2, sheet_cut as sc
from PIL import Image
figs = c2.split_figures(Image.open('turn_wukong/sheet_101_0.png').convert('RGB'))
arr, mask, _ = figs['front']
part, names, j, meta = c2.cut_front_sam(arr, mask, {'r': [400, 745]})
print(meta, {k: [round(v) for v in val] for k, val in j.items()})
ys, xs = np.nonzero(mask); print("bbox", xs.min(), xs.max(), ys.min(), ys.max())
for pid in range(6): print(pid, (part == pid).sum())
Image.fromarray((np.array([[0,0,0],[255,80,80],[80,200,255],[80,120,255],[120,255,120],[60,180,60],[255,170,40]],np.uint8)[(part+1).clip(0,6)] )).save('dbg_wk.png')
