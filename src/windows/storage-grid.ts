import {el} from "../core/ui";
import {SaveData} from "../core/save-store";
import {GearInstance, InventoryData} from "../data/dungeon-types";
import {ItemKey, ITEMS} from "../data/items";
import {STACK_SIZE} from "../logic/bank";
import {isEquipped, itemName} from "../logic/inventory";
import {iconImg} from "../render/item-icons";
import {gearDescription, itemDescription} from "./window-helpers";

/** One occupied slot of a bag or bank grid. */
export interface StorageCell {
    key: ItemKey;
    count: number;
    /** Gear only. */
    gear: GearInstance | null;
}

/** Slots of a storage in display order: gear first, then stacks split into STACK_SIZE piles. */
export function storageCells(save: SaveData, inv: InventoryData, hideEquipped: boolean): StorageCell[] {
    const cells: StorageCell[] = [];
    for (const g of inv.gear) {
        if (hideEquipped && isEquipped(save, g.uid)) {
            continue;
        }
        cells.push({key: g.key, count: 1, gear: g});
    }
    const keys: ItemKey[] = (Object.keys(inv.stacks) as ItemKey[]).sort((a: ItemKey, b: ItemKey) => ITEMS[a].category.localeCompare(ITEMS[b].category));
    for (const key of keys) {
        let left: number = inv.stacks[key] ?? 0;
        while (left > 0) {
            const n: number = Math.min(STACK_SIZE, left);
            cells.push({key: key, count: n, gear: null});
            left -= n;
        }
    }
    return cells;
}

export function cellTitle(cell: StorageCell): string {
    const name: string = itemName(cell.key, cell.gear ? cell.gear.plus : 0);
    const desc: string = cell.gear ? gearDescription(cell.gear) : itemDescription(cell.key);
    return name + (cell.count > 1 ? " ×" + cell.count : "") + (desc ? "\n" + desc : "");
}

/** Grid of `slots` squares; occupied ones show the item icon and pile size and react to clicks. */
export function storageGrid(cells: StorageCell[], slots: number, onClick: (cell: StorageCell) => void, selected: StorageCell | null = null): HTMLElement {
    const nodes: HTMLElement[] = [];
    for (let i: number = 0; i < slots; i++) {
        const cell: StorageCell | undefined = cells[i];
        if (!cell) {
            nodes.push(el("div", {cls: "bag-slot empty"}));
            continue;
        }
        const isSelected: boolean = selected !== null && selected.key === cell.key && selected.gear?.uid === cell.gear?.uid;
        const slot: HTMLElement = el("div", {cls: "bag-slot" + (isSelected ? " selected" : ""), title: cellTitle(cell)}, [
            iconImg(cell.key),
            cell.gear && cell.gear.plus > 0 ? el("span", {cls: "bag-plus", text: "+" + cell.gear.plus}) : null,
            cell.count > 1 ? el("span", {cls: "bag-count", text: String(cell.count)}) : null
        ]);
        slot.addEventListener("click", () => onClick(cell));
        nodes.push(slot);
    }
    return el("div", {cls: "bag-grid"}, nodes);
}
