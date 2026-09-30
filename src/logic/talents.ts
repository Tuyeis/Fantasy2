import {SaveData} from "../core/save-store";
import {AbilityDef, AbilityKey, AbilityKind, ABILITIES, BuffSpec, DamageType} from "../data/abilities";
import {ClassKey, CLASSES} from "../data/hero-classes";
import {StatBlock, StatKey} from "../data/stat-block";
import {TALENT_TREES, TalentDef, TalentEffect, TalentEffectKind, TalentKey, TALENTS, TalentTreeDef, tierStep} from "../data/talents";

/** Respec price in gold per hero level (town only). */
const RESPEC_GOLD_PER_LEVEL: number = 15;
const MAX_COST_REDUCTION: number = 0.6;
const MAX_STATUS_CHANCE: number = 0.95;

export enum LearnBlock {
    None = "none",
    NoPoints = "no_points",
    MaxRank = "max_rank",
    TierLocked = "tier_locked",
    Requires = "requires",
    OtherClass = "other_class"
}

export function talentRank(save: SaveData, key: TalentKey): number {
    return save.hero.talents[key] ?? 0;
}

/** One point per level after the first. */
function talentPointsEarned(save: SaveData): number {
    return Math.max(0, save.hero.level - 1);
}

function spentIn(save: SaveData, classKey: ClassKey): number {
    return TALENT_TREES[classKey].reduce((sum: number, tree: TalentTreeDef) => sum + pointsInTree(save, tree), 0);
}

export function pointsInTree(save: SaveData, tree: TalentTreeDef): number {
    return tree.talents.reduce((sum: number, def: TalentDef) => sum + talentRank(save, def.key), 0);
}

/** Points spent on the Novice stay there forever; the rest are free for the current tree. */
export function availableTalentPoints(save: SaveData): number {
    const noviceSpent: number = spentIn(save, ClassKey.Novice);
    const classSpent: number = save.hero.classKey === ClassKey.Novice ? 0 : spentIn(save, save.hero.classKey);
    return Math.max(0, talentPointsEarned(save) - noviceSpent - classSpent);
}

export function learnBlock(save: SaveData, def: TalentDef): LearnBlock {
    if (def.classKey !== save.hero.classKey) {
        return LearnBlock.OtherClass;
    }
    if (talentRank(save, def.key) >= def.maxRank) {
        return LearnBlock.MaxRank;
    }
    const tree: TalentTreeDef = TALENT_TREES[def.classKey][def.tree];
    if (pointsInTree(save, tree) < def.tier * tierStep(def.classKey)) {
        return LearnBlock.TierLocked;
    }
    if (def.requires && talentRank(save, def.requires) < 1) {
        return LearnBlock.Requires;
    }
    if (availableTalentPoints(save) <= 0) {
        return LearnBlock.NoPoints;
    }
    return LearnBlock.None;
}

export function learnTalent(save: SaveData, key: TalentKey): boolean {
    const def: TalentDef | undefined = TALENTS[key];
    if (!def || learnBlock(save, def) !== LearnBlock.None) {
        return false;
    }
    save.hero.talents[key] = talentRank(save, key) + 1;
    return true;
}

export function respecCost(save: SaveData): number {
    return RESPEC_GOLD_PER_LEVEL * save.hero.level;
}

/** Points that a respec would give back (only the current class; a transformed hero keeps the Novice tree). */
export function refundablePoints(save: SaveData): number {
    return spentIn(save, save.hero.classKey);
}

export function canRespec(save: SaveData): boolean {
    return !save.run && refundablePoints(save) > 0 && save.hero.gold >= respecCost(save);
}

export function respecTalents(save: SaveData): boolean {
    if (!canRespec(save)) {
        return false;
    }
    save.hero.gold -= respecCost(save);
    for (const tree of TALENT_TREES[save.hero.classKey]) {
        for (const def of tree.talents) {
            delete save.hero.talents[def.key];
        }
    }
    return true;
}

// ---------------------------------------------------------------- abilities

export function knowsAbility(save: SaveData, ability: AbilityKey): boolean {
    const abilities: AbilityKey[] = CLASSES[save.hero.classKey].abilities;
    if (abilities[0] === ability) {
        return true;
    }
    return TALENT_TREES[save.hero.classKey].some((tree: TalentTreeDef) =>
        tree.talents.some((def: TalentDef) => def.grants === ability && talentRank(save, def.key) > 0));
}

/** Hotbar slots 1-4 in class order; null while the ability is not learned yet. */
export function abilitySlots(save: SaveData): (AbilityKey | null)[] {
    return CLASSES[save.hero.classKey].abilities.map((key: AbilityKey) => knowsAbility(save, key) ? key : null);
}

/** Talent trees that currently apply: the Novice's (always) and the current class's. */
function activeTrees(save: SaveData): TalentTreeDef[] {
    const trees: TalentTreeDef[] = [...TALENT_TREES[ClassKey.Novice]];
    if (save.hero.classKey !== ClassKey.Novice) {
        trees.push(...TALENT_TREES[save.hero.classKey]);
    }
    return trees;
}

