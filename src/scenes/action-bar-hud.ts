import {t, tr} from "../core/i18n";
import {Input} from "../core/input";
import {SaveData} from "../core/save-store";
import {el} from "../core/ui";
import {AbilityDef, describeAbility} from "../data/abilities";
import {ACTION_BAR_SIZE, ActionBarSlot, ActionDrag} from "../data/action-bar";
import {ItemKey} from "../data/items";
import {clearAction, placeAction, syncActionBar} from "../logic/action-bar";
import {countItem, itemName} from "../logic/inventory";
import {effectiveAbility} from "../logic/talents";
import {abilityIconEl} from "../render/ability-icons";
import {iconImg} from "../render/item-icons";
import {itemDescription} from "../windows/window-helpers";

const SLOT_SIZE: number = 52;

/** Cooldown of one slot: seconds left and the full length (for the shade). */
export interface SlotCooldown {
    left: number;
    total: number;
}

export interface ActionBarState {
    cooldownOf: (slot: ActionBarSlot) => SlotCooldown;
    /** Current mana, or null when mana does not matter (town). */
    mana: number | null;
}

interface Cell {
    slot: ActionBarSlot | null;
    root: HTMLElement;
    shade: HTMLElement;
    label: HTMLElement;
    cost: number;
}

// ---------------------------------------------------------------- drag and drop

/** Pointer distance before a press becomes a drag (a shorter move is still a click). */
const DRAG_THRESHOLD: number = 6;

interface PendingDrag {
    drag: ActionDrag;
    source: HTMLElement;
    startX: number;
    startY: number;
    ghost: HTMLElement | null;
    target: HTMLElement | null;
}

/** Drop handlers of the visible bar slots, and what to do when a bar slot is dropped outside the bar. */
const dropHandlers: WeakMap<HTMLElement, (drag: ActionDrag) => void> = new WeakMap<HTMLElement, (drag: ActionDrag) => void>();
const dropOutsideHandlers: WeakMap<HTMLElement, () => void> = new WeakMap<HTMLElement, () => void>();
let pending: PendingDrag | null = null;
/** The click that follows a finished drag must not use the slot. */
let suppressClick: boolean = false;

/**
 * Hand-made drag (not the browser's HTML drag and drop): the icon follows the pointer and the slot under it is found
 * with elementsFromPoint, which also sees the bar through the backdrop of open windows.
 */
function slotUnder(x: number, y: number): HTMLElement | null {
    for (const node of document.elementsFromPoint(x, y)) {
        if (node instanceof HTMLElement && dropHandlers.has(node)) {
            return node;
        }
    }
    return null;
}

function onPointerMove(e: MouseEvent): void {
    if (!pending) {
        return;
    }
    if (!pending.ghost) {
        if (Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY) < DRAG_THRESHOLD) {
            return;
        }
        const icon: Element | null = pending.source.querySelector("img, .talent-glyph");
        pending.ghost = el("div", {cls: "action-drag-ghost"}, [icon ? icon.cloneNode(true) as HTMLElement : el("span", {text: "?"})]);
        document.body.append(pending.ghost);
        document.body.classList.add("dragging-action");
    }
    pending.ghost.style.left = e.clientX + "px";
    pending.ghost.style.top = e.clientY + "px";
    const target: HTMLElement | null = slotUnder(e.clientX, e.clientY);
    if (target !== pending.target) {
        pending.target?.classList.remove("drop-target");
        target?.classList.add("drop-target");
        pending.target = target;
    }
}

function onPointerUp(e: MouseEvent): void {
    window.removeEventListener("mousemove", onPointerMove);
    window.removeEventListener("mouseup", onPointerUp);
    const current: PendingDrag | null = pending;
    pending = null;
    if (!current || !current.ghost) {
        return;
    }
    current.ghost.remove();
    current.target?.classList.remove("drop-target");
    document.body.classList.remove("dragging-action");
    suppressClick = true;
    window.setTimeout(() => {
        suppressClick = false;
    }, 0);
    const target: HTMLElement | null = slotUnder(e.clientX, e.clientY);
    if (target) {
        dropHandlers.get(target)?.(current.drag);
    } else {
        // Dropped outside the bar: a slot taken from the bar is cleared, like in WoW.
        dropOutsideHandlers.get(current.source)?.();
    }
}

/** Makes a DOM node (spell in the talent window, potion in the bag, a bar slot) draggable onto the action bar. */
export function makeActionDraggable(node: HTMLElement, slot: ActionBarSlot, fromIndex: number | null = null): void {
    node.classList.add("action-draggable");
    node.draggable = false;
    node.addEventListener("dragstart", (e: DragEvent) => e.preventDefault());
    node.addEventListener("mousedown", (e: MouseEvent) => {
        if (e.button !== 0) {
            return;
        }
        e.preventDefault();
        pending = {drag: {slot: slot, fromIndex: fromIndex}, source: node, startX: e.clientX, startY: e.clientY, ghost: null, target: null};
        window.addEventListener("mousemove", onPointerMove);
        window.addEventListener("mouseup", onPointerUp);
    });
}

