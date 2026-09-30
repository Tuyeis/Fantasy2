/**
 * Painted dungeon art (public/art/dungeon/): battle backdrops and room floors per floor, and props.
 * Everything is optional: missing files keep the procedural drawing.
 */

export enum DungeonProp {
    Chest = "chest",
    ChestOpen = "chest_open",
    Campfire = "campfire",
    CampfireOut = "campfire_out",
    Shrine = "shrine",
    Pedestal = "pedestal",
    Stairs = "stairs",
    Spikes = "spikes",
    Torch = "torch",
    Bones = "bones",
    Barrels = "barrels"
}

const FLOORS: number[] = [1, 2, 3];

const images: Map<string, HTMLImageElement> = new Map<string, HTMLImageElement>();

function load(key: string, src: string): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
        const img: HTMLImageElement = new Image();
        img.onload = () => {
            images.set(key, img);
            resolve();
        };
        img.onerror = () => resolve();
        img.src = src;
    });
}

export function preloadDungeonArt(): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const floor of FLOORS) {
        jobs.push(load("bg_floor" + floor, "art/dungeon/bg_floor" + floor + ".jpg"));
        jobs.push(load("bg_boss" + floor, "art/dungeon/bg_boss" + floor + ".jpg"));
        for (let v: number = 0; v < 3; v++) {
            jobs.push(load("floor" + floor + "_" + v, "art/dungeon/floor" + floor + "_" + v + ".jpg"));
        }
    }
    for (const prop of Object.values(DungeonProp) as DungeonProp[]) {
        jobs.push(load("prop_" + prop, "art/dungeon/prop_" + prop + ".png"));
    }
    return Promise.all(jobs).then(() => undefined);
}

export function battleBackdrop(floor: number, boss: boolean): HTMLImageElement | undefined {
    return (boss ? images.get("bg_boss" + floor) : undefined) ?? images.get("bg_floor" + floor);
}

/** A floor painting for a room; the variant is chosen from the room seed so every room keeps its look. */
export function roomFloor(floor: number, seed: number): HTMLImageElement | undefined {
    const variants: HTMLImageElement[] = [0, 1, 2]
        .map((v: number) => images.get("floor" + floor + "_" + v))
        .filter((img: HTMLImageElement | undefined): img is HTMLImageElement => img !== undefined);
    if (variants.length === 0) {
        return undefined;
    }
    return variants[Math.abs(seed) % variants.length];
}

export function propArt(prop: DungeonProp): HTMLImageElement | undefined {
    return images.get("prop_" + prop);
}

/** Draws a prop standing on (x, bottom) with the given on-screen height. */
export function drawProp(ctx: CanvasRenderingContext2D, prop: DungeonProp, x: number, bottom: number, height: number): boolean {
    const img: HTMLImageElement | undefined = images.get("prop_" + prop);
    if (!img) {
        return false;
    }
    const w: number = img.width * height / img.height;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(x, bottom - 2, w * 0.36, height * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, x - w / 2, bottom - height, w, height);
    ctx.restore();
    return true;
}
