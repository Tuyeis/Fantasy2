"""Three-view sheet -> puppet parts, v2.

Changes over sheet_cut.py:
- The three figures are separated by silhouette components (a tail crossing into the next third no longer leaks).
- Side view arm is segmented with SAM (point prompts along shoulder->hand), cleaned, with the old
  geometric capsule as fallback.
- Optional tail part (SAM), pivot at the attachment point.
- rig.json stores neckToFeet so the runtime can give every view the same body size.

usage: sheet_cut2.py <sheet.png> <out_dir> [--tail] [scale]
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sheet_cut as sc  # noqa: E402

CENTERS = (280 / 1536, 768 / 1536, 1256 / 1536)
VIEWS = ("front", "side", "back")


def split_figures(sheet):
    """Full-sheet background removal, then every component goes to the nearest figure centre."""
    arr, mask = sc.silhouette(sheet)
    H, W = mask.shape
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    cms = ndimage.center_of_mass(mask, lab, range(1, n + 1))
    # Region of each column: nearest figure centre. Components that stay inside one region go whole to it;
    # components that touch two figures (hair or hat brims touching) are split at the region border.
    col_region = np.argmin(np.abs(np.arange(W)[:, None] - np.array(CENTERS)[None, :] * W), axis=1)
    view_masks = [np.zeros_like(mask) for _ in VIEWS]
    for i, (size, (cy, cx)) in enumerate(zip(sizes, cms)):
        if size < 0.002 * mask.sum():
            continue
        comp = lab == (i + 1)
        regions = np.unique(col_region[np.nonzero(comp.any(axis=0))[0]])
        if len(regions) == 1 or size < 0.05 * mask.sum():
            view_masks[int(np.argmin([abs(cx - c * W) for c in CENTERS]))] |= comp
        else:
            pieces = {int(r): comp & (col_region[None, :] == r) for r in regions}
            sizes_r = {r: int(m.sum()) for r, m in pieces.items()}
            biggest = max(sizes_r, key=sizes_r.get)
            for r, m in pieces.items():
                # a small overhang (an ear tip crossing the border) stays with the figure it belongs to
                view_masks[r if sizes_r[r] >= 0.15 * size else biggest] |= m
    out = {}
    for v, view in enumerate(VIEWS):
        m = view_masks[v]
        # Floating fragments (a stray extra head drawn next to the figure) are dropped: keep only the pieces that
        # touch the main body or lie within a few pixels of it.
        lab_v, nv = ndimage.label(m)
        if nv > 1:
            sz = ndimage.sum(m, lab_v, range(1, nv + 1))
            main = lab_v == (int(np.argmax(sz)) + 1)
            near = ndimage.binary_dilation(main, iterations=12)
            keep = np.unique(lab_v[near & m])
            m = np.isin(lab_v, keep[keep > 0])
        xs = np.nonzero(m.any(axis=0))[0]
        x0, x1 = max(0, xs.min() - 40), min(W, xs.max() + 41)
        a = arr[:, x0:x1].copy()
        a[~m[:, x0:x1], 3] = 0
        out[view] = (a, m[:, x0:x1], x0)
    return out


def clean_mask(m, keep_largest=True):
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=4)
    m = ndimage.binary_fill_holes(m)
    if keep_largest:
        lab, n = ndimage.label(m)
        if n > 1:
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            m = lab == (int(np.argmax(sizes)) + 1)
    return m


def sam_arm(arr, mask, shoulder, hand, neck_y, hip):
    import sam_util
    sh, hd = np.array(shoulder), np.array(hand)
    pos = [sh + (hd - sh) * f for f in (0.15, 0.4, 0.65, 0.88)]
    ys, xs = np.nonzero(mask)
    row = int(neck_y + 0.45 * (hip[1] - neck_y))
    rx = xs[ys == row]
    negs = [[rx.min() + 8, row], [rx.max() - 8, row], [hip[0], hip[1] + 0.3 * (ys.max() - hip[1])]]
    total = mask.sum()
    m, score = sam_util.segment(arr[:, :, :3], pos, negs, area_range=(0.015 * total, 0.22 * total), silhouette=mask)
    m = clean_mask(m & mask) & mask & (np.arange(mask.shape[0])[:, None] > neck_y + 4)
    return m, score


def find_tail(mask, part, hip, body_half, bottom):
    """Farthest silhouette pixel from the body axis in the lower body, outside arms/head: a tail tip candidate."""
    h, w = mask.shape
    ys, xs = np.mgrid[0:h, 0:w]
    zone = mask & (part != 1) & (part != 2) & (part != 3) & (ys > hip[1] - 0.05 * (bottom - hip[1])) & (ys < bottom - 0.08 * (bottom - hip[1]))
    dist = np.abs(xs - hip[0]) * zone
    if dist.max() < body_half * 1.35:
        return None
    y, x = np.unravel_index(int(np.argmax(dist)), dist.shape)
    return (float(x), float(y))


def sam_tail(arr, mask, tip, hip):
    import sam_util
    total = mask.sum()
    m, score = sam_util.segment(arr[:, :, :3], [tip], [[hip[0], hip[1]]], area_range=(0.004 * total, 0.15 * total), silhouette=mask)
    return clean_mask(m & mask) & mask, score


def add_tail(arr, mask, part, names, joints, meta):
    hip = joints["hip"]
    xs = np.nonzero(mask[int(hip[1])])[0]
    body_half = (xs.max() - xs.min()) / 2 if len(xs) else 40
    tip = find_tail(mask, part, hip, body_half, meta["bottom"])
    if tip is None:
        return None
    tail, score = sam_tail(arr, mask, tip, hip)
    if tail.sum() < 50:
        return None
    part[tail] = 6
    ty, tx = np.nonzero(tail)
    k = int(np.argmin(np.hypot(tx - hip[0], ty - hip[1])))
    joints["tail"] = (float(tx[k]), float(ty[k]))
    names[6] = "tail"
    return score


def kmeans(px, k, iters=12, seed=0):
    rng = np.random.default_rng(seed)
    c = px[rng.choice(len(px), size=min(k, len(px)), replace=False)].astype(np.float32)
    for _ in range(iters):
        lab = np.argmin(((px[:, None, :] - c[None]) ** 2).sum(-1), axis=1)
        for i in range(len(c)):
            if (lab == i).any():
                c[i] = px[lab == i].mean(axis=0)
    counts = np.bincount(lab, minlength=len(c))
    return c, counts


def cloth_colour(arr, mask, arm, y0, y1):
    """Dominant colour of the body right around the arm between y0 and y1 (outline pixels ignored)."""
    ys = np.arange(mask.shape[0])[:, None]
    ring = ndimage.binary_dilation(arm, iterations=10) & mask & ~ndimage.binary_dilation(arm, iterations=2)
    sel = ring & (ys >= y0) & (ys < y1)
    px = arr[sel][:, :3].astype(np.float32)
    px = px[px.sum(axis=1) > 80]
    if len(px) < 50:
        # Landmarks unusable (long robes): the whole visible body below the head, minus the arm.
        sel = mask & ~arm & (ys > y0 - 0.25 * max(1, y1 - y0))
        px = arr[sel][:, :3].astype(np.float32)
        px = px[px.sum(axis=1) > 80]
    c, counts = kmeans(px[:: max(1, len(px) // 4000)], 4)
    return c[int(np.argmax(counts))]


def grow_arm(arr, mask, arm, cloth, radius=8):
    """Give the arm the pixels next to it that clearly look like the arm (e.g. a white cuff) and not like the shirt."""
    arm_px = arr[arm][:, :3].astype(np.float32)
    centres, _ = kmeans(arm_px[:: max(1, len(arm_px) // 3000)], 5, seed=1)
    ring = ndimage.binary_dilation(arm, iterations=radius) & mask & ~arm
    col = arr[:, :, :3].astype(np.float32)
    d_arm = np.min(np.sqrt(((col[:, :, None, :] - centres[None, None]) ** 2).sum(-1)), axis=2)
    d_cloth = np.sqrt(((col - cloth) ** 2).sum(-1))
    cand = ring & (d_arm < 60) & (d_arm < d_cloth - 25)
    lab, n = ndimage.label(cand | arm)
    keep = np.isin(lab, np.unique(lab[arm]))
    arm = arm | (cand & keep)
    # Notches in the arm outline (a cuff between sleeve and hand) belong to the arm too.
    closed = ndimage.binary_closing(arm, iterations=7) & mask
    # A cuff band crossing the sleeve has arm above AND below it: a vertical closing takes it, while the shirt
    # front (arm only on one side) stays with the torso.
    vert = ndimage.binary_closing(np.pad(arm, 20), structure=np.ones((41, 1), bool))[20:-20, 20:-20] & mask
    return arm | closed | vert


def fill_cloth(torso_rgba, arm_fill, cloth, body, allowed=None, tol=60):
    """Rows whose fill runs between two different colours (white ruffle | red shirt) get the cloth colour;
    rows between matching colours (a belt passing behind the arm) keep the interpolation."""
    out = torso_rgba.copy()
    col = out[:, :, :3].astype(np.float32)
    outline = col.sum(-1) < 110
    for y in np.nonzero(arm_fill.any(axis=1))[0]:
        for a, b in sc.runs(arm_fill[y]):
            xs = [x for x in range(a, b) if out[y, x, 3] > 0 and not outline[y, x]]
            if len(xs) < 3:
                continue
            ca, cb = col[y, xs[0]], col[y, xs[-1]]
            two_sided = body[y, max(0, a - 5):a].any() and body[y, b:b + 5].any()
            same_ends = np.sqrt(((ca - cb) ** 2).sum()) <= tol
            near_cloth = max(np.sqrt(((ca - cloth) ** 2).sum()), np.sqrt(((cb - cloth) ** 2).sum())) <= tol
            in_back = allowed is None or (allowed(y, ca) and allowed(y, cb))
            if not ((two_sided and same_ends and in_back) or near_cloth):
                out[y, xs, :3] = cloth
    # A vertical median removes single-row streaks but keeps steps such as the edges of a belt.
    inside = arm_fill & (out[:, :, 3] > 0) & ~outline
    for c in range(3):
        med = ndimage.median_filter(out[:, :, c], size=(11, 1))
        out[:, :, c] = np.where(inside, med, out[:, :, c])
    # Rows where the arm hides the whole body width: interpolate the body span from the rows above/below.
    rows = np.nonzero(arm_fill.any(axis=1))[0]
    have = {y: np.nonzero(out[y, :, 3] > 0)[0] for y in range(out.shape[0]) if (out[y, :, 3] > 0).any()}
    known = sorted(have)
    for y in rows:
        xs = have.get(y)
        if xs is not None and len(xs) > 0.6 * (max(len(have[k]) for k in known) if known else 1):
            continue
        above = [k for k in known if k < y and len(have[k]) > 8]
        below = [k for k in known if k > y and len(have[k]) > 8]
        if not above or not below:
            continue
        a_, b_ = above[-1], below[0]
        if b_ - a_ > 200:
            continue
        f = (y - a_) / (b_ - a_)
        lo = int(round(have[a_].min() * (1 - f) + have[b_].min() * f))
        hi = int(round(have[a_].max() * (1 - f) + have[b_].max() * f))
        span = np.zeros(out.shape[1], bool); span[lo:hi + 1] = True
        empty = span & (out[y, :, 3] == 0)
        out[y, empty, :3] = cloth; out[y, empty, 3] = 255
        out[y, lo:lo + 2] = (35, 25, 30, 255); out[y, max(lo, hi - 1):hi + 1] = (35, 25, 30, 255)
    # gentle vertical smoothing inside the filled area
    for c in range(3):
        ch = out[:, :, c].astype(np.float32)
        sm = ndimage.uniform_filter(ch, size=(7, 3))
        out[:, :, c] = np.where(arm_fill & ~outline & (out[:, :, 3] > 0), sm, ch).astype(out.dtype)
    return out


def find_crotch(mask, cx, top, bottom):
    """Bottom-up: follow the background gap between the feet upwards; the crotch is where it closes.
    Characters in long robes have no gap: the crotch is then the lower edge of the robe."""
    H = bottom - top
    y = bottom - 2
    # start where the centre column is background near the feet
    while y > top + 0.5 * H and mask[y, int(cx) - 1:int(cx) + 2].any():
        y -= 1
    if y <= top + 0.5 * H:
        return int(top + 0.8 * H)
    while y > top + 0.45 * H and not mask[y, int(cx) - 1:int(cx) + 2].any():
        y -= 1
    return int(y)


def cut_front_sam(arr, mask, hints=None):
    """Front / back view cut that survives arms touching the body, tabards and robes."""
    import sam_util
    h, w = mask.shape
    top, bottom, neck = sc.body_landmarks(mask)
    H = bottom - top
    cx = float(np.nonzero(mask[neck])[0].mean())
    crotch = find_crotch(mask, cx, top, bottom)
    # Legs pressed together, tabards and robes hide the gap: never let the legs start lower than chibi proportions allow.
    crotch = min(crotch, int(neck + 0.62 * (bottom - neck)))
    ys, xs = np.mgrid[0:h, 0:w]
    part = np.full((h, w), -1, np.int8)
    part[mask] = 0
    part[:neck + 1][mask[:neck + 1]] = 1
    body = mask & (ys > neck + 4) & (ys < crotch + 0.12 * H)
    sh_row = int(neck + 0.07 * H)
    row = np.nonzero(mask[sh_row])[0]
    arms = {}
    total = mask.sum()
    for side, sign in (("l", -1), ("r", 1)):
        cand = body & ((xs - cx) * sign > 0)
        if not cand.any():
            continue
        # hand = the outermost pixel of the silhouette below the head on this side
        # Thin structures (a tail curling up beside the hand) must not win the "outermost point" test.
        cand_open = ndimage.binary_opening(cand, iterations=max(3, int(0.016 * H)))
        if cand_open.any():
            cand = cand_open
        score = (xs - cx) * sign * cand
        hy, hx = np.unravel_index(int(np.argmax(score)), score.shape)
        if hints and side in hints:
            hx, hy = int(hints[side][0]) + sign * 6, int(hints[side][1])
        hand = (float(hx - sign * 6), float(hy))
        edge = row.min() if sign < 0 else row.max()
        shoulder = (float(edge + (cx - edge) * 0.28), float(sh_row))
        sh, hd = np.array(shoulder), np.array(hand)
        pos = [sh + (hd - sh) * f for f in (0.15, 0.4, 0.65, 0.9)]
        negs = [[cx, neck + 0.18 * H], [cx, crotch - 0.08 * H], [cx + sign * 0.12 * H, min(bottom - 5, crotch + 0.12 * H)],
                [cx - sign * 0.3 * H, hy]]
        m, _score = sam_util.segment(arr[:, :, :3], pos, negs, area_range=(0.01 * total, 0.2 * total), silhouette=mask)
        m = clean_mask(m & mask) & mask & (ys > neck + 4) & ((xs - cx) * sign > 0.04 * H)
        # The fist often comes out as a separate piece (fur cuff, bracer): everything around the hand point joins the arm.
        fist = mask & (np.hypot(xs - hx, ys - hy) < 0.07 * H) & ((xs - cx) * sign > 0.1 * H) & (part != 1)
        m = m | fist
        area = m.sum() / total
        arms[side] = (m if 0.01 < area < 0.2 else None, shoulder, hand)
    if any(v[0] is None for v in arms.values()) or len(arms) < 2:
        raise RuntimeError("sam front arms failed")
    part[arms["l"][0]] = 2
    part[arms["r"][0]] = 3
    leg_cut = crotch - int(0.02 * H)
    lower = mask & (ys >= leg_cut) & (part == 0)
    part[lower & (xs < cx)] = 4
    part[lower & (xs >= cx)] = 5
    # Loose leg fragments (the tip of a fist hanging below the crotch line) belong to the arm on that side.
    for pid, arm_id in ((4, 2), (5, 3)):
        lab_l, nl = ndimage.label(part == pid)
        if nl > 1:
            sz = ndimage.sum(part == pid, lab_l, range(1, nl + 1))
            big = int(np.argmax(sz)) + 1
            for i in range(1, nl + 1):
                if i != big and ndimage.binary_dilation(lab_l == i, iterations=2)[part == arm_id].any():
                    part[lab_l == i] = arm_id

    def fist(m):
        yy, xx = np.nonzero(m)
        # the arm's far end from the shoulder
        return yy, xx

    joints = {"neck": (cx, float(neck)), "hip": (cx, float(crotch - 0.06 * H))}
    for side, pid in (("l", 2), ("r", 3)):
        m, shoulder, hand = arms[side]
        yy, xx = np.nonzero(m)
        sh = np.array(shoulder)
        d = np.hypot(xx - sh[0], yy - sh[1])
        far = d > np.percentile(d, 88)
        mid = (d > np.percentile(d, 80)) & (d < np.percentile(d, 94))
        joints["hand_" + side] = (float(xx[mid].mean()), float(yy[mid].mean()))
        near = d < np.percentile(d, 8)
        joints["shoulder_" + side] = (float(xx[near].mean()), float(yy[near].mean()))
        _ = far
    for side, pid in (("l", 4), ("r", 5)):
        yy, xx = np.nonzero(part == pid)
        joints["hip_" + side] = (float(xx.mean()) if len(xx) else cx, float(crotch - 0.06 * H))
    names = {0: "torso", 1: "head", 2: "arm_l", 3: "arm_r", 4: "leg_l", 5: "leg_r"}
    armpit = int(neck + 0.35 * (crotch - neck))
    return part, names, joints, {"top": top, "bottom": bottom, "neck": neck, "armpit": armpit, "crotch": crotch}


sc.PIVOT["tail"] = "tail"
sc.PAD["tail"] = 10


HINTS = {}


def main(sheet_path, out_dir, tail=False, scale=0.5):
    global HINTS
    hint_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hints", os.path.basename(out_dir.rstrip("/\\")) + ".json")
    HINTS = json.load(open(hint_path)) if os.path.exists(hint_path) else {}
    sheet = Image.open(sheet_path).convert("RGB")
    figs = split_figures(sheet)
    report = {}

    # ---- front / back
    metas = {}
    for view in ("front", "back"):
        arr, mask, _ = figs[view]
        part = None
        if os.environ.get("FRONT") == "sam":
            try:
                part, names, joints, meta = cut_front_sam(arr, mask, HINTS.get(view))
            except RuntimeError as e:
                print(view, "front sam failed, classic cut:", e)
        if part is None:
            part, names, joints, meta = sc.cut_front_like(arr, mask)
        if tail:
            report[view + "_tail"] = add_tail(arr, mask, part, names, joints, meta)
        metas[view] = (arr, mask, part, names, joints, meta)
        z_tail = 0 if view == "front" else 7
        sc.Z["tail"] = z_tail
        sc.export(arr, part, names, joints, os.path.join(out_dir, view), scale, center_head=True,
                  extra={"neckToFeet": (meta["bottom"] - meta["neck"]) * scale})

    arr_f, mask_f, part_f, names_f, joints_f, meta_f = metas["front"]
    fy = int(meta_f["neck"] - 0.10 * (meta_f["bottom"] - meta_f["top"]))
    fx = int(joints_f["neck"][0])
    skin = arr_f[fy - 4:fy + 5, fx - 4:fx + 5, :3].reshape(-1, 3).mean(axis=0)

    # ---- side
    arr, mask, _ = figs["side"]
    top, bottom, neck = sc.body_landmarks(mask)
    Hs = bottom - top
    fH = meta_f["bottom"] - meta_f["top"]
    rel = lambda y: (y - meta_f["top"]) / fH
    armpit = int(top + rel(meta_f["armpit"]) * Hs)
    crotch = int(top + rel(meta_f["crotch"]) * Hs)
    hand_y = top + rel(joints_f["hand_l"][1]) * Hs
    part = np.full(mask.shape, -1, np.int8)
    part[mask] = 0
    part[:neck + 1][mask[:neck + 1]] = 1
    body_x = np.nonzero(mask[neck + 10])[0]
    torso_mid = float(body_x.mean())
    shoulder = (torso_mid, float(neck + 0.3 * (armpit - neck)))
    hip = (torso_mid, float(crotch - 0.06 * Hs))
    # Hand guess: skin blob if the forearm is bare, else the front-view proportion on the body axis.
    hand = (torso_mid, float(hand_y))
    try:
        _p, _n, j_old, _arm = sc.cut_side(arr, mask, meta_f, skin, "right")
        hand = j_old["hand_l"]
    except Exception:
        pass
    side_hint = HINTS.get("side", {})
    if "hand" in side_hint:
        hand = tuple(float(v) for v in side_hint["hand"])
    if "shoulder" in side_hint:
        shoulder = tuple(float(v) for v in side_hint["shoulder"])
    if os.environ.get("ARM") == "geom":
        arm, score, area = None, "geom", 0.0
    else:
        arm, score = sam_arm(arr, mask, shoulder, hand, neck, hip)
        area = arm.sum() / mask.sum()
    report["side_arm_sam"] = score
    if not (0.04 < area < 0.22):
        try:
            _p, _n, j_old, arm = sc.cut_side(arr, mask, meta_f, skin, "right")
            report["side_arm_sam"] = "fallback"
            if arm.sum() / mask.sum() < 0.04:
                raise RuntimeError("fallback arm too small")
        except RuntimeError:
            # No bare skin (gauntlets, gloves): a plain capsule from the shoulder down to the hand height.
            yy, xx = np.mgrid[0:mask.shape[0], 0:mask.shape[1]]
            ax_, ay_ = shoulder; bx_, by_ = torso_mid, float(hand_y)
            dx_, dy_ = bx_ - ax_, by_ - ay_
            t_ = np.clip(((xx - ax_) * dx_ + (yy - ay_) * dy_) / (dx_ * dx_ + dy_ * dy_), 0, 1)
            arm = mask & (np.hypot(xx - (ax_ + t_ * dx_), yy - (ay_ + t_ * dy_)) < 0.075 * Hs) & (yy > neck + 4)
            report["side_arm_sam"] = "capsule"
    # The body behind the side arm is the same garment as the back: take the cloth colour from the back view.
    arr_b, mask_b, part_b, _nb, _jb, meta_b = metas["back"]
    bx = np.nonzero((part_b == 0).any(axis=0))[0]
    cx0, cx1 = int(bx.min() + 0.3 * (bx.max() - bx.min())), int(bx.min() + 0.7 * (bx.max() - bx.min()))
    by0 = int(meta_b["armpit"]); by1 = int(meta_b["armpit"] + 0.5 * (meta_b["crotch"] - meta_b["armpit"]))
    sel_b = np.zeros_like(mask_b); sel_b[by0:by1, cx0:cx1] = True
    px = arr_b[sel_b & (part_b == 0)][:, :3].astype(np.float32)
    px = px[px.sum(axis=1) > 80]
    if len(px) >= 50:
        centres, counts = kmeans(px[:: max(1, len(px) // 4000)], 3)
        cloth = centres[int(np.argmax(counts))]
    else:
        cloth = cloth_colour(arr, mask, arm, armpit, crotch)
    arm = grow_arm(arr, mask, arm, cloth)
    report["cloth"] = str([int(v) for v in cloth])
    part[arm] = 2
    ys, xs = np.mgrid[0:mask.shape[0], 0:mask.shape[1]]
    leg_cut = crotch - int(0.02 * Hs)
    part[mask & (ys >= leg_cut) & (part == 0)] = 4
    ay, ax = np.nonzero(arm)
    alen = ay.max() - ay.min()
    sel = (ay > ay.max() - 0.22 * alen) & (ay < ay.max() - 0.06 * alen)
    joints = {
        "neck": (torso_mid, float(neck)), "hip": hip, "shoulder_l": (float(ax[ay < ay.min() + 12].mean()), float(ay.min() + 10)),
        "hand_l": (float(ax[sel].mean()), float(ay[sel].mean())),
        "hip_l": (float(np.nonzero(mask[min(mask.shape[0] - 1, leg_cut + 5)])[0].mean()), hip[1]),
    }
    names = {0: "torso", 1: "head", 2: "arm_l", 4: "leg_l"}
    meta_s = {"bottom": bottom}
    if tail:
        report["side_tail"] = add_tail(arr, mask, part, names, joints, meta_s)
    # Facing: skin at the outer edge of the lower head.
    head = part == 1
    skin_px = np.sqrt(((arr[:, :, :3] - np.array(skin, np.float32)) ** 2).sum(axis=2)) < 50
    hy = np.nonzero(head.any(axis=1))[0]
    votes = 0
    for y in range(int(hy[0] + 0.55 * (hy[-1] - hy[0])), int(hy[-1])):
        row = np.nonzero(head[y])[0]
        if len(row) < 4:
            continue
        votes += int(skin_px[y, row[-1] - 5:row[-1] - 1].mean() > 0.5) - int(skin_px[y, row[0] + 2:row[0] + 6].mean() > 0.5)
    facing = 1 if votes > 0 else -1
    facing = int(HINTS.get("facing", facing))
    arm_fill = ndimage.binary_dilation(arm, iterations=3) & mask
    torso_rgba = sc.fill_behind_arm(arr, arm_fill, 0, arr.shape[0], np.array(skin, np.float32))
    # A colour band may continue behind the arm (a belt) only if the back view shows it at the same height.
    Hb = meta_b["bottom"] - meta_b["top"]
    back_px = arr_b[:, :, :3].astype(np.float32)
    def allowed(y, colour):
        yb = int(meta_b["top"] + (y - top) / Hs * Hb)
        band = (part_b[max(0, yb - int(0.03 * Hb)):yb + int(0.03 * Hb)] == 0)
        px = back_px[max(0, yb - int(0.03 * Hb)):yb + int(0.03 * Hb)][band]
        return len(px) > 0 and float(np.sqrt(((px - colour) ** 2).sum(-1)).min()) < 40
    torso_rgba = fill_cloth(torso_rgba, arm_fill & (np.arange(mask.shape[0])[:, None] < crotch), cloth, mask & ~arm_fill, allowed)
    sc.Z["tail"] = 0
    sc.export(arr, part, names, joints, os.path.join(out_dir, "side"), scale, torso_rgba=torso_rgba,
              extra={"facing": facing, "neckToFeet": (bottom - neck) * scale})
    json.dump({"skin": skin.tolist(), "report": {k: (v if isinstance(v, (str, type(None))) else float(v)) for k, v in report.items()}},
              open(os.path.join(out_dir, "meta.json"), "w"))
    print("ok", report)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    main(args[0], args[1], tail="--tail" in sys.argv, scale=float(args[2]) if len(args) > 2 else 0.5)
