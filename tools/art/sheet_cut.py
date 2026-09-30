"""Cut a three-view character sheet (front | side | back) into puppet parts.

Silhouette analysis (row runs) finds neck, armpits, arms, crotch and legs.
Side view: near arm = forearm skin blob + capsule up to the shoulder; far arm/leg are
made at runtime from the near ones. Outputs per view: part PNGs + rig.json + debug maps.

usage: sheet_cut.py <sheet.png> <out_dir> <side_facing: left|right> [scale]
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

SESSION = None


def silhouette(img_rgb):
    global SESSION
    SESSION = SESSION or new_session("isnet-anime")
    arr = np.array(remove(img_rgb, session=SESSION)).astype(np.float32)
    a = arr[:, :, 3]
    a[a < 50] = 0
    arr[:, :, 3] = np.clip((a - 50) / 170 * 255, 0, 255)
    mask = arr[:, :, 3] > 0
    lab, n = ndimage.label(mask)
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s > 0.01 * sizes.max()]
        mask = np.isin(lab, keep)
    arr[~mask, 3] = 0
    return arr, mask


def runs(row):
    """(start, end_exclusive) of True runs in a boolean row."""
    d = np.diff(np.concatenate([[0], row.astype(np.int8), [0]]))
    return list(zip(np.nonzero(d == 1)[0], np.nonzero(d == -1)[0]))


def find_neck(mask, top, bottom):
    h = bottom - top
    best = None
    for y in range(int(top + 0.30 * h), int(top + 0.58 * h)):
        w = mask[y].sum()
        if w > 0 and (best is None or w < best[1]):
            best = (y, w)
    return best[0]


def body_landmarks(mask):
    ys = np.nonzero(mask.any(axis=1))[0]
    top, bottom = int(ys[0]), int(ys[-1])
    neck = find_neck(mask, top, bottom)
    return top, bottom, neck


def cut_front_like(arr, mask, mirror_names=False):
    """Front / back views: arms separated by row runs; legs split below the crotch."""
    h, w = mask.shape
    top, bottom, neck = body_landmarks(mask)
    H = bottom - top
    part = np.full((h, w), -1, np.int8)
    part[mask] = 0  # torso
    part[:neck + 1][mask[:neck + 1]] = 1  # head
    cx = float(np.nonzero(mask[neck])[0].mean())

    # Arms: rows below the neck that show >= 3 runs; the outermost runs are arms.
    arm_rows = {}
    armpit = None
    for y in range(neck + 5, int(top + 0.92 * H)):
        r = [(a, b) for a, b in runs(mask[y]) if b - a > 2]
        if len(r) >= 3:
            if armpit is None:
                armpit = y
            arm_rows[y] = (r[0], r[-1])
    if armpit is None:
        raise RuntimeError("no separated arms found")
    # Inner edges near the armpit, extrapolated upwards to the shoulder.
    probe = [y for y in sorted(arm_rows) if y < armpit + 30]
    inner_l = np.median([arm_rows[y][0][1] for y in probe])
    inner_r = np.median([arm_rows[y][1][0] for y in probe])
    shoulder_y = int(neck + 0.25 * (armpit - neck))
    arm_l = np.zeros_like(mask)
    arm_r = np.zeros_like(mask)
    for y, (ra, rb) in arm_rows.items():
        arm_l[y, ra[0]:ra[1]] = True
        arm_r[y, rb[0]:rb[1]] = True
    for y in range(shoulder_y, armpit):
        row = mask[y]
        xs = np.nonzero(row)[0]
        arm_l[y, xs[xs < inner_l]] = True
        arm_r[y, xs[xs >= inner_r]] = True
    part[arm_l & mask] = 2
    part[arm_r & mask] = 3

    # Crotch: first row (below the armpit) where the central body splits in two.
    crotch = None
    for y in range(armpit + 10, bottom):
        r = [(a, b) for a, b in runs(mask[y] & (part[y] == 0)) if b - a > 4]
        if len(r) >= 2:
            crotch = y
            break
    if crotch is None:
        crotch = int(top + 0.8 * H)
    leg_cut = crotch - int(0.02 * H)
    lower = mask & (np.arange(h)[:, None] >= leg_cut) & (part == 0)
    xs = np.arange(w)[None, :]
    part[lower & (xs < cx)] = 4
    part[lower & (xs >= cx)] = 5

    def centroid(m):
        yy, xx = np.nonzero(m)
        return float(xx.mean()), float(yy.mean())

    def hand(m):
        # Centre of the fist (not the knuckles): the band between 6% and 20% of the arm length from its lower end.
        yy, xx = np.nonzero(m)
        top, bot = yy.min(), yy.max()
        length = bot - top
        sel = (yy > bot - 0.20 * length) & (yy < bot - 0.06 * length)
        if sel.sum() < 5:
            sel = yy > bot - 0.35 * length
        return float(xx[sel].mean()), float(yy[sel].mean())

    leg_l_c = centroid(part == 4)
    leg_r_c = centroid(part == 5)
    hip_y = crotch - 0.06 * H
    joints = {
        "neck": (cx, float(neck)),
        "hip": (cx, float(hip_y)),
        "shoulder_l": (centroid(arm_l[shoulder_y:shoulder_y + 20])[0] if arm_l[shoulder_y:shoulder_y + 20].any() else inner_l - 20, float(shoulder_y + 8)),
        "shoulder_r": (centroid(arm_r[shoulder_y:shoulder_y + 20])[0] if arm_r[shoulder_y:shoulder_y + 20].any() else inner_r + 20, float(shoulder_y + 8)),
        "hand_l": hand(part == 2),
        "hand_r": hand(part == 3),
        "hip_l": (leg_l_c[0], float(hip_y)),
        "hip_r": (leg_r_c[0], float(hip_y)),
    }
    # Shoulder pivot: centre of the arm's top band, pushed a little inwards (the joint sits inside the sleeve).
    for key, arm in (("shoulder_l", arm_l), ("shoulder_r", arm_r)):
        band = arm[shoulder_y:shoulder_y + 14] & mask[shoulder_y:shoulder_y + 14]
        if band.any():
            bx = float(np.nonzero(band)[1].mean())
            joints[key] = (bx + (5 if key == "shoulder_l" else -5), float(shoulder_y + 10))
    names = {0: "torso", 1: "head", 2: "arm_l", 3: "arm_r", 4: "leg_l", 5: "leg_r"}
    return part, names, joints, {"top": top, "bottom": bottom, "neck": neck, "armpit": armpit, "crotch": crotch}


def cut_side(arr, mask, front_meta, skin_rgb, facing):
    """Side view: near arm = skin blob (forearm + hand) + capsule to the shoulder; legs = everything below the crotch."""
    h, w = mask.shape
    top, bottom, neck = body_landmarks(mask)
    H = bottom - top
    fH = front_meta["bottom"] - front_meta["top"]
    rel = lambda key: (front_meta[key] - front_meta["top"]) / fH
    armpit = int(top + rel("armpit") * H)
    crotch = int(top + rel("crotch") * H)
    part = np.full((h, w), -1, np.int8)
    part[mask] = 0
    part[:neck + 1][mask[:neck + 1]] = 1
    rgb = arr[:, :, :3]
    dist = np.sqrt(((rgb - np.array(skin_rgb, np.float32)) ** 2).sum(axis=2))
    skin = mask & (dist < 78) & (np.arange(h)[:, None] > min(armpit, neck + 20)) & (np.arange(h)[:, None] < crotch + 0.08 * H)
    lab, n = ndimage.label(skin)
    if n == 0:
        raise RuntimeError("no forearm skin found in side view")
    sizes = ndimage.sum(skin, lab, range(1, n + 1))
    fore = lab == (int(np.argmax(sizes)) + 1)
    # Finger fragments separated by the outline belong to the hand too.
    fore = fore | (skin & ndimage.binary_dilation(fore, iterations=14))
    fy, fx = np.nonzero(fore)
    fore_top = int(fy.min())
    fore_w = float(np.percentile([fore[y].sum() for y in range(fore_top, int(fy.max()) + 1)], 70))
    body_x = np.nonzero(mask[neck + 10])[0]
    torso_mid = float(body_x.mean())
    shoulder = (torso_mid + (4 if facing == "right" else -4), float(neck + 0.3 * (armpit - neck)))
    fore_top_x = float(fx[fy < fore_top + 6].mean())
    radius = fore_w * 0.62
    ys, xs = np.mgrid[0:h, 0:w]
    ax, ay = shoulder
    bx, by = fore_top_x, float(fore_top + 4)
    dx, dy = bx - ax, by - ay
    t = np.clip(((xs - ax) * dx + (ys - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    capsule = np.hypot(xs - (ax + t * dx), ys - (ay + t * dy)) < radius
    arm = mask & (capsule | ndimage.binary_dilation(fore, iterations=4)) & (ys > neck + 4)
    part[arm] = 2
    leg_cut = crotch - int(0.02 * H)
    lower = mask & (ys >= leg_cut) & (part == 0)
    part[lower] = 4
    hy, hx = np.nonzero(fore)
    fist_len = hy.max() - hy.min()
    sel = (hy > hy.max() - 0.42 * fist_len) & (hy < hy.max() - 0.12 * fist_len)
    joints = {
        "neck": (torso_mid, float(neck)),
        "hip": (torso_mid, float(crotch - 0.06 * H)),
        "shoulder_l": shoulder,
        "hand_l": (float(hx[sel].mean()), float(hy[sel].mean())),
        "hip_l": (float(np.nonzero(mask[leg_cut + 5])[0].mean()), float(crotch - 0.06 * H)),
    }
    names = {0: "torso", 1: "head", 2: "arm_l", 4: "leg_l"}
    return part, names, joints, arm


def sample(arr, body, y, x0, x1, skin):
    """Median colour of body pixels in a row window, ignoring dark outline and skin pixels."""
    x0, x1 = max(0, x0), min(arr.shape[1], x1)
    if x0 >= x1:
        return None
    px = arr[y, x0:x1]
    ok = body[y, x0:x1] & (px[:, :3].mean(axis=1) > 70)
    if skin is not None:
        ok &= np.sqrt(((px[:, :3] - skin) ** 2).sum(axis=1)) > 55
    if not ok.any():
        return None
    return np.median(px[ok], axis=0)


def fill_behind_arm(arr, arm_mask, y0, y1, skin=None):
    """Row-wise colour fill of the body hidden by the near arm (works well with cel shading).

    For every row the hidden span is filled by interpolating the colours found just left and
    right of the arm. Where the arm reaches the silhouette edge, the body's edge is estimated by
    interpolating that edge from rows where it is visible. New edges get the dark outline colour.
    """
    h, w = arm_mask.shape
    alpha = arr[:, :, 3] > 0
    body = alpha & ~arm_mask
    out = arr.copy()
    out[arm_mask, 3] = 0
    rows = [y for y in range(max(0, y0), min(h, y1)) if arm_mask[y].any()]
    left_edge = {}
    right_edge = {}
    for y in rows:
        xs = np.nonzero(body[y])[0]
        if len(xs) == 0:
            continue
        arm_xs = np.nonzero(arm_mask[y])[0]
        # Is the body edge hidden by the arm on each side?
        left_hidden = arm_xs.min() <= xs.min() + 1
        right_hidden = arm_xs.max() >= xs.max() - 1
        if not left_hidden:
            left_edge[y] = xs.min()
        if not right_hidden:
            right_edge[y] = xs.max()

    def interp(edges, y):
        known = sorted(edges)
        if not known:
            return None
        above = [k for k in known if k <= y]
        below = [k for k in known if k >= y]
        if above and below:
            a, b = above[-1], below[0]
            if a == b:
                return edges[a]
            return edges[a] + (edges[b] - edges[a]) * (y - a) / (b - a)
        return edges[above[-1]] if above else edges[below[0]]

    outline = np.array([35, 25, 30, 255], np.float32)
    for y in rows:
        lo = left_edge.get(y, interp(left_edge, y))
        hi = right_edge.get(y, interp(right_edge, y))
        if lo is None or hi is None:
            continue
        lo, hi = int(round(lo)), int(round(hi))
        for a, b in runs(arm_mask[y]):
            a2, b2 = max(a, lo), min(b, hi + 1)
            if a2 >= b2:
                continue
            cl = sample(arr, body, y, a - 12, a - 3, skin)
            cr = sample(arr, body, y, b + 2, b + 11, skin)
            if cl is None and cr is None:
                continue
            cl = cr if cl is None else cl
            cr = cl if cr is None else cr
            for x in range(a2, b2):
                t = (x - a) / max(1, (b - a))
                out[y, x] = cl * (1 - t) + cr * t
                out[y, x, 3] = 255
            if a2 == lo:
                out[y, lo:lo + 2] = outline
            if b2 == hi + 1:
                out[y, max(lo, hi - 1):hi + 1] = outline
    # Vertical smoothing of the filled area removes row-to-row streaks.
    filled = arm_mask & (out[:, :, 3] > 0)
    smooth = out.copy()
    for c in range(3):
        chan = np.where(filled, out[:, :, c], np.nan)
        stack = np.stack([np.roll(chan, k, axis=0) for k in range(-5, 6)])
        med = np.nanmedian(stack, axis=0)
        smooth[:, :, c] = np.where(filled & ~np.isnan(med), med, out[:, :, c])
    return smooth


def side_torso_without_arm(arr, arm_mask, out_dir, desc):
    """AI-inpaint the body behind the near arm so the arm can swing without revealing a hole."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from comfy_client import inpaint, upload_image
    h, w = arm_mask.shape
    white = Image.new("RGB", (w, h), (255, 255, 255))
    white.paste(Image.fromarray(arr.astype(np.uint8)), (0, 0), Image.fromarray(arr[:, :, 3].astype(np.uint8)))
    img_path = os.path.join(out_dir, "_side_white.png")
    mask_path = os.path.join(out_dir, "_side_arm_mask.png")
    white.save(img_path)
    Image.fromarray((ndimage.binary_dilation(arm_mask, iterations=5) * 255).astype(np.uint8)).convert("RGB").save(mask_path)
    files = inpaint(upload_image(img_path), upload_image(mask_path),
                    "side view of a chibi boy standing, " + desc + ", arms hidden behind the body, clean lineart, cel shading, simple white background",
                    out_dir, "_side_inpaint", negative="score_4, score_5, score_6, arm, hand, fingers, fist, extra arm, lowres, blurry, text, watermark")
    filled = Image.open(files[0]).convert("RGB")
    cut, mask = silhouette(filled)
    return cut


