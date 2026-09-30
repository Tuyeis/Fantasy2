import {SaveData} from "../core/save-store";
import {GearInstance, RunBuffKey} from "../data/dungeon-types";
import {ClassDef, ClassKey, CLASSES} from "../data/hero-classes";
import {ITEMS} from "../data/items";
import {PerkKey} from "../data/perks";
import {addStats, roundStats, StatBlock} from "../data/stat-block";
import {equippedGear} from "./inventory";
import {applyTalentStats} from "./talents";

export const MAX_LEVEL: number = 30;
const FORGE_BONUS_PER_PLUS: number = 0.2;
export const MAX_FORGE_PLUS: number = 5;

export function perkRank(save: SaveData, perk: PerkKey): number {
    return save.perks[perk] ?? 0;
}

export function xpToNext(level: number): number {
    return Math.round(30 * Math.pow(level, 1.45));
}

function classStatsAtLevel(classKey: ClassKey, level: number): StatBlock {
    const def: ClassDef = CLASSES[classKey];
    return addStats(def.base, def.growth, level - 1);
}

export function gearFactor(plus: number): number {
    return 1 + FORGE_BONUS_PER_PLUS * plus;
}

function gearStats(gear: GearInstance): Partial<StatBlock> {
    const base: Partial<StatBlock> = ITEMS[gear.key].stats ?? {};
    const scaled: Partial<StatBlock> = {};
    const factor: number = gearFactor(gear.plus);
    for (const key of Object.keys(base) as (keyof StatBlock)[]) {
        scaled[key] = (base[key] ?? 0) * factor;
    }
    return scaled;
}

/** Max stats of the hero: class + level + equipment + perks + run blessings. */
export function computeHeroStats(save: SaveData): StatBlock {
    let result: StatBlock = classStatsAtLevel(save.hero.classKey, save.hero.level);
    for (const gear of equippedGear(save)) {
        result = addStats(result, gearStats(gear));
    }
    result.hp *= 1 + 0.1 * perkRank(save, PerkKey.Vitality);
    result.mana *= 1 + 0.1 * perkRank(save, PerkKey.ArcaneWell);
    result.crit += 3 * perkRank(save, PerkKey.Lucky);
    result = applyTalentStats(save, result);
    if (save.run) {
        for (const buff of save.run.buffs) {
            if (buff === RunBuffKey.Atk) {
                result.atk *= 1.15;
            } else if (buff === RunBuffKey.Matk) {
                result.matk *= 1.15;
            } else if (buff === RunBuffKey.Def) {
                result.def *= 1.15;
                result.mdef *= 1.15;
            } else if (buff === RunBuffKey.Hp) {
                result.hp *= 1.15;
            } else if (buff === RunBuffKey.Crit) {
                result.crit += 8;
            }
        }
    }
    return roundStats(result);
}

export function potionMultiplier(save: SaveData): number {
    return 1 + 0.25 * perkRank(save, PerkKey.PotionMaster);
}

export function shopPriceMultiplier(save: SaveData): number {
    return 1 - 0.08 * perkRank(save, PerkKey.Merchant);
}

export function companionPowerMultiplier(save: SaveData): number {
    return 1 + 0.3 * perkRank(save, PerkKey.BeastTamer);
}

export function dashCharges(save: SaveData): number {
    return 2 + perkRank(save, PerkKey.ExtraDash);
}
