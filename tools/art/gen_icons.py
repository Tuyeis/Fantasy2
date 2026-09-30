"""Ability icons (DreamShaper Lightning): one square painted icon per ability key, 3 candidates each."""
import os, sys
sys.path.insert(0, ".")
from comfy_client import dream
STYLE = ("fantasy RPG skill icon, square icon, centered symbol, vibrant glowing colors, bold outline, painted anime game UI art, "
         "dark rich background with a soft radial glow, no text, no border frame")
NEG = "text, letters, words, watermark, signature, person, face, character, hands, frame, border, blurry, photo, 3d render, multiple icons"
ICONS = {
    "firm_strike": "a heavy sword strike with a white impact flash",
    "study_bolt": "an open glowing spellbook shooting a blue magic bolt",
    "minor_heal": "a small golden healing cross with green sparkles",
    "morale": "a raised banner flag with golden rays of courage",
    "slash": "a single sharp white sword slash arc",
    "double_cut": "two crossing sword slash arcs in an X",
    "flame_blade": "a sword engulfed in orange flames",
    "war_cry": "a roaring shout sound wave in red and gold",
    "fireball": "a blazing fireball with a fiery tail",
    "frost_nova": "an exploding ring of blue ice shards",
    "arcane_missiles": "three purple arcane magic orbs flying",
    "mana_shield": "a glowing blue magic bubble shield",
    "arrow_rain": "many arrows falling from the sky",
    "poison_arrow": "an arrow dripping green poison",
    "natures_blessing": "green leaves swirling around a glowing seed of life",
    "eagle_eye": "a golden eagle eye with a target crosshair",
    "staff_combo": "a red and gold monkey king staff spinning with motion lines",
    "cloud_strike": "a golden cloud with a powerful staff smash from above",
    "golden_body": "a glowing golden armored body silhouette with light",
    "heavenly_thunder": "a golden lightning bolt striking from heavenly clouds",
    "scratch_fury": "four claw scratch marks slashing",
    "pounce": "a cat paw leaping with speed lines",
    "hypnotic_gaze": "a hypnotic spiral eye in purple and pink",
    "nine_lives": "a cat tail forming a golden halo with a heart",
    "shield_bash": "a steel shield smashing with an impact burst",
    "holy_strike": "a sword glowing with holy white and gold light",
    "fortress": "a stone castle tower shield glowing blue",
    "lay_on_hands": "two glowing hands radiating warm golden healing light",
    "blood_drain": "red blood droplets being drained in a swirl",
    "bat_swarm": "a swarm of small black bats flying",
    "charm_gaze": "a seductive pink heart shaped eye",
    "crimson_feast": "a crimson blood moon with vampire fangs",
    "shadow_arrow": "a dark purple shadow arrow",
    "venom_volley": "three green venomous arrows",
    "night_veil": "a dark crescent moon veil of night",
    "soul_rend": "a ghostly soul being torn apart in violet light",
    "hex_bolt": "a cursed purple hex rune bolt",
    "curse_of_sleep": "a sleepy purple moon with zzz clouds",
    "hellfire": "a pillar of dark red hellfire flames",
    "soul_siphon": "ghostly blue souls spiraling into a dark vortex",
}
if __name__ == "__main__":
    only = sys.argv[1:] or list(ICONS)
    os.makedirs("icons", exist_ok=True)
    for key in only:
        print(key, dream(ICONS[key] + ", " + STYLE, "icons", key, negative=NEG, seed=91, width=768, height=768, batch=3), flush=True)
    print("ICONS DONE", flush=True)