PAD = {"arm_l": 26, "arm_r": 26, "leg_l": 30, "leg_r": 30}
PIVOT = {"torso": "hip", "head": "neck", "arm_l": "shoulder_l", "arm_r": "shoulder_r", "leg_l": "hip_l", "leg_r": "hip_r"}
Z = {"leg_l": 1, "leg_r": 2, "arm_l": 3, "arm_r": 4, "torso": 5, "head": 6}


def export(arr, part, names, joints, out_dir, scale, torso_rgba=None, extra=None, center_head=False):
    os.makedirs(out_dir, exist_ok=True)
    h, w = part.shape
    ys, xs = np.mgrid[0:h, 0:w]
    mask = arr[:, :, 3] > 0
    rig = {"parts": []}
    top = int(np.nonzero(mask.any(axis=1))[0][0])
    bottom = int(np.nonzero(mask.any(axis=1))[0][-1])
    for pid, name in names.items():
        m = part == pid
        src = arr
        if name == "torso" and torso_rgba is not None:
            src = torso_rgba
            m = m | (torso_rgba[:, :, 3] > 0) & (part == 2)
        if name in PAD:
            jx, jy = joints[PIVOT[name]]
            # Joint padding copies only torso pixels (never another limb) under the joint.
            m = m | (mask & (part == 0) & (np.hypot(xs - jx, ys - jy) < PAD[name]))
        layer = src.copy()
        layer[~m, 3] = 0
        img = Image.fromarray(layer.clip(0, 255).astype(np.uint8))
        bbox = img.getbbox()
        img = img.crop(bbox).resize((max(1, round((bbox[2] - bbox[0]) * scale)), max(1, round((bbox[3] - bbox[1]) * scale))), Image.LANCZOS)
        img.save(os.path.join(out_dir, name + ".png"))
        px, py = joints[PIVOT[name]]
        rig["parts"].append({"name": name, "file": name + ".png", "x": bbox[0] * scale, "y": bbox[1] * scale,
                             "pivotX": px * scale, "pivotY": py * scale, "z": Z[name]})
    if center_head:
        # Front/back views: the generator sometimes draws the head slightly turned. Instead of moving it
        # (which breaks the neck), store a small tilt around the neck that puts its centre of mass above it.
        parts = {p["name"]: p for p in rig["parts"]}
        head = parts.get("head")
        if head:
            a = np.array(Image.open(os.path.join(out_dir, head["file"])))[:, :, 3] > 0
            hy, hx = np.nonzero(a)
            mx, my = head["x"] + hx.mean(), head["y"] + hy.mean()
            nx, ny = joints["neck"][0] * scale, joints["neck"][1] * scale
            tilt = float(np.arctan2(nx - mx, ny - my))
            rig["headTilt"] = float(np.clip(tilt, -0.12, 0.12))
    rig["joints"] = {k: [v[0] * scale, v[1] * scale] for k, v in joints.items()}
    rig["top"] = top * scale
    rig["bottom"] = bottom * scale
    rig.update(extra or {})
    json.dump(rig, open(os.path.join(out_dir, "rig.json"), "w"), indent=1)
    palette = np.array([[90, 90, 90], [255, 80, 80], [80, 200, 255], [80, 120, 255], [120, 255, 120], [60, 180, 60], [255, 170, 40]], np.uint8)
    dbg = np.zeros((h, w, 3), np.uint8)
    dbg[part >= 0] = palette[part[part >= 0]]
    for k, (jx, jy) in joints.items():
        dbg[max(0, int(jy) - 4):int(jy) + 5, max(0, int(jx) - 4):int(jx) + 5] = [255, 0, 255]
    Image.fromarray(dbg).save(os.path.join(out_dir, "_partition.png"))


