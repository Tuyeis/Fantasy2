import {ClassKey} from "../data/hero-classes";
import {drawClassHero} from "./class-hero";
import {ease} from "./draw-utils";
import {defaultPose, HeroPose} from "./hero-sprite";
import {PuppetView} from "./puppet/puppet-types";

/**
 * Full-screen class transformation: the old class spins up and burns to white inside a column of light and a rune
 * circle, a burst reveals the new class, and a banner names it. Click (or 2.8 s) closes it.
 */

interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    size: number;
    color: string;
}

const DURATION: number = 2.8;
/** Moment the old class turns into the new one. */
const SWAP: number = 1.25;

/** Draws the effect at time t; kept separate from the animation loop so it can be rendered at any moment. */
export class ClassTransformFx {
    private sparks: Spark[] = [];
    private burst: boolean = false;

    public constructor(private readonly from: ClassKey, private readonly to: ClassKey, private readonly banner: string,
                       private readonly className: string, private readonly color: string) {
    }

    public draw(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dt: number): void {
        const cx: number = W / 2;
        const feet: number = H * 0.68;
        const scale: number = Math.min(W, H) / 170;

        // Dim the game behind.
        const fadeIn: number = Math.min(1, t / 0.3);
        const fadeOut: number = t > DURATION - 0.35 ? Math.max(0, (DURATION - t) / 0.35) : 1;
        const alpha: number = fadeIn * fadeOut;
        ctx.fillStyle = "rgba(8,6,14," + 0.78 * alpha + ")";
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = alpha;

        // Rune circle on the floor.
        ctx.save();
        ctx.translate(cx, feet);
        ctx.scale(1, 0.32);
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        const grow: number = ease(Math.min(1, t / 0.6));
        for (const [r, spin] of [[120, 1], [92, -1.7], [64, 2.4]] as [number, number][]) {
            ctx.save();
            ctx.rotate(t * spin);
            ctx.beginPath();
            ctx.arc(0, 0, r * scale * 0.5 * grow, 0, Math.PI * 2);
            ctx.stroke();
            for (let i: number = 0; i < 6; i++) {
                const a: number = i / 6 * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * r * scale * 0.5 * grow, Math.sin(a) * r * scale * 0.5 * grow);
                ctx.lineTo(Math.cos(a + 2.1) * r * scale * 0.5 * grow, Math.sin(a + 2.1) * r * scale * 0.5 * grow);
                ctx.stroke();
            }
            ctx.restore();
        }
        ctx.restore();

        // Column of light, strongest at the swap.
        const pillar: number = Math.max(0, 1 - Math.abs(t - SWAP) / 0.9);
        if (pillar > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            const w: number = 70 * scale * (0.4 + pillar * 0.6);
            const g: CanvasGradient = ctx.createLinearGradient(cx - w, 0, cx + w, 0);
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(0.5, "rgba(255,244,200," + 0.75 * pillar + ")");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g;
            ctx.fillRect(cx - w, 0, w * 2, feet + 10);
            ctx.restore();
        }

        // The character: old class spins faster and whitens, the new one lands with a bounce.
        const swapped: boolean = t >= SWAP;
        const cls: ClassKey = swapped ? this.to : this.from;
        const k: number = swapped ? Math.min(1, (t - SWAP) / 0.45) : Math.min(1, t / SWAP);
        const lift: number = swapped ? (1 - ease(k)) * 40 * scale * 0.4 : ease(k) * 40 * scale * 0.4;
        const views: PuppetView[] = [PuppetView.Front, PuppetView.Side, PuppetView.Back, PuppetView.Side];
        const spinRate: number = swapped ? 0 : 2 + k * 14;
        const view: PuppetView = swapped ? PuppetView.Front : views[Math.floor(t * spinRate) % 4];
        const facing: number = Math.floor(t * spinRate) % 4 === 3 ? -1 : 1;
        const squash: number = swapped ? 1 + Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.12 : 1;
        const pose: HeroPose = defaultPose({scale: scale * 1.5, time: t, view: view, facing: facing, flash: swapped ? Math.max(0, 1 - k * 1.6) : Math.min(1, k * k * 1.2)});
        ctx.save();
        ctx.translate(cx, feet - lift);
        ctx.scale(1 / squash, squash);
        drawClassHero(ctx, 0, 0, cls, pose, "transform_fx");
        ctx.restore();

