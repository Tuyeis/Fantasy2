import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {pick, randInt} from "../core/rng";
import {SaveData} from "../core/save-store";
import {BuildingKey, BUILDINGS} from "../data/buildings";
import {CompanionKey, COMPANIONS, MAX_COMPANIONS} from "../data/companions";
import {DungeonEventKey, RoomData, RunBuffKey, RunData} from "../data/dungeon-types";
import {ADVANCED_CLASSES, ClassKey, CLASSES} from "../data/hero-classes";
import {ItemKey} from "../data/items";
import {StatBlock} from "../data/stat-block";
import {computeHeroStats} from "../logic/hero-stats";
import {addItem, itemName} from "../logic/inventory";
import {nextLockedBuilding, unlockBuilding, unlockClass} from "../logic/progression";
import {buffLabel} from "./world-helpers";

export interface EventResult {
    title: string;
    text: string;
    /** Big positive moment (blueprint, class) → special sound. */
    special: boolean;
    /** The companion that joined, if any. */
    companion?: CompanionKey;
}

/** Companion that waits in a companion-event room (stable per room). */
export function roomCompanion(save: SaveData, room: RoomData): CompanionKey {
    const all: CompanionKey[] = Object.values(CompanionKey) as CompanionKey[];
    const owned: CompanionKey[] = save.run?.companions ?? [];
    const free: CompanionKey[] = all.filter((c: CompanionKey) => !owned.includes(c));
    const list: CompanionKey[] = free.length > 0 ? free : all;
    return list[(room.x * 7 + room.y * 13 + (save.run?.floor ?? 1)) % list.length];
}

/** Applies a dungeon event to the save and returns the text to show. */
export function resolveEvent(game: Game, room: RoomData, event: DungeonEventKey): EventResult {
    const save: SaveData = game.save as SaveData;
    const run: RunData = save.run as RunData;
    room.used = true;
    room.cleared = true;
    switch (event) {
        case DungeonEventKey.Blueprint: {
            const building: BuildingKey | null = nextLockedBuilding(save);
            if (!building) {
                const gold: number = 80 * run.floor;
                save.hero.gold += gold;
                run.goldEarned += gold;
                return {title: t("eventWandererTitle"), text: t("eventWandererText", {items: gold + " " + t("gold")}), special: false};
            }
            unlockBuilding(save, building);
            return {title: t("eventBlueprintTitle"), text: t("eventBlueprintText", {building: tr(BUILDINGS[building].name)}), special: true};
        }
        case DungeonEventKey.ClassOffer: {
            const options: ClassKey[] = ADVANCED_CLASSES.filter((c: ClassKey) => c !== save.hero.classKey);
            const chosen: ClassKey = pick(options);
            const before: StatBlock = computeHeroStats(save);
            const hpRatio: number = run.hp / before.hp;
            const manaRatio: number = run.mana / Math.max(1, before.mana);
            save.hero.classKey = chosen;
            unlockClass(save, chosen);
            const after: StatBlock = computeHeroStats(save);
            run.hp = Math.max(1, Math.round(after.hp * hpRatio));
            run.mana = Math.round(after.mana * manaRatio);
            return {title: t("eventClassTitle"), text: t("eventClassText", {cls: tr(CLASSES[chosen].name)}), special: true};
        }
        case DungeonEventKey.Companion: {
            const companion: CompanionKey = roomCompanion(save, room);
            const name: string = tr(COMPANIONS[companion].name);
            if (run.companions.length >= MAX_COMPANIONS || run.companions.includes(companion)) {
                addItem(save, ItemKey.PotionMedium, 1);
                return {title: t("eventCompanionTitle"), text: t("eventCompanionFull", {beast: name}), special: false};
            }
            run.companions.push(companion);
            save.records.beastsBefriended++;
            return {title: t("eventCompanionTitle"), text: t("eventCompanionText", {beast: name}) + " " + tr(COMPANIONS[companion].desc), special: true, companion: companion};
        }
        case DungeonEventKey.Shrine: {
            const all: RunBuffKey[] = Object.values(RunBuffKey) as RunBuffKey[];
            const free: RunBuffKey[] = all.filter((b: RunBuffKey) => !run.buffs.includes(b));
            const buff: RunBuffKey = pick(free.length > 0 ? free : all);
            const before: StatBlock = computeHeroStats(save);
            if (!run.buffs.includes(buff)) {
                run.buffs.push(buff);
            }
            const after: StatBlock = computeHeroStats(save);
            run.hp = Math.min(after.hp, run.hp + Math.max(0, after.hp - before.hp));
            run.mana = Math.min(after.mana, run.mana + Math.round(after.mana * 0.3));
            return {title: t("eventShrineTitle"), text: t("eventShrineText", {buff: buffLabel(buff)}), special: false};
        }
        case DungeonEventKey.Wanderer: {
            const potion: ItemKey = run.floor >= 3 ? ItemKey.PotionLarge : run.floor === 2 ? ItemKey.PotionMedium : ItemKey.PotionSmall;
            const ether: ItemKey = run.floor >= 3 ? ItemKey.EtherLarge : ItemKey.EtherSmall;
            addItem(save, potion, 2);
            addItem(save, ether, 1);
            return {title: t("eventWandererTitle"), text: t("eventWandererText", {items: "2× " + itemName(potion) + ", " + itemName(ether)}), special: false};
        }
        case DungeonEventKey.Trap: {
            const max: StatBlock = computeHeroStats(save);
            const damage: number = Math.round(max.hp * (0.1 + randInt(0, 5) / 100));
            run.hp = Math.max(1, run.hp - damage);
            return {title: t("eventTrapTitle"), text: t("eventTrapText", {hp: damage}), special: false};
        }
    }
}
