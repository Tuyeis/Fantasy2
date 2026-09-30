import {hash} from "./draw-utils";

/**
 * Turns a tile grid into organic shapes: the tiles of one kind are blurred together and cut again at a
 * noise-wobbled threshold, so paths, plazas and ponds get round, irregular edges instead of square steps.
 */

/** Smooth value noise in 0..1 (two octaves), deterministic. */
function valueNoise(x: number, y: number, cell: number, seed: number): number {
    const gx: number = Math.floor(x / cell);
    const gy: number = Math.floor(y / cell);
    const fx: number = x / cell - gx;
    const fy: number = y / cell - gy;
    const sx: number = fx * fx * (3 - 2 * fx);
    const sy: number = fy * fy * (3 - 2 * fy);
    const a: number = hash(gx, gy, seed);
    const b: number = hash(gx + 1, gy, seed);
    const c: number = hash(gx, gy + 1, seed);
    const d: number = hash(gx + 1, gy + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function groundNoise(x: number, y: number, seed: number): number {
    return valueNoise(x, y, 26, seed) * 0.65 + valueNoise(x, y, 9, seed + 7) * 0.35;
}

export interface OrganicMaskOptions {
    /** Blur radius that rounds the tile corners (px). */
    round: number;
    /** How far the noise pushes the edge in or out (0..0.5 of the blurred ramp). */
    wobble: number;
    /** > 0 grows the shape (for rims/banks drawn under it), < 0 shrinks it. */
    grow: number;
    seed: number;
}

/**
 * Canvas whose alpha is the organic shape of the tiles where `isInside(tx, ty)` is true
 * (white, anti-aliased edge). Size = cols*tile x rows*tile.
 */
export function organicMask(cols: number, rows: number, tile: number, isInside: (tx: number, ty: number) => boolean, opt: OrganicMaskOptions): HTMLCanvasElement {
    const w: number = cols * tile;
    const h: number = rows * tile;
    const raw: HTMLCanvasElement = document.createElement("canvas");
    raw.width = w;
    raw.height = h;
    const rc: CanvasRenderingContext2D = raw.getContext("2d") as CanvasRenderingContext2D;
    rc.fillStyle = "#fff";
    for (let ty: number = 0; ty < rows; ty++) {
        for (let tx: number = 0; tx < cols; tx++) {
            if (isInside(tx, ty)) {
                rc.fillRect(tx * tile, ty * tile, tile, tile);
            }
        }
    }
    const out: HTMLCanvasElement = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const oc: CanvasRenderingContext2D = out.getContext("2d") as CanvasRenderingContext2D;
    oc.filter = "blur(" + opt.round + "px)";
    oc.drawImage(raw, 0, 0);
    oc.filter = "none";
    const data: ImageData = oc.getImageData(0, 0, w, h);
    const px: Uint8ClampedArray = data.data;
    for (let y: number = 0; y < h; y++) {
        for (let x: number = 0; x < w; x++) {
            const i: number = (y * w + x) * 4 + 3;
            const blurred: number = px[i] / 255;
            if (blurred <= 0) {
                continue;
            }
            const threshold: number = 0.5 - opt.grow + (groundNoise(x, y, opt.seed) - 0.5) * 2 * opt.wobble;
            // ~2 px anti-aliased edge around the threshold
            const k: number = Math.max(0, Math.min(1, (blurred - threshold) * 18 + 0.5));
            px[i] = Math.round(k * 255);
            px[i - 3] = 255;
            px[i - 2] = 255;
            px[i - 1] = 255;
        }
    }
    oc.putImageData(data, 0, 0);
    return out;
}

/** Fills `target` with `fill` (colour or pattern) only where `mask` is opaque. */
export function paintThroughMask(target: CanvasRenderingContext2D, mask: HTMLCanvasElement, fill: string | CanvasPattern): void {
    const layer: HTMLCanvasElement = document.createElement("canvas");
    layer.width = mask.width;
    layer.height = mask.height;
    const lc: CanvasRenderingContext2D = layer.getContext("2d") as CanvasRenderingContext2D;
    lc.fillStyle = fill;
    lc.fillRect(0, 0, layer.width, layer.height);
    lc.globalCompositeOperation = "destination-in";
    lc.drawImage(mask, 0, 0);
    target.drawImage(layer, 0, 0);
}
