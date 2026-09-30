export const OUTLINE: string = "#15101c";

export function hexToRgb(hex: string): [number, number, number] {
    const clean: string = hex.replace("#", "");
    const full: string = clean.length === 3 ? clean.split("").map((c: string) => c + c).join("") : clean;
    const value: number = parseInt(full, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Lightens (amount > 0) or darkens (amount < 0) a hex colour. */
export function shade(hex: string, amount: number): string {
    const [r, g, b]: [number, number, number] = hexToRgb(hex);
    const f: (c: number) => number = (c: number) => {
        const target: number = amount > 0 ? 255 : 0;
        return Math.round(c + (target - c) * Math.abs(amount));
    };
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
}

export function rgba(hex: string, alpha: number): string {
    const [r, g, b]: [number, number, number] = hexToRgb(hex);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

export function fillStroke(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, lineWidth: number = 1.6): void {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
}

export function ellipsePath(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation: number = 0): void {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
}

export function rectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number = 0): void {
    ctx.beginPath();
    if (r > 0) {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.rect(x, y, w, h);
    }
}

export function polyPath(ctx: CanvasRenderingContext2D, points: number[]): void {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i: number = 2; i < points.length; i += 2) {
        ctx.lineTo(points[i], points[i + 1]);
    }
    ctx.closePath();
}

export function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
    ellipsePath(ctx, x, y, rx, ry);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fill();
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number = 0.5): void {
    const gradient: CanvasGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, alpha));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

/** Seeded pseudo random (for stable decoration). */
export function hash(x: number, y: number, seed: number = 0): number {
    let h: number = (x * 374761393 + y * 668265263 + seed * 144269504) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return ((h >>> 0) % 10000) / 10000;
}

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", bold: boolean = true): void {
    ctx.font = (bold ? "700 " : "") + size + "px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.lineWidth = Math.max(2, size / 5);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}
