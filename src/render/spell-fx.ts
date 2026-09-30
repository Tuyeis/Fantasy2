import {AbilityKey} from "../data/abilities";
import {Element, ELEMENTS} from "../data/element";
import {clamp01, ease, rgba} from "./draw-utils";

/**
 * Spell visuals shared by the turn-based and the real-time combat. Every ability has a style; the element colours it.
 * Positions are in the scene's world coordinates; `scale` is the scene's sprite scale.
 */

export enum FxStyle {
    Slash = "slash",
    MultiSlash = "multi_slash",
    Claws = "claws",
    Smash = "smash",
    Bolt = "bolt",
    Fireball = "fireball",
    Missiles = "missiles",
    Arrow = "arrow",
    ArrowRain = "arrow_rain",
    Nova = "nova",
    SkyBeam = "sky_beam",
    Drain = "drain",
    Swarm = "swarm",
    Gaze = "gaze",
    Heal = "heal",
    Buff = "buff",
    Shield = "shield",
    Pillar = "pillar"
}

const ABILITY_FX: Record<AbilityKey, FxStyle> = {
    [AbilityKey.FirmStrike]: FxStyle.Smash,
    [AbilityKey.StudyBolt]: FxStyle.Bolt,
    [AbilityKey.MinorHeal]: FxStyle.Heal,
    [AbilityKey.Morale]: FxStyle.Buff,
    [AbilityKey.Slash]: FxStyle.Slash,
    [AbilityKey.DoubleCut]: FxStyle.MultiSlash,
    [AbilityKey.FlameBlade]: FxStyle.Slash,
    [AbilityKey.WarCry]: FxStyle.Buff,
    [AbilityKey.Fireball]: FxStyle.Fireball,
    [AbilityKey.FrostNova]: FxStyle.Nova,
    [AbilityKey.ArcaneMissiles]: FxStyle.Missiles,
    [AbilityKey.ManaShield]: FxStyle.Shield,
    [AbilityKey.ArrowRain]: FxStyle.ArrowRain,
    [AbilityKey.PoisonArrow]: FxStyle.Arrow,
    [AbilityKey.NaturesBlessing]: FxStyle.Heal,
    [AbilityKey.EagleEye]: FxStyle.Buff,
    [AbilityKey.StaffCombo]: FxStyle.MultiSlash,
    [AbilityKey.CloudStrike]: FxStyle.Smash,
    [AbilityKey.GoldenBody]: FxStyle.Shield,
    [AbilityKey.HeavenlyThunder]: FxStyle.SkyBeam,
    [AbilityKey.ScratchFury]: FxStyle.Claws,
    [AbilityKey.Pounce]: FxStyle.Claws,
    [AbilityKey.HypnoticGaze]: FxStyle.Gaze,
    [AbilityKey.NineLives]: FxStyle.Heal,
    [AbilityKey.ShieldBash]: FxStyle.Smash,
    [AbilityKey.HolyStrike]: FxStyle.SkyBeam,
    [AbilityKey.Fortress]: FxStyle.Shield,
    [AbilityKey.LayOnHands]: FxStyle.Heal,
    [AbilityKey.BloodDrain]: FxStyle.Drain,
    [AbilityKey.BatSwarm]: FxStyle.Swarm,
    [AbilityKey.CharmGaze]: FxStyle.Gaze,
    [AbilityKey.CrimsonFeast]: FxStyle.Drain,
    [AbilityKey.ShadowArrow]: FxStyle.Arrow,
    [AbilityKey.VenomVolley]: FxStyle.ArrowRain,
    [AbilityKey.NightVeil]: FxStyle.Buff,
    [AbilityKey.SoulRend]: FxStyle.Bolt,
    [AbilityKey.HexBolt]: FxStyle.Bolt,
    [AbilityKey.CurseOfSleep]: FxStyle.Gaze,
    [AbilityKey.Hellfire]: FxStyle.Pillar,
    [AbilityKey.SoulSiphon]: FxStyle.Drain
};

