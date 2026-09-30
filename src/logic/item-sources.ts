import {t} from "../core/i18n";
import {FloorDef, FLOORS, LootEntry} from "../data/floors";
import {ITEMS, ItemKey} from "../data/items";

export enum ItemSourceKind {
    Shop = "shop",
    FloorLoot = "floor_loot"
}

export interface ItemSource {
    kind: ItemSourceKind;
    /** Floor number for FloorLoot. */
    floor?: number;
}

/** Where an item can be obtained, derived from the shop flag and the floor loot tables (so it never goes stale). */
export function itemSources(item: ItemKey): ItemSource[] {
    const sources: ItemSource[] = [];
    if (ITEMS[item].inShop) {
        sources.push({kind: ItemSourceKind.Shop});
    }
    for (const floor of FLOORS as FloorDef[]) {
        if (floor.loot.some((entry: LootEntry) => entry.item === item)) {
            sources.push({kind: ItemSourceKind.FloorLoot, floor: floor.floor});
        }
    }
    return sources;
}

export function describeItemSources(item: ItemKey): string {
    const sources: ItemSource[] = itemSources(item);
    if (sources.length === 0) {
        return t("sourceUnknown");
    }
    return sources.map((source: ItemSource) => source.kind === ItemSourceKind.Shop ? t("sourceShop") : t("sourceFloor", {floor: source.floor ?? 1})).join(" · ");
}
