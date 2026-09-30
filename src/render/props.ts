import {BuildingDef, BuildingKey} from "../data/buildings";
import {ArtKey, BUILDING_ART, getArt} from "./art-assets";
import {ellipsePath, fillStroke, glow, hash, OUTLINE, polyPath, rectPath, rgba, shade, shadow} from "./draw-utils";

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
    const art: HTMLImageElement | undefined = (variant > 0.5 ? getArt(ArtKey.TreePine) : undefined) ?? getArt(ArtKey.TreeRound);
    if (art) {
        shadow(ctx, x, y, 18 * size, 6 * size);
        drawArtStanding(ctx, art, x, y + 3 * size, 64 * size, Math.sin(time * 1.2 + x * 0.05) * 0.025);
        return;
    }
    shadow(ctx, x, y, 16 * size, 6 * size);
    rectPath(ctx, x - 4 * size, y - 16 * size, 8 * size, 16 * size, 2);
    fillStroke(ctx, "#6b4226", 1.5);
    const sway: number = Math.sin(time * 1.2 + x * 0.05) * 1.2;
    const green: string = variant > 0.5 ? "#2f9e44" : "#37b24d";
    for (const [ox, oy, r] of [[-9, -22, 11], [9, -22, 11], [0, -33, 13], [0, -22, 12]] as [number, number, number][]) {
        ellipsePath(ctx, x + ox * size + sway, y + oy * size, r * size, r * size);
        fillStroke(ctx, green, 1.6);
    }
    ellipsePath(ctx, x - 4 * size + sway, y - 36 * size, 5 * size, 3.5 * size);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fill();
}

export function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number, flower: boolean): void {
    const art: HTMLImageElement | undefined = getArt(flower ? ArtKey.FlowerBush : ArtKey.Bush);
    if (art) {
        shadow(ctx, x, y, 12, 4);
        drawArtStanding(ctx, art, x, y + 2, 26);
        return;
    }
    shadow(ctx, x, y, 10, 3);
    for (const [ox, r] of [[-6, 6], [6, 6], [0, 8]] as [number, number][]) {
        ellipsePath(ctx, x + ox, y - 6, r, r * 0.85);
        fillStroke(ctx, "#40c057", 1.3);
    }
    if (flower) {
        for (const [ox, oy] of [[-5, -9], [4, -11], [1, -5]] as [number, number][]) {
            ellipsePath(ctx, x + ox, y + oy, 1.8, 1.8);
            ctx.fillStyle = "#ffd8f0";
            ctx.fill();
        }
    }
}

export function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const art: HTMLImageElement | undefined = getArt(ArtKey.Lamp);
    if (art) {
        shadow(ctx, x, y, 7, 3);
        drawArtStanding(ctx, art, x, y + 2, 58);
        glow(ctx, x, y - 50, 28, "#ffd43b", 0.3 + Math.sin(time * 3 + x) * 0.05);
        return;
    }
    rectPath(ctx, x - 2, y - 40, 4, 40, 1);
    fillStroke(ctx, "#343a40", 1.2);
    glow(ctx, x, y - 44, 26, "#ffd43b", 0.35 + Math.sin(time * 3 + x) * 0.05);
    rectPath(ctx, x - 5, y - 50, 10, 11, 2);
    fillStroke(ctx, "#ffe8a3", 1.3);
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

export function drawChest(ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean, time: number): void {
    shadow(ctx, x, y + 2, 16, 5);
    if (!open) {
        glow(ctx, x, y - 10, 26 + Math.sin(time * 3) * 3, "#ffd43b", 0.25);
    }
    rectPath(ctx, x - 15, y - 16, 30, 17, 3);
    fillStroke(ctx, "#8d5a2b", 1.8);
    if (open) {
        rectPath(ctx, x - 15, y - 26, 30, 10, 3);
        fillStroke(ctx, "#6b4226", 1.6);
        rectPath(ctx, x - 12, y - 16, 24, 4, 0);
        ctx.fillStyle = "#1a1208";
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(x - 15, y - 16);
        ctx.quadraticCurveTo(x, y - 30, x + 15, y - 16);
        ctx.closePath();
        fillStroke(ctx, "#a0663a", 1.8);
    }
    rectPath(ctx, x - 3, y - 13, 6, 7, 1);
    fillStroke(ctx, "#fcc419", 1.2);
    ctx.fillStyle = "#fcc419";
    ctx.fillRect(x - 15, y - 9, 30, 2);
}

