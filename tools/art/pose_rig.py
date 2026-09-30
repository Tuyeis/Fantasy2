"""OpenPose skeleton for the chibi rig pose + generation of the rig-ready character."""
import json, math, sys, os
sys.path.insert(0, ".")
import numpy as np
from PIL import Image, ImageDraw

W, H = 832, 1216
# COCO-18: 0 nose,1 neck,2 Rsho,3 Relb,4 Rwri,5 Lsho,6 Lelb,7 Lwri,8 Rhip,9 Rknee,10 Rank,11 Lhip,12 Lknee,13 Lank,14 Reye,15 Leye,16 Rear,17 Lear
# (R = character's right = image LEFT in a front view)
FRONT = {
    0: (416, 430), 1: (416, 560), 2: (336, 590), 3: (272, 705), 4: (236, 815),
    5: (496, 590), 6: (560, 705), 7: (596, 815), 8: (378, 820), 9: (366, 950), 10: (360, 1085),
    11: (454, 820), 12: (466, 950), 13: (472, 1085), 14: (382, 405), 15: (450, 405), 16: (330, 410), 17: (502, 410),
}
LIMBS = [[2, 3], [2, 6], [3, 4], [4, 5], [6, 7], [7, 8], [2, 9], [9, 10], [10, 11], [2, 12], [12, 13], [13, 14], [2, 1], [1, 15], [15, 17], [1, 16], [16, 18]]
COLORS = [[255, 0, 0], [255, 85, 0], [255, 170, 0], [255, 255, 0], [170, 255, 0], [85, 255, 0], [0, 255, 0], [0, 255, 85], [0, 255, 170], [0, 255, 255],
          [0, 170, 255], [0, 85, 255], [0, 0, 255], [85, 0, 255], [170, 0, 255], [255, 0, 255], [255, 0, 170], [255, 0, 85]]

def draw_pose(kp, path, stick=9):
    base = np.zeros((H, W, 3), np.float32)
    for i, (a, b) in enumerate(LIMBS):
        a -= 1; b -= 1
        if a not in kp or b not in kp:
            continue
        layer = Image.new("RGB", (W, H))
        d = ImageDraw.Draw(layer)
        (x1, y1), (x2, y2) = kp[a], kp[b]
        length = math.hypot(x2 - x1, y2 - y1)
        ang = math.atan2(y2 - y1, x2 - x1)
        cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
        pts = []
        for t in range(0, 360, 10):
            r = math.radians(t)
            ex, ey = math.cos(r) * length / 2, math.sin(r) * stick
            pts.append((cx + ex * math.cos(ang) - ey * math.sin(ang), cy + ex * math.sin(ang) + ey * math.cos(ang)))
        d.polygon(pts, fill=tuple(COLORS[i]))
        arr = np.array(layer, np.float32)
        mask = arr.sum(axis=2) > 0
        base[mask] = base[mask] * 0.4 + arr[mask] * 0.6
    img = Image.fromarray(base.clip(0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    for i, (x, y) in kp.items():
        d.ellipse([x - 7, y - 7, x + 7, y + 7], fill=tuple(COLORS[i]))
    img.save(path)

if __name__ == "__main__":
    from comfy_client import pony, upload_image
    os.makedirs("rig", exist_ok=True)
    draw_pose(FRONT, "rig/pose_front.png")
    json.dump({str(k): v for k, v in FRONT.items()}, open("rig/pose_front.json", "w"))
    name = upload_image("rig/pose_front.png")
    files = pony("1boy, solo, chibi, young adventurer, brown messy hair, determined smile, blue tunic, leather belt, brown pants, brown boots, "
                 "empty hands, open hands, arms apart from the body, a-pose, legs apart, standing straight, symmetrical, front view, facing viewer, "
                 "full body, feet visible, cute, big eyes, clean lineart, cel shading, simple background, white background",
                 "rig", "novice_front", seed=2024, batch=4, control_image=name, control_type="openpose",
                 control_strength=1.0, control_end=0.85, extra_neg="weapon, sword, holding, crossed arms, hands on hips")
    print(files)
