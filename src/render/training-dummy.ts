import {ellipsePath} from "./draw-utils";

/** Visual state of one training dummy. */
export interface DummyLook {
    /** Current lean in radians (swings back after a hit). */
    lean: number;
    /** 0..1 white hit flash. */
    flash: number;
}

/** Worn, trampled dirt under the practice yard. */
export function drawTrainingGround(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
    ctx.save();
    const worn: CanvasGradient = ctx.createRadialGradient(x, y, 4, x, y, rx);
    worn.addColorStop(0, "rgba(120,92,56,0.55)");
    worn.addColorStop(0.7, "rgba(110,86,50,0.35)");
    worn.addColorStop(1, "rgba(110,86,50,0)");
    ctx.fillStyle = worn;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/** Straw-stuffed practice dummy on a wooden post; (x, y) is where the post meets the ground. */
export function drawTrainingDummy(ctx: CanvasRenderingContext2D, x: number, y: number, look: DummyLook): void {
    ctx.save();
    // Shadow stays on the ground; the dummy leans around its base.
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y, 13, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(x, y);
    ctx.rotate(look.lean);

    // Post and a small base block.
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(-7, -5, 14, 5);
    ctx.fillStyle = "#7d5733";
    ctx.fillRect(-2.5, -46, 5, 42);
    // Crossbar arms.
    ctx.fillRect(-19, -38, 38, 4);
    ctx.strokeStyle = "#3b2716";
    ctx.lineWidth = 1;
    ctx.strokeRect(-19, -38, 38, 4);
    // Straw tufts at the arm ends.
    ctx.strokeStyle = "#e0c068";
    ctx.lineWidth = 1.3;
    for (const side of [-1, 1]) {
        for (let i: number = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(side * 19, -36);
            ctx.lineTo(side * (23 + i), -40 + i * 2.6);
            ctx.stroke();
        }
    }

    // Burlap body with a painted target.
    ellipsePath(ctx, 0, -30, 11, 15);
    paint(ctx, "#c9a56a", 1.2, "#5a4122");
    ctx.strokeStyle = "rgba(90,65,34,0.45)";
    ctx.lineWidth = 0.8;
    for (let i: number = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-9, -30 + i * 5);
        ctx.lineTo(9, -30 + i * 5);
        ctx.stroke();
    }
    ellipsePath(ctx, 0, -29, 6.5, 6.5);
    paint(ctx, "#e8e2d0", 1, "#8a1f1f");
    ellipsePath(ctx, 0, -29, 4, 4);
    paint(ctx, "#c92a2a", 0.8, "#8a1f1f");
    ellipsePath(ctx, 0, -29, 1.6, 1.6);
    paint(ctx, "#f8f9fa", 0.5, "#8a1f1f");
    // Rope belt.
    ctx.strokeStyle = "#8d6e3f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -20);
    ctx.quadraticCurveTo(0, -17, 10, -20);
    ctx.stroke();

    // Sack head with stitched face.
    ellipsePath(ctx, 0, -53, 8, 8.5);
    paint(ctx, "#d4b47a", 1.2, "#5a4122");
    ctx.strokeStyle = "#3b2716";
    ctx.lineWidth = 1.1;
    for (const ex of [-3, 3]) {
        ctx.beginPath();
        ctx.moveTo(ex - 1.5, -55.5);
        ctx.lineTo(ex + 1.5, -52.5);
        ctx.moveTo(ex + 1.5, -55.5);
        ctx.lineTo(ex - 1.5, -52.5);
        ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-3, -48.5);
    ctx.lineTo(3, -48.5);
    ctx.stroke();
    // Tied top of the sack.
    ctx.fillStyle = "#b8955a";
    ctx.beginPath();
    ctx.moveTo(-3, -61);
    ctx.lineTo(0, -66);
    ctx.lineTo(3, -61);
    ctx.closePath();
    ctx.fill();

    if (look.flash > 0) {
        ctx.globalAlpha = look.flash * 0.75;
        ctx.fillStyle = "#ffffff";
        ellipsePath(ctx, 0, -30, 11, 15);
        ctx.fill();
        ellipsePath(ctx, 0, -53, 8, 8.5);
        ctx.fill();
    }
    ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, fill: string, lineWidth: number, stroke: string): void {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
}
