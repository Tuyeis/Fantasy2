import {chance, pick, shuffle, weightedPick} from "../core/rng";
import {SaveData} from "../core/save-store";
import {Direction, DungeonEventKey, FloorLayout, MonsterSpawn, RoomData, RoomType} from "../data/dungeon-types";
import {FloorDef, floorDef} from "../data/floors";
import {MonsterKey} from "../data/monsters";
import {PerkKey} from "../data/perks";
import {perkRank} from "./hero-stats";
import {nextLockedBuilding} from "./progression";

interface Cell {
    x: number;
    y: number;
}

interface Neighbour extends Cell {
    /** Direction from the original cell to this one. */
    dir: Direction;
}

export const DELTA: Record<Direction, {dx: number; dy: number}> = {
    [Direction.North]: {dx: 0, dy: -1},
    [Direction.South]: {dx: 0, dy: 1},
    [Direction.East]: {dx: 1, dy: 0},
    [Direction.West]: {dx: -1, dy: 0}
};

export const OPPOSITE: Record<Direction, Direction> = {
    [Direction.North]: Direction.South,
    [Direction.South]: Direction.North,
    [Direction.East]: Direction.West,
    [Direction.West]: Direction.East
};

/** Order in which neighbours are listed (it feeds the random picks, so it is kept stable). */
const NEIGHBOUR_ORDER: Direction[] = [Direction.East, Direction.West, Direction.South, Direction.North];

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

function rollCrossroads(): RoomType[] {
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

/** Opens a door from `a` towards its neighbour `b`, and the matching door back. */
function connect(layout: FloorLayout, a: Cell, b: Neighbour): void {
    (roomAt(layout, a.x, a.y) as RoomData).doors[b.dir] = true;
    (roomAt(layout, b.x, b.y) as RoomData).doors[OPPOSITE[b.dir]] = true;
}

function neighbours(size: number, c: Cell): Neighbour[] {
    return NEIGHBOUR_ORDER
        .map((dir: Direction) => ({x: c.x + DELTA[dir].dx, y: c.y + DELTA[dir].dy, dir: dir}))
        .filter((n: Neighbour) => n.x >= 0 && n.y >= 0 && n.x < size && n.y < size);
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
        const options: Neighbour[] = neighbours(size, current).filter((n: Neighbour) => !visited.has(n.x + "," + n.y));
        if (options.length === 0) {
            stack.pop();
            continue;
        }
        const next: Neighbour = pick(options);
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
    quota.push(...new Array<RoomType>(Math.max(1, Math.round(m * 0.14))).fill(RoomType.Crossroads));
    quota.push(...new Array<RoomType>(Math.max(1, Math.round(m * 0.14))).fill(RoomType.Treasure));
    quota.push(...new Array<RoomType>(Math.max(1, Math.round(m * 0.14))).fill(RoomType.Event));
    quota.push(...new Array<RoomType>(Math.max(1, Math.round(m * 0.09))).fill(RoomType.Rest));
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
