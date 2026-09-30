import {drawText} from "./draw-utils";

/** One floating text (damage number, pickup message...). Positions are in the scene's world coordinates. */
export interface Floater {
    text: string;
    x: number;
    y: number;
    /** Seconds left; the text fades out during its last moments. */
    life: number;
    color: string;
    /** Font size; the layer's default size when left out. */
    size?: number;
}

/** Floating texts that rise and fade out, shared by the scenes. Each scene keeps its own rise speed, fade and look. */
export class FloaterLayer {
    private floaters: Floater[] = [];

    constructor(private readonly options: FloaterLayer.Options) {
    }

    public push(floater: Floater): void {
        this.floaters.push(floater);
    }

    public clear(): void {
        this.floaters = [];
    }

    public update(dt: number): void {
        this.floaters = this.floaters.filter((f: Floater) => {
            f.life -= dt;
            f.y -= dt * this.options.riseSpeed;
            return f.life > 0;
        });
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        const fadeRate: number = this.options.fadeRate ?? 2;
        if (this.options.style === FloaterLayer.Style.Outlined) {
            ctx.save();
            ctx.textAlign = "center";
            ctx.lineJoin = "round";
            for (const f of this.floaters) {
                ctx.globalAlpha = Math.min(1, f.life * fadeRate);
                ctx.font = "bold " + this.sizeOf(f) + "px 'Cinzel', Georgia, serif";
                ctx.lineWidth = 3.5;
                ctx.strokeStyle = "rgba(20,12,6,0.9)";
                ctx.strokeText(f.text, f.x, f.y);
                ctx.fillStyle = f.color;
                ctx.fillText(f.text, f.x, f.y);
            }
            ctx.restore();
            return;
        }
        for (const f of this.floaters) {
            ctx.globalAlpha = Math.min(1, f.life * fadeRate);
            drawText(ctx, f.text, f.x, f.y, this.sizeOf(f), f.color);
        }
        ctx.globalAlpha = 1;
    }

    private sizeOf(f: Floater): number {
        return f.size ?? this.options.size;
    }
}

export namespace FloaterLayer {
    export enum Style {
        /** Bold UI font (drawText). */
        Plain = "plain",
        /** Serif numbers with a dark outline (training yard). */
        Outlined = "outlined"
    }

    export interface Options {
        /** Pixels per second the texts rise. */
        riseSpeed: number;
        /** Font size of floaters that do not set their own. */
        size: number;
        /** Alpha = min(1, life * fadeRate); 2 when left out. */
        fadeRate?: number;
        style?: FloaterLayer.Style;
    }
}