// ---------------------------------------------------------------- the bar

/** Index of the action bar slot whose key (1-8, main row or numpad) was pressed this frame, or -1. */
export function pressedSlot(input: Input): number {
    for (let i: number = 0; i < ACTION_BAR_SIZE; i++) {
        if (input.wasPressed("Digit" + (i + 1), "Numpad" + (i + 1))) {
            return i;
        }
    }
    return -1;
}

/**
 * WoW-style action bar (keys 1-8) at the bottom of the screen.
 * Drag spells (talent window) or potions (bag) onto it, drag slots to reorder, drag a slot away to clear it.
 */
export class ActionBarHud {
    public readonly element: HTMLElement;
    private cells: Cell[] = [];
    private signature: string = "";

    constructor(private readonly save: () => SaveData, private readonly onUse: (index: number) => void, private readonly onEdit: () => void) {
        this.element = el("div", {cls: "ability-hotbar"});
    }

    /** Rebuilds the slots when the bar, the talents or the potion counts changed. */
    public refresh(): void {
        const save: SaveData = this.save();
        const bar: (ActionBarSlot | null)[] = syncActionBar(save);
        const signature: string = JSON.stringify(bar.map((slot: ActionBarSlot | null) => {
            if (!slot) {
                return null;
            }
            if (slot.kind === ActionBarSlot.Kind.Item && slot.item) {
                return [slot.item, countItem(save, slot.item)];
            }
            const def: AbilityDef | null = slot.ability ? effectiveAbility(save, slot.ability) : null;
            return def ? [def.key, def.manaCost, def.power, def.hits] : null;
        }));
        if (signature === this.signature) {
            return;
        }
        this.signature = signature;
        this.cells = bar.map((slot: ActionBarSlot | null, index: number) => this.buildCell(save, slot, index));
        this.element.replaceChildren(...this.cells.map((c: Cell) => c.root));
    }

    public update(state: ActionBarState): void {
        for (const cell of this.cells) {
            if (!cell.slot) {
                continue;
            }
            const cd: SlotCooldown = state.cooldownOf(cell.slot);
            const noMana: boolean = state.mana !== null && state.mana < cell.cost;
            cell.shade.style.height = (cd.left > 0 ? Math.min(100, cd.left / Math.max(0.01, cd.total) * 100) : noMana ? 100 : 0) + "%";
            cell.label.textContent = cd.left > 0.05 ? cd.left.toFixed(1) : "";
            cell.root.classList.toggle("no-mana", noMana);
        }
    }

    private buildCell(save: SaveData, slot: ActionBarSlot | null, index: number): Cell {
        const shade: HTMLElement = el("div", {cls: "hotbar-shade"});
        const label: HTMLElement = el("div", {cls: "hotbar-cd"});
        const keyLabel: HTMLElement = el("div", {cls: "hotbar-key", text: String(index + 1)});
        let root: HTMLElement;
        let cost: number = 0;
        if (slot && slot.kind === ActionBarSlot.Kind.Ability && slot.ability) {
            const def: AbilityDef = effectiveAbility(save, slot.ability);
            cost = def.manaCost;
            root = el("div", {cls: "hotbar-slot", title: tr(def.name) + "\n" + def.manaCost + " " + t("mana") + " · " + describeAbility(def)}, [
                abilityIconEl(slot.ability, SLOT_SIZE), shade, label, keyLabel,
                el("div", {cls: "hotbar-cost", text: String(def.manaCost)})
            ]);
        } else if (slot && slot.kind === ActionBarSlot.Kind.Item && slot.item) {
            const item: ItemKey = slot.item;
            const count: number = countItem(save, item);
            const icon: HTMLImageElement = iconImg(item);
            icon.style.width = SLOT_SIZE - 8 + "px";
            icon.style.height = SLOT_SIZE - 8 + "px";
            root = el("div", {cls: "hotbar-slot item" + (count === 0 ? " empty-stack" : ""), title: itemName(item) + " ×" + count + "\n" + itemDescription(item)}, [
                icon, shade, label, keyLabel,
                el("div", {cls: "hotbar-count", text: String(count)})
            ]);
        } else {
            root = el("div", {cls: "hotbar-slot empty", title: t("actionBarEmpty")}, [keyLabel]);
        }
        if (slot) {
            makeActionDraggable(root, slot, index);
            dropOutsideHandlers.set(root, () => {
                clearAction(this.save(), index);
                this.changed();
            });
            root.addEventListener("click", (e: MouseEvent) => {
                e.stopPropagation();
                if (!suppressClick) {
                    this.onUse(index);
                }
            });
        }
        // mousedown must not reach the game (it would also swing).
        root.addEventListener("mousedown", (e: MouseEvent) => e.stopPropagation());
        dropHandlers.set(root, (drag: ActionDrag) => {
            placeAction(this.save(), index, drag.slot, drag.fromIndex);
            this.changed();
        });
        return {slot: slot, root: root, shade: shade, label: label, cost: cost};
    }

    private changed(): void {
        this.signature = "";
        this.refresh();
        this.onEdit();
    }
}
