"""Segment Anything helpers (isolated install in ./pylibs)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "pylibs"))
import numpy as np
import torch
from segment_anything import sam_model_registry, SamPredictor

_PRED = None


def predictor():
    global _PRED
    if _PRED is None:
        sam = sam_model_registry["vit_b"](checkpoint=os.path.join(HERE, "models", "sam_vit_b_01ec64.pth"))
        sam.to("cuda" if torch.cuda.is_available() else "cpu")
        _PRED = SamPredictor(sam)
    return _PRED


def segment(rgb_array, positives, negatives=(), area_range=None, silhouette=None):
    """Return the best mask for the given point prompts (optionally constrained by area and silhouette)."""
    p = predictor()
    p.set_image(rgb_array.astype(np.uint8))
    pts = np.array(list(positives) + list(negatives), np.float32)
    labels = np.array([1] * len(positives) + [0] * len(negatives))
    masks, scores, _ = p.predict(point_coords=pts, point_labels=labels, multimask_output=True)
    best = None
    for m, s in zip(masks, scores):
        if silhouette is not None:
            m = m & silhouette
        area = m.sum()
        if area_range and not (area_range[0] <= area <= area_range[1]):
            continue
        if best is None or s > best[1]:
            best = (m, s)
    if best is None:
        i = int(np.argmax(scores))
        best = (masks[i] & silhouette if silhouette is not None else masks[i], scores[i])
    return best[0], float(best[1])