def main(sheet_path, out_dir, side_facing, scale=0.5, desc="blue short sleeve tunic, brown leather belt, brown shorts, brown boots"):
    sheet = Image.open(sheet_path).convert("RGB")
    W, H = sheet.size
    third = W // 3
    views = {"front": sheet.crop((0, 0, third, H)), "side": sheet.crop((third, 0, 2 * third, H)), "back": sheet.crop((2 * third, 0, W, H))}
    arr_f, mask_f = silhouette(views["front"])
    part_f, names_f, joints_f, meta_f = cut_front_like(arr_f, mask_f)
    export(arr_f, part_f, names_f, joints_f, os.path.join(out_dir, "front"), scale, center_head=True)
    # Skin colour: face centre just above the neck.
    fy = int(meta_f["neck"] - 0.10 * (meta_f["bottom"] - meta_f["top"]))
    fx = int(joints_f["neck"][0])
    skin = arr_f[fy - 4:fy + 5, fx - 4:fx + 5, :3].reshape(-1, 3).mean(axis=0)
    arr_b, mask_b = silhouette(views["back"])
    part_b, names_b, joints_b, _ = cut_front_like(arr_b, mask_b)
    export(arr_b, part_b, names_b, joints_b, os.path.join(out_dir, "back"), scale, center_head=True)
    arr_s, mask_s = silhouette(views["side"])
    part_s, names_s, joints_s, arm_mask = cut_side(arr_s, mask_s, meta_f, skin, side_facing)
    # Facing of the side art: the face skin sits on the forward side of the head.
    head = part_s == 1
    skin_px = np.sqrt(((arr_s[:, :, :3] - np.array(skin, np.float32)) ** 2).sum(axis=2)) < 50
    hy = np.nonzero(head.any(axis=1))[0]
    votes = 0
    for y in range(int(hy[0] + 0.55 * (hy[-1] - hy[0])), int(hy[-1])):
        xs = np.nonzero(head[y])[0]
        if len(xs) < 4:
            continue
        left_skin = skin_px[y, xs[0] + 2:xs[0] + 6].mean() > 0.5
        right_skin = skin_px[y, xs[-1] - 5:xs[-1] - 1].mean() > 0.5
        votes += int(right_skin) - int(left_skin)
    side_facing = "right" if votes > 0 else "left"
    torso_rgba = fill_behind_arm(arr_s, ndimage.binary_dilation(arm_mask, iterations=3) & mask_s, 0, arr_s.shape[0], np.array(skin, np.float32))
    export(arr_s, part_s, names_s, joints_s, os.path.join(out_dir, "side"), scale, torso_rgba=torso_rgba,
           extra={"facing": 1 if side_facing == "right" else -1})
    json.dump({"sideFacing": side_facing, "skin": skin.tolist()}, open(os.path.join(out_dir, "meta.json"), "w"))
    print("ok", {k: len(v) for k, v in {"front": names_f, "back": names_b, "side": names_s}.items()})


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]) if len(sys.argv) > 4 else 0.5)
