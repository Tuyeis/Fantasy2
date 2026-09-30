import {ClassKey} from "./hero-classes";
import {CompanionKey} from "./companions";
import {EquipSlot, ItemKey} from "./items";
import {MonsterKey} from "./monsters";

export enum RoomType {
    Start = "start",
    Combat = "combat",
    Treasure = "treasure",
    Event = "event",
    Rest = "rest",
    Crossroads = "crossroads",
    Boss = "boss"
}

export enum DungeonEventKey {
    Blueprint = "blueprint",
    ClassOffer = "class_offer",
    Companion = "companion",
    Shrine = "shrine",
    Wanderer = "wanderer",
    Trap = "trap"
}

export enum RunBuffKey {
    Atk = "atk",
    Matk = "matk",
    Def = "def",
    Hp = "hp",
    Crit = "crit"
}

export enum Direction {
    North = "n",
    East = "e",
    South = "s",
    West = "w"
}

export interface MonsterSpawn {
    key: MonsterKey;
    armored: boolean;
}

export interface DropData {
    id: number;
    x: number;
    y: number;
    gold: number;
    item: ItemKey | null;
}

export interface RoomDoors {
    n: boolean;
    e: boolean;
    s: boolean;
    w: boolean;
}

export interface RoomData {
    x: number;
    y: number;
    type: RoomType;
    doors: RoomDoors;
    visited: boolean;
    /** Combat won / event resolved / crossroads resolved. */
    cleared: boolean;
    monster: MonsterSpawn | null;
    event: DungeonEventKey | null;
    /** Three signposted choices of a crossroads room. */
    crossOptions: RoomType[] | null;
    /** For a resolved crossroads: which path was taken. */
    chosen: RoomType | null;
    /** Chest opened / fire used / event consumed. */
    used: boolean;
    drops: DropData[];
}

export interface FloorLayout {
    floor: number;
    size: number;
    rooms: RoomData[];
    startX: number;
    startY: number;
    bossX: number;
    bossY: number;
}

export interface GearInstance {
    uid: number;
    key: ItemKey;
    plus: number;
}

export interface InventoryData {
    stacks: Partial<Record<ItemKey, number>>;
    gear: GearInstance[];
}

export type EquipmentData = Record<EquipSlot, number | null>;

export interface RunSnapshot {
    gold: number;
    inventory: InventoryData;
    equipment: EquipmentData;
}

export interface RunData {
    classKey: ClassKey;
    startFloor: number;
    floor: number;
    layout: FloorLayout;
    roomX: number;
    roomY: number;
    prevRoomX: number;
    prevRoomY: number;
    /** Door through which the hero entered the current room (null = start / stairs). */
    entryDir: Direction | null;
    hp: number;
    mana: number;
    companions: CompanionKey[];
    buffs: RunBuffKey[];
    snapshot: RunSnapshot;
    /** Won combats on the current floor that granted rewards. */
    rewardCombats: number;
    xpEarned: number;
    goldEarned: number;
    kills: number;
    nextDropId: number;
    bossDefeated: boolean;
}
