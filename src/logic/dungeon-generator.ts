import {chance, pick, shuffle, weightedPick} from "../core/rng";
import {SaveData} from "../core/save-store";
import {DungeonEventKey, FloorLayout, MonsterSpawn, RoomData, RoomType} from "../data/dungeon-types";
import {FloorDef, floorDef} from "../data/floors";
import {MonsterKey} from "../data/monsters";
import {PerkKey} from "../data/perks";
import {perkRank} from "./hero-stats";
import {nextLockedBuilding} from "./progression";

interface Cell {
    x: number;
    y: number;
}

export function roomAt(layout: FloorLayout, x: number, y: number): RoomData | null {
    if (x < 0 || y < 0 || x >= layout.size || y >= layout.size) {
        return null;
    }
    return layout.rooms[y * layout.size + x];
}

export function rollMonster(floor: number, armoredBonus: number = 0): MonsterSpawn {
    const def: FloorDef = floorDef(floor);
    const key: MonsterKey = pick(def.pool);
    return {key: key, armored: chance(def.armoredChance + armoredBonus)};
}

export function rollEvent(save: SaveData, layout: FloorLayout | null): DungeonEventKey {
    const blueprintAvailable: boolean = nextLockedBuilding(save) !== null
        && (layout === null || !layout.rooms.some((r: RoomData) => r.event === DungeonEventKey.Blueprint));
    const companionsFull: boolean = (save.run?.companions.length ?? 0) >= 3;
    const weights: [DungeonEventKey, number][] = [
        [DungeonEventKey.Blueprint, blueprintAvailable ? 9 : 0],
        [DungeonEventKey.ClassOffer, 6],
        [DungeonEventKey.Companion, companionsFull ? 4 : 18 + 8 * perkRank(save, PerkKey.BeastTamer)],
        [DungeonEventKey.Shrine, 26],
        [DungeonEventKey.Wanderer, 22],
        [DungeonEventKey.Trap, 13]
    ];
    return weightedPick(weights, (w: [DungeonEventKey, number]) => w[1])[0];
}

export function rollCrossroads(): RoomType[] {
    const others: RoomType[] = shuffle([RoomType.Treasure, RoomType.Rest, RoomType.Event, RoomType.Combat]).slice(0, 2);
    return shuffle([RoomType.Combat, ...others]);
}

function emptyRoom(x: number, y: number): RoomData {
    return {
        x: x, y: y, type: RoomType.Combat,
        doors: {n: false, e: false, s: false, w: false},
        visited: false, cleared: false, monster: null, event: null,
        crossOptions: null, chosen: null, used: false, drops: []
    };
}

function connect(layout: FloorLayout, a: Cell, b: Cell): void {
    const roomA: RoomData = roomAt(layout, a.x, a.y) as RoomData;
    const roomB: RoomData = roomAt(layout, b.x, b.y) as RoomData;
    if (b.x === a.x + 1) {
        roomA.doors.e = true;
        roomB.doors.w = true;
    } else if (b.x === a.x - 1) {
        roomA.doors.w = true;
        roomB.doors.e = true;
    } else if (b.y === a.y + 1) {
        roomA.doors.s = true;
        roomB.doors.n = true;
    } else if (b.y === a.y - 1) {
        roomA.doors.n = true;
        roomB.doors.s = true;
    }
}

function neighbours(size: number, c: Cell): Cell[] {
    const list: Cell[] = [{x: c.x + 1, y: c.y}, {x: c.x - 1, y: c.y}, {x: c.x, y: c.y + 1}, {x: c.x, y: c.y - 1}];
    return list.filter((n: Cell) => n.x >= 0 && n.y >= 0 && n.x < size && n.y < size);
}

/** Builds a floor: spanning tree of doors + a few loops, typed rooms, start bottom-left and boss top-right. */
export function generateFloor(save: SaveData, floor: number): FloorLayout {
    const def: FloorDef = floorDef(floor);
    const size: number = def.size;
    const layout: FloorLayout = {
        floor: floor, size: size, rooms: [],
        startX: 0, startY: size - 1, bossX: size - 1, bossY: 0
    };
    for (let y: number = 0; y < size; y++) {
        for (let x: number = 0; x < size; x++) {
            layout.rooms.push(emptyRoom(x, y));
        }
    }

    // Randomised DFS spanning tree.
    const visited: Set<string> = new Set<string>();
    const stack: Cell[] = [{x: layout.startX, y: layout.startY}];
    visited.add(layout.startX + "," + layout.startY);
    while (stack.length > 0) {
        const current: Cell = stack[stack.length - 1];
        const options: Cell[] = neighbours(size, current).filter((n: Cell) => !visited.has(n.x + "," + n.y));
        if (options.length === 0) {
            stack.pop();
            continue;
        }
        const next: Cell = pick(options);
        connect(layout, current, next);
        visited.add(next.x + "," + next.y);
        stack.push(next);
    }
    // Extra loops (never into the boss room, it keeps a single entrance feel).
    for (const room of layout.rooms) {
        for (const n of neighbours(size, room)) {
            const isBoss: boolean = (n.x === layout.bossX && n.y === layout.bossY) || (room.x === layout.bossX && room.y === layout.bossY);
            if (!isBoss && chance(0.18)) {
                connect(layout, room, n);
            }
        }
    }

    // Room types.
    const start: RoomData = roomAt(layout, layout.startX, layout.startY) as RoomData;
    start.type = RoomType.Start;
    start.cleared = true;
    const boss: RoomData = roomAt(layout, layout.bossX, layout.bossY) as RoomData;
    boss.type = RoomType.Boss;
    boss.monster = {key: def.boss, armored: false};

    const others: RoomData[] = shuffle(layout.rooms.filter((r: RoomData) => r.type !== RoomType.Start && r.type !== RoomType.Boss));
    const m: number = others.length;
    const quota: RoomType[] = [];
    const crossroads: number = Math.max(1, Math.round(m * 0.14));
    const treasure: number = Math.max(1, Math.round(m * 0.14));
    const events: number = Math.max(1, Math.round(m * 0.14));
    const rests: number = Math.max(1, Math.round(m * 0.09));
    for (let i: number = 0; i < crossroads; i++) {
        quota.push(RoomType.Crossroads);
    }
    for (let i: number = 0; i < treasure; i++) {
        quota.push(RoomType.Treasure);
    }
    for (let i: number = 0; i < events; i++) {
        quota.push(RoomType.Event);
    }
    for (let i: number = 0; i < rests; i++) {
        quota.push(RoomType.Rest);
    }
    while (quota.length < m) {
        quota.push(RoomType.Combat);
    }
    others.forEach((room: RoomData, index: number) => {
        room.type = quota[index];
        if (room.type === RoomType.Combat) {
            room.monster = rollMonster(floor);
        } else if (room.type === RoomType.Event) {
            room.event = rollEvent(save, layout);
        } else if (room.type === RoomType.Crossroads) {
            room.crossOptions = rollCrossroads();
        }
    });
    start.visited = true;
    return layout;
}
