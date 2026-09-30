import {BuildingDef, BuildingKey} from "../data/buildings";
import {ArtKey, BUILDING_ART, getArt} from "./art-assets";
import {ellipsePath, fillStroke, glow, polyPath, rectPath, rgba, shadow} from "./draw-utils";

/** Draws a painted sprite standing on (x, bottomY), scaled to targetH, optionally swaying around its base. */
function drawArtStanding(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, bottomY: number, targetH: number, sway: number = 0): void {
    const scale: number = targetH / img.height;
    const w: number = img.width * scale;
    ctx.save();
    ctx.translate(x, bottomY);
    if (sway !== 0) {
        // Shear instead of rotation: the base stays planted, the crown moves.
        ctx.transform(1, 0, sway, 1, 0, 0);
    }
    ctx.drawImage(img, -w / 2, -targetH, w, targetH);
    ctx.restore();
}

export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, variant: number, time: number): void {
    const art: HTMLImageElement | undefined = getArt(variant > 0.5 ? ArtKey.TreePine : ArtKey.TreeRound);
    if (art) {
        shadow(ctx, x, y, 18 * size, 6 * size);
        drawArtStanding(ctx, art, x, y + 3 * size, 64 * size, Math.sin(time * 1.2 + x * 0.05) * 0.025);
    }
}
export function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, flower: boolean): void {
    const art: HTMLImageElement | undefined = getArt(flower ? ArtKey.FlowerBush : ArtKey.Bush);
    if (art) {
        shadow(ctx, x, y, 12, 4);
        drawArtStanding(ctx, art, x, y + 2, 26);
    }
}
export function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const art: HTMLImageElement | undefined = getArt(ArtKey.Lamp);
    if (art) {
        shadow(ctx, x, y, 7, 3);
        drawArtStanding(ctx, art, x, y + 2, 58);
        glow(ctx, x, y - 50, 28, "#ffd43b", 0.3 + Math.sin(time * 3 + x) * 0.05);
    }
}
/** Repeating pattern of a painted ground texture, scaled so one repeat covers `repeatPx` pixels. */
export function groundPattern(ctx: CanvasRenderingContext2D, key: ArtKey, repeatPx: number): CanvasPattern | undefined {
    const art: HTMLImageElement | undefined = getArt(key);
    if (!art) {
        return undefined;
    }
    const pattern: CanvasPattern | null = ctx.createPattern(art, "repeat");
    if (!pattern) {
        return undefined;
    }
    pattern.setTransform(new DOMMatrix().scaleSelf(repeatPx / art.width, repeatPx / art.height));
    return pattern;
}

export function drawSignpost(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, symbol: string, highlight: boolean): void {
    shadow(ctx, x, y, 9, 3);
    rectPath(ctx, x - 2.5, y - 34, 5, 34, 1);
    fillStroke(ctx, "#6b4226", 1.4);
    polyPath(ctx, [x - 16, y - 44, x + 12, y - 44, x + 19, y - 36, x + 12, y - 28, x - 16, y - 28]);
    fillStroke(ctx, highlight ? "#ffe8a3" : "#d9b77a", highlight ? 2.4 : 1.6);
    ellipsePath(ctx, x - 1, y - 36, 6, 6);
    fillStroke(ctx, color, 1.2);
    ctx.fillStyle = "#fff";
    ctx.font = "700 9px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x - 1, y - 35.5);
}

/** Pictogram per building for the town signposts. */
function drawSignPictogram(ctx: CanvasRenderingContext2D, key: BuildingKey, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    switch (key) {
        case BuildingKey.Shop:
            // Coin pouch.
            ellipsePath(ctx, 0, 2, 7, 6);
            fillStroke(ctx, "#c68a3a", 1.4);
            rectPath(ctx, -3, -6, 6, 3, 1);
            fillStroke(ctx, "#a86a26", 1.2);
            ellipsePath(ctx, 0, 2, 2.6, 2.6);
            ctx.fillStyle = "#ffd43b";
            ctx.fill();
            break;
        case BuildingKey.Guild:
            // Crossed swords.
            ctx.strokeStyle = "#e9ecef";
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(-7, 7);
            ctx.lineTo(7, -7);
            ctx.moveTo(7, 7);
            ctx.lineTo(-7, -7);
            ctx.stroke();
            ctx.strokeStyle = "#8d5524";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-8, 8);
            ctx.lineTo(-5, 5);
            ctx.moveTo(8, 8);
            ctx.lineTo(5, 5);
            ctx.stroke();
            break;
        case BuildingKey.Forge:
            // Anvil.
            polyPath(ctx, [-8, -3, 8, -3, 5, 1, 3, 1, 4, 6, -4, 6, -3, 1, -8, 0]);
            fillStroke(ctx, "#868e96", 1.3);
            break;
        case BuildingKey.ClassLibrary:
            // Open book.
            polyPath(ctx, [0, -4, -8, -6, -8, 5, 0, 7]);
            fillStroke(ctx, "#d0bfff", 1.2);
            polyPath(ctx, [0, -4, 8, -6, 8, 5, 0, 7]);
            fillStroke(ctx, "#b197fc", 1.2);
            break;
        case BuildingKey.House:
            // Little house with a heart.
            polyPath(ctx, [-7, -1, 0, -8, 7, -1, 7, 7, -7, 7]);
            fillStroke(ctx, "#f1dfc0", 1.2);
            ctx.fillStyle = "#e03131";
            ctx.beginPath();
            ctx.arc(-1.6, 2, 1.8, 0, Math.PI * 2);
            ctx.arc(1.6, 2, 1.8, 0, Math.PI * 2);
            ctx.fill();
            break;
        case BuildingKey.Coliseum:
            // Shield with a star.
            polyPath(ctx, [-7, -7, 7, -7, 6, 2, 0, 8, -6, 2]);
            fillStroke(ctx, "#fab005", 1.3);
            ctx.fillStyle = "#fff";
            ctx.font = "700 9px 'Segoe UI', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("★", 0, -0.5);
            break;
        case BuildingKey.Bank:
            // Stack of gold coins.
            for (let i: number = 0; i < 3; i++) {
                ellipsePath(ctx, 0, 5 - i * 4, 7, 2.6);
                fillStroke(ctx, i === 2 ? "#ffe066" : "#fab005", 1.1);
            }
            break;
        case BuildingKey.Portal:
            // Swirl.
            ctx.strokeStyle = "#b197fc";
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let a: number = 0; a < Math.PI * 4; a += 0.2) {
                const r: number = 1 + a * 0.55;
                if (a === 0) {
                    ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                } else {
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
            }
            ctx.stroke();
            break;
    }
    ctx.restore();
}

