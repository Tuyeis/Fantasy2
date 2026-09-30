"""Tiny ComfyUI API client: builds SDXL workflows, queues them and downloads results."""
import json
import os
import random
import sys
import time
import urllib.parse
import urllib.request
import uuid

SERVER = "http://127.0.0.1:8188"

PONY = "ponyDiffusionV6XL.safetensors"
DREAM = "dreamshaperXL_lightningDPMSDE.safetensors"

PONY_POS_PREFIX = "score_9, score_8_up, score_7_up, source_anime, "
PONY_NEG = ("score_4, score_5, score_6, lowres, bad anatomy, bad hands, extra fingers, missing fingers, "
            "blurry, jpeg artifacts, watermark, signature, text, logo, cropped, out of frame, multiple views, "
            "2girls, 2boys, duo, group, reference sheet, nsfw, realistic, 3d")


def _post(path, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(SERVER + path, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def _get(path):
    with urllib.request.urlopen(SERVER + path) as resp:
        return json.loads(resp.read())


def upload_image(file_path):
    boundary = uuid.uuid4().hex
    name = os.path.basename(file_path)
    with open(file_path, "rb") as fh:
        content = fh.read()
    body = (
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"{name}\"\r\n"
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}\r\nContent-Disposition: form-data; name=\"overwrite\"\r\n\r\ntrue\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(SERVER + "/upload/image", data=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["name"]


def sdxl_workflow(positive, negative, ckpt, width, height, seed, steps, cfg, sampler, scheduler,
                  clip_skip=None, lora=None, lora_strength=0.8, control_image=None, control_type="openpose",
                  control_strength=0.8, control_end=0.8, batch=1, prefix="game"):
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
    }
    model = ["1", 0]
    clip = ["1", 1]
    if lora:
        wf["20"] = {"class_type": "LoraLoader", "inputs": {"model": model, "clip": clip, "lora_name": lora,
                                                          "strength_model": lora_strength, "strength_clip": lora_strength}}
        model = ["20", 0]
        clip = ["20", 1]
    if clip_skip:
        wf["2"] = {"class_type": "CLIPSetLastLayer", "inputs": {"clip": clip, "stop_at_clip_layer": -clip_skip}}
        clip = ["2", 0]
    wf["3"] = {"class_type": "CLIPTextEncode", "inputs": {"text": positive, "clip": clip}}
    wf["4"] = {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": clip}}
    pos = ["3", 0]
    neg = ["4", 0]
    if control_image:
        wf["10"] = {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "controlnet-union-sdxl-promax.safetensors"}}
        wf["13"] = {"class_type": "SetUnionControlNetType", "inputs": {"control_net": ["10", 0], "type": control_type}}
        wf["11"] = {"class_type": "LoadImage", "inputs": {"image": control_image}}
        wf["12"] = {"class_type": "ControlNetApplyAdvanced", "inputs": {
            "positive": pos, "negative": neg, "control_net": ["13", 0], "image": ["11", 0],
            "strength": control_strength, "start_percent": 0.0, "end_percent": control_end, "vae": ["1", 2]}}
        pos = ["12", 0]
        neg = ["12", 1]
    wf["5"] = {"class_type": "EmptyLatentImage", "inputs": {"width": width, "height": height, "batch_size": batch}}
    wf["6"] = {"class_type": "KSampler", "inputs": {
        "model": model, "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": sampler, "scheduler": scheduler,
        "positive": pos, "negative": neg, "latent_image": ["5", 0], "denoise": 1.0}}
    wf["7"] = {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}}
    wf["8"] = {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": prefix}}
    return wf


def run(workflow, out_dir, name, timeout=600):
    os.makedirs(out_dir, exist_ok=True)
    client_id = uuid.uuid4().hex
    prompt_id = _post("/prompt", {"prompt": workflow, "client_id": client_id})["prompt_id"]
    start = time.time()
    while True:
        hist = _get("/history/" + prompt_id)
        if prompt_id in hist:
            entry = hist[prompt_id]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(json.dumps(status)[:2000])
            files = []
            for node_out in entry["outputs"].values():
                for i, img in enumerate(node_out.get("images", [])):
                    query = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
                    with urllib.request.urlopen(SERVER + "/view?" + query) as resp:
                        target = os.path.join(out_dir, f"{name}_{i}.png")
                        with open(target, "wb") as fh:
                            fh.write(resp.read())
                        files.append(target)
            return files
        if time.time() - start > timeout:
            raise TimeoutError(prompt_id)
        time.sleep(1.0)


def inpaint(image_name, mask_name, prompt, out_dir, name, seed=7, steps=28, cfg=6.5, grow=10, ckpt=PONY, negative=None):
    """Inpaint the white area of an uploaded mask image (both uploaded with upload_image)."""
    negative = negative or PONY_NEG
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": ckpt}},
        "2": {"class_type": "CLIPSetLastLayer", "inputs": {"clip": ["1", 1], "stop_at_clip_layer": -2}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": PONY_POS_PREFIX + prompt, "clip": ["2", 0]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["2", 0]}},
        "5": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "9": {"class_type": "LoadImage", "inputs": {"image": mask_name}},
        "10": {"class_type": "ImageToMask", "inputs": {"image": ["9", 0], "channel": "red"}},
        "11": {"class_type": "VAEEncodeForInpaint", "inputs": {"pixels": ["5", 0], "vae": ["1", 2], "mask": ["10", 0], "grow_mask_by": grow}},
        "6": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler_ancestral",
                                                  "scheduler": "normal", "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["11", 0], "denoise": 1.0}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "inpaint"}},
    }
    return run(wf, out_dir, name)


def repaint(image_name, mask_name, prompt, out_dir, name, seed=7, denoise=0.6, steps=30, cfg=6.5, negative=None, batch=1):
    """Partial re-generation of the white area of the mask (keeps the underlying structure)."""
    negative = negative or PONY_NEG
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": PONY}},
        "2": {"class_type": "CLIPSetLastLayer", "inputs": {"clip": ["1", 1], "stop_at_clip_layer": -2}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": PONY_POS_PREFIX + prompt, "clip": ["2", 0]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["2", 0]}},
        "5": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "9": {"class_type": "LoadImage", "inputs": {"image": mask_name}},
        "10": {"class_type": "ImageToMask", "inputs": {"image": ["9", 0], "channel": "red"}},
        "11": {"class_type": "VAEEncode", "inputs": {"pixels": ["5", 0], "vae": ["1", 2]}},
        "12": {"class_type": "SetLatentNoiseMask", "inputs": {"samples": ["11", 0], "mask": ["10", 0]}},
        "13": {"class_type": "RepeatLatentBatch", "inputs": {"samples": ["12", 0], "amount": batch}},
        "6": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler_ancestral",
                                                  "scheduler": "normal", "positive": ["3", 0], "negative": ["4", 0], "latent_image": ["13", 0], "denoise": denoise}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "repaint"}},
    }
    return run(wf, out_dir, name)


