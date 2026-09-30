import {chance, randFloat} from "../core/rng";
import {DamageType} from "../data/abilities";
import {Element, elementMultiplier} from "../data/element";
import {StatBlock, StatKey} from "../data/stat-block";
import {StatusKey} from "../data/status-effect";

/** Defense constant: damage = base * K / (K + defense). */
export const DEFENSE_K: number = 45;
/** Minimum damage floor as a fraction of the raw attack. */
export const MIN_DAMAGE_RATIO: number = 0.12;
export const CRIT_MULTIPLIER: number = 1.6;
export const GUARD_MULTIPLIER: number = 0.5;
export const VARIANCE: number = 0.1;

export enum Side {
    Hero = "hero",
    Enemy = "enemy"
}

export interface StatusInstance {
    key: StatusKey;
    turns: number;
}

export interface BuffInstance {
    stat: StatKey;
    amount: number;
    turns: number;
    source: string;
}

export interface Combatant {
    side: Side;
    name: string;
    /** Max / base stats. */
    stats: StatBlock;
    hp: number;
    mana: number;
    element: Element;
    weak: Element[];
    resist: Element[];
    statuses: StatusInstance[];
    buffs: BuffInstance[];
    guarding: boolean;
    controlResistant: boolean;
}

export function effectiveStat(c: Combatant, stat: StatKey): number {
    const bonus: number = c.buffs
        .filter((b: BuffInstance) => b.stat === stat)
        .reduce((sum: number, b: BuffInstance) => sum + b.amount, 0);
    if (stat === StatKey.Crit) {
        return c.stats.crit + bonus;
    }
    return c.stats[stat] * (1 + bonus);
}

export interface DamageRoll {
    amount: number;
    crit: boolean;
    multiplier: number;
}

export function mitigate(raw: number, defense: number): number {
    return Math.max(raw * DEFENSE_K / (DEFENSE_K + Math.max(0, defense)), raw * MIN_DAMAGE_RATIO, 1);
}

export function rollDamage(attacker: Combatant, defender: Combatant, type: DamageType, element: Element, power: number, critBonus: number = 0): DamageRoll {
    const physical: boolean = type === DamageType.Physical;
    const attack: number = effectiveStat(attacker, physical ? StatKey.Atk : StatKey.Matk);
    const defense: number = effectiveStat(defender, physical ? StatKey.Def : StatKey.Mdef);
    let amount: number = mitigate(attack * power, defense);
    amount *= randFloat(1 - VARIANCE, 1 + VARIANCE);
    const multiplier: number = elementMultiplier(element, defender.weak, defender.resist);
    amount *= multiplier;
    const crit: boolean = chance((effectiveStat(attacker, StatKey.Crit) + critBonus) / 100);
    if (crit) {
        amount *= CRIT_MULTIPLIER;
    }
    if (defender.guarding) {
        amount *= GUARD_MULTIPLIER;
    }
    return {amount: Math.max(1, Math.round(amount)), crit: crit, multiplier: multiplier};
}

export function hasStatus(c: Combatant, key: StatusKey): boolean {
    return c.statuses.some((s: StatusInstance) => s.key === key);
}
