"""Weapon sprite -> transparent PNG + grip metadata.

Blades (sword/dagger, drawn tip-down): grip = centre of the handle between pommel and guard.
Bow: thin string removed (morphological opening); grip = middle of the riser; string anchors = bow tips.
"""
import json, os, sys
import numpy as np
from PIL import Image
from rembg import new_session, remove
from scipy import ndimage

SESSION = None


def cutout(path):
    global SESSION
    SESSION = SESSION or new_session("isnet-anime")
    arr = np.array(remove(Image.open(path).convert("RGB"), session=SESSION)).astype(np.float32)
    a = arr[:, :, 3]; a[a < 60] = 0; arr[:, :, 3] = np.clip((a - 60) / 160 * 255, 0, 255)
    return arr


def crop_scale(arr, height):
    img = Image.fromarray(arr.astype(np.uint8)); img = img.crop(img.getbbox())
    s = height / img.height
    return img.resize((max(1, round(img.width * s)), height), Image.LANCZOS)


def blade(path, out_dir, height, wtype, by_colour=False):
    img = crop_scale(largest(colour_cut(path)) if by_colour else cutout(path), height)
    a = np.array(img)[:, :, 3] > 30
    w = a.sum(axis=1)
    guard = int(np.argmax(w[:len(w) // 2]))
    guard_top = next((y for y in range(guard, 0, -1) if w[y] <= w[guard] * 0.45), max(1, guard - 5))
    handle = w[2:guard_top]
    pommel_end = 2 + int(np.argmin(handle[:max(1, len(handle) // 3)])) if len(handle) > 3 else 1
    grip_y = (pommel_end + guard_top) / 2
    xs = np.nonzero(a[int(grip_y)])[0]
    if len(xs) == 0:
        # thin or faint handle: take the nearest rows that do have pixels
        xs = np.nonzero(a[max(0, int(grip_y) - 6):int(grip_y) + 7].any(axis=0))[0]
    if len(xs) == 0:
        xs = np.array([img.width / 2])
    img.save(os.path.join(out_dir, "weapon.png"))
    meta = {"type": wtype, "grip": [float(xs.mean()), float(grip_y)], "tipDown": True, "w": img.width, "h": img.height,
            "handle": [int(pommel_end), int(guard_top)], "guard": guard}
    json.dump(meta, open(os.path.join(out_dir, "weapon.json"), "w"))
    return meta


def colour_cut(path):
    """Plain studio background: alpha from the colour distance to the background, measured on the image border
    (per row, so a vertical gradient is followed). No AI matting, nothing of the background leaks in."""
    rgb = np.array(Image.open(path).convert("RGB")).astype(np.float32)
    border = np.concatenate([rgb[:, :12], rgb[:, -12:]], axis=1)          # left and right strips, per row
    bg_row = np.median(border, axis=1)                                    # (h, 3)
    dist = np.sqrt(((rgb - bg_row[:, None, :]) ** 2).sum(axis=2))
    alpha = np.clip((dist - 22) / 28, 0, 1) * 255
    return np.dstack([rgb, alpha])


def dark_cut(path):
    """Dark or saturated pixels on a light background (the approved dark elf bow was cut with this)."""
    rgb = np.array(Image.open(path).convert("RGB")).astype(np.float32)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    score = np.maximum((175 - mx) / 50, (sat - 0.18) / 0.15)
    return np.dstack([rgb, np.clip(score, 0, 1) * 255])


def bow(path, out_dir, height, by_colour=False):
    arr = dark_cut(path) if by_colour else cutout(path)
    solid = arr[:, :, 3] > 30
    limbs = ndimage.binary_opening(solid, iterations=4 if by_colour else 3)   # removes the thin string(s)
    lab, n = ndimage.label(limbs)
    if n > 1:
        sizes = ndimage.sum(limbs, lab, range(1, n + 1)); limbs = lab == (int(np.argmax(sizes)) + 1)
    limbs = ndimage.binary_dilation(limbs, iterations=2 if by_colour else 1) & solid
    arr[~limbs, 3] = 0
    img = crop_scale(arr, height)
    a = np.array(img)[:, :, 3] > 30
    ys = np.nonzero(a.any(axis=1))[0]
    top, bot = ys.min(), ys.max()
    tip_top = [float(np.nonzero(a[top + 2])[0].mean()), float(top + 2)]
    tip_bot = [float(np.nonzero(a[bot - 2])[0].mean()), float(bot - 2)]
    mid = int((top + bot) / 2)
    grip = [float(np.nonzero(a[mid])[0].mean()), float(mid)]
    img.save(os.path.join(out_dir, "weapon.png"))
    # The string runs on the side opposite to the belly of the limbs.
    belly = float(np.mean([np.nonzero(a[y])[0].mean() for y in range(top + 5, bot - 5, 5)]))
    string_side = 1 if belly < (tip_top[0] + tip_bot[0]) / 2 else -1
    meta = {"type": "bow", "grip": grip, "tipTop": tip_top, "tipBottom": tip_bot, "stringSide": string_side, "w": img.width, "h": img.height}
    json.dump(meta, open(os.path.join(out_dir, "weapon.json"), "w"))
    return meta


def largest(arr):
    solid = arr[:, :, 3] > 30
    lab, n = ndimage.label(solid)
    if n > 1:
        sizes = ndimage.sum(solid, lab, range(1, n + 1))
        arr[lab != (int(np.argmax(sizes)) + 1), 3] = 0
    return arr


def drop_base(arr):
    """Remove a pedestal/stand at the bottom: bottom rows much wider than the shaft."""
    a = arr[:, :, 3] > 30
    rows = np.nonzero(a.any(axis=1))[0]
    w = a.sum(axis=1)
    shaft = np.median(w[rows[int(len(rows) * 0.45)]:rows[int(len(rows) * 0.75)]])
    low = [y for y in range(int(rows[0] + 0.7 * (rows[-1] - rows[0])), rows[-1] + 1) if w[y] > shaft * 2.2]
    if not low:
        return arr
    y = min(low)
    while y > rows[0] and w[y] > shaft * 1.3:
        y -= 1
    arr[y + 1:, :, 3] = 0
    return arr


def long_item(path, out_dir, height, wtype, grip_frac, flip=False, base=False, by_colour=False):
    """Staffs, poles, axes, clubs, tridents. Drawn head-up; tip-down types (axe, club) are flipped so the viewer can
    treat them like swords (handle end up, heavy end down)."""
    arr = largest(colour_cut(path) if by_colour else cutout(path))
    if base:
        arr = drop_base(arr)
    if flip:
        arr = arr[::-1].copy()
    img = crop_scale(arr, height)
    a = np.array(img)[:, :, 3] > 30
    gy = int(grip_frac * img.height)
    xs = np.nonzero(a[gy])[0]
    img.save(os.path.join(out_dir, "weapon.png"))
    meta = {"type": wtype, "grip": [float(xs.mean()) if len(xs) else img.width / 2, float(gy)], "w": img.width, "h": img.height,
            "tipDown": flip}
    json.dump(meta, open(os.path.join(out_dir, "weapon.json"), "w"))
    return meta


def shield(path, out_dir, height):
    arr = largest(cutout(path))
    img = crop_scale(arr, height)
    img.save(os.path.join(out_dir, "offhand.png"))
    meta = {"type": "shield", "grip": [img.width / 2, img.height * 0.5], "w": img.width, "h": img.height}
    json.dump(meta, open(os.path.join(out_dir, "offhand.json"), "w"))
    return meta


if __name__ == "__main__":
    src, out_dir, wtype, height = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    os.makedirs(out_dir, exist_ok=True)
    if wtype == "bow":
        print(bow(src, out_dir, height, by_colour="--colour" in sys.argv))
    elif wtype in ("staff", "trident"):
        print(long_item(src, out_dir, height, wtype, 0.56, base="--base" in sys.argv))
    elif wtype == "pole":
        print(long_item(src, out_dir, height, wtype, 0.5, by_colour=True))
    elif wtype in ("axe", "club"):
        print(long_item(src, out_dir, height, wtype, 0.13, flip=True))
    elif wtype == "shield":
        print(shield(src, out_dir, height))
    else:
        print(blade(src, out_dir, height, wtype, by_colour="--colour" in sys.argv))