        // Rising motes before, a burst at the swap, embers after.
        if (!swapped && Math.random() < 0.8) {
            this.spawn(cx + (Math.random() - 0.5) * 120 * scale * 0.5, feet, 1, 60, [this.color, "#ffffff"]);
            this.sparks[this.sparks.length - 1].vy = -80 - Math.random() * 120;
        }
        if (swapped && !this.burst) {
            this.burst = true;
            this.spawn(cx, feet - 30 * scale, 90, 520, [this.color, "#ffffff", "#fff3bf"]);
        }
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const s of this.sparks) {
            s.life -= dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 160 * dt;
            s.vx *= Math.pow(0.35, dt);
            if (s.life <= 0) {
                continue;
            }
            ctx.globalAlpha = alpha * Math.min(1, s.life / s.max * 1.4);
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * (0.4 + s.life / s.max), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        this.sparks = this.sparks.filter((spark: Spark) => spark.life > 0);

        // White flash at the swap.
        const flash: number = Math.max(0, 1 - Math.abs(t - SWAP) / 0.18);
        if (flash > 0) {
            ctx.fillStyle = "rgba(255,255,255," + 0.7 * flash + ")";
            ctx.fillRect(0, 0, W, H);
        }

        // Banner.
        if (swapped) {
            const b: number = Math.min(1, (t - SWAP) / 0.35);
            ctx.save();
            ctx.globalAlpha = alpha * b;
            ctx.textAlign = "center";
            ctx.fillStyle = "#efe6d2";
            ctx.font = "600 " + Math.round(16 * scale * 0.5) + "px 'Segoe UI', sans-serif";
            ctx.fillText(this.banner, cx, H * 0.2);
            const size: number = Math.round(34 * scale * 0.5 * (0.8 + 0.2 * ease(b)));
            ctx.font = "800 " + size + "px Georgia, serif";
            ctx.lineWidth = 6;
            ctx.strokeStyle = "rgba(0,0,0,0.75)";
            ctx.strokeText(this.className, cx, H * 0.2 + size * 1.25);
            ctx.fillStyle = this.color;
            ctx.fillText(this.className, cx, H * 0.2 + size * 1.25);
            ctx.restore();
        }
        ctx.globalAlpha = 1;

    }

    private spawn(x: number, y: number, n: number, speed: number, palette: string[]): void {
        for (let i: number = 0; i < n; i++) {
            const a: number = Math.random() * Math.PI * 2;
            const s: number = speed * (0.3 + Math.random() * 0.7);
            const life: number = 0.6 + Math.random() * 0.8;
            this.sparks.push({x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2, life: life, max: life, size: 2 + Math.random() * 4, color: palette[i % palette.length]});
        }
    }
}

export function playClassTransformation(from: ClassKey, to: ClassKey, banner: string, className: string, color: string = "#f5c542"): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.style.position = "fixed";
        canvas.style.inset = "0";
        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
        canvas.style.zIndex = "1000";
        canvas.style.cursor = "pointer";
        document.body.appendChild(canvas);
        const dpr: number = Math.min(2, window.devicePixelRatio || 1);
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
        const fx: ClassTransformFx = new ClassTransformFx(from, to, banner, className, color);
        let start: number = -1;
        let last: number = 0;
        let done: boolean = false;
        const finish: () => void = (): void => {
            if (done) {
                return;
            }
            done = true;
            canvas.remove();
            resolve();
        };
        canvas.addEventListener("click", finish);
        // Safety net: a hidden tab pauses requestAnimationFrame; never leave the overlay stuck.
        window.setTimeout(finish, (DURATION + 2) * 1000);
        const frame: (now: number) => void = (now: number): void => {
            if (done) {
                return;
            }
            if (start < 0) {
                start = now;
                last = now;
            }
            const t: number = (now - start) / 1000;
            const dt: number = Math.min(0.05, (now - last) / 1000);
            last = now;
            const W: number = window.innerWidth;
            const H: number = window.innerHeight;
            if (canvas.width !== Math.round(W * dpr)) {
                canvas.width = Math.round(W * dpr);
                canvas.height = Math.round(H * dpr);
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            fx.draw(ctx, W, H, t, dt);
            if (t >= DURATION) {
                finish();
                return;
            }
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    });
}
