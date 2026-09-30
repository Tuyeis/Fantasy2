import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, UiKey} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {EquipSlot, ItemCategory, ItemDef, ItemKey, ITEMS} from "../data/items";
import {StatBlock} from "../data/stat-block";
import {BAG_SLOTS, bagUsed} from "../logic/bank";
import {computeHeroStats, potionMultiplier} from "../logic/hero-stats";
import {equip, itemName, removeItem} from "../logic/inventory";
import {iconImg} from "../render/item-icons";
import {sameCell, StorageCell, storageCells, storageGrid} from "./storage-grid";
import {isBarItem} from "../logic/action-bar";
import {ActionBarSlot} from "../data/action-bar";
import {fail, gearDescription, itemDescription, tag, walletLine} from "./window-helpers";

export const SLOT_LABELS: Record<EquipSlot, UiKey> = {
    [EquipSlot.Weapon]: "slotWeapon",
    [EquipSlot.Armor]: "slotArmor",
    [EquipSlot.Shield]: "slotShield",
    [EquipSlot.Helmet]: "slotHelmet",
    [EquipSlot.Boots]: "slotBoots",
    [EquipSlot.Accessory]: "slotAccessory"
};

export interface InventoryOptions {
    inDungeon: boolean;
    onChange: () => void;
}

/** Heals the run HP/mana with a potion outside of combat. */
export function usePotionOutsideCombat(save: SaveData, key: ItemKey): boolean {
    const def: ItemDef = ITEMS[key];
    if (!save.run || !def.heal || (!def.heal.hp && !def.heal.mana)) {
        return false;
    }
    const max: StatBlock = computeHeroStats(save);
    const hpFull: boolean = save.run.hp >= max.hp;
    const manaFull: boolean = save.run.mana >= max.mana;
    if ((def.heal.hp && !def.heal.mana && hpFull) || (def.heal.mana && !def.heal.hp && manaFull) || (hpFull && manaFull)) {
        return false;
    }
    if (!removeItem(save, key, 1)) {
        return false;
    }
    const mult: number = potionMultiplier(save);
    save.run.hp = Math.min(max.hp, save.run.hp + Math.round((def.heal.hp ?? 0) * mult));
    save.run.mana = Math.min(max.mana, save.run.mana + Math.round((def.heal.mana ?? 0) * mult));
    return true;
}

/** Keeps the run's current HP/mana within the (possibly lower) maximum after equipment changes. */
export function clampRunToStats(save: SaveData): void {
    if (save.run) {
        const max: StatBlock = computeHeroStats(save);
        save.run.hp = Math.min(save.run.hp, max.hp);
        save.run.mana = Math.min(save.run.mana, max.mana);
    }
}

/** The bag: a WoW-style grid of limited slots. Equipment and stats live in the character window. */
export function openInventory(game: Game, opts: InventoryOptions): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("bag"), cls: "window-bag"});
    let selected: StorageCell | null = null;

    const render: () => void = () => {
        const stats: StatBlock = computeHeroStats(save);
        const cells: StorageCell[] = storageCells(save, save.inventory, true);
        // Re-resolve the selection to this render's cell (null when that slot is gone).
        const previous: StorageCell | null = selected;
        selected = previous ? cells.find((c: StorageCell) => sameCell(c, previous)) ?? null : null;
        const summary: HTMLElement = walletLine(save, [
            save.run ? tag(t("hp") + " " + save.run.hp + "/" + stats.hp, "bad") : null,
            save.run ? tag(t("mana") + " " + save.run.mana + "/" + stats.mana) : null
        ]);
        const used: number = bagUsed(save);
        // Potions can be dragged onto the action bar.
        const grid: HTMLElement = storageGrid(cells, BAG_SLOTS, (cell: StorageCell) => {
            selected = cell;
            render();
        }, selected, (cell: StorageCell) => !cell.gear && isBarItem(cell.key) ? {kind: ActionBarSlot.Kind.Item, item: cell.key} : null);
        const footer: HTMLElement = el("div", {cls: "bag-footer" + (used >= BAG_SLOTS ? " full" : ""), text: t("slotsUsed", {used: used, max: BAG_SLOTS})});
        win.body.replaceChildren(summary, grid, footer, detail(selected));
    };

    const detail: (cell: StorageCell | null) => HTMLElement = (cell: StorageCell | null) => {
        if (!cell) {
            return el("div", {cls: "bag-detail muted", text: t("selectItemHint")});
        }
        const def: ItemDef = ITEMS[cell.key];
        const actions: HTMLElement[] = [];
        if (cell.gear) {
            const uid: number = cell.gear.uid;
            actions.push(button(t("equip"), () => {
                equip(save, uid);
                clampRunToStats(save);
                game.audio.play(Sfx.Pickup);
                changed();
            }, {cls: "btn-small btn-primary"}));
        } else if (def.category === ItemCategory.Potion && opts.inDungeon) {
            actions.push(button(t("use"), () => {
                if (usePotionOutsideCombat(save, cell.key)) {
                    game.audio.play(Sfx.Heal);
                    game.ui.toast(t("usedItem", {item: itemName(cell.key)}), ToastKind.Good);
                    changed();
                } else {
                    fail(game, t("cannotUseHere"));
                }
            }, {cls: "btn-small"}));
        }
        return el("div", {cls: "bag-detail"}, [
            iconImg(cell.key),
            el("div", {cls: "row-main"}, [
                el("div", {cls: "row-title", text: itemName(cell.key, cell.gear ? cell.gear.plus : 0) + (cell.count > 1 ? " ×" + cell.count : "")}),
                el("div", {cls: "row-sub", text: cell.gear ? gearDescription(cell.gear) : itemDescription(cell.key)})
            ]),
            el("div", {cls: "row-actions"}, actions)
        ]);
    };

    const changed: () => void = () => {
        game.saveGame();
        opts.onChange();
        render();
    };
    render();
}
