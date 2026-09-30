import {DamageType} from "../data/abilities";
import {MonsterAttack, MonsterBody, MonsterDef} from "../data/monsters";

/**
 * Hybrid combat: every encounter can be fought turn by turn or in real time.
 * The monster's traits decide which one is easier, so the choice is a real decision:
 * - Heavy monsters hit hard every turn but telegraph slow swings → dodge them in real time.
 * - Swift monsters and casters punish you in real time (lunges, volleys) → safer by turns.
 * Real time also pays more (skill reward) and fills the Focus gauge that can switch the fight to turns.
 */

export enum CombatMode {
    Turns = "turns",
    RealTime = "real_time"
}

export enum EncounterTrait {
    Heavy = "heavy",
    Swift = "swift",
    Caster = "caster",
    Balanced = "balanced"
}

export interface EncounterProfile {
    trait: EncounterTrait;
    recommended: CombatMode;
}

/** Real-time victories grant this much more XP and gold. */
export const REAL_TIME_REWARD_BONUS: number = 0.25;

const HEAVY_BODIES: MonsterBody[] = [MonsterBody.Blob, MonsterBody.Mushroom, MonsterBody.Golem, MonsterBody.Hydra];
const SWIFT_BODIES: MonsterBody[] = [MonsterBody.Beast, MonsterBody.Flyer, MonsterBody.Spider];

function magicalShare(def: MonsterDef): number {
    const total: number = def.attacks.reduce((sum: number, a: MonsterAttack) => sum + a.weight, 0);
    const magical: number = def.attacks.filter((a: MonsterAttack) => a.type === DamageType.Magical).reduce((sum: number, a: MonsterAttack) => sum + a.weight, 0);
    return total > 0 ? magical / total : 0;
}

export function encounterTrait(def: MonsterDef): EncounterTrait {
    if (magicalShare(def) >= 0.5) {
        return EncounterTrait.Caster;
    }
    if (SWIFT_BODIES.includes(def.body)) {
        return EncounterTrait.Swift;
    }
    if (HEAVY_BODIES.includes(def.body) || def.size >= 1.25) {
        return EncounterTrait.Heavy;
    }
    return EncounterTrait.Balanced;
}

export function encounterProfile(def: MonsterDef): EncounterProfile {
    const trait: EncounterTrait = encounterTrait(def);
    const recommended: CombatMode = trait === EncounterTrait.Heavy || trait === EncounterTrait.Balanced ? CombatMode.RealTime : CombatMode.Turns;
    return {trait: trait, recommended: recommended};
}

/** How the monster behaves in real time. */
export interface RealTimeBehaviour {
    /** Walking speed (px/s). */
    speed: number;
    /** Keeps this distance and shoots instead of closing in. */
    preferredRange: number;
    /** Seconds of visible wind-up before a melee hit lands (dodge window). */
    windUp: number;
    /** Damage multiplier of a landed melee hit. */
    meleePower: number;
    /** Seconds between attacks. */
    cooldown: number;
    /** Swift monsters dash at you. */
    lungeSpeed: number;
    /** Casters fire this many bolts per volley. */
    volley: number;
}

export function realTimeBehaviour(def: MonsterDef): RealTimeBehaviour {
    switch (encounterTrait(def)) {
        case EncounterTrait.Heavy:
            return {speed: 55, preferredRange: 0, windUp: 0.75, meleePower: 1.25, cooldown: 1.6, lungeSpeed: 0, volley: 0};
        case EncounterTrait.Swift:
            return {speed: 130, preferredRange: 0, windUp: 0.28, meleePower: 0.8, cooldown: 1.0, lungeSpeed: 520, volley: 0};
        case EncounterTrait.Caster:
            return {speed: 70, preferredRange: 210, windUp: 0.45, meleePower: 0.8, cooldown: 1.9, lungeSpeed: 0, volley: 3};
        default:
            return {speed: 90, preferredRange: 0, windUp: 0.45, meleePower: 1.0, cooldown: 1.2, lungeSpeed: 0, volley: 0};
    }
}
