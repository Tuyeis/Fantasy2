import {loadImage} from "../draw-utils";
import {ALL_VIEWS, LoadedItem, LoadedPart, LoadedView, Point, Puppet, PuppetRig, PuppetView, WeaponMeta, WeaponType} from "./puppet-types";

/** Puppets live in public/art/puppets/<key>/ (class keys and monster keys share the folder). */
const PUPPET_BASE: string = "art/puppets/";

const loaded: Map<string, Puppet> = new Map<string, Puppet>();

/** Like loadImage, but a missing image is an error (a puppet with a missing part is broken). */
async function requireImage(src: string): Promise<HTMLImageElement> {
    const img: HTMLImageElement | undefined = await loadImage(src);
    if (!img) {
        throw new Error("image failed: " + src);
    }
    return img;
}

/** The same image painted in one flat colour (hit flash) or through a CSS filter (far limbs, back of a shield). */
export function recolor(img: HTMLImageElement, filter: string | undefined): HTMLCanvasElement {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const g: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (filter !== undefined) {
        g.filter = filter;
        g.drawImage(img, 0, 0);
        return canvas;
    }
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

/** JSON that may legitimately be missing. A dev server answers unknown paths with index.html, so check the type. */
export async function fetchOptionalJson<T>(url: string): Promise<T | undefined> {
    try {
        const res: Response = await fetch(url);
        const type: string = res.headers.get("content-type") ?? "";
        if (!res.ok || !type.includes("json")) {
            return undefined;
        }
        return await res.json() as T;
    } catch (err: unknown) {
        return undefined;
    }
}

/** A raw value from a JSON file as a member of `values`; missing gives `fallback`, unknown logs `problem` and gives `fallback`. */
export function toEnum<T extends string>(values: Record<string, T>, raw: string | undefined, fallback: T, problem: string): T {
    if (raw === undefined) {
        return fallback;
    }
    if ((Object.values(values) as string[]).includes(raw)) {
        return raw as T;
    }
    console.error(problem, raw);
    return fallback;
}

/** Arms painted open (A-pose sheets) hang straighter in play; only the excess over a natural angle is corrected. */
function restCorrection(rig: PuppetRig, view: PuppetView): {l: number; r: number} {
    const keep: number = view === PuppetView.Side ? 0.1 : 0.25;
    const angle: (shoulder: Point | undefined, hand: Point | undefined) => number = (shoulder: Point | undefined, hand: Point | undefined): number => {
        if (!shoulder || !hand) {
            return 0;
        }
        const a: number = Math.atan2(hand[0] - shoulder[0], hand[1] - shoulder[1]);
        return Math.abs(a) <= keep ? 0 : a - Math.sign(a) * keep;
    };
    return {l: angle(rig.joints.shoulder_l, rig.joints.hand_l), r: angle(rig.joints.shoulder_r, rig.joints.hand_r)};
}

async function loadView(base: string, view: PuppetView): Promise<LoadedView> {
    const res: Response = await fetch(base + view + "/rig.json");
    const rig: PuppetRig = await res.json() as PuppetRig;
    const parts: Map<string, LoadedPart> = new Map<string, LoadedPart>();
    for (const part of rig.parts) {
        const img: HTMLImageElement = await requireImage(base + view + "/" + part.file);
        parts.set(part.name, {...part, img: img, white: recolor(img, undefined), dark: recolor(img, "brightness(0.86) saturate(0.92)")});
    }
    return {rig: rig, parts: parts, rest: restCorrection(rig, view)};
}

async function loadItem(base: string, name: string): Promise<LoadedItem | undefined> {
    const meta: WeaponMeta | undefined = await fetchOptionalJson<WeaponMeta>(base + name + ".json");
    if (!meta) {
        return undefined;
    }
    const type: WeaponType = toEnum(WeaponType, meta.type, WeaponType.Sword, "Unknown puppet weapon type, drawing it as a sword:");
    if (type === WeaponType.None) {
        return undefined;
    }
    const img: HTMLImageElement = await requireImage(base + name + ".png");
    return {meta: meta, type: type, img: img, white: recolor(img, undefined), dark: recolor(img, "brightness(0.55) saturate(0.7)")};
}

async function loadPuppet(key: string): Promise<void> {
    const base: string = PUPPET_BASE + key + "/";
    // A puppet exists when its side view does (monsters without one are painted sprites).
    if (!await fetchOptionalJson<PuppetRig>(base + PuppetView.Side + "/rig.json")) {
        return;
    }
    try {
        const views: Partial<Record<PuppetView, LoadedView>> = {};
        for (const view of ALL_VIEWS) {
            views[view] = await loadView(base, view);
        }
        const complete: Record<PuppetView, LoadedView> = views as Record<PuppetView, LoadedView>;
        const puppet: Puppet = {
            key: key,
            views: complete,
            weapon: await loadItem(base, "weapon"),
            offhand: await loadItem(base, "offhand"),
            sideFacing: complete[PuppetView.Side].rig.facing ?? 1
        };
        loaded.set(key, puppet);
    } catch (err: unknown) {
        console.error("Puppet failed to load:", key, err);
    }
}

/** Loads several puppets in parallel; never rejects. */
export function preloadPuppets(keys: string[]): Promise<void> {
    return Promise.all(keys.map((key: string) => loadPuppet(key))).then(() => undefined);
}

/** Synchronous access for renderers: undefined until loaded (or when the puppet does not exist). */
export function getPuppet(key: string): Puppet | undefined {
    return loaded.get(key);
}
