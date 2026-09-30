/**
 * Painted single-sprite monsters (creatures that are not cut into a puppet: slimes, beasts, flyers, spirits...).
 * Each sprite is animated in code with a movement style. Files: public/art/monsters/<key>.png + <key>.json.
 */

export enum MonsterAnim {
    Blob = "blob",
    Hop = "hop",
    Scurry = "scurry",
    Flap = "flap",
    Float = "float",
    Stomp = "stomp"
}

export interface MonsterSpriteMeta {
    key: string;
    w: number;
    h: number;
    anim: MonsterAnim | `${MonsterAnim}` | string;
    /** Horizontal position of the feet in the image (sprites face LEFT). */
    footX: number;
}

export interface MonsterSprite {
    meta: MonsterSpriteMeta;
    anim: MonsterAnim;
    img: HTMLImageElement;
    white: HTMLCanvasElement;
}

/** Transform of a sprite for one frame. */
interface SpriteFrame {
    x: number;
    y: number;
    rot: number;
    sx: number;
    sy: number;
    alpha: number;
    glow: number;
}

const MONSTER_BASE: string = "art/monsters/";
const sprites: Map<string, MonsterSprite> = new Map<string, MonsterSprite>();

function toAnim(raw: string): MonsterAnim {
    const known: boolean = (Object.values(MonsterAnim) as string[]).includes(raw);
    if (!known) {
        console.error("Unknown monster animation style, using blob:", raw);
        return MonsterAnim.Blob;
    }
    return raw as MonsterAnim;
}

async function loadOne(key: string): Promise<void> {
    try {
        const res: Response = await fetch(MONSTER_BASE + key + ".json");
        if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) {
            return;
        }
        const meta: MonsterSpriteMeta = await res.json() as MonsterSpriteMeta;
        const img: HTMLImageElement = await new Promise<HTMLImageElement>((resolve: (i: HTMLImageElement) => void, reject: (e: Error) => void) => {
            const i: HTMLImageElement = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error("image failed: " + key));
            i.src = MONSTER_BASE + key + ".png";
        });
        const white: HTMLCanvasElement = document.createElement("canvas");
        white.width = img.width;
        white.height = img.height;
        const g: CanvasRenderingContext2D = white.getContext("2d") as CanvasRenderingContext2D;
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, white.width, white.height);
        sprites.set(key, {meta: meta, anim: toAnim(meta.anim), img: img, white: white});
    } catch (err: unknown) {
        console.error("Monster sprite failed to load, using procedural drawing:", key, err);
    }
}

export function preloadMonsterArt(keys: string[]): Promise<void> {
    return Promise.all(keys.map((key: string) => loadOne(key))).then(() => undefined);
}

export function getMonsterSprite(key: string): MonsterSprite | undefined {
    return sprites.get(key);
}

const ease: (k: number) => number = (k: number): number => 1 - Math.pow(1 - k, 3);

