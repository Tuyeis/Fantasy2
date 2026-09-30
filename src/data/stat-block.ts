import {t, UiKey} from "../core/i18n";

export enum StatKey {
    Hp = "hp",
    Mana = "mana",
    Atk = "atk",
    Def = "def",
    Matk = "matk",
    Mdef = "mdef",
    Crit = "crit"
}

export interface StatBlock {
    hp: number;
    mana: number;
    atk: number;
    def: number;
    matk: number;
    mdef: number;
    crit: number;
}

export const ALL_STATS: StatKey[] = [StatKey.Hp, StatKey.Mana, StatKey.Atk, StatKey.Def, StatKey.Matk, StatKey.Mdef, StatKey.Crit];

const STAT_LABEL_KEYS: Record<StatKey, UiKey> = {
    [StatKey.Hp]: "statHp",
    [StatKey.Mana]: "statMana",
    [StatKey.Atk]: "statAtk",
    [StatKey.Def]: "statDef",
    [StatKey.Matk]: "statMatk",
    [StatKey.Mdef]: "statMdef",
    [StatKey.Crit]: "statCrit"
};

export function statLabel(stat: StatKey): string {
    return t(STAT_LABEL_KEYS[stat]);
}

export function stats(hp: number, mana: number, atk: number, def: number, matk: number, mdef: number, crit: number): StatBlock {
    return {hp: hp, mana: mana, atk: atk, def: def, matk: matk, mdef: mdef, crit: crit};
}

export function emptyStats(): StatBlock {
    return stats(0, 0, 0, 0, 0, 0, 0);
}

/** Returns a + b * factor (new object). */
export function addStats(a: StatBlock, b: Partial<StatBlock>, factor: number = 1): StatBlock {
    const result: StatBlock = {...a};
    for (const key of ALL_STATS) {
        const value: number | undefined = b[key];
        if (value !== undefined) {
            result[key] = result[key] + value * factor;
        }
    }
    return result;
}

export function roundStats(a: StatBlock): StatBlock {
    const result: StatBlock = {...a};
    for (const key of ALL_STATS) {
        result[key] = Math.round(result[key]);
    }
    return result;
}

/** Short text like "+10 ATK, +5 DEF" for tooltips. */
export function describeStats(bonus: Partial<StatBlock>, factor: number = 1): string {
    const parts: string[] = [];
    for (const key of ALL_STATS) {
        const value: number | undefined = bonus[key];
        if (value) {
            const scaled: number = Math.round(value * factor);
            parts.push((scaled >= 0 ? "+" : "") + scaled + " " + statLabel(key));
        }
    }
    return parts.join(", ");
}
