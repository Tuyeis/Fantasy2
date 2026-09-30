import sys
sys.path.insert(0, ".")
from comfy_client import dream
P = ("top-down 3/4 view of a cozy fantasy village for a 2d RPG game map, hand painted anime game art, zoomed out, "
     "only six buildings spread far apart with lots of open grass between them, each building different: "
     "a big timber guild hall, a small shop with a striped awning, a stone blacksmith with a smoking chimney, "
     "a round wizard tower, a tiny cottage, a small round open-air stone arena, "
     "roofs in varied natural colors red, blue, green, brown and slate grey, "
     "an ancient stone archway portal at the edge of the forest, winding stone paths, a stream with a bridge, a well, flowers, rocks, "
     "forest around the edges, everything in harmony, one cohesive painting, soft warm afternoon light, natural colors, cel shading")
N = ("people, characters, text, letters, watermark, signature, frame, border, ui, grid, tiles, symmetric layout, straight roads, "
     "crowded, many houses, all purple roofs, city, castle, walls, blurry, photo, 3d render")
for seed in (501, 502, 503, 504):
    print(seed, dream(P, "village", f"y_{seed}", negative=N, seed=seed, width=1536, height=1152, batch=2), flush=True)