export function drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number, lit: boolean, time: number): void {
    if (lit) {
        glow(ctx, x, y - 10, 60 + Math.sin(time * 8) * 4, "#ff922b", 0.35);
    }
    for (const angle of [0.4, -0.4, 1.6]) {
        ctx.save();
        ctx.translate(x, y - 3);
        ctx.rotate(angle);
        rectPath(ctx, -12, -2.5, 24, 5, 2);
        fillStroke(ctx, "#6b4226", 1.4);
        ctx.restore();
    }
    for (let i: number = 0; i < 8; i++) {
        const a: number = (i / 8) * Math.PI * 2;
        ellipsePath(ctx, x + Math.cos(a) * 15, y - 2 + Math.sin(a) * 6, 4, 3);
        fillStroke(ctx, "#868e96", 1.1);
    }
    if (lit) {
        const f: number = Math.sin(time * 12) * 2;
        ctx.beginPath();
        ctx.moveTo(x - 9, y - 4);
        ctx.quadraticCurveTo(x - 10, y - 18, x + f, y - 30);
        ctx.quadraticCurveTo(x + 10, y - 18, x + 9, y - 4);
        ctx.closePath();
        fillStroke(ctx, "#ff922b", 1.4);
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 4);
        ctx.quadraticCurveTo(x - 5, y - 13, x - f * 0.5, y - 20);
        ctx.quadraticCurveTo(x + 5, y - 13, x + 5, y - 4);
        ctx.closePath();
        ctx.fillStyle = "#ffe066";
        ctx.fill();
    }
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

export function drawPedestal(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, color: string, withScroll: boolean): void {
    shadow(ctx, x, y, 14, 4);
    rectPath(ctx, x - 10, y - 22, 20, 22, 2);
    fillStroke(ctx, "#adb5bd", 1.6);
    rectPath(ctx, x - 14, y - 26, 28, 6, 2);
    fillStroke(ctx, "#ced4da", 1.6);
    if (withScroll) {
        const bob: number = Math.sin(time * 2.5) * 2.5;
        glow(ctx, x, y - 38 + bob, 22, color, 0.6);
        rectPath(ctx, x - 9, y - 44 + bob, 18, 12, 2);
        fillStroke(ctx, "#f1e3c4", 1.3);
        ctx.strokeStyle = shade(color, -0.3);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 5, y - 40 + bob);
        ctx.lineTo(x + 5, y - 40 + bob);
        ctx.moveTo(x - 5, y - 36.5 + bob);
        ctx.lineTo(x + 3, y - 36.5 + bob);
        ctx.stroke();
    }
}

export function drawShrine(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, active: boolean): void {
    shadow(ctx, x, y, 22, 6);
    rectPath(ctx, x - 20, y - 8, 40, 8, 2);
    fillStroke(ctx, "#868e96", 1.6);
    for (const px of [-15, 15]) {
        rectPath(ctx, x + px - 3.5, y - 44, 7, 36, 1);
        fillStroke(ctx, "#ced4da", 1.4);
    }
    polyPath(ctx, [x - 24, y - 44, x, y - 56, x + 24, y - 44]);
    fillStroke(ctx, "#adb5bd", 1.6);
    if (active) {
        glow(ctx, x, y - 26, 24 + Math.sin(time * 3) * 3, "#ffe066", 0.55);
        polyPath(ctx, [x, y - 34, x + 5, y - 26, x, y - 18, x - 5, y - 26]);
        fillStroke(ctx, "#ffe066", 1.2);
    }
}

export function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, raised: boolean): void {
    rectPath(ctx, x - 26, y - 14, 52, 28, 3);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();
    for (let i: number = 0; i < 4; i++) {
        for (let j: number = 0; j < 2; j++) {
            const sx: number = x - 18 + i * 12;
            const sy: number = y - 3 + j * 12;
            if (raised) {
                polyPath(ctx, [sx - 4, sy, sx, sy - 12, sx + 4, sy]);
                fillStroke(ctx, "#ced4da", 1.1);
            } else {
                ellipsePath(ctx, sx, sy - 2, 2.5, 1.5);
                ctx.fillStyle = "#212529";
                ctx.fill();
            }
        }
    }
}

