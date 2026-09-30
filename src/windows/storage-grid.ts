import {el} from "../core/ui";
import {SaveData} from "../core/save-store";
import {GearInstance, InventoryData} from "../data/dungeon-types";
import {ItemKey, ITEMS} from "../data/items";
import {STACK_SIZE} from "../logic/bank";
import {isEquipped, itemName} from "../logic/inventory";
import {iconImg} from "../render/item-icons";
import {ActionBarSlot} from "../data/action-bar";
import {makeActionDraggable} from "../scenes/action-bar-hud";
import {gearDescription, itemDescription} from "./window-helpers";

/** One occupied slot of a bag or bank grid. */
export interface StorageCell {
    key: ItemKey;
    count: number;
    /** Gear only. */
    gear: GearInstance | null;
    /** Index of this pile among the piles of the same stackable item (0 for gear). */
    pile: number;
}

/** Same slot across re-renders: gear by uid, stacks by item and pile index. */
export function sameCell(a: StorageCell, b: StorageCell): boolean {
    return a.key === b.key && a.pile === b.pile && a.gear?.uid === b.gear?.uid;
}

/** Slots of a storage in display order: gear first, then stacks split into STACK_SIZE piles. */
export function storageCells(save: SaveData, inv: InventoryData, hideEquipped: boolean): StorageCell[] {
    const cells: StorageCell[] = [];
    for (const g of inv.gear) {
        if (hideEquipped && isEquipped(save, g.uid)) {
            continue;
        }
        cells.push({key: g.key, count: 1, gear: g, pile: 0});
    }
    const keys: ItemKey[] = (Object.keys(inv.stacks) as ItemKey[]).sort((a: ItemKey, b: ItemKey) => ITEMS[a].category.localeCompare(ITEMS[b].category));
    for (const key of keys) {
        let left: number = inv.stacks[key] ?? 0;
        let pile: number = 0;
        while (left > 0) {
            const n: number = Math.min(STACK_SIZE, left);
            cells.push({key: key, count: n, gear: null, pile: pile});
            left -= n;
            pile++;
        }
    }
    return cells;
}

function cellTitle(cell: StorageCell): string {
    const name: string = itemName(cell.key, cell.gear ? cell.gear.plus : 0);
    const desc: string = cell.gear ? gearDescription(cell.gear) : itemDescription(cell.key);
    return name + (cell.count > 1 ? " ×" + cell.count : "") + (desc ? "\n" + desc : "");
}

/** Grid of `slots` squares; occupied ones show the item icon and pile size and react to clicks. */
export function storageGrid(cells: StorageCell[], slots: number, onClick: (cell: StorageCell) => void, selected: StorageCell | null = null,
                            dragAction: ((cell: StorageCell) => ActionBarSlot | null) | null = null): HTMLElement {
    const nodes: HTMLElement[] = [];
    for (let i: number = 0; i < slots; i++) {
        const cell: StorageCell | undefined = cells[i];
        if (!cell) {
            nodes.push(el("div", {cls: "bag-slot empty"}));
            continue;
        }
        const isSelected: boolean = selected !== null && sameCell(selected, cell);
        const slot: HTMLElement = el("div", {cls: "bag-slot" + (isSelected ? " selected" : ""), title: cellTitle(cell)}, [
            iconImg(cell.key),
            cell.gear && cell.gear.plus > 0 ? el("span", {cls: "bag-plus", text: "+" + cell.gear.plus}) : null,
            cell.count > 1 ? el("span", {cls: "bag-count", text: String(cell.count)}) : null
        ]);
        slot.addEventListener("click", () => onClick(cell));
        const action: ActionBarSlot | null = dragAction ? dragAction(cell) : null;
        if (action) {
            makeActionDraggable(slot, action);
        }
        nodes.push(slot);
    }
    return el("div", {cls: "bag-grid"}, nodes);
}
