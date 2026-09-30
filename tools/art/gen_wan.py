import sys, time, os
sys.path.insert(0, ".")
from PIL import Image
from comfy_client import run, upload_image

W, H, LENGTH = 512, 704, 49

def prepare_start(src, dst):
    im = Image.open(src).convert("RGB")
    bg = im.getpixel((5, 5))
    scale = min(W / im.width, H * 0.92 / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), bg)
    canvas.paste(im, ((W - im.width) // 2, H - im.height - 12))
    canvas.save(dst)

def wan(start_name, prompt, prefix, seed=77, steps=20):
    neg = ("blurry, low quality, distorted, deformed, extra limbs, extra fingers, morphing, flickering, camera movement, zoom, "
           "background change, text, watermark, static image, still frame")
    wf = {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": "wan2.2_ti2v_5B_fp16.safetensors", "weight_dtype": "fp8_e4m3fn"}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors", "type": "wan"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "wan2.2_vae.safetensors"}},
        "4": {"class_type": "LoadImage", "inputs": {"image": start_name}},
        "5": {"class_type": "Wan22ImageToVideoLatent", "inputs": {"vae": ["3", 0], "width": W, "height": H, "length": LENGTH, "batch_size": 1, "start_image": ["4", 0]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["2", 0]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": neg, "clip": ["2", 0]}},
        "8": {"class_type": "ModelSamplingSD3", "inputs": {"model": ["1", 0], "shift": 8.0}},
        "9": {"class_type": "KSampler", "inputs": {"model": ["8", 0], "seed": seed, "steps": steps, "cfg": 5.0, "sampler_name": "uni_pc", "scheduler": "simple",
                                                  "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0], "denoise": 1.0}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["3", 0]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefix}},
    }
    return run(wf, os.path.join("gen_test", prefix), "f", timeout=3600)

prepare_start("gen_test/novice_1.png", "gen_test/wan_start.png")
name = upload_image("gen_test/wan_start.png")
jobs = [
    ("wan_front", "2D anime animation. A cute chibi boy with a sword walks in place facing the camera, a clear walk cycle: his legs step one after the other and his arms swing. "
                  "Full body always visible, the character stays in the center, the camera is static, plain white background, smooth hand-drawn anime animation."),
    ("wan_side", "2D anime animation. The cute chibi boy turns to show his side profile facing right and walks in place, a clear side view walk cycle, legs stepping forward and back, "
                 "arms swinging. Full body always visible, the character stays in the center, static camera, plain white background, smooth hand-drawn anime animation."),
]
for prefix, prompt in jobs:
    t = time.time()
    files = wan(name, prompt, prefix)
    print(prefix, len(files), "frames", round(time.time() - t), "s", flush=True)
