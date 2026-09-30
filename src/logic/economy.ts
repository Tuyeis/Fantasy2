import {SaveData} from "../core/save-store";
import {GearInstance} from "../data/dungeon-types";
import {ItemKey, ITEMS, sellPrice} from "../data/items";
import {addItem, countItem, findGear, removeGear, removeItem} from "./inventory";
import {MAX_FORGE_PLUS, shopPriceMultiplier} from "./hero-stats";

/** Values match the hero's wallet fields. */
export enum Currency {
    Gold = "gold",
    Diamonds = "diamonds"
}

export function buyPrice(save: SaveData, key: ItemKey): number {
    return Math.max(1, Math.round(ITEMS[key].price * shopPriceMultiplier(save)));
}

/** Price of one unit in the given currency; undefined when the item is not sold for it. */
export function priceIn(save: SaveData, key: ItemKey, currency: Currency): number | undefined {
    return currency === Currency.Gold ? buyPrice(save, key) : ITEMS[key].diamondPrice;
}

export function buy(save: SaveData, key: ItemKey, currency: Currency): boolean {
    const price: number | undefined = priceIn(save, key, currency);
    if (price === undefined || save.hero[currency] < price) {
        return false;
    }
    save.hero[currency] -= price;
    addItem(save, key, 1);
    return true;
}

export function sellStack(save: SaveData, key: ItemKey): number {
    if (!removeItem(save, key, 1)) {
        return 0;
    }
    const gold: number = sellPrice(key);
    save.hero.gold += gold;
    return gold;
}

export function gearSellPrice(gear: GearInstance): number {
    return Math.round(sellPrice(gear.key) * (1 + 0.25 * gear.plus));
}

export function sellGear(save: SaveData, uid: number): number {
    const gear: GearInstance | null = findGear(save, uid);
    if (!gear) {
        return 0;
    }
    const gold: number = gearSellPrice(gear);
    removeGear(save, uid);
    save.hero.gold += gold;
    return gold;
}

export interface ForgeCost {
    gold: number;
    diamonds: number;
    materials: ForgeCost.Material[];
}

export namespace ForgeCost {
    export interface Material {
        item: ItemKey;
        amount: number;
    }
}

/** Diamonds and materials by the gear's current plus; higher levels reuse the last entry. */
const FORGE_STEPS: Omit<ForgeCost, "gold">[] = [
    {diamonds: 0, materials: [{item: ItemKey.IronOre, amount: 1}]},
    {diamonds: 0, materials: [{item: ItemKey.IronOre, amount: 2}]},
    {diamonds: 0, materials: [{item: ItemKey.GoldOre, amount: 1}]},
    {diamonds: 0, materials: [{item: ItemKey.GoldOre, amount: 2}]},
    {diamonds: 1, materials: [{item: ItemKey.GoldOre, amount: 2}]}
];

export function forgeCost(gear: GearInstance): ForgeCost | null {
    if (gear.plus >= MAX_FORGE_PLUS) {
        return null;
    }
    const step: Omit<ForgeCost, "gold"> = FORGE_STEPS[Math.min(gear.plus, FORGE_STEPS.length - 1)];
    return {gold: Math.round(ITEMS[gear.key].price * 0.4 * (gear.plus + 1)) + 20, diamonds: step.diamonds, materials: step.materials};
}

export function canForge(save: SaveData, gear: GearInstance): boolean {
    const cost: ForgeCost | null = forgeCost(gear);
    if (!cost) {
        return false;
    }
    if (save.hero.gold < cost.gold || save.hero.diamonds < cost.diamonds) {
        return false;
    }
    return cost.materials.every((m: ForgeCost.Material) => countItem(save, m.item) >= m.amount);
}

export function forge(save: SaveData, uid: number): boolean {
    const gear: GearInstance | null = findGear(save, uid);
    if (!gear || !canForge(save, gear)) {
        return false;
    }
    const cost: ForgeCost = forgeCost(gear) as ForgeCost;
    save.hero.gold -= cost.gold;
    save.hero.diamonds -= cost.diamonds;
    for (const m of cost.materials) {
        removeItem(save, m.item, m.amount);
    }
    gear.plus++;
    return true;
}
