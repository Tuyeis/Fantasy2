import {defaultActionBar, SaveData} from "../core/save-store";
import {AbilityKey} from "../data/abilities";
import {ACTION_BAR_SIZE, ActionBarSlot} from "../data/action-bar";
import {ItemCategory, ItemDef, ItemKey, ITEMS} from "../data/items";
import {abilitySlots, knowsAbility} from "./talents";

/** Only consumables that heal or restore can go on the bar (potions, ethers, elixirs). */
export function isBarItem(key: ItemKey): boolean {
    const def: ItemDef = ITEMS[key];
    return def.category === ItemCategory.Potion && def.heal !== undefined;
}

function sameAction(a: ActionBarSlot | null, b: ActionBarSlot | null): boolean {
    return a !== null && b !== null && a.kind === b.kind && a.ability === b.ability && a.item === b.item;
}

/**
 * Keeps the bar consistent with what the hero knows, like WoW:
 * a newly learned ability goes to the first free slot once; forgotten abilities (respec, class change) leave the bar.
 * Abilities the player removed by hand stay off until they are learned again.
 */
export function syncActionBar(save: SaveData): (ActionBarSlot | null)[] {
    const saved: (ActionBarSlot | null)[] = save.hero.actionBar ?? defaultActionBar();
    const bar: (ActionBarSlot | null)[] = Array.from({length: ACTION_BAR_SIZE}, (_: unknown, i: number) => saved[i] ?? null);
    for (let i: number = 0; i < bar.length; i++) {
        const slot: ActionBarSlot | null = bar[i];
        if (slot && slot.kind === ActionBarSlot.Kind.Ability && (!slot.ability || !knowsAbility(save, slot.ability))) {
            bar[i] = null;
        }
    }
    const offered: AbilityKey[] = (save.hero.barOffered ?? []).filter((key: AbilityKey) => knowsAbility(save, key));
    for (const key of abilitySlots(save)) {
        if (!key || offered.includes(key)) {
            continue;
        }
        offered.push(key);
        const free: number = bar.findIndex((s: ActionBarSlot | null) => s === null);
        if (free >= 0 && !bar.some((s: ActionBarSlot | null) => s?.ability === key)) {
            bar[free] = {kind: ActionBarSlot.Kind.Ability, ability: key};
        }
    }
    save.hero.actionBar = bar;
    save.hero.barOffered = offered;
    return bar;
}

/** Drops an action on a slot. Coming from another slot swaps them; otherwise any copy elsewhere moves here. */
export function placeAction(save: SaveData, index: number, slot: ActionBarSlot, fromIndex: number | null): void {
    const bar: (ActionBarSlot | null)[] = syncActionBar(save);
    if (index < 0 || index >= bar.length) {
        return;
    }
    if (fromIndex !== null && fromIndex >= 0 && fromIndex < bar.length) {
        const previous: ActionBarSlot | null = bar[index];
        bar[index] = bar[fromIndex];
        bar[fromIndex] = previous;
        return;
    }
    for (let i: number = 0; i < bar.length; i++) {
        if (sameAction(bar[i], slot)) {
            bar[i] = null;
        }
    }
    bar[index] = {...slot};
}

export function clearAction(save: SaveData, index: number): void {
    const bar: (ActionBarSlot | null)[] = syncActionBar(save);
    if (index >= 0 && index < bar.length) {
        bar[index] = null;
    }
}
