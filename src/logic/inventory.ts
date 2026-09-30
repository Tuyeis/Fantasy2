import {tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {EquipmentData, GearInstance, InventoryData} from "../data/dungeon-types";
import {ALL_SLOTS, EquipSlot, isGear, ItemKey, ITEMS, slotOf} from "../data/items";

export function itemName(key: ItemKey, plus: number = 0): string {
    return tr(ITEMS[key].name) + (plus > 0 ? " +" + plus : "");
}

export function stackCount(save: SaveData, key: ItemKey): number {
    return save.inventory.stacks[key] ?? 0;
}

/** Total owned (stack amount, or number of gear instances including equipped ones). */
export function countItem(save: SaveData, key: ItemKey): number {
    if (isGear(key)) {
        return save.inventory.gear.filter((g: GearInstance) => g.key === key).length;
    }
    return stackCount(save, key);
}

export function isEquipped(save: SaveData, uid: number): boolean {
    return ALL_SLOTS.some((slot: EquipSlot) => save.hero.equipment[slot] === uid);
}

export function addItem(save: SaveData, key: ItemKey, quantity: number = 1): void {
    if (isGear(key)) {
        for (let i: number = 0; i < quantity; i++) {
            save.inventory.gear.push({uid: save.nextUid, key: key, plus: 0});
            save.nextUid++;
        }
        return;
    }
    save.inventory.stacks[key] = stackCount(save, key) + quantity;
}

/** Removes items; for gear prefers unequipped and least upgraded instances. Returns false if not enough. */
export function removeItem(save: SaveData, key: ItemKey, quantity: number = 1): boolean {
    if (countItem(save, key) < quantity) {
        return false;
    }
    if (!isGear(key)) {
        const left: number = stackCount(save, key) - quantity;
        if (left > 0) {
            save.inventory.stacks[key] = left;
        } else {
            delete save.inventory.stacks[key];
        }
        return true;
    }
    for (let i: number = 0; i < quantity; i++) {
        const candidates: GearInstance[] = save.inventory.gear
            .filter((g: GearInstance) => g.key === key)
            .sort((a: GearInstance, b: GearInstance) => {
                const equippedDiff: number = Number(isEquipped(save, a.uid)) - Number(isEquipped(save, b.uid));
                return equippedDiff !== 0 ? equippedDiff : a.plus - b.plus;
            });
        removeGear(save, candidates[0].uid);
    }
    return true;
}

export function removeGear(save: SaveData, uid: number): void {
    for (const slot of ALL_SLOTS) {
        if (save.hero.equipment[slot] === uid) {
            save.hero.equipment[slot] = null;
        }
    }
    save.inventory.gear = save.inventory.gear.filter((g: GearInstance) => g.uid !== uid);
}

export function findGear(save: SaveData, uid: number | null): GearInstance | null {
    if (uid === null) {
        return null;
    }
    return save.inventory.gear.find((g: GearInstance) => g.uid === uid) ?? null;
}

export function equip(save: SaveData, uid: number): void {
    const gear: GearInstance | null = findGear(save, uid);
    if (!gear) {
        return;
    }
    const slot: EquipSlot | null = slotOf(gear.key);
    if (slot) {
        save.hero.equipment[slot] = uid;
    }
}

export function unequip(save: SaveData, slot: EquipSlot): void {
    save.hero.equipment[slot] = null;
}

export function equippedGear(save: SaveData): GearInstance[] {
    const result: GearInstance[] = [];
    for (const slot of ALL_SLOTS) {
        const gear: GearInstance | null = findGear(save, save.hero.equipment[slot]);
        if (gear) {
            result.push(gear);
        }
    }
    return result;
}

export function cloneInventory(inventory: InventoryData): InventoryData {
    return {
        stacks: {...inventory.stacks},
        gear: inventory.gear.map((g: GearInstance) => ({...g}))
    };
}

export function cloneEquipment(equipment: EquipmentData): EquipmentData {
    return {...equipment};
}

/** Stackable items sorted for lists. */
export function ownedStacks(save: SaveData): ItemKey[] {
    return (Object.keys(save.inventory.stacks) as ItemKey[]).filter((key: ItemKey) => stackCount(save, key) > 0);
}
