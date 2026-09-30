"""Hand layout of village/y_503_0.png (1536x1152, 1 px = 1 game px): collisions, doors, occluders, signs."""
import json
from PIL import Image, ImageDraw
L = {
    "image": "art/town/village/village.jpg", "width": 1536, "height": 1152,
    # key: door (where the hero stands to enter), sign (post position), body (building outline for occlusion, point list),
    # base (y of the wall bottom: the hero is behind the building when above it), block (footprint rectangle x0,y0,x1,y1)
    "buildings": {
        "class_library": {"door": [378, 412], "sign": [320, 420], "base": 402,
                          "block": [345, 255, 590, 398], "body": [[330, 130], [405, 55], [470, 125], [535, 150], [602, 235], [600, 335], [565, 400], [345, 402], [340, 300]]},
        "guild": {"door": [1262, 352], "sign": [1195, 355], "base": 342,
                  "block": [1045, 215, 1458, 338], "body": [[1030, 170], [1120, 45], [1400, 60], [1470, 160], [1468, 300], [1450, 345], [1045, 345], [1030, 280]]},
        "shop": {"door": [760, 708], "sign": [700, 712], "base": 695,
                 "block": [680, 560, 995, 690], "body": [[650, 530], [760, 390], [850, 360], [1000, 510], [995, 690], [690, 700], [660, 640]]},
        "forge": {"door": [932, 992], "sign": [872, 995], "base": 980,
                  "block": [870, 815, 1275, 975], "body": [[845, 830], [1020, 640], [1110, 660], [1285, 820], [1275, 975], [870, 990], [850, 900]]},
        "house": {"door": [300, 768], "sign": [240, 772], "base": 758,
                  "block": [90, 600, 395, 752], "body": [[70, 590], [170, 400], [220, 380], [400, 600], [398, 760], [110, 765], [75, 700]]},
        "coliseum": {"door": [1440, 728], "sign": [1380, 740], "base": 716,
                     "block": [1250, 610, 1482, 712], "body": [[1238, 600], [1320, 485], [1420, 500], [1490, 590], [1486, 715], [1255, 720], [1240, 660]]},
        "portal": {"door": [1375, 1000], "sign": [1305, 1010], "base": 985, "block": [1330, 930, 1420, 982], "body": []}
    },
    # decorative houses: only occlusion + collision
    "decor": [
        {"base": 485, "block": [285, 420, 392, 480], "body": [[272, 400], [320, 350], [395, 400], [392, 488], [285, 490]]},
        {"base": 292, "block": [655, 240, 752, 288], "body": [[645, 215], [690, 165], [758, 210], [752, 298], [655, 300]]},
        {"base": 432, "block": [850, 330, 1085, 428], "body": [[828, 320], [880, 200], [980, 220], [1092, 330], [1085, 440], [850, 440]]},
        {"base": 552, "block": [1120, 470, 1288, 548], "body": [[1108, 455], [1160, 370], [1235, 380], [1292, 450], [1288, 560], [1120, 560]]}
    ],
    # blocked polygons (water, rocks, forest)
    "blocked": [
        [[0, 0], [1536, 0], [1536, 120], [1300, 130], [1030, 160], [900, 185], [820, 190], [760, 160], [640, 175], [600, 150], [320, 150], [250, 200], [120, 330], [0, 360]],
        [[0, 330], [60, 330], [70, 560], [40, 760], [0, 780]],
        [[1470, 120], [1536, 120], [1536, 450], [1490, 420]],
        [[1450, 790], [1536, 760], [1536, 1152], [1400, 1152], [1440, 1060]],
        [[0, 880], [60, 900], [150, 960], [250, 960], [360, 900], [440, 860], [510, 840], [560, 870], [600, 900], [660, 910], [660, 960], [610, 1040], [600, 1152], [0, 1152]],
        [[488, 560], [540, 540], [610, 545], [650, 580], [640, 640], [590, 670], [520, 668], [488, 630]],
        [[700, 1110], [1050, 1100], [1100, 1152], [700, 1152]]
    ],
    # walkable holes carved out of the blocked areas (bridges)
    "bridges": [[[525, 800], [575, 780], [705, 860], [720, 900], [680, 920], [535, 840]]],
    "spawn": {"house": [300, 800], "portal": [1370, 1040], "coliseum": [1440, 760]}
}
json.dump(L, open("village_layout.json", "w"), indent=1)
im = Image.open("village/y_503_0.png").convert("RGBA")
ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
for poly in L["blocked"]:
    d.polygon([tuple(p) for p in poly], fill=(255, 0, 0, 90))
for poly in L["bridges"]:
    d.polygon([tuple(p) for p in poly], fill=(0, 255, 0, 110))
for k, b in list(L["buildings"].items()) + [("decor", x) for x in L["decor"]]:
    x0, y0, x1, y1 = b["block"]; d.rectangle([x0, y0, x1, y1], fill=(255, 140, 0, 90))
    if b["body"]:
        d.line([tuple(p) for p in b["body"]] + [tuple(b["body"][0])], fill=(0, 200, 255, 255), width=3)
    if "door" in b:
        x, y = b["door"]; d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(255, 255, 0, 255)); d.text((x + 10, y - 6), k, fill=(255, 255, 255, 255))
        sx, sy = b["sign"]; d.rectangle([sx - 6, sy - 30, sx + 6, sy], fill=(160, 90, 30, 255))
im.alpha_composite(ov); im.convert("RGB").save("village_overlay.png")
