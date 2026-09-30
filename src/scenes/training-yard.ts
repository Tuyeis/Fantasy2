import {Vec2} from "../core/input";
import {DamageType} from "../data/abilities";
import {Element} from "../data/element";
import {stats} from "../data/stat-block";
import {Combatant, DamageRoll, rollDamage, Side} from "../logic/combat-math";
import {FloaterLayer} from "../render/floater-layer";
import {drawTrainingDummy, drawTrainingGround} from "../render/training-dummy";

const DUMMY_RADIUS: number = 11;
/** Chest height above the dummy's feet, where spells aim. */
export const DUMMY_CHEST: number = 30;
const HIT_STAGGER: number = 0.12;

/** What hits the dummy; rolled with the same formula as real combat. */
export interface DummyAttack {
    type: DamageType;
    element: Element;
    power: number;
    critBonus: number;
    hits: number;
}

interface TrainingDummy {
    x: number;
    y: number;
    lean: number;
    leanSpeed: number;
    flash: number;
}

interface PendingHit {
    delay: number;
    dummy: TrainingDummy;
    attacker: Combatant;
    attack: DummyAttack;
    dirX: number;
}

/** Practice yard in town: dummies that take hits, wobble and show the damage you would deal (no armor, no element). */
export class TrainingYard {
    private readonly dummies: TrainingDummy[];
    private readonly center: Vec2;
    private readonly target: Combatant = {
        side: Side.Enemy, name: "dummy", stats: stats(9999, 0, 0, 0, 0, 0, 0), hp: 9999, mana: 0,
        element: Element.Neutral, weak: [], resist: [],
        statuses: [], buffs: [], guarding: false, controlResistant: false
    };
    private pending: PendingHit[] = [];
    private readonly popups: FloaterLayer = new FloaterLayer({riseSpeed: 38, size: 15, fadeRate: 2.5, style: FloaterLayer.Style.Outlined});

    constructor(spots: Vec2[]) {
        this.dummies = spots.map((p: Vec2) => ({x: p.x, y: p.y, lean: 0, leanSpeed: 0, flash: 0}));
        const sum: Vec2 = spots.reduce((a: Vec2, p: Vec2) => ({x: a.x + p.x, y: a.y + p.y}), {x: 0, y: 0});
        this.center = {x: sum.x / Math.max(1, spots.length), y: sum.y / Math.max(1, spots.length)};
    }

    /** Where the dummies stand (feet), e.g. to walk up to one. */
    public get positions(): Vec2[] {
        return this.dummies.map((d: TrainingDummy) => ({x: d.x, y: d.y}));
    }

    public blocks(x: number, y: number, r: number): boolean {
        return this.dummies.some((d: TrainingDummy) => Math.hypot(x - d.x, (y - d.y) * 1.4) < DUMMY_RADIUS + r * 0.5);
    }

    /** Nearest dummy chest in front of `from` (within range and a forward cone), for aiming spells. */
    public aimTarget(from: Vec2, aim: Vec2, range: number): Vec2 | null {
        let best: Vec2 | null = null;
        let bestDist: number = range;
        for (const d of this.dummies) {
            const dx: number = d.x - from.x;
            const dy: number = d.y - DUMMY_CHEST - from.y;
            const dist: number = Math.hypot(dx, dy);
            if (dist < bestDist && dist > 0 && (dx * aim.x + dy * aim.y) / dist > 0.55) {
                bestDist = dist;
                best = {x: d.x, y: d.y - DUMMY_CHEST};
            }
        }
        return best;
    }

    /** Hits every dummy whose chest is within `radius` of `at`, after `delay` seconds. Returns how many were hit. */
    public strike(attacker: Combatant, at: Vec2, radius: number, attack: DummyAttack, delay: number): number {
        let count: number = 0;
        for (const d of this.dummies) {
            if (Math.hypot(d.x - at.x, d.y - DUMMY_CHEST - at.y) > radius) {
                continue;
            }
            count++;
            for (let i: number = 0; i < attack.hits; i++) {
                this.pending.push({delay: delay + i * HIT_STAGGER, dummy: d, attacker: attacker, attack: attack, dirX: Math.sign(d.x - at.x) || 1});
            }
        }
        return count;
    }

    public update(dt: number): void {
        const due: PendingHit[] = [];
        this.pending = this.pending.filter((h: PendingHit) => {
            h.delay -= dt;
            if (h.delay <= 0) {
                due.push(h);
                return false;
            }
            return true;
        });
        for (const h of due) {
            this.applyHit(h);
        }
        for (const d of this.dummies) {
            // Damped spring back to upright.
            d.leanSpeed += (-d.lean * 70 - d.leanSpeed * 7) * dt;
            d.lean += d.leanSpeed * dt;
            d.flash = Math.max(0, d.flash - dt * 5);
        }
        this.popups.update(dt);
    }

    private applyHit(h: PendingHit): void {
        const roll: DamageRoll = rollDamage(h.attacker, this.target, h.attack.type, h.attack.element, h.attack.power, h.attack.critBonus);
        h.dummy.leanSpeed += h.dirX * (roll.crit ? 5 : 3.2);
        h.dummy.flash = 1;
        const jitter: number = (Math.random() - 0.5) * 16;
        this.popups.push({
            x: h.dummy.x + jitter,
            y: h.dummy.y - 64,
            text: String(roll.amount) + (roll.crit ? "!" : ""),
            color: roll.crit ? "#ffd43b" : h.attack.type === DamageType.Physical ? "#f8f9fa" : "#a5d8ff",
            life: 1,
            size: roll.crit ? 20 : 15
        });
    }

    public drawGround(ctx: CanvasRenderingContext2D): void {
        drawTrainingGround(ctx, this.center.x, this.center.y, 110, 58);
    }

    /** Dummies as y-sorted drawables. */
    public drawables(ctx: CanvasRenderingContext2D): {y: number; draw: () => void}[] {
        return this.dummies.map((d: TrainingDummy) => ({y: d.y, draw: () => drawTrainingDummy(ctx, d.x, d.y, {lean: d.lean, flash: d.flash})}));
    }

    public drawPopups(ctx: CanvasRenderingContext2D): void {
        this.popups.draw(ctx);
    }
}
