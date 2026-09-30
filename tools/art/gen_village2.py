import sys
sys.path.insert(0, ".")
from comfy_client import dream
P = ("top-down 3/4 view of a wide open fantasy village clearing for a 2d RPG game map, hand painted anime game art, zoomed out, "
     "organic natural layout with lots of open grass to walk on, a winding stone path connecting three places: "
     "an adventurers guild hall with a blue tiled roof and blue banners, a small item shop with a red roof and a red and white striped awning, "
     "and an ancient stone archway portal glowing with swirling violet magic at the top of the map, "
     "a small stream with a wooden bridge, a stone well, fences, flower patches, rocks, forest trees only around the edges, "
     "everything in harmony, one cohesive painting, soft warm afternoon light, gentle shadows, natural colors, cel shading, detailed")
N = ("people, characters, text, letters, watermark, signature, frame, border, ui, grid, tiles, symmetric layout, straight roads, "
     "more than two houses, many houses, city, castle, blurry, photo, 3d render")
for seed in (301, 302, 303):
    print(seed, dream(P, "village", f"w_{seed}", negative=N, seed=seed, width=1536, height=1152, batch=2), flush=True)