/** Some abilities want a colour that is not their element's (arcane purple, blood red...). */
const COLOR_OVERRIDE: Partial<Record<AbilityKey, string>> = {
    [AbilityKey.ArcaneMissiles]: "#b197fc",
    [AbilityKey.ManaShield]: "#74c0fc",
    [AbilityKey.StudyBolt]: "#74c0fc",
    [AbilityKey.BloodDrain]: "#e03131",
    [AbilityKey.CrimsonFeast]: "#c92a2a",
    [AbilityKey.CharmGaze]: "#f783ac",
    [AbilityKey.GoldenBody]: "#fcc419",
    [AbilityKey.WarCry]: "#ff6b6b",
    [AbilityKey.EagleEye]: "#ffd43b",
    [AbilityKey.CloudStrike]: "#ffe066",
    [AbilityKey.StaffCombo]: "#ffa94d",
    [AbilityKey.Fortress]: "#74c0fc"
};

/** Styles that reach the enemy from any distance. */
export const RANGED_STYLES: FxStyle[] = [FxStyle.Bolt, FxStyle.Fireball, FxStyle.Missiles, FxStyle.Arrow, FxStyle.ArrowRain, FxStyle.Nova, FxStyle.SkyBeam,
    FxStyle.Pillar, FxStyle.Drain, FxStyle.Swarm, FxStyle.Gaze];

/** How long a style takes before its damage should land (the scene can wait on it). */
/** Seconds until a plain arrow (bow basic attack) reaches its target. */
export const ARROW_IMPACT_DELAY: number = 0.28;
const BASIC_ARROW_COLOR: string = "#f1e3c2";

export function fxImpactDelay(key: AbilityKey): number {
    switch (ABILITY_FX[key]) {
        case FxStyle.Bolt:
        case FxStyle.Fireball:
        case FxStyle.Arrow:
            return ARROW_IMPACT_DELAY;
        case FxStyle.Missiles:
            return 0.35;
        case FxStyle.ArrowRain:
        case FxStyle.SkyBeam:
        case FxStyle.Pillar:
            return 0.32;
        default:
            return 0.12;
    }
}

export function fxStyleOf(key: AbilityKey): FxStyle {
    return ABILITY_FX[key];
}

export function fxColor(key: AbilityKey, element: Element): string {
    return COLOR_OVERRIDE[key] ?? (element === Element.Neutral ? "#ffe8a3" : ELEMENTS[element].color);
}

interface Point {
    x: number;
    y: number;
}

interface Mote {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    size: number;
    color: string;
}

interface Fx {
    /** Null for plain effects that belong to no ability (a bow's basic shot). */
    ability: AbilityKey | null;
    style: FxStyle;
    color: string;
    from: Point;
    to: Point;
    t: number;
    duration: number;
    scale: number;
    hits: number;
    seed: number;
}

const DURATION: Record<FxStyle, number> = {
    [FxStyle.Slash]: 0.35, [FxStyle.MultiSlash]: 0.55, [FxStyle.Claws]: 0.5, [FxStyle.Smash]: 0.45,
    [FxStyle.Bolt]: 0.55, [FxStyle.Fireball]: 0.7, [FxStyle.Missiles]: 0.8, [FxStyle.Arrow]: 0.5, [FxStyle.ArrowRain]: 0.8,
    [FxStyle.Nova]: 0.7, [FxStyle.SkyBeam]: 0.7, [FxStyle.Drain]: 0.9, [FxStyle.Swarm]: 0.9, [FxStyle.Gaze]: 0.9,
    [FxStyle.Heal]: 1.0, [FxStyle.Buff]: 0.9, [FxStyle.Shield]: 1.0, [FxStyle.Pillar]: 0.9
};

function lerp(a: Point, b: Point, k: number): Point {
    return {x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k};
}

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
    const g: CanvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba("#ffffff", alpha));
    g.addColorStop(0.3, rgba(color, alpha * 0.9));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

