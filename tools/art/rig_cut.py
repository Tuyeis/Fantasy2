"""Cut a rig-pose character (known OpenPose keypoints) into puppet parts + rig.json.

usage: rig_cut.py <image.png> <pose.json> <out_dir> [scale]
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove


def seg_dist(px, py, a, b):
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    length2 = dx * dx + dy * dy
    t = np.clip(((px - ax) * dx + (py - ay) * dy) / length2, 0, 1)
    cx, cy = ax + t * dx, ay + t * dy
    return np.hypot(px - cx, py - cy)


def main(src, pose_path, out_dir, scale=0.5):
    os.makedirs(out_dir, exist_ok=True)
    kp = {int(k): tuple(v) for k, v in json.load(open(pose_path)).items()}
    rgb = Image.open(src).convert("RGB")
    cut = remove(rgb, session=new_session("isnet-anime"))
    arr = np.array(cut).astype(np.float32)
    alpha = arr[:, :, 3]
    alpha[alpha < 40] = 0
    alpha = np.clip((alpha - 40) / 175 * 255, 0, 255)
    arr[:, :, 3] = alpha
    h, w = alpha.shape
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    opaque = alpha > 0

    neck, nose = kp[1], kp[0]
    hip_r, hip_l = kp[8], kp[11]
    hip_c = ((hip_r[0] + hip_l[0]) / 2, (hip_r[1] + hip_l[1]) / 2)
    cx = neck[0]
    head_cut = nose[1] + 0.72 * (neck[1] - nose[1])
    leg_cut = hip_c[1] + 0.12 * (kp[9][1] - hip_c[1])
    shoulder_half = abs(kp[5][0] - kp[2][0]) / 2

    d_arm_r = np.minimum(seg_dist(xs, ys, kp[2], kp[3]), seg_dist(xs, ys, kp[3], kp[4]))
    d_arm_l = np.minimum(seg_dist(xs, ys, kp[5], kp[6]), seg_dist(xs, ys, kp[6], kp[7]))
    d_spine = seg_dist(xs, ys, neck, hip_c)

    # Ground shadow / stray pixels below the feet.
    opaque = opaque & (ys < max(kp[10][1], kp[13][1]) + 70)
    arr[~opaque, 3] = 0
    part = np.full((h, w), -1, np.int8)  # 0 torso, 1 head, 2 armR, 3 armL, 4 legR, 5 legL
    part[opaque] = 0
    hip_half = abs(hip_l[0] - hip_r[0]) / 2
    core = hip_half * 2.3
    arm_zone = opaque & (ys > kp[2][1] - 20) & (ys < max(kp[4][1], kp[7][1]) + 90)
    arm_r = arm_zone & (xs < cx - core) & (d_arm_r < 60)
    arm_l = arm_zone & (xs > cx + core) & (d_arm_l < 60)
    part[arm_r] = 2
    part[arm_l] = 3
    part[opaque & (ys < head_cut) & ~arm_r & ~arm_l] = 1
    legs = opaque & (ys > leg_cut) & (part == 0)
    part[legs & (xs < hip_c[0])] = 4
    part[legs & (xs >= hip_c[0])] = 5

    names = {0: "torso", 1: "head", 2: "arm_r", 3: "arm_l", 4: "leg_r", 5: "leg_l"}
    pivots = {"torso": hip_c, "head": neck, "arm_r": kp[2], "arm_l": kp[5], "leg_r": hip_r, "leg_l": hip_l}
    # Joint padding: copy nearby body pixels under each limb so rotations never open holes.
    pad_radius = {"arm_r": 42, "arm_l": 42, "leg_r": 46, "leg_l": 46, "head": 0, "torso": 0}
    z = {"leg_r": 0, "leg_l": 1, "arm_r": 2, "arm_l": 3, "torso": 4, "head": 5}
    rig = {"width": round(w * scale), "height": round(h * scale), "parts": []}
    for pid, name in names.items():
        mask = part == pid
        pr = pad_radius[name]
        if pr:
            px, py = pivots[name]
            mask = mask | (opaque & (np.hypot(xs - px, ys - py) < pr))
        if not mask.any():
            continue
        layer = arr.copy()
        layer[~mask, 3] = 0
        img = Image.fromarray(layer.clip(0, 255).astype(np.uint8))
        bbox = img.getbbox()
        img = img.crop(bbox)
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
        img.save(os.path.join(out_dir, name + ".png"))
        rig["parts"].append({
            "name": name, "file": name + ".png", "x": bbox[0] * scale, "y": bbox[1] * scale,
            "pivotX": pivots[name][0] * scale, "pivotY": pivots[name][1] * scale, "z": z[name]
        })
    rig["joints"] = {k: [v[0] * scale, v[1] * scale] for k, v in {"neck": neck, "hip": hip_c, "wrist_r": kp[4], "wrist_l": kp[7],
                                                                   "ankle_r": kp[10], "ankle_l": kp[13]}.items()}
    # Colour debug map of the partition.
    palette = np.array([[90, 90, 90], [255, 80, 80], [80, 200, 255], [80, 120, 255], [120, 255, 120], [60, 180, 60]], np.uint8)
    dbg = np.zeros((h, w, 3), np.uint8)
    dbg[part >= 0] = palette[part[part >= 0]]
    Image.fromarray(dbg).save(os.path.join(out_dir, "_partition.png"))
    json.dump(rig, open(os.path.join(out_dir, "rig.json"), "w"), indent=1)
    print("parts:", [p["name"] for p in rig["parts"]])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.5)
