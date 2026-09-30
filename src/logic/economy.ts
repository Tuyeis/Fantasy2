import {SaveData} from "../core/save-store";
import {GearInstance} from "../data/dungeon-types";
import {ItemKey, ITEMS, sellPrice} from "../data/items";
import {addItem, countItem, findGear, removeGear, removeItem} from "./inventory";
import {MAX_FORGE_PLUS, shopPriceMultiplier} from "./hero-stats";

export function buyPrice(save: SaveData, key: ItemKey): number {
    return Math.max(1, Math.round(ITEMS[key].price * shopPriceMultiplier(save)));
}

export function buyWithGold(save: SaveData, key: ItemKey): boolean {
    const price: number = buyPrice(save, key);
    if (save.hero.gold < price) {
        return false;
    }
    save.hero.gold -= price;
    addItem(save, key, 1);
    return true;
}

export function buyWithDiamonds(save: SaveData, key: ItemKey): boolean {
    const price: number | undefined = ITEMS[key].diamondPrice;
    if (price === undefined || save.hero.diamonds < price) {
        return false;
    }
    save.hero.diamonds -= price;
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

export function sellGear(save: SaveData, uid: number): number {
    const gear: GearInstance | null = findGear(save, uid);
    if (!gear) {
        return 0;
    }
    const gold: number = Math.round(sellPrice(gear.key) * (1 + 0.25 * gear.plus));
    removeGear(save, uid);
    save.hero.gold += gold;
    return gold;
}

export interface ForgeCost {
    gold: number;
    diamonds: number;
    materials: {item: ItemKey; amount: number}[];
}

export function forgeCost(gear: GearInstance): ForgeCost | null {
    if (gear.plus >= MAX_FORGE_PLUS) {
        return null;
    }
    const gold: number = Math.round(ITEMS[gear.key].price * 0.4 * (gear.plus + 1)) + 20;
    switch (gear.plus) {
        case 0:
            return {gold: gold, diamonds: 0, materials: [{item: ItemKey.IronOre, amount: 1}]};
        case 1:
            return {gold: gold, diamonds: 0, materials: [{item: ItemKey.IronOre, amount: 2}]};
        case 2:
            return {gold: gold, diamonds: 0, materials: [{item: ItemKey.GoldOre, amount: 1}]};
        case 3:
            return {gold: gold, diamonds: 0, materials: [{item: ItemKey.GoldOre, amount: 2}]};
        default:
            return {gold: gold, diamonds: 1, materials: [{item: ItemKey.GoldOre, amount: 2}]};
    }
}

export function canForge(save: SaveData, gear: GearInstance): boolean {
    const cost: ForgeCost | null = forgeCost(gear);
    if (!cost) {
        return false;
    }
    if (save.hero.gold < cost.gold || save.hero.diamonds < cost.diamonds) {
        return false;
    }
    return cost.materials.every((m: {item: ItemKey; amount: number}) => countItem(save, m.item) >= m.amount);
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
