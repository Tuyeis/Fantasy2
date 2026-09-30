import {SaveData} from "../core/save-store";
import {GearInstance, InventoryData} from "../data/dungeon-types";
import {isGear, ItemKey} from "../data/items";
import {isEquipped} from "./inventory";

/**
 * Bag and bank, WoW style: the bag you carry has a limited number of slots, the bank in town keeps the rest.
 * Stackable items take one slot per STACK_SIZE units; every unequipped piece of gear takes one slot.
 * The bank is not part of the run snapshot, so whatever is stored there is safe when an expedition fails.
 */

export const BAG_SLOTS: number = 16;
export const BANK_SLOTS: number = 48;
export const STACK_SIZE: number = 20;

export function emptyStorage(): InventoryData {
    return {stacks: {}, gear: []};
}

function stackSlots(inv: InventoryData): number {
    return (Object.values(inv.stacks) as (number | undefined)[]).reduce((sum: number, n: number | undefined) => sum + Math.ceil((n ?? 0) / STACK_SIZE), 0);
}

export function bagUsed(save: SaveData): number {
    return stackSlots(save.inventory) + save.inventory.gear.filter((g: GearInstance) => !isEquipped(save, g.uid)).length;
}

export function bankUsed(save: SaveData): number {
    return stackSlots(save.bank) + save.bank.gear.length;
}

/** Extra slots needed to put `quantity` of `key` into a storage. */
function slotsNeeded(inv: InventoryData, key: ItemKey, quantity: number): number {
    if (isGear(key)) {
        return quantity;
    }
    const have: number = inv.stacks[key] ?? 0;
    return Math.ceil((have + quantity) / STACK_SIZE) - Math.ceil(have / STACK_SIZE);
}

export function bagHasRoomFor(save: SaveData, key: ItemKey, quantity: number = 1): boolean {
    return bagUsed(save) + slotsNeeded(save.inventory, key, quantity) <= BAG_SLOTS;
}

function moveStack(from: InventoryData, to: InventoryData, key: ItemKey, quantity: number): void {
    const left: number = (from.stacks[key] ?? 0) - quantity;
    if (left > 0) {
        from.stacks[key] = left;
    } else {
        delete from.stacks[key];
    }
    to.stacks[key] = (to.stacks[key] ?? 0) + quantity;
}

/** Bag -> bank. Stacks move up to `quantity` (default: all). Returns false when the bank is full. */
export function depositStack(save: SaveData, key: ItemKey, quantity?: number): boolean {
    const amount: number = Math.min(quantity ?? Number.MAX_SAFE_INTEGER, save.inventory.stacks[key] ?? 0);
    if (amount <= 0 || bankUsed(save) + slotsNeeded(save.bank, key, amount) > BANK_SLOTS) {
        return false;
    }
    moveStack(save.inventory, save.bank, key, amount);
    return true;
}

export function withdrawStack(save: SaveData, key: ItemKey, quantity?: number): boolean {
    const amount: number = Math.min(quantity ?? Number.MAX_SAFE_INTEGER, save.bank.stacks[key] ?? 0);
    if (amount <= 0 || bagUsed(save) + slotsNeeded(save.inventory, key, amount) > BAG_SLOTS) {
        return false;
    }
    moveStack(save.bank, save.inventory, key, amount);
    return true;
}

export function depositGear(save: SaveData, uid: number): boolean {
    const gear: GearInstance | undefined = save.inventory.gear.find((g: GearInstance) => g.uid === uid);
    if (!gear || isEquipped(save, uid) || bankUsed(save) >= BANK_SLOTS) {
        return false;
    }
    save.inventory.gear = save.inventory.gear.filter((g: GearInstance) => g.uid !== uid);
    save.bank.gear.push(gear);
    return true;
}

export function withdrawGear(save: SaveData, uid: number): boolean {
    const gear: GearInstance | undefined = save.bank.gear.find((g: GearInstance) => g.uid === uid);
    if (!gear || bagUsed(save) >= BAG_SLOTS) {
        return false;
    }
    save.bank.gear = save.bank.gear.filter((g: GearInstance) => g.uid !== uid);
    save.inventory.gear.push(gear);
    return true;
}