def repose(image_name, control_name, prompt, out_dir, name, seed=7, denoise=0.6, steps=30, cfg=6.5, strength=0.85, control_end=0.8, extra_neg=""):
    """img2img of an existing sheet with an OpenPose ControlNet: keeps the design, changes the pose."""
    wf = {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": PONY}},
        "2": {"class_type": "CLIPSetLastLayer", "inputs": {"clip": ["1", 1], "stop_at_clip_layer": -2}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": PONY_POS_PREFIX + prompt, "clip": ["2", 0]}},
        "4": {"class_type": "CLIPTextEncode", "inputs": {"text": PONY_NEG + ", " + extra_neg, "clip": ["2", 0]}},
        "5": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "11": {"class_type": "VAEEncode", "inputs": {"pixels": ["5", 0], "vae": ["1", 2]}},
        "20": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": "controlnet-union-sdxl-promax.safetensors"}},
        "21": {"class_type": "SetUnionControlNetType", "inputs": {"control_net": ["20", 0], "type": "openpose"}},
        "22": {"class_type": "LoadImage", "inputs": {"image": control_name}},
        "23": {"class_type": "ControlNetApplyAdvanced", "inputs": {"positive": ["3", 0], "negative": ["4", 0], "control_net": ["21", 0], "image": ["22", 0],
                                                                  "strength": strength, "start_percent": 0.0, "end_percent": control_end, "vae": ["1", 2]}},
        "6": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler_ancestral",
                                                  "scheduler": "normal", "positive": ["23", 0], "negative": ["23", 1], "latent_image": ["11", 0], "denoise": denoise}},
        "7": {"class_type": "VAEDecode", "inputs": {"samples": ["6", 0], "vae": ["1", 2]}},
        "8": {"class_type": "SaveImage", "inputs": {"images": ["7", 0], "filename_prefix": "repose"}},
    }
    return run(wf, out_dir, name)


def pony(prompt, out_dir, name, seed=None, width=832, height=1216, batch=1, steps=26, cfg=7.0, **kw):
    seed = seed if seed is not None else random.randint(1, 2**31)
    wf = sdxl_workflow(PONY_POS_PREFIX + prompt, PONY_NEG + ", " + kw.pop("extra_neg", ""), PONY, width, height, seed,
                       steps, cfg, "euler_ancestral", "normal", clip_skip=2, batch=batch, **kw)
    return run(wf, out_dir, name)


def dream(prompt, out_dir, name, negative="blurry, lowres, text, watermark, signature, frame, border", seed=None,
          width=1024, height=1024, batch=1, steps=6, cfg=2.0, **kw):
    seed = seed if seed is not None else random.randint(1, 2**31)
    wf = sdxl_workflow(prompt, negative, DREAM, width, height, seed, steps, cfg, "dpmpp_sde", "karras", batch=batch, **kw)
    return run(wf, out_dir, name)


if __name__ == "__main__":
    print(json.dumps(_get("/system_stats"), indent=1)[:800])
