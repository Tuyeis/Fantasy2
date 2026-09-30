import {IconShape, ItemDef, ItemKey, ITEMS} from "../data/items";
import {ellipsePath, fillStroke, glow, OUTLINE, polyPath, rectPath, shade} from "./draw-utils";

const cache: Map<string, string> = new Map<string, string>();

/** Data URL of a procedurally drawn 64x64 item icon. */
export function iconUrl(key: ItemKey): string {
    const cached: string | undefined = cache.get(key);
    if (cached) {
        return cached;
    }
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.scale(2, 2);
    drawItemIcon(ctx, ITEMS[key]);
    const url: string = canvas.toDataURL();
    cache.set(key, url);
    return url;
}

export function iconImg(key: ItemKey): HTMLImageElement {
    const img: HTMLImageElement = document.createElement("img");
    img.className = "icon";
    img.src = iconUrl(key);
    img.alt = "";
    return img;
}

/** Draws an icon inside a 32x32 box. */
export function drawItemIcon(ctx: CanvasRenderingContext2D, def: ItemDef): void {
    const c: string = def.color;
    ctx.lineJoin = "round";
    switch (def.icon) {
        case IconShape.Potion:
            rectPath(ctx, 13, 5, 6, 6, 1);
            fillStroke(ctx, "#ced4da", 1.4);
            ctx.beginPath();
            ctx.moveTo(13, 10);
            ctx.lineTo(19, 10);
            ctx.lineTo(26, 22);
            ctx.quadraticCurveTo(26, 28, 20, 28);
            ctx.lineTo(12, 28);
            ctx.quadraticCurveTo(6, 28, 6, 22);
            ctx.closePath();
            fillStroke(ctx, c, 1.6);
            ellipsePath(ctx, 11, 21, 2, 3.5, 0.4);
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.fill();
            rectPath(ctx, 12, 3, 8, 3, 1);
            fillStroke(ctx, "#8d5a3a", 1.2);
            break;
        case IconShape.Sword:
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 4);
            rectPath(ctx, -2.2, -14, 4.4, 20, 1);
            fillStroke(ctx, c, 1.4);
            rectPath(ctx, -6, 5, 12, 3, 1);
            fillStroke(ctx, "#fcc419", 1.2);
            rectPath(ctx, -1.5, 8, 3, 6, 1);
            fillStroke(ctx, "#6b4226", 1.2);
            ctx.restore();
            break;
        case IconShape.Dagger:
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 4);
            polyPath(ctx, [0, -11, 2.5, -7, 2.5, 3, -2.5, 3, -2.5, -7]);
            fillStroke(ctx, c, 1.4);
            rectPath(ctx, -5, 3, 10, 2.5, 1);
            fillStroke(ctx, "#fcc419", 1.1);
            rectPath(ctx, -1.5, 5.5, 3, 6, 1);
            fillStroke(ctx, "#6b4226", 1.1);
            ctx.restore();
            break;
        case IconShape.Staff:
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 5);
            rectPath(ctx, -1.6, -8, 3.2, 22, 1.5);
            fillStroke(ctx, "#7a4e2a", 1.2);
            glow(ctx, 0, -10, 9, c, 0.7);
            ellipsePath(ctx, 0, -10, 4.5, 4.5);
            fillStroke(ctx, c, 1.3);
            ctx.restore();
            break;
        case IconShape.Scythe:
            ctx.save();
            ctx.translate(16, 16);
            ctx.rotate(Math.PI / 6);
            rectPath(ctx, -1.4, -12, 2.8, 26, 1);
            fillStroke(ctx, "#343a40", 1.1);
            ctx.beginPath();
            ctx.moveTo(0, -12);
            ctx.quadraticCurveTo(-14, -14, -16, -2);
            ctx.quadraticCurveTo(-10, -9, 0, -8);
            ctx.closePath();
            fillStroke(ctx, c, 1.3);
            ctx.restore();
            break;
        case IconShape.Bow:
            ctx.beginPath();
            ctx.moveTo(10, 4);
            ctx.quadraticCurveTo(28, 16, 10, 28);
            ctx.lineWidth = 4.5;
            ctx.strokeStyle = OUTLINE;
            ctx.stroke();
            ctx.lineWidth = 2.6;
            ctx.strokeStyle = c;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(10, 4);
            ctx.lineTo(10, 28);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#f1f3f5";
            ctx.stroke();
            break;
        case IconShape.Armor:
            polyPath(ctx, [9, 6, 13, 4, 19, 4, 23, 6, 28, 11, 24, 15, 23, 27, 9, 27, 8, 15, 4, 11]);
            fillStroke(ctx, c, 1.6);
            ctx.beginPath();
            ctx.moveTo(16, 7);
            ctx.lineTo(16, 26);
            ctx.strokeStyle = shade(c, -0.35);
            ctx.lineWidth = 1.2;
            ctx.stroke();
            break;
        case IconShape.Robe:
            polyPath(ctx, [11, 4, 21, 4, 26, 10, 23, 12, 26, 28, 6, 28, 9, 12, 6, 10]);
            fillStroke(ctx, c, 1.6);
            rectPath(ctx, 8, 15, 16, 2.5, 0);
            ctx.fillStyle = "#fcc419";
            ctx.fill();
            break;
        case IconShape.Shield:
            ctx.beginPath();
            ctx.moveTo(16, 4);
            ctx.lineTo(27, 8);
            ctx.quadraticCurveTo(27, 22, 16, 29);
            ctx.quadraticCurveTo(5, 22, 5, 8);
            ctx.closePath();
            fillStroke(ctx, c, 1.6);
            ctx.beginPath();
            ctx.moveTo(16, 8);
            ctx.lineTo(22, 10.5);
            ctx.quadraticCurveTo(22, 20, 16, 24.5);
            ctx.quadraticCurveTo(10, 20, 10, 10.5);
            ctx.closePath();
            ctx.fillStyle = shade(c, 0.35);
            ctx.fill();
            break;
        case IconShape.Helmet:
            ctx.beginPath();
            ctx.arc(16, 18, 11, Math.PI, 0);
            ctx.lineTo(27, 24);
            ctx.lineTo(5, 24);
            ctx.closePath();
            fillStroke(ctx, c, 1.6);
            rectPath(ctx, 9, 17, 14, 3, 1);
            ctx.fillStyle = OUTLINE;
            ctx.fill();
            break;
        case IconShape.Hat:
            ellipsePath(ctx, 16, 24, 13, 4);
            fillStroke(ctx, c, 1.5);
            ctx.beginPath();
            ctx.moveTo(9, 23);
            ctx.lineTo(23, 23);
            ctx.quadraticCurveTo(19, 12, 8, 3);
            ctx.quadraticCurveTo(12, 14, 9, 23);
            ctx.closePath();
            fillStroke(ctx, c, 1.5);
            rectPath(ctx, 9, 19, 14, 2.5, 0);
            ctx.fillStyle = "#be4bdb";
            ctx.fill();
            break;
        case IconShape.Crown:
            polyPath(ctx, [5, 24, 5, 10, 11, 16, 16, 6, 21, 16, 27, 10, 27, 24]);
            fillStroke(ctx, c, 1.6);
            ellipsePath(ctx, 16, 19, 2.4, 2.4);
            ctx.fillStyle = "#e03131";
            ctx.fill();
            break;
        case IconShape.Boots:
            polyPath(ctx, [8, 5, 16, 5, 16, 19, 26, 21, 26, 27, 8, 27]);
            fillStroke(ctx, c, 1.6);
            rectPath(ctx, 8, 10, 8, 2, 0);
            ctx.fillStyle = shade(c, -0.3);
            ctx.fill();
            break;
        case IconShape.Ring:
            ctx.beginPath();
            ctx.arc(16, 19, 8, 0, Math.PI * 2);
            ctx.lineWidth = 5.5;
            ctx.strokeStyle = OUTLINE;
            ctx.stroke();
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = "#fcc419";
            ctx.stroke();
            polyPath(ctx, [16, 4, 21, 9, 16, 14, 11, 9]);
            fillStroke(ctx, c, 1.3);
            break;
        case IconShape.Amulet:
            ctx.beginPath();
            ctx.moveTo(7, 4);
            ctx.quadraticCurveTo(16, 18, 25, 4);
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = "#fcc419";
            ctx.stroke();
            glow(ctx, 16, 20, 10, c, 0.6);
            ellipsePath(ctx, 16, 20, 6, 7);
            fillStroke(ctx, c, 1.5);
            break;
        case IconShape.Ore:
            polyPath(ctx, [6, 22, 9, 12, 16, 8, 24, 11, 27, 20, 21, 27, 10, 27]);
            fillStroke(ctx, "#6c6f75", 1.6);
            for (const [ox, oy] of [[12, 16], [19, 13], [18, 21], [11, 22]] as [number, number][]) {
                polyPath(ctx, [ox, oy - 2.5, ox + 2.5, oy, ox, oy + 2.5, ox - 2.5, oy]);
                ctx.fillStyle = c;
                ctx.fill();
            }
            break;
        case IconShape.Gem:
            glow(ctx, 16, 16, 13, c, 0.5);
            polyPath(ctx, [9, 11, 13, 6, 19, 6, 23, 11, 16, 27]);
            fillStroke(ctx, c, 1.5);
            polyPath(ctx, [13, 6, 16, 11, 19, 6]);
            ctx.fillStyle = "rgba(255,255,255,0.45)";
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(9, 11);
            ctx.lineTo(23, 11);
            ctx.strokeStyle = "rgba(255,255,255,0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();
            break;
        case IconShape.Essence:
            glow(ctx, 16, 16, 14, c, 0.8);
            ctx.beginPath();
            ctx.moveTo(16, 4);
            ctx.bezierCurveTo(26, 14, 24, 26, 16, 27);
            ctx.bezierCurveTo(8, 26, 6, 14, 16, 4);
            fillStroke(ctx, c, 1.4);
            ellipsePath(ctx, 14, 19, 2.5, 4);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fill();
            break;
        case IconShape.Tome:
            rectPath(ctx, 6, 5, 20, 23, 2);
            fillStroke(ctx, c, 1.6);
            rectPath(ctx, 8, 7, 3, 19, 0);
            ctx.fillStyle = shade(c, -0.35);
            ctx.fill();
            polyPath(ctx, [18, 11, 20, 15, 18, 19, 16, 15]);
            ctx.fillStyle = "#fcc419";
            ctx.fill();
            break;
    }
}
