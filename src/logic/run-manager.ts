import {SaveData} from "../core/save-store";
import {Direction, RoomData, RunData} from "../data/dungeon-types";
import {LAST_FLOOR} from "../data/floors";
import {StatBlock} from "../data/stat-block";
import {computeHeroStats} from "./hero-stats";
import {cloneEquipment, cloneInventory} from "./inventory";
import {generateFloor, roomAt} from "./dungeon-generator";

export function startRun(save: SaveData, startFloor: number): void {
    const floor: number = Math.max(1, Math.min(save.deepestFloor, startFloor));
    const layoutPlaceholder: RunData["layout"] = generateFloor(save, floor);
    save.run = {
        classKey: save.hero.classKey,
        startFloor: floor,
        floor: floor,
        layout: layoutPlaceholder,
        roomX: layoutPlaceholder.startX,
        roomY: layoutPlaceholder.startY,
        prevRoomX: layoutPlaceholder.startX,
        prevRoomY: layoutPlaceholder.startY,
        entryDir: null,
        hp: 0,
        mana: 0,
        companions: [],
        buffs: [],
        snapshot: {
            gold: save.hero.gold,
            inventory: cloneInventory(save.inventory),
            equipment: cloneEquipment(save.hero.equipment)
        },
        rewardCombats: 0,
        xpEarned: 0,
        goldEarned: 0,
        kills: 0,
        nextDropId: 1,
        bossDefeated: false
    };
    const max: StatBlock = computeHeroStats(save);
    save.run.hp = max.hp;
    save.run.mana = max.mana;
    save.records.runs++;
    save.expeditionBonusReady = true;
}

/** Moves the run to a new floor. Returns true if this floor was never reached before. */
export function enterFloor(save: SaveData, floor: number): boolean {
    const run: RunData = save.run as RunData;
    run.floor = Math.min(LAST_FLOOR, floor);
    run.layout = generateFloor(save, run.floor);
    run.roomX = run.layout.startX;
    run.roomY = run.layout.startY;
    run.prevRoomX = run.roomX;
    run.prevRoomY = run.roomY;
    run.entryDir = null;
    run.rewardCombats = 0;
    run.bossDefeated = false;
    const isNew: boolean = run.floor > save.deepestFloor;
    save.deepestFloor = Math.max(save.deepestFloor, run.floor);
    return isNew;
}

export function currentRoom(save: SaveData): RoomData {
    const run: RunData = save.run as RunData;
    return roomAt(run.layout, run.roomX, run.roomY) as RoomData;
}

export function directionDelta(dir: Direction): {dx: number; dy: number} {
    switch (dir) {
        case Direction.North:
            return {dx: 0, dy: -1};
        case Direction.South:
            return {dx: 0, dy: 1};
        case Direction.East:
            return {dx: 1, dy: 0};
        case Direction.West:
            return {dx: -1, dy: 0};
    }
}

export function oppositeDirection(dir: Direction): Direction {
    switch (dir) {
        case Direction.North:
            return Direction.South;
        case Direction.South:
            return Direction.North;
        case Direction.East:
            return Direction.West;
        case Direction.West:
            return Direction.East;
    }
}

/** Moves through a door. The hero appears at the opposite door of the new room. */
export function moveThroughDoor(save: SaveData, dir: Direction): RoomData | null {
    const run: RunData = save.run as RunData;
    const delta: {dx: number; dy: number} = directionDelta(dir);
    const target: RoomData | null = roomAt(run.layout, run.roomX + delta.dx, run.roomY + delta.dy);
    if (!target) {
        return null;
    }
    run.prevRoomX = run.roomX;
    run.prevRoomY = run.roomY;
    run.roomX = target.x;
    run.roomY = target.y;
    run.entryDir = oppositeDirection(dir);
    return target;
}

/** Death / abandon: the run's loot is lost (snapshot restored), XP and levels are kept. */
export function endRunDefeat(save: SaveData): void {
    const run: RunData | null = save.run;
    if (!run) {
        return;
    }
    save.hero.gold = run.snapshot.gold;
    save.inventory = cloneInventory(run.snapshot.inventory);
    save.hero.equipment = cloneEquipment(run.snapshot.equipment);
    save.records.deaths++;
    save.run = null;
}

/** Voluntary return after a boss: everything is kept. */
export function endRunReturn(save: SaveData): void {
    save.run = null;
}