/** Offsets are in sprite pixels at scale 1; forward is -x (sprites face left). */
function frameOf(anim: MonsterAnim, time: number, attack: number, moving: boolean): SpriteFrame {
    const f: SpriteFrame = {x: 0, y: 0, rot: 0, sx: 1, sy: 1, alpha: 1, glow: 0};
    const breathe: number = Math.sin(time * 2.6);
    const sway: number = Math.sin(time * 1.3);
    // Attack progress 0..1 mapped onto a 0.9 s lunge.
    const t: number = attack * 0.9;
    const lunge: number = attack <= 0 ? 0 : t < 0.25 ? ease(t / 0.25) : Math.max(0, 1 - (t - 0.25) / 0.4);
    switch (anim) {
        case MonsterAnim.Blob:
        case MonsterAnim.Hop: {
            // Always a little bouncy; hops when moving.
            const c: number = (time * (moving ? 2.4 : 1.1)) % 1;
            const air: number = Math.sin(c * Math.PI);
            const land: number = c < 0.12 ? 1 - c / 0.12 : c > 0.92 ? (c - 0.92) / 0.08 : 0;
            f.y = -air * (moving ? 22 : 5);
            f.sy = 1 + breathe * 0.06 + air * 0.1 - land * 0.16;
            f.sx = 1 - breathe * 0.05 - air * 0.06 + land * 0.18;
            f.rot = sway * 0.04;
            f.x = -lunge * 38;
            f.sx += lunge * 0.3;
            f.sy -= lunge * 0.2;
            f.rot += lunge * 0.08;
            break;
        }
        case MonsterAnim.Scurry:
            f.sy = 1 + breathe * 0.035;
            f.rot = sway * 0.03;
            if (moving) {
                f.y = -Math.abs(Math.sin(time * 14)) * 6;
                f.rot += Math.sin(time * 14) * 0.06;
            } else {
                // Sniffing / shifting weight.
                f.x = Math.sin(time * 0.9) * 3;
                f.rot += Math.sin(time * 5) * 0.015;
            }
            f.x -= lunge * 46;
            f.rot -= lunge * 0.12;
            f.sx = 1 + lunge * 0.12;
            break;
        case MonsterAnim.Flap: {
            const flap: number = Math.sin(time * (moving ? 20 : 14));
            f.y = -18 + Math.sin(time * 3) * 9 + flap * 4;
            f.x = Math.sin(time * 1.7) * 8;
            f.sy = 1 + flap * 0.09;
            f.sx = 1 - flap * 0.04;
            f.rot = Math.sin(time * 1.7) * 0.08;
            f.x -= lunge * 52;
            f.y += lunge * 22;
            f.rot -= lunge * 0.35;
            break;
        }
        case MonsterAnim.Float:
            f.y = -14 + Math.sin(time * 2) * 9;
            f.x = Math.sin(time * 1.1) * 6;
            f.rot = Math.sin(time * 1.3) * 0.07;
            f.sy = 1 + breathe * 0.04;
            f.glow = 0.35 + Math.sin(time * 3) * 0.15 + lunge * 0.4;
            f.alpha = 0.92;
            f.x -= lunge * 50;
            f.sx = 1 + lunge * 0.15;
            break;
        case MonsterAnim.Stomp: {
            f.sy = 1 + breathe * 0.035;
            f.sx = 1 - breathe * 0.02;
            f.rot = sway * 0.025;
            if (moving) {
                const c: number = (time * 1.6) % 1;
                const step: number = Math.abs(Math.sin(c * Math.PI * 2));
                f.y = -step * 6;
                f.rot += Math.sin(c * Math.PI * 2) * 0.05;
                if (step < 0.1) {
                    f.sy -= 0.05;
                    f.sx += 0.04;
                }
            }
            const wind: number = attack <= 0 ? 0 : t < 0.35 ? -ease(t / 0.35) * 0.5 : t < 0.5 ? ease((t - 0.35) / 0.15) : Math.max(0, 1 - (t - 0.5) / 0.35);
            f.x -= wind * 30;
            f.rot -= wind * 0.14;
            f.y -= Math.max(0, -wind) * 16;
            break;
        }
    }
    return f;
}

/**
 * Draws a painted monster with its feet at (x, y). `height` is the on-screen height in pixels,
 * facing -1 = left (the painted direction), 1 = right.
 */
export function drawMonsterSprite(ctx: CanvasRenderingContext2D, sprite: MonsterSprite, x: number, y: number, height: number, facing: number, time: number, attack: number, flash: number, moving: boolean = false): void {
    const meta: MonsterSpriteMeta = sprite.meta;
    const scale: number = height / meta.h;
    const f: SpriteFrame = frameOf(sprite.anim, time, attack, moving);
    const air: number = Math.min(0.5, Math.max(0, -f.y / 80));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + 1, meta.w * scale * 0.36 * (1 - air), height * 0.06 * (1 - air), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y);
    // Painted facing left: mirror when the monster looks right.
    ctx.scale(facing > 0 ? -1 : 1, 1);
    ctx.translate(f.x * scale, f.y * scale);
    ctx.rotate(f.rot);
    ctx.scale(scale * f.sx, scale * f.sy);
    ctx.globalAlpha = f.alpha;
    if (f.glow > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = f.glow;
        ctx.filter = "blur(6px)";
        ctx.drawImage(sprite.img, -meta.footX, -meta.h);
        ctx.restore();
    }
    ctx.drawImage(sprite.img, -meta.footX, -meta.h);
    if (flash > 0) {
        ctx.globalAlpha = Math.min(1, flash);
        ctx.drawImage(sprite.white, -meta.footX, -meta.h);
    }
    ctx.restore();
}
