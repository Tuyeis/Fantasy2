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

export enum BankDirection {
    /** Bag -> bank. */
    Deposit = "deposit",
    /** Bank -> bag. */
    Withdraw = "withdraw"
}

interface Route {
    from: InventoryData;
    to: InventoryData;
    /** Free slots left in the destination. */
    free: number;
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

function route(save: SaveData, direction: BankDirection): Route {
    return direction === BankDirection.Deposit
        ? {from: save.inventory, to: save.bank, free: BANK_SLOTS - bankUsed(save)}
        : {from: save.bank, to: save.inventory, free: BAG_SLOTS - bagUsed(save)};
}

/** Moves up to `quantity` units of a stackable item. Returns false when there is nothing to move or the destination is full. */
export function transferStack(save: SaveData, direction: BankDirection, key: ItemKey, quantity: number): boolean {
    const r: Route = route(save, direction);
    const amount: number = Math.min(quantity, r.from.stacks[key] ?? 0);
    if (amount <= 0 || slotsNeeded(r.to, key, amount) > r.free) {
        return false;
    }
    const left: number = (r.from.stacks[key] ?? 0) - amount;
    if (left > 0) {
        r.from.stacks[key] = left;
    } else {
        delete r.from.stacks[key];
    }
    r.to.stacks[key] = (r.to.stacks[key] ?? 0) + amount;
    return true;
}

/** Moves one unequipped piece of gear. Returns false when it is missing, equipped or the destination is full. */
export function transferGear(save: SaveData, direction: BankDirection, uid: number): boolean {
    const r: Route = route(save, direction);
    const gear: GearInstance | undefined = r.from.gear.find((g: GearInstance) => g.uid === uid);
    if (!gear || isEquipped(save, uid) || r.free <= 0) {
        return false;
    }
    r.from.gear = r.from.gear.filter((g: GearInstance) => g.uid !== uid);
    r.to.gear.push(gear);
    return true;
}
