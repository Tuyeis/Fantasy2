import {Vec2} from "../core/input";
import {glow} from "../render/draw-utils";

/** Arena edge: walkers stay inside this share of the arena ellipse. */
const ARENA_EDGE: number = 0.94;

/**
 * Dash and invulnerability state of the hero in the real-time scenes (duel and coliseum).
 * The scenes implement it themselves (tools/duel-bot.js reads these fields on the duel).
 */
export interface RealTimeHero {
    x: number;
    y: number;
    /** Seconds left of the current dash. */
    dashTimer: number;
    dashDir: Vec2;
    /** Seconds of invulnerability left (after a dash or a hit). */
    iframes: number;
    charges: number;
    readonly maxCharges: number;
    rechargeTimer: number;
}

export namespace RealTimeHero {
    /** Tuning of the dash; every scene keeps its own values. */
    export interface DashConfig {
        speed: number;
        time: number;
        iframeTime: number;
        /** Seconds to refill one charge. */
        recharge: number;
    }

    /** Counts down the invulnerability and refills dash charges one at a time. */
    export function tick(hero: RealTimeHero, dt: number, dash: DashConfig): void {
        hero.iframes -= dt;
        if (hero.charges < hero.maxCharges) {
            hero.rechargeTimer += dt;
            if (hero.rechargeTimer >= dash.recharge) {
                hero.rechargeTimer = 0;
                hero.charges++;
            }
        }
    }

    /** Spends a charge and dashes along `dir`. Returns false when no charge is left. */
    export function startDash(hero: RealTimeHero, dir: Vec2, dash: DashConfig): boolean {
        if (hero.charges <= 0) {
            return false;
        }
        hero.charges--;
        hero.dashTimer = dash.time;
        hero.iframes = dash.iframeTime;
        hero.dashDir = {x: dir.x, y: dir.y};
        return true;
    }

    /** Moves the hero, kept inside the arena ellipse with radii rx / ry. */
    export function move(hero: RealTimeHero, dx: number, dy: number, rx: number, ry: number): void {
        const p: Vec2 = clampToArena(hero.x + dx, hero.y + dy, rx, ry);
        hero.x = p.x;
        hero.y = p.y;
    }

    /** Dash charges for the HUD: filled and empty diamonds. */
    export function pips(hero: RealTimeHero): string {
        return "◆".repeat(hero.charges) + "◇".repeat(hero.maxCharges - hero.charges);
    }
}

/** Pulls a point back inside the arena ellipse with radii rx / ry. */
export function clampToArena(x: number, y: number, rx: number, ry: number): Vec2 {
    const d: number = Math.hypot(x / rx, y / ry);
    if (d > ARENA_EDGE) {
        return {x: x / d * ARENA_EDGE, y: y / d * ARENA_EDGE};
    }
    return {x: x, y: y};
}

/** A glowing projectile of the real-time scenes. */
export interface RealTimeBolt {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    damage: number;
    color: string;
}

export namespace RealTimeBolt {
    export function advance(bolt: RealTimeBolt, dt: number): void {
        bolt.x += bolt.vx * dt;
        bolt.y += bolt.vy * dt;
        bolt.life -= dt;
    }

    export function draw(ctx: CanvasRenderingContext2D, bolt: RealTimeBolt): void {
        glow(ctx, bolt.x, bolt.y, 22, bolt.color, 0.8);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(bolt.x, bolt.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}
