import sys
sys.path.insert(0, ".")
from comfy_client import dream
P = ("top-down 3/4 view of a cozy fantasy village for a 2d RPG game map, hand painted anime game art, zoomed out, "
     "organic natural layout with open grass and winding stone paths between the buildings, "
     "a large adventurers guild hall with a blue roof, a small item shop with a striped awning, a blacksmith forge with a chimney and glowing furnace, "
     "a magic library with a purple roof and a small tower, a cozy cottage with a green roof, a small round stone arena, "
     "an ancient stone archway portal with violet magic at the edge of the forest, "
     "a stream with a stone bridge, a well, fences, flower patches, rocks, forest trees around the edges, "
     "everything in harmony, one cohesive painting, soft warm afternoon light, gentle shadows, natural colors, cel shading, detailed")
N = ("people, characters, text, letters, watermark, signature, frame, border, ui, grid, tiles, symmetric layout, straight roads, "
     "city, castle, walls, blurry, photo, 3d render")
for seed in (401, 402, 403, 404):
    print(seed, dream(P, "village", f"x_{seed}", negative=N, seed=seed, width=1536, height=1152, batch=2), flush=True)
