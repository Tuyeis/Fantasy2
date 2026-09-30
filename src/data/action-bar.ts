import {AbilityKey} from "./abilities";
import {ItemKey} from "./items";

/** WoW-style action bar: keys 1-8, each slot holds an ability or a consumable item. */
export const ACTION_BAR_SIZE: number = 8;

export interface ActionBarSlot {
    kind: ActionBarSlot.Kind;
    ability?: AbilityKey;
    item?: ItemKey;
}

export namespace ActionBarSlot {
    export enum Kind {
        Ability = "ability",
        Item = "item"
    }
}

/** Payload of a drag: the action, plus the bar slot it comes from when it is dragged off the bar. */
export interface ActionDrag {
    slot: ActionBarSlot;
    fromIndex: number | null;
}