export class SpellFxLayer {
    private fxs: Fx[] = [];
    private motes: Mote[] = [];

    /**
     * from = caster centre, to = target centre (both around chest height). Self abilities pass the caster twice.
     */
    public cast(key: AbilityKey, element: Element, from: Point, to: Point, scale: number = 1, hits: number = 1): void {
        const style: FxStyle = ABILITY_FX[key];
        this.fxs.push({ability: key, style: style, color: fxColor(key, element), from: from, to: to, t: 0, duration: DURATION[style], scale: scale, hits: hits, seed: Math.random() * 1000});
    }

    /** A plain arrow, for the basic attack of bow wielders. */
    public shootArrow(from: Point, to: Point, scale: number = 1): void {
        this.fxs.push({ability: null, style: FxStyle.Arrow, color: BASIC_ARROW_COLOR, from: from, to: to, t: 0, duration: DURATION[FxStyle.Arrow], scale: scale, hits: 1, seed: Math.random() * 1000});
    }

    public update(dt: number): void {
        for (const fx of this.fxs) {
            const before: number = fx.t / fx.duration;
            fx.t += dt;
            this.emit(fx, before, fx.t / fx.duration);
        }
        this.fxs = this.fxs.filter((fx: Fx) => fx.t < fx.duration);
        for (const m of this.motes) {
            m.life -= dt;
            m.x += m.vx * dt;
            m.y += m.vy * dt;
            m.vx *= Math.pow(0.4, dt);
        }
        this.motes = this.motes.filter((m: Mote) => m.life > 0);
    }

    private spark(x: number, y: number, color: string, n: number, speed: number, size: number, rise: number = 0): void {
        for (let i: number = 0; i < n; i++) {
            const a: number = Math.random() * Math.PI * 2;
            const s: number = speed * (0.3 + Math.random() * 0.7);
            const life: number = 0.35 + Math.random() * 0.45;
            this.motes.push({x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rise, life: life, max: life, size: size * (0.5 + Math.random() * 0.8), color: color});
        }
    }

