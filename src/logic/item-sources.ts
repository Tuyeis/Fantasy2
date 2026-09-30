import {t} from "../core/i18n";
import {FloorDef, FLOORS, LootEntry} from "../data/floors";
import {ITEMS, ItemKey} from "../data/items";

/** Where an item can be obtained, derived from the shop flag and the floor loot tables (so it never goes stale). */
export function describeItemSources(item: ItemKey): string {
    const sources: string[] = ITEMS[item].inShop ? [t("sourceShop")] : [];
    for (const floor of FLOORS as FloorDef[]) {
        if (floor.loot.some((entry: LootEntry) => entry.item === item)) {
            sources.push(t("sourceFloor", {floor: floor.floor}));
        }
    }
    return sources.length > 0 ? sources.join(" · ") : t("sourceUnknown");
}