export function drawStairs(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    glow(ctx, x, y - 10, 46 + Math.sin(time * 2) * 4, "#b197fc", 0.3);
    rectPath(ctx, x - 26, y - 30, 52, 36, 4);
    fillStroke(ctx, "#0b0710", 2);
    for (let i: number = 0; i < 4; i++) {
        rectPath(ctx, x - 22 + i * 3, y - 26 + i * 8, 44 - i * 6, 6, 1);
        ctx.fillStyle = shade("#868e96", -0.15 * i);
        ctx.fill();
    }
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

export function drawFountain(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const art: HTMLImageElement | undefined = getArt(ArtKey.Fountain);
    if (art) {
        const h: number = 100 * art.height / art.width;
        drawArtStanding(ctx, art, x, y + 26, h);
        // Living water on top of the painting: ripples and a few drops.
        for (let i: number = 0; i < 3; i++) {
            const r: number = ((time * 12 + i * 12) % 30);
            ellipsePath(ctx, x, y - 4, r, r * 0.45);
            ctx.strokeStyle = "rgba(255,255,255," + (0.45 - r / 70) + ")";
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
        for (let i: number = 0; i < 6; i++) {
            const a: number = (i / 6) * Math.PI * 2 + time;
            const d: number = (time * 30 + i * 7) % 18;
            ellipsePath(ctx, x + Math.cos(a) * d, y - h * 0.55 - Math.sin(d / 18 * Math.PI) * 10 + d * 0.3, 1.5, 1.5);
            ctx.fillStyle = "#d0ebff";
            ctx.fill();
        }
        return;
    }
    ellipsePath(ctx, x, y, 46, 26);
    fillStroke(ctx, "#ced4da", 2);
    ellipsePath(ctx, x, y - 2, 40, 21);
    ctx.fillStyle = "#4dabf7";
    ctx.fill();
    for (let i: number = 0; i < 3; i++) {
        const r: number = ((time * 12 + i * 12) % 36);
        ellipsePath(ctx, x, y - 2, r, r * 0.52);
        ctx.strokeStyle = "rgba(255,255,255," + (0.5 - r / 80) + ")";
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
    rectPath(ctx, x - 5, y - 30, 10, 28, 2);
    fillStroke(ctx, "#adb5bd", 1.6);
    ellipsePath(ctx, x, y - 30, 12, 5);
    fillStroke(ctx, "#ced4da", 1.6);
    for (let i: number = 0; i < 6; i++) {
        const a: number = (i / 6) * Math.PI * 2 + time;
        const d: number = (time * 30 + i * 7) % 18;
        ellipsePath(ctx, x + Math.cos(a) * d, y - 34 - Math.sin(d / 18 * Math.PI) * 10 + d * 0.3, 1.5, 1.5);
        ctx.fillStyle = "#d0ebff";
        ctx.fill();
    }
}

function drawSignSymbol(ctx: CanvasRenderingContext2D, key: BuildingKey, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = OUTLINE;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    switch (key) {
        case BuildingKey.Shop:
            ctx.beginPath();
            ctx.arc(0, 2, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#e5484d";
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(-2, -7, 4, 4);
            break;
        case BuildingKey.Forge:
            ctx.fillRect(-7, -2, 14, 4);
            ctx.fillRect(-3, 2, 6, 5);
            ctx.fillRect(-8, -4, 5, 2);
            break;
        case BuildingKey.Guild:
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-6, -6);
            ctx.lineTo(6, 6);
            ctx.moveTo(6, -6);
            ctx.lineTo(-6, 6);
            ctx.stroke();
            break;
        case BuildingKey.ClassLibrary:
            ctx.fillRect(-7, -5, 6, 10);
            ctx.fillRect(1, -5, 6, 10);
            break;
        case BuildingKey.House:
            ctx.beginPath();
            ctx.moveTo(0, 6);
            ctx.bezierCurveTo(-9, -1, -5, -8, 0, -3);
            ctx.bezierCurveTo(5, -8, 9, -1, 0, 6);
            ctx.fillStyle = "#e64980";
            ctx.fill();
            break;
        case BuildingKey.Coliseum:
            ctx.beginPath();
            ctx.moveTo(-7, 6);
            ctx.lineTo(7, -6);
            ctx.moveTo(7, 6);
            ctx.lineTo(-7, -6);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#fcc419";
            ctx.fill();
            break;
        case BuildingKey.Portal:
            break;
    }
    ctx.restore();
}

/** Draws a town building at its tile rectangle. */
export function drawBuilding(ctx: CanvasRenderingContext2D, def: BuildingDef, tile: number, locked: boolean, time: number): void {
    const x: number = def.tx * tile;
    const y: number = def.ty * tile;
    const w: number = def.tw * tile;
    const h: number = def.th * tile;
    const art: HTMLImageElement | undefined = getArt(BUILDING_ART[def.key]);
    if (art) {
        drawBuildingArt(ctx, def, art, x, y, w, h, locked, time);
        return;
    }
    if (def.key === BuildingKey.Portal) {
        drawPortal(ctx, x + w / 2, y + h, w, h, time);
        return;
    }
    const wallTop: number = y + h * 0.38;
    ctx.save();
    if (locked) {
        ctx.filter = "grayscale(0.85) brightness(0.65)";
    }
    rectPath(ctx, x + 4, y + h - 6, w - 8, 10, 3);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();
    if (def.key === BuildingKey.Coliseum) {
        rectPath(ctx, x, wallTop - 10, w, h - (wallTop - y) + 10, 18);
        fillStroke(ctx, def.wall, 2);
        for (let i: number = 0; i < 6; i++) {
            const ax: number = x + 18 + i * ((w - 36) / 5);
            ctx.beginPath();
            ctx.arc(ax, wallTop + 22, 9, Math.PI, 0);
            ctx.lineTo(ax + 9, wallTop + 40);
            ctx.lineTo(ax - 9, wallTop + 40);
            ctx.closePath();
            ctx.fillStyle = shade(def.wall, -0.5);
            ctx.fill();
        }
        rectPath(ctx, x - 4, wallTop - 20, w + 8, 14, 4);
        fillStroke(ctx, def.roof, 2);
        for (let i: number = 0; i < 9; i++) {
            rectPath(ctx, x + i * (w / 8) - 3, wallTop - 30, 8, 12, 1);
            fillStroke(ctx, def.wall, 1.3);
        }
        const flagX: number = x + w / 2;
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(flagX - 1, wallTop - 58, 2, 30);
        polyPath(ctx, [flagX + 1, wallTop - 58, flagX + 20 + Math.sin(time * 4) * 2, wallTop - 52, flagX + 1, wallTop - 46]);
        fillStroke(ctx, "#e03131", 1.2);
    } else {
        rectPath(ctx, x, wallTop, w, h - (wallTop - y), 3);
        fillStroke(ctx, def.wall, 2);
        ctx.strokeStyle = rgba("#000000", 0.12);
        ctx.lineWidth = 1;
        for (let by: number = wallTop + 12; by < y + h - 4; by += 12) {
            ctx.beginPath();
            ctx.moveTo(x + 2, by);
            ctx.lineTo(x + w - 2, by);
            ctx.stroke();
        }
        polyPath(ctx, [x - 10, wallTop + 6, x + w * 0.12, y - 6, x + w * 0.88, y - 6, x + w + 10, wallTop + 6]);
        fillStroke(ctx, def.roof, 2);
        ctx.strokeStyle = shade(def.roof, -0.3);
        ctx.lineWidth = 1.2;
        for (let r: number = 1; r < 4; r++) {
            const ry: number = y - 6 + (wallTop + 6 - (y - 6)) * (r / 4);
            ctx.beginPath();
            ctx.moveTo(x - 10 + (w * 0.12 + 10) * (1 - r / 4), ry);
            ctx.lineTo(x + w + 10 - (w * 0.12 + 10) * (1 - r / 4), ry);
            ctx.stroke();
        }
        if (def.key === BuildingKey.Forge) {
            rectPath(ctx, x + w - 26, y - 22, 14, 30, 2);
            fillStroke(ctx, "#868e96", 1.6);
            if (!locked) {
                for (let i: number = 0; i < 3; i++) {
                    const p: number = (time * 0.6 + i / 3) % 1;
                    ellipsePath(ctx, x + w - 19 + Math.sin(p * 6) * 4, y - 26 - p * 40, 5 + p * 8, 4 + p * 6);
                    ctx.fillStyle = "rgba(200,200,200," + (0.45 * (1 - p)) + ")";
                    ctx.fill();
                }
            }
        }
        for (const wx of [x + w * 0.2, x + w * 0.8]) {
            rectPath(ctx, wx - 9, wallTop + 16, 18, 16, 2);
            fillStroke(ctx, locked ? "#343a40" : "#ffe8a3", 1.5);
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(wx - 0.75, wallTop + 16, 1.5, 16);
        }
    }
    // Door
    const doorX: number = x + w / 2;
    const doorBottom: number = y + h;
    ctx.beginPath();
    ctx.moveTo(doorX - 14, doorBottom);
    ctx.lineTo(doorX - 14, doorBottom - 30);
    ctx.arc(doorX, doorBottom - 30, 14, Math.PI, 0);
    ctx.lineTo(doorX + 14, doorBottom);
    ctx.closePath();
    fillStroke(ctx, "#5c3b1e", 2);
    ctx.fillStyle = "#fcc419";
    ctx.fillRect(doorX + 7, doorBottom - 20, 3, 3);
    // Sign
    rectPath(ctx, doorX - 16, doorBottom - 66, 32, 20, 3);
    fillStroke(ctx, def.sign, 1.6);
    drawSignSymbol(ctx, def.key, doorX, doorBottom - 56);
    ctx.restore();

    if (locked) {
        ctx.save();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#8d5a2b";
        ctx.beginPath();
        ctx.moveTo(doorX - 18, doorBottom - 40);
        ctx.lineTo(doorX + 18, doorBottom - 8);
        ctx.moveTo(doorX + 18, doorBottom - 40);
        ctx.lineTo(doorX - 18, doorBottom - 8);
        ctx.stroke();
        for (let i: number = 0; i < 7; i++) {
            const rx: number = x + 10 + hash(i, def.tx) * (w - 20);
            ellipsePath(ctx, rx, y + h + 2 - hash(def.ty, i) * 6, 5 + hash(i, i) * 4, 3.5);
            fillStroke(ctx, "#868e96", 1.2);
        }
        ctx.restore();
    }
}

/** Painted building: as wide as its plot (a little overhang), standing on the plot's lower edge. */
function drawBuildingArt(ctx: CanvasRenderingContext2D, def: BuildingDef, art: HTMLImageElement, x: number, y: number, w: number, h: number, locked: boolean, time: number): void {
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

function drawPortal(ctx: CanvasRenderingContext2D, cx: number, bottom: number, w: number, h: number, time: number): void {
    const archW: number = w * 0.8;
    const archH: number = h * 1.05;
    ellipsePath(ctx, cx, bottom, archW / 2 + 12, 10);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
    glow(ctx, cx, bottom - archH / 2, archW, "#9775fa", 0.35 + Math.sin(time * 2) * 0.08);
    // Vortex
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, bottom - archH * 0.45, archW * 0.36, archH * 0.42, 0, 0, Math.PI * 2);
    ctx.clip();
    const gradient: CanvasGradient = ctx.createRadialGradient(cx, bottom - archH * 0.45, 2, cx, bottom - archH * 0.45, archH * 0.45);
    gradient.addColorStop(0, "#f3d9fa");
    gradient.addColorStop(0.4, "#9775fa");
    gradient.addColorStop(1, "#2b1a66");
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - archW, bottom - archH * 1.2, archW * 2, archH * 1.4);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    for (let i: number = 0; i < 5; i++) {
        ctx.beginPath();
        const r: number = 8 + i * 12;
        ctx.arc(cx, bottom - archH * 0.45, r, time * (1.5 + i * 0.3) + i, time * (1.5 + i * 0.3) + i + 2.2);
        ctx.stroke();
    }
    ctx.restore();
    // Stone arch
    ctx.lineWidth = 16;
    ctx.strokeStyle = OUTLINE;
    ctx.beginPath();
    ctx.ellipse(cx, bottom - archH * 0.45, archW * 0.4, archH * 0.47, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#868e96";
    ctx.stroke();
    for (const side of [-1, 1]) {
        rectPath(ctx, cx + side * archW * 0.4 - 9, bottom - archH * 0.5, 18, archH * 0.5, 3);
        fillStroke(ctx, "#868e96", 2);
        glow(ctx, cx + side * archW * 0.4, bottom - archH * 0.62, 12, "#b197fc", 0.8);
    }
}
