import sys
sys.path.insert(0, ".")
from comfy_client import dream
P = ("top-down 3/4 view of a small cozy fantasy village clearing for a 2d RPG game map, hand painted anime game art, "
     "organic natural layout, a winding dirt path that meanders through soft grass, only two buildings: an adventurers guild hall with a blue roof "
     "and a small item shop with a red roof and striped awning, a little stone well, wooden fences, a small pond with reeds, flower patches, "
     "rocks, bushes, dense forest trees framing the edges, everything in harmony, one cohesive painting, soft warm afternoon light, "
     "gentle shadows, vibrant but natural colors, cel shading, detailed, no grid, no symmetry")
N = ("people, characters, text, letters, watermark, signature, frame, border, ui, grid, tiles, symmetric layout, straight roads, "
     "many houses, city, castle, blurry, photo, 3d render, isometric city block")
for seed in (201, 202):
    print(seed, dream(P, "village", f"v_{seed}", negative=N, seed=seed, width=1536, height=1152, batch=2), flush=True)