    /** Particles spawned along the way (trails, impact bursts). */
    private emit(fx: Fx, before: number, now: number): void {
        const s: number = fx.scale;
        const crossed: (k: number) => boolean = (k: number): boolean => before < k && now >= k;
        switch (fx.style) {
            case FxStyle.Bolt:
            case FxStyle.Fireball:
            case FxStyle.Arrow: {
                const p: Point = lerp(fx.from, fx.to, ease(clamp01(now / 0.5)));
                if (now < 0.5) {
                    this.spark(p.x, p.y, fx.color, fx.style === FxStyle.Fireball ? 3 : 1, 40 * s, (fx.style === FxStyle.Fireball ? 7 : 4) * s);
                }
                if (crossed(0.5)) {
                    this.spark(fx.to.x, fx.to.y, fx.color, fx.style === FxStyle.Fireball ? 30 : 16, 260 * s, 6 * s);
                    this.spark(fx.to.x, fx.to.y, "#ffffff", 8, 180 * s, 4 * s);
                }
                break;
            }
            case FxStyle.Missiles:
                for (let i: number = 0; i < 3; i++) {
                    if (crossed(0.45 + i * 0.12)) {
                        this.spark(fx.to.x, fx.to.y, fx.color, 10, 200 * s, 5 * s);
                    }
                }
                break;
            case FxStyle.ArrowRain:
                for (let i: number = 0; i < 6; i++) {
                    if (crossed(0.3 + i * 0.08)) {
                        this.spark(fx.to.x + (i - 2.5) * 12 * s, fx.to.y + 20 * s, fx.color, 5, 120 * s, 3 * s, 60);
                    }
                }
                break;
            case FxStyle.Smash:
            case FxStyle.Slash:
            case FxStyle.MultiSlash:
            case FxStyle.Claws:
                if (crossed(0.3)) {
                    this.spark(fx.to.x, fx.to.y, fx.color, 14, 240 * s, 5 * s);
                }
                break;
            case FxStyle.Nova:
                if (crossed(0.15)) {
                    this.spark(fx.to.x, fx.to.y, fx.color, 36, 320 * s, 6 * s);
                    this.spark(fx.to.x, fx.to.y, "#ffffff", 14, 220 * s, 4 * s);
                }
                break;
            case FxStyle.SkyBeam:
            case FxStyle.Pillar:
                if (crossed(0.4)) {
                    this.spark(fx.to.x, fx.to.y + 30 * s, fx.color, 30, 280 * s, 6 * s, 80);
                }
                if (fx.style === FxStyle.Pillar && now > 0.35 && now < 0.85) {
                    this.spark(fx.to.x + (Math.random() - 0.5) * 50 * s, fx.to.y + 40 * s, fx.color, 2, 60 * s, 6 * s, 220);
                }
                break;
            case FxStyle.Drain:
                if (now > 0.2 && now < 0.8) {
                    this.spark(fx.to.x, fx.to.y, fx.color, 1, 30 * s, 5 * s);
                }
                break;
            case FxStyle.Heal:
                if (now < 0.8) {
                    this.spark(fx.from.x + (Math.random() - 0.5) * 60 * s, fx.from.y + 40 * s, fx.color, 1, 20 * s, 5 * s, 130);
                    this.spark(fx.from.x + (Math.random() - 0.5) * 50 * s, fx.from.y + 30 * s, "#ffffff", 1, 10 * s, 3 * s, 110);
                }
                break;
            case FxStyle.Buff:
                if (now < 0.7) {
                    this.spark(fx.from.x + (Math.random() - 0.5) * 70 * s, fx.from.y + 45 * s, fx.color, 2, 20 * s, 4 * s, 170);
                }
                break;
            default:
                break;
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (const fx of this.fxs) {
            this.drawFx(ctx, fx);
        }
        for (const m of this.motes) {
            const k: number = m.life / m.max;
            glowDot(ctx, m.x, m.y, m.size * (0.6 + k), m.color, k);
        }
        ctx.restore();
    }

    private drawFx(ctx: CanvasRenderingContext2D, fx: Fx): void {
        const k: number = clamp01(fx.t / fx.duration);
        const s: number = fx.scale;
        const c: string = fx.color;
        const dir: number = fx.to.x >= fx.from.x ? 1 : -1;
        switch (fx.style) {
            case FxStyle.Slash:
            case FxStyle.MultiSlash:
            case FxStyle.Smash: {
                const count: number = fx.style === FxStyle.MultiSlash ? Math.max(2, fx.hits) : 1;
                for (let i: number = 0; i < count; i++) {
                    const start: number = i * (0.7 / count);
                    const local: number = clamp01((k - start) / 0.45);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const r: number = (fx.style === FxStyle.Smash ? 34 : 46) * s;
                    const tilt: number = (i % 2 === 0 ? 1 : -1) * 0.6;
                    ctx.save();
                    ctx.translate(fx.to.x, fx.to.y);
                    ctx.rotate(tilt * dir);
                    ctx.scale(dir, 1);
                    if (fx.style === FxStyle.Smash) {
                        ctx.strokeStyle = rgba(c, 1 - local);
                        ctx.lineWidth = 8 * s * (1 - local);
                        ctx.beginPath();
                        ctx.arc(0, 0, r * (0.4 + local), 0, Math.PI * 2);
                        ctx.stroke();
                        for (let j: number = 0; j < 8; j++) {
                            const a: number = j / 8 * Math.PI * 2;
                            ctx.beginPath();
                            ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
                            ctx.lineTo(Math.cos(a) * r * (0.6 + local), Math.sin(a) * r * (0.6 + local));
                            ctx.lineWidth = 4 * s * (1 - local);
                            ctx.stroke();
                        }
                    } else {
                        const a0: number = -2.2;
                        const a1: number = a0 + 2.6 * ease(clamp01(local * 2));
                        for (let j: number = 0; j < 3; j++) {
                            ctx.beginPath();
                            ctx.arc(0, 0, r - j * 6 * s, a0 + (a1 - a0) * 0.2 * j, a1);
                            ctx.strokeStyle = j === 0 ? rgba("#ffffff", 1 - local) : rgba(c, (1 - local) * 0.8);
                            ctx.lineWidth = (12 - j * 3.5) * s * (1 - local * 0.5);
                            ctx.lineCap = "round";
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                }
                break;
            }
            case FxStyle.Claws: {
                const count: number = Math.max(3, Math.min(4, fx.hits));
                for (let i: number = 0; i < count; i++) {
                    const local: number = clamp01((k - i * 0.12) / 0.35);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const off: number = (i - (count - 1) / 2) * 10 * s;
                    ctx.strokeStyle = rgba(i % 2 ? c : "#ffffff", 1 - local);
                    ctx.lineWidth = 5 * s * (1 - local * 0.6);
                    ctx.lineCap = "round";
                    ctx.beginPath();
                    ctx.moveTo(fx.to.x - 28 * s + off, fx.to.y - 30 * s);
                    ctx.lineTo(fx.to.x - 28 * s + off + 56 * s * ease(clamp01(local * 2.5)), fx.to.y - 30 * s + 60 * s * ease(clamp01(local * 2.5)));
                    ctx.stroke();
                }
                break;
            }
            case FxStyle.Bolt:
            case FxStyle.Fireball:
            case FxStyle.Arrow: {
                const travel: number = clamp01(k / 0.5);
                if (travel < 1) {
                    const p: Point = lerp(fx.from, fx.to, ease(travel));
                    const back: Point = lerp(fx.from, fx.to, ease(Math.max(0, travel - 0.15)));
                    if (fx.style === FxStyle.Arrow) {
                        const ang: number = Math.atan2(fx.to.y - fx.from.y, fx.to.x - fx.from.x);
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(ang);
                        ctx.strokeStyle = rgba(c, 0.5);
                        ctx.lineWidth = 6 * s;
                        ctx.beginPath();
                        ctx.moveTo(-50 * s, 0);
                        ctx.lineTo(0, 0);
                        ctx.stroke();
                        ctx.strokeStyle = "#ffffff";
                        ctx.lineWidth = 2.5 * s;
                        ctx.beginPath();
                        ctx.moveTo(-26 * s, 0);
                        ctx.lineTo(10 * s, 0);
                        ctx.stroke();
                        ctx.restore();
                    } else {
                        ctx.strokeStyle = rgba(c, 0.6);
                        ctx.lineWidth = (fx.style === FxStyle.Fireball ? 16 : 9) * s;
                        ctx.lineCap = "round";
                        ctx.beginPath();
                        ctx.moveTo(back.x, back.y);
                        ctx.lineTo(p.x, p.y);
                        ctx.stroke();
                        glowDot(ctx, p.x, p.y, (fx.style === FxStyle.Fireball ? 30 : 18) * s, c, 1);
                    }
                } else {
                    const b: number = clamp01((k - 0.5) / 0.5);
                    glowDot(ctx, fx.to.x, fx.to.y, (fx.style === FxStyle.Fireball ? 70 : 40) * s * (0.5 + b), c, 1 - b);
                }
                break;
            }
            case FxStyle.Missiles: {
                for (let i: number = 0; i < 3; i++) {
                    const local: number = clamp01((k - i * 0.12) / 0.45);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const p: Point = lerp(fx.from, fx.to, ease(local));
                    const arc: number = Math.sin(local * Math.PI) * (i - 1) * 50 * s;
                    glowDot(ctx, p.x, p.y + arc, 14 * s, c, 1);
                }
                break;
            }
            case FxStyle.ArrowRain: {
                for (let i: number = 0; i < 7; i++) {
                    const local: number = clamp01((k - i * 0.07) / 0.35);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const x: number = fx.to.x + (i - 3) * 13 * s + dir * 30 * s * (1 - local);
                    const y: number = fx.to.y - 160 * s * (1 - local) + 20 * s;
                    ctx.strokeStyle = rgba(c, 0.8);
                    ctx.lineWidth = 3 * s;
                    ctx.beginPath();
                    ctx.moveTo(x - dir * 10 * s, y - 34 * s);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                }
                break;
            }
            case FxStyle.Nova: {
                const r: number = 90 * s * ease(k);
                ctx.strokeStyle = rgba(c, 1 - k);
                ctx.lineWidth = 10 * s * (1 - k);
                ctx.beginPath();
                ctx.ellipse(fx.to.x, fx.to.y + 20 * s, r, r * 0.45, 0, 0, Math.PI * 2);
                ctx.stroke();
                for (let i: number = 0; i < 10; i++) {
                    const a: number = i / 10 * Math.PI * 2 + fx.seed;
                    const d: number = r * 0.8;
                    const x: number = fx.to.x + Math.cos(a) * d;
                    const y: number = fx.to.y + 20 * s + Math.sin(a) * d * 0.45;
                    ctx.fillStyle = rgba("#e7f5ff", 1 - k);
                    ctx.beginPath();
                    ctx.moveTo(x, y - 18 * s * (1 - k * 0.5));
                    ctx.lineTo(x + 5 * s, y);
                    ctx.lineTo(x - 5 * s, y);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            }
            case FxStyle.SkyBeam:
            case FxStyle.Pillar: {
                const on: number = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
                const w: number = (fx.style === FxStyle.Pillar ? 46 : 26) * s * (0.4 + on * 0.6);
                const g: CanvasGradient = ctx.createLinearGradient(fx.to.x - w, 0, fx.to.x + w, 0);
                g.addColorStop(0, rgba(c, 0));
                g.addColorStop(0.5, rgba(fx.style === FxStyle.Pillar ? c : "#ffffff", on));
                g.addColorStop(1, rgba(c, 0));
                ctx.fillStyle = g;
                ctx.fillRect(fx.to.x - w, fx.to.y - 400 * s, w * 2, 400 * s + 50 * s);
                if (fx.style === FxStyle.SkyBeam && k < 0.45) {
                    // Zig-zag bolt.
                    ctx.strokeStyle = rgba("#ffffff", 1);
                    ctx.lineWidth = 4 * s;
                    ctx.beginPath();
                    let y: number = fx.to.y - 300 * s;
                    let x: number = fx.to.x;
                    ctx.moveTo(x, y);
                    while (y < fx.to.y + 30 * s) {
                        y += 30 * s;
                        x = fx.to.x + (Math.sin(y * 0.7 + fx.seed + fx.t * 40) * 14) * s;
                        ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                glowDot(ctx, fx.to.x, fx.to.y + 30 * s, 60 * s * (0.5 + on), c, on * 0.8);
                break;
            }
            case FxStyle.Drain: {
                for (let i: number = 0; i < 8; i++) {
                    const local: number = clamp01((k - i * 0.06) / 0.6);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const p: Point = lerp(fx.to, fx.from, ease(local));
                    const wobble: number = Math.sin(local * Math.PI * 2 + i) * 22 * s;
                    glowDot(ctx, p.x, p.y + wobble, 10 * s, c, 1 - local * 0.3);
                }
                break;
            }
            case FxStyle.Swarm: {
                for (let i: number = 0; i < 9; i++) {
                    const local: number = clamp01((k - i * 0.04) / 0.7);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const p: Point = lerp(fx.from, fx.to, ease(local));
                    const y: number = p.y + Math.sin(local * 12 + i * 2) * 26 * s - Math.sin(local * Math.PI) * 30 * s;
                    const x: number = p.x + Math.cos(local * 9 + i) * 14 * s;
                    const flap: number = Math.sin(fx.t * 40 + i) * 5 * s;
                    ctx.fillStyle = rgba("#212529", 0.9);
                    ctx.globalCompositeOperation = "source-over";
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 10 * s, y - 4 * s - flap);
                    ctx.lineTo(x - 5 * s, y + 2 * s);
                    ctx.lineTo(x, y - 1 * s);
                    ctx.lineTo(x + 5 * s, y + 2 * s);
                    ctx.lineTo(x + 10 * s, y - 4 * s - flap);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalCompositeOperation = "lighter";
                    glowDot(ctx, x, y, 5 * s, c, 0.8);
                }
                break;
            }
            case FxStyle.Gaze: {
                // Rings travel from the caster's eyes to the target, then symbols float above it.
                for (let i: number = 0; i < 4; i++) {
                    const local: number = clamp01((k - i * 0.1) / 0.5);
                    if (local <= 0 || local >= 1) {
                        continue;
                    }
                    const p: Point = lerp(fx.from, fx.to, local);
                    ctx.strokeStyle = rgba(c, 1 - local * 0.5);
                    ctx.lineWidth = 3 * s;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, 10 * s * (1 + local), 16 * s * (1 + local), 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                if (k > 0.5) {
                    const b: number = (k - 0.5) / 0.5;
                    ctx.fillStyle = rgba(c, 1 - b);
                    ctx.font = "700 " + Math.round(22 * s) + "px 'Segoe UI', sans-serif";
                    ctx.textAlign = "center";
                    const glyph: string = fx.ability === AbilityKey.CharmGaze ? "♥" : "z";
                    ctx.fillText(glyph, fx.to.x + 18 * s, fx.to.y - 50 * s - b * 30 * s);
                    ctx.fillText(glyph, fx.to.x - 16 * s, fx.to.y - 40 * s - b * 44 * s);
                }
                break;
            }
            case FxStyle.Heal: {
                const on: number = Math.sin(k * Math.PI);
                glowDot(ctx, fx.from.x, fx.from.y, 70 * s, c, on * 0.5);
                ctx.fillStyle = rgba("#ffffff", on);
                for (let i: number = 0; i < 3; i++) {
                    const x: number = fx.from.x + (i - 1) * 26 * s;
                    const y: number = fx.from.y - 20 * s - k * 50 * s - i * 8 * s;
                    ctx.fillRect(x - 2 * s, y - 7 * s, 4 * s, 14 * s);
                    ctx.fillRect(x - 7 * s, y - 2 * s, 14 * s, 4 * s);
                }
                break;
            }
            case FxStyle.Buff: {
                const on: number = Math.sin(k * Math.PI);
                ctx.strokeStyle = rgba(c, on);
                ctx.lineWidth = 4 * s;
                for (let i: number = 0; i < 2; i++) {
                    const y: number = fx.from.y + 40 * s - ((k + i * 0.35) % 1) * 90 * s;
                    ctx.beginPath();
                    ctx.ellipse(fx.from.x, y, 36 * s, 11 * s, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.fillStyle = rgba(c, on);
                ctx.font = "800 " + Math.round(20 * s) + "px 'Segoe UI', sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("▲", fx.from.x + 30 * s, fx.from.y - 40 * s - k * 30 * s);
                break;
            }
            case FxStyle.Shield: {
                const on: number = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
                ctx.strokeStyle = rgba(c, on);
                ctx.lineWidth = 3 * s;
                ctx.fillStyle = rgba(c, on * 0.18);
                ctx.beginPath();
                ctx.ellipse(fx.from.x, fx.from.y, 48 * s, 64 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                for (let i: number = 0; i < 6; i++) {
                    const a: number = i / 6 * Math.PI * 2 + fx.t * 2;
                    glowDot(ctx, fx.from.x + Math.cos(a) * 48 * s, fx.from.y + Math.sin(a) * 64 * s, 8 * s, c, on);
                }
                break;
            }
        }
    }
}