/** Wooden signpost with a round board and the building's pictogram. */
export function drawBuildingSign(ctx: CanvasRenderingContext2D, key: BuildingKey, x: number, y: number, highlight: boolean, locked: boolean): void {
    ctx.save();
    shadow(ctx, x, y, 10, 3.5);
    rectPath(ctx, x - 2.5, y - 30, 5, 30, 1);
    fillStroke(ctx, "#6b4226", 1.4);
    ctx.save();
    if (locked) {
        ctx.filter = "grayscale(1) brightness(0.7)";
    }
    ellipsePath(ctx, x, y - 42, 15, 15);
    fillStroke(ctx, highlight ? "#ffe8a3" : "#d9b77a", highlight ? 2.6 : 1.8);
    ellipsePath(ctx, x, y - 42, 11.5, 11.5);
    ctx.fillStyle = "rgba(90,60,30,0.35)";
    ctx.fill();
    drawSignPictogram(ctx, key, x, y - 42);
    ctx.restore();
    if (highlight) {
        glow(ctx, x, y - 42, 24, "#ffe066", 0.35);
    }
    ctx.restore();
}

export function drawCoins(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const bob: number = Math.sin(time * 4 + x) * 1.5;
    glow(ctx, x, y - 6, 14, "#ffd43b", 0.35);
    for (const [ox, oy] of [[-4, 0], [4, 0], [0, -4]] as [number, number][]) {
        ellipsePath(ctx, x + ox, y + oy - 4 + bob, 4.5, 3.5);
        fillStroke(ctx, "#fcc419", 1.2);
    }
}

export function drawLootBag(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const bob: number = Math.sin(time * 4 + x) * 1.5;
    glow(ctx, x, y - 8, 18, "#b197fc", 0.4);
    shadow(ctx, x, y, 8, 3);
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 16 + bob);
    ctx.quadraticCurveTo(x - 12, y - 6 + bob, x - 8, y + bob);
    ctx.lineTo(x + 8, y + bob);
    ctx.quadraticCurveTo(x + 12, y - 6 + bob, x + 4, y - 16 + bob);
    ctx.closePath();
    fillStroke(ctx, "#c08a3e", 1.4);
    rectPath(ctx, x - 5, y - 18 + bob, 10, 3, 1);
    fillStroke(ctx, "#8d5a2b", 1.1);
    const sparkle: number = (time * 2 + x) % 2;
    if (sparkle < 0.6) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 6, y - 20 + bob, 2, 2);
    }
}

/** Draws a painted town building: as wide as its plot (a little overhang), standing on the plot's lower edge. */
export function drawBuilding(ctx: CanvasRenderingContext2D, def: BuildingDef, tile: number, locked: boolean, time: number): void {
    const art: HTMLImageElement | undefined = getArt(BUILDING_ART[def.key]);
    if (!art) {
        return;
    }
    const x: number = def.tx * tile;
    const y: number = def.ty * tile;
    const w: number = def.tw * tile;
    const h: number = def.th * tile;
    const dw: number = w * 1.1;
    const dh: number = dw * art.height / art.width;
    const left: number = x + (w - dw) / 2;
    const top: number = y + h + 6 - dh;
    ctx.save();
    // The painted dioramas bring their own ground plate, no extra shadow needed.
    if (locked) {
        ctx.filter = "grayscale(0.85) brightness(0.62)";
    }
    ctx.drawImage(art, left, top, dw, dh);
    ctx.restore();
    if (def.key === BuildingKey.Portal && !locked) {
        // The painted archway gets a living gate: a slowly turning violet swirl in the doorway.
        const cx: number = x + w / 2;
        const cy: number = top + dh * 0.6;
        const rx: number = dw * 0.17;
        const ry: number = dh * 0.2;
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, cx, cy, rx * 1.8, "#9775fa", 0.35 + Math.sin(time * 2) * 0.08);
        for (let i: number = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx * (1 - i * 0.25), ry * (1 - i * 0.25), 0, time * (1.5 + i * 0.7) + i * 2, time * (1.5 + i * 0.7) + i * 2 + 4);
            ctx.strokeStyle = rgba("#d0bfff", 0.55 - i * 0.12);
            ctx.lineWidth = 3 - i * 0.6;
            ctx.stroke();
        }
        ctx.restore();
    }
}
