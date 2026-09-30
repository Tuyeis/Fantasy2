import {ALL_VIEWS, LoadedItem, LoadedPart, LoadedView, Point, Puppet, PuppetRig, PuppetView, WeaponMeta, WeaponType} from "./puppet-types";

/** Puppets live in public/art/puppets/<key>/ (class keys and monster keys share the folder). */
const PUPPET_BASE: string = "art/puppets/";

const loaded: Map<string, Puppet> = new Map<string, Puppet>();
const pending: Map<string, Promise<Puppet | undefined>> = new Map<string, Promise<Puppet | undefined>>();

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise<HTMLImageElement>((resolve: (img: HTMLImageElement) => void, reject: (err: Error) => void) => {
        const img: HTMLImageElement = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("image failed: " + src));
        img.src = src;
    });
}

/** The same image painted in one flat colour (hit flash) or through a CSS filter (far limbs, back of a shield). */
function recolor(img: HTMLImageElement, filter: string | undefined): HTMLCanvasElement {
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
async function fetchOptionalJson<T>(url: string): Promise<T | undefined> {
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

function toWeaponType(raw: string | undefined): WeaponType {
    if (raw === undefined) {
        return WeaponType.Sword;
    }
    const known: WeaponType | undefined = (Object.values(WeaponType) as string[]).includes(raw) ? raw as WeaponType : undefined;
    if (known === undefined) {
        console.error("Unknown puppet weapon type, drawing it as a sword:", raw);
        return WeaponType.Sword;
    }
    return known;
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
        const img: HTMLImageElement = await loadImage(base + view + "/" + part.file);
        parts.set(part.name, {...part, img: img, white: recolor(img, undefined), dark: recolor(img, "brightness(0.86) saturate(0.92)")});
    }
    return {rig: rig, parts: parts, rest: restCorrection(rig, view)};
}

async function loadItem(base: string, name: string): Promise<LoadedItem | undefined> {
    const meta: WeaponMeta | undefined = await fetchOptionalJson<WeaponMeta>(base + name + ".json");
    if (!meta) {
        return undefined;
    }
    const type: WeaponType = toWeaponType(meta.type);
    if (type === WeaponType.None) {
        return undefined;
    }
    const img: HTMLImageElement = await loadImage(base + name + ".png");
    return {meta: meta, type: type, img: img, white: recolor(img, undefined), dark: recolor(img, "brightness(0.55) saturate(0.7)")};
}

async function loadPuppetNow(key: string): Promise<Puppet | undefined> {
    const base: string = PUPPET_BASE + key + "/";
    // A puppet exists when its side view does; missing puppets are normal (procedural fallback).
    if (!await fetchOptionalJson<PuppetRig>(base + PuppetView.Side + "/rig.json")) {
        return undefined;
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
        return puppet;
    } catch (err: unknown) {
        console.error("Puppet failed to load, using procedural sprite:", key, err);
        return undefined;
    }
}

export function loadPuppet(key: string): Promise<Puppet | undefined> {
    let job: Promise<Puppet | undefined> | undefined = pending.get(key);
    if (!job) {
        job = loadPuppetNow(key);
        pending.set(key, job);
    }
    return job;
}

/** Loads several puppets in parallel; never rejects. */
export function preloadPuppets(keys: string[]): Promise<void> {
    return Promise.all(keys.map((key: string) => loadPuppet(key))).then(() => undefined);
}

/** Synchronous access for renderers: undefined until loaded (or when the puppet does not exist). */
export function getPuppet(key: string): Puppet | undefined {
    return loaded.get(key);
}
