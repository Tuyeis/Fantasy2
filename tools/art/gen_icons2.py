import sys
sys.path.insert(0, ".")
from comfy_client import dream
import gen_icons
until = __import__("time")
print("fireball", dream("a round blazing ball of fire, orange and yellow flames swirling around a bright core, no creature, " + gen_icons.STYLE,
                        "icons", "fireball2", negative=gen_icons.NEG + ", dragon, animal, creature, monster", seed=93, width=768, height=768, batch=3), flush=True)
