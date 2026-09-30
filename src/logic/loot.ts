import {chance, randFloat, randInt, weightedPick} from "../core/rng";
import {SaveData} from "../core/save-store";
import {FloorDef, LootEntry} from "../data/floors";
import {ItemKey} from "../data/items";
import {ARMORED_REWARD_MULT, MonsterDef} from "../data/monsters";
import {PerkKey} from "../data/perks";
import {perkRank} from "./hero-stats";

export interface LootResult {
    gold: number;
    items: ItemKey[];
}

function dropMultiplier(save: SaveData): number {
    return 1 + 0.15 * perkRank(save, PerkKey.Fortune);
}

function rollLoot(entries: LootEntry[]): ItemKey {
    return weightedPick(entries, (e: LootEntry) => e.weight).item;
}

export function combatLoot(save: SaveData, monster: MonsterDef, armored: boolean, floor: FloorDef): LootResult {
    const rewardMult: number = (armored ? ARMORED_REWARD_MULT : 1) * (1 + 0.25 * save.challenge);
    const gold: number = Math.round(monster.gold * rewardMult * randFloat(0.8, 1.2));
    const items: ItemKey[] = [];
    const dropChance: number = Math.min(0.95, floor.dropChance * dropMultiplier(save) * (armored ? 1.4 : 1));
    if (monster.boss) {
        items.push(rollLoot(floor.loot), rollLoot(floor.loot), ItemKey.PotionMedium);
    } else if (chance(dropChance)) {
        items.push(rollLoot(floor.loot));
        if (chance(0.15 * dropMultiplier(save))) {
            items.push(rollLoot(floor.loot));
        }
    }
    return {gold: gold, items: items};
}

export function chestLoot(save: SaveData, floor: FloorDef): LootResult {
    const gold: number = Math.round(randInt(25, 45) * floor.floor * (1 + 0.25 * save.challenge));
    const count: number = chance(0.35 * dropMultiplier(save)) ? 3 : 2;
    const items: ItemKey[] = [];
    for (let i: number = 0; i < count; i++) {
        items.push(rollLoot(floor.loot));
    }
    return {gold: gold, items: items};
}

export function combatXp(monster: MonsterDef, armored: boolean, challenge: number): number {
    return Math.round(monster.xp * (armored ? ARMORED_REWARD_MULT : 1) * (1 + 0.3 * challenge));
}
