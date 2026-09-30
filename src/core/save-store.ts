import {BuildingKey, BUILDINGS, ALL_BUILDINGS} from "../data/buildings";
import {EquipmentData, InventoryData, RunData} from "../data/dungeon-types";
import {ClassKey} from "../data/hero-classes";
import {EquipSlot, ItemKey} from "../data/items";
import {MissionKey} from "../data/missions";
import {MonsterKey} from "../data/monsters";
import {PerkKey} from "../data/perks";
import {Lang} from "./i18n";

export const SAVE_VERSION: number = 1;
const SAVE_KEY: string = "fantasy-game.save.v1";
const SETTINGS_KEY: string = "fantasy-game.settings.v1";

export interface HeroData {
    classKey: ClassKey;
    unlockedClasses: ClassKey[];
    level: number;
    /** Unspent experience. Only the Guild converts it into levels. */
    xp: number;
    gold: number;
    diamonds: number;
    equipment: EquipmentData;
}

export interface RecordsData {
    kills: number;
    armoredKills: number;
    bossKills: number;
    runs: number;
    deaths: number;
    victories: number;
    chestsOpened: number;
    beastsBefriended: number;
    playTime: number;
}

export interface SaveData {
    version: number;
    hero: HeroData;
    inventory: InventoryData;
    /** Items stored in the town bank (safe from expedition losses). */
    bank: InventoryData;
    unlockedBuildings: BuildingKey[];
    featPoints: number;
    perks: Partial<Record<PerkKey, number>>;
    deepestFloor: number;
    bossesDefeated: MonsterKey[];
    missionsClaimed: MissionKey[];
    records: RecordsData;
    /** New-game-plus level: monsters get stronger after each final victory. */
    challenge: number;
    /** The perk gold bonus is granted once per preparation. */
    expeditionBonusReady: boolean;
    arenaCleared: boolean;
    seenWelcome: boolean;
    nextUid: number;
    run: RunData | null;
}

export interface SettingsData {
    lang: Lang;
    master: number;
    music: number;
    sfx: number;
}

export function createNewSave(): SaveData {
    const equipment: EquipmentData = {
        [EquipSlot.Weapon]: 1,
        [EquipSlot.Armor]: 2,
        [EquipSlot.Shield]: null,
        [EquipSlot.Helmet]: null,
        [EquipSlot.Boots]: null,
        [EquipSlot.Accessory]: null
    };
    return {
        version: SAVE_VERSION,
        hero: {
            classKey: ClassKey.Novice,
            unlockedClasses: [ClassKey.Novice],
            level: 1,
            xp: 0,
            gold: 120,
            diamonds: 0,
            equipment: equipment
        },
        inventory: {
            stacks: {[ItemKey.PotionSmall]: 3, [ItemKey.EtherSmall]: 1},
            gear: [
                {uid: 1, key: ItemKey.WoodenSword, plus: 0},
                {uid: 2, key: ItemKey.ClothTunic, plus: 0}
            ]
        },
        bank: {stacks: {}, gear: []},
        unlockedBuildings: ALL_BUILDINGS.filter((key: BuildingKey) => BUILDINGS[key].startsUnlocked),
        featPoints: 0,
        perks: {},
        deepestFloor: 1,
        bossesDefeated: [],
        missionsClaimed: [],
        records: {kills: 0, armoredKills: 0, bossKills: 0, runs: 0, deaths: 0, victories: 0, chestsOpened: 0, beastsBefriended: 0, playTime: 0},
        challenge: 0,
        expeditionBonusReady: true,
        arenaCleared: false,
        seenWelcome: false,
        nextUid: 3,
        run: null
    };
}

function isSaveData(value: unknown): value is SaveData {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate: Partial<SaveData> = value as Partial<SaveData>;
    return candidate.version === SAVE_VERSION && typeof candidate.hero === "object" && typeof candidate.inventory === "object";
}

export function hasSave(): boolean {
    return loadSave() !== null;
}

export function loadSave(): SaveData | null {
    try {
        const raw: string | null = localStorage.getItem(SAVE_KEY);
        if (!raw) {
            return null;
        }
        const parsed: unknown = JSON.parse(raw);
        if (!isSaveData(parsed)) {
            return null;
        }
        // Fill fields that may be missing in older saves of the same version.
        const fresh: SaveData = createNewSave();
        const merged: SaveData = {...fresh, ...parsed, records: {...fresh.records, ...parsed.records}};
        // Buildings added after the save was made that start unlocked (e.g. the bank).
        for (const key of ALL_BUILDINGS) {
            if (BUILDINGS[key].startsUnlocked && !merged.unlockedBuildings.includes(key)) {
                merged.unlockedBuildings.push(key);
            }
        }
        return merged;
    } catch (error: unknown) {
        console.warn("Could not load save", error);
        return null;
    }
}

export function writeSave(data: SaveData): boolean {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch (error: unknown) {
        console.warn("Could not write save", error);
        return false;
    }
}

export function deleteSave(): void {
    try {
        localStorage.removeItem(SAVE_KEY);
    } catch (error: unknown) {
        console.warn("Could not delete save", error);
    }
}

export function defaultSettings(): SettingsData {
    return {lang: Lang.Es, master: 0.8, music: 0.6, sfx: 0.8};
}

export function loadSettings(): SettingsData {
    try {
        const raw: string | null = localStorage.getItem(SETTINGS_KEY);
        if (!raw) {
            return defaultSettings();
        }
        const parsed: Partial<SettingsData> = JSON.parse(raw) as Partial<SettingsData>;
        const settings: SettingsData = {...defaultSettings(), ...parsed};
        if (!(Object.values(Lang) as string[]).includes(settings.lang)) {
            settings.lang = Lang.Es;
        }
        return settings;
    } catch (error: unknown) {
        console.warn("Could not load settings", error);
        return defaultSettings();
    }
}

export function writeSettings(settings: SettingsData): void {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error: unknown) {
        console.warn("Could not write settings", error);
    }
}