/** Every learned effect, multiplied by its rank. */
function activeEffects(save: SaveData): TalentEffect[] {
    const effects: TalentEffect[] = [];
    for (const tree of activeTrees(save)) {
        for (const def of tree.talents) {
            const rank: number = talentRank(save, def.key);
            if (rank <= 0) {
                continue;
            }
            for (const effect of def.effects) {
                effects.push({...effect, amount: effect.amount * rank});
            }
        }
    }
    return effects;
}

function sumEffects(effects: TalentEffect[], filter: (e: TalentEffect) => boolean): number {
    return effects.filter(filter).reduce((sum: number, e: TalentEffect) => sum + e.amount, 0);
}

/** Applies stat talents to the hero's max stats (after class, level and gear). */
export function applyTalentStats(save: SaveData, stats: StatBlock): StatBlock {
    const effects: TalentEffect[] = activeEffects(save).filter((e: TalentEffect) => e.kind === TalentEffectKind.StatPct);
    const result: StatBlock = {...stats};
    for (const key of Object.values(StatKey) as StatKey[]) {
        const bonus: number = sumEffects(effects, (e: TalentEffect) => e.stat === key);
        if (bonus === 0) {
            continue;
        }
        result[key] = key === StatKey.Crit ? result[key] + bonus : result[key] * (1 + bonus);
    }
    return result;
}

/** Multiplier for basic attacks (they are physical). */
export function basicAttackMultiplier(save: SaveData): number {
    return 1 + sumEffects(activeEffects(save), (e: TalentEffect) => e.kind === TalentEffectKind.TypePower && e.damageType === DamageType.Physical);
}

/** The ability as the hero casts it: base data plus every talent that improves it. */
export function effectiveAbility(save: SaveData, key: AbilityKey): AbilityDef {
    const base: AbilityDef = ABILITIES[key];
    const effects: TalentEffect[] = activeEffects(save);
    const own: (kind: TalentEffectKind) => number = (kind: TalentEffectKind) => sumEffects(effects, (e: TalentEffect) => e.kind === kind && e.ability === key);
    const powerBonus: number = own(TalentEffectKind.AbilityPower);
    const def: AbilityDef = {...base};
    def.manaCost = Math.max(1, Math.round(base.manaCost * (1 - Math.min(MAX_COST_REDUCTION, own(TalentEffectKind.AbilityCost)))));
    if (base.kind === AbilityKind.Damage) {
        const typeBonus: number = sumEffects(effects, (e: TalentEffect) => e.kind === TalentEffectKind.TypePower && e.damageType === base.damageType);
        const elementBonus: number = sumEffects(effects, (e: TalentEffect) => e.kind === TalentEffectKind.ElementPower && e.element === base.element);
        def.power = (base.power ?? 1) * (1 + powerBonus + typeBonus + elementBonus);
        def.hits = (base.hits ?? 1) + own(TalentEffectKind.AbilityHits);
        const crit: number = (base.critBonus ?? 0) + own(TalentEffectKind.AbilityCrit);
        def.critBonus = crit > 0 ? crit : undefined;
        const lifesteal: number = (base.lifesteal ?? 0) + own(TalentEffectKind.AbilityLifesteal);
        def.lifesteal = lifesteal > 0 ? lifesteal : undefined;
        if (base.status) {
            def.statusChance = Math.min(MAX_STATUS_CHANCE, (base.statusChance ?? 0) + own(TalentEffectKind.AbilityStatus));
        }
    }
    if (base.healPct !== undefined) {
        // Heals scale with the ability's own power talents (heal abilities) and the general healing talents.
        const healBonus: number = sumEffects(effects, (e: TalentEffect) => e.kind === TalentEffectKind.HealPower) + (base.kind === AbilityKind.Damage ? 0 : powerBonus);
        def.healPct = base.healPct * (1 + healBonus);
        def.healPower = base.healPower !== undefined ? base.healPower * (1 + healBonus) : undefined;
    }
    if (base.buffs) {
        const extraTurns: number = own(TalentEffectKind.AbilityTurns);
        const buffScale: number = base.kind === AbilityKind.Damage ? 1 : 1 + powerBonus;
        def.buffs = base.buffs.map((b: BuffSpec) => ({...b, amount: b.amount * buffScale, turns: b.turns + extraTurns}));
    }
    return def;
}

// ---------------------------------------------------------------- helpers for tests / bots

/** Spends every free point greedily: abilities first, then row by row (used by the balance bot). */
export function autoSpendTalents(save: SaveData): void {
    const trees: TalentTreeDef[] = TALENT_TREES[save.hero.classKey];
    const order: TalentDef[] = [
        ...trees.flatMap((tree: TalentTreeDef) => tree.talents.filter((d: TalentDef) => d.grants !== null)),
        ...trees.flatMap((tree: TalentTreeDef) => [...tree.talents].sort((a: TalentDef, b: TalentDef) => a.tier - b.tier))
    ];
    let progress: boolean = true;
    while (progress && availableTalentPoints(save) > 0) {
        progress = false;
        for (const def of order) {
            if (learnTalent(save, def.key)) {
                progress = true;
                break;
            }
        }
    }
}
