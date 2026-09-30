import {ALL_BUILDINGS, BuildingDef, BuildingKey, BUILDINGS} from "../data/buildings";
import {ClassKey, HatStyle, HeroLook, WeaponStyle, EarStyle, TailStyle} from "../data/hero-classes";
import {hash} from "../render/draw-utils";

export const TOWN_W: number = 48;
export const TOWN_H: number = 36;
export const TILE: number = 32;

export enum TownTile {
    Grass = "grass",
    Path = "path",
    Plaza = "plaza",
    Water = "water"
}

export enum DecorKind {
    Tree = "tree",
    Bush = "bush",
    FlowerBush = "flower_bush",
    Lamp = "lamp"
}

export interface TownDecor {
    kind: DecorKind;
    x: number;
    y: number;
    variant: number;
}

export interface TownNpc {
    building: BuildingKey;
    x: number;
    y: number;
    look: HeroLook;
    /** Painted puppet of this villager (a class puppet); `look` is the procedural fallback. */
    puppetClass: ClassKey;
    facing: number;
}

export interface TownMap {
    tiles: TownTile[];
    decor: TownDecor[];
    npcs: TownNpc[];
    fountainX: number;
    fountainY: number;
}

export const PLAZA_X: number = 24;
export const PLAZA_Y: number = 16;

/** World position right in front of a building's door. */
export function doorPoint(def: BuildingDef): {x: number; y: number} {
    return {x: (def.tx + def.tw / 2) * TILE, y: (def.ty + def.th) * TILE + 14};
}

function npcLook(skin: string, hair: string, outfit: string, dark: string, accent: string, hat: HatStyle, weapon: WeaponStyle, extra: Partial<HeroLook> = {}): HeroLook {
    return {skin: skin, hair: hair, outfit: outfit, outfitDark: dark, accent: accent, hat: hat, weapon: weapon, ears: EarStyle.Human, tail: TailStyle.None, cape: null, shield: false, ...extra};
}

/** Which class puppet stands in front of each building (the villagers are adventurers of those classes). */
const NPC_CLASSES: Partial<Record<BuildingKey, ClassKey>> = {
    [BuildingKey.Shop]: ClassKey.Cat,
    [BuildingKey.Guild]: ClassKey.Knight,
    [BuildingKey.Forge]: ClassKey.Wukong,
    [BuildingKey.ClassLibrary]: ClassKey.Mage,
    [BuildingKey.Coliseum]: ClassKey.Swordsman,
    [BuildingKey.Portal]: ClassKey.DarkElf
};

const NPC_LOOKS: Partial<Record<BuildingKey, HeroLook>> = {
    [BuildingKey.Shop]: npcLook("#e0ac69", "#8d5524", "#e8590c", "#8a3b0a", "#fff4e6", HatStyle.Headband, WeaponStyle.Dagger),
    [BuildingKey.Guild]: npcLook("#c68642", "#dee2e6", "#1864ab", "#0b3b6b", "#fcc419", HatStyle.None, WeaponStyle.Sword, {cape: "#1c7ed6"}),
    [BuildingKey.Forge]: npcLook("#f1c27d", "#3b2a1a", "#495057", "#212529", "#ff922b", HatStyle.Headband, WeaponStyle.Pole),
    [BuildingKey.ClassLibrary]: npcLook("#f8d7b5", "#e9ecef", "#7048e8", "#43269e", "#ffd43b", HatStyle.WizardHat, WeaponStyle.Staff, {ears: EarStyle.Elf}),
    [BuildingKey.Coliseum]: npcLook("#8d5524", "#212529", "#b08900", "#6b5300", "#e03131", HatStyle.Helmet, WeaponStyle.Sword, {shield: true}),
    [BuildingKey.Portal]: npcLook("#f1e3d3", "#adb5bd", "#343a40", "#1e2124", "#b197fc", HatStyle.Hood, WeaponStyle.Staff)
};

export function buildTownMap(): TownMap {
    const tiles: TownTile[] = new Array<TownTile>(TOWN_W * TOWN_H).fill(TownTile.Grass);
    const set: (x: number, y: number, tile: TownTile) => void = (x: number, y: number, tile: TownTile) => {
        if (x >= 0 && y >= 0 && x < TOWN_W && y < TOWN_H) {
            tiles[y * TOWN_W + x] = tile;
        }
    };
    const get: (x: number, y: number) => TownTile = (x: number, y: number) => tiles[y * TOWN_W + x];

    // Pond (west side).
    for (let y: number = 12; y < 20; y++) {
        for (let x: number = 2; x < 8; x++) {
            const dx: number = (x + 0.5 - 4.8) / 2.6;
            const dy: number = (y + 0.5 - 15.8) / 3.2;
            if (dx * dx + dy * dy < 1 + (hash(x, y) - 0.5) * 0.25) {
                set(x, y, TownTile.Water);
            }
        }
    }

    // Paths: from each door one tile outwards, then horizontally to the plaza column, then to the plaza.
    const hLine: (x0: number, x1: number, y: number) => void = (x0: number, x1: number, y: number) => {
        for (let x: number = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
            set(x, y, TownTile.Path);
            set(x, y + 1, TownTile.Path);
        }
    };
    const vLine: (x: number, y0: number, y1: number) => void = (x: number, y0: number, y1: number) => {
        for (let y: number = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
            set(x - 1, y, TownTile.Path);
            set(x, y, TownTile.Path);
        }
    };
    for (const key of ALL_BUILDINGS) {
        const def: BuildingDef = BUILDINGS[key];
        const doorX: number = Math.floor(def.tx + def.tw / 2);
        const doorY: number = def.ty + def.th;
        vLine(doorX, doorY, doorY + 1);
        hLine(doorX - 1, PLAZA_X, doorY + 1);
        vLine(PLAZA_X, doorY + 1, PLAZA_Y);
    }

    // No paved plaza for now: the paths simply meet at a dirt crossroads in the centre.

    const insideBuilding: (x: number, y: number, margin: number) => boolean = (x: number, y: number, margin: number) => ALL_BUILDINGS.some((key: BuildingKey) => {
        const def: BuildingDef = BUILDINGS[key];
        return x >= def.tx - margin && x < def.tx + def.tw + margin && y >= def.ty - margin - 1 && y < def.ty + def.th + margin + 1;
    });

    const decor: TownDecor[] = [];
    // Border forest.
    for (let x: number = 0; x < TOWN_W; x += 1.5) {
        for (const y of [0.6, 1.8, TOWN_H - 0.4]) {
            decor.push({kind: DecorKind.Tree, x: (x + hash(Math.floor(x * 2), Math.floor(y)) * 0.6) * TILE, y: y * TILE, variant: hash(x, y, 3)});
        }
    }
    for (let y: number = 3; y < TOWN_H - 1; y += 1.5) {
        for (const x of [0.6, 1.8, TOWN_W - 1.8, TOWN_W - 0.6]) {
            decor.push({kind: DecorKind.Tree, x: x * TILE, y: (y + hash(Math.floor(x), Math.floor(y * 2)) * 0.5) * TILE, variant: hash(x, y, 5)});
        }
    }
    // Scattered trees / bushes.
    for (let y: number = 3; y < TOWN_H - 2; y++) {
        for (let x: number = 3; x < TOWN_W - 3; x++) {
            if (get(x, y) !== TownTile.Grass || insideBuilding(x, y, 1)) {
                continue;
            }
            const nearPath: boolean = [[1, 0], [-1, 0], [0, 1], [0, -1]].some((d: number[]) => {
                const nx: number = x + d[0];
                const ny: number = y + d[1];
                return nx >= 0 && ny >= 0 && nx < TOWN_W && ny < TOWN_H && get(nx, ny) !== TownTile.Grass;
            });
            if (nearPath) {
                continue;
            }
            const r: number = hash(x, y, 11);
            if (r < 0.045) {
                decor.push({kind: DecorKind.Tree, x: (x + 0.5) * TILE, y: (y + 0.8) * TILE, variant: hash(x, y, 2)});
            } else if (r < 0.075) {
                decor.push({kind: hash(x, y, 7) > 0.5 ? DecorKind.FlowerBush : DecorKind.Bush, x: (x + 0.5) * TILE, y: (y + 0.8) * TILE, variant: 0});
            }
        }
    }
    // Lamps around the plaza.
    for (const [lx, ly] of [[-5, -3], [5, -3], [-5, 4], [5, 4]] as [number, number][]) {
        decor.push({kind: DecorKind.Lamp, x: (PLAZA_X + lx + 0.5) * TILE, y: (PLAZA_Y + ly) * TILE, variant: 0});
    }

    const npcs: TownNpc[] = [];
    for (const key of ALL_BUILDINGS) {
        const look: HeroLook | undefined = NPC_LOOKS[key];
        if (!look) {
            continue;
        }
        const def: BuildingDef = BUILDINGS[key];
        const door: {x: number; y: number} = doorPoint(def);
        npcs.push({building: key, x: door.x + 40, y: door.y + 4, look: look, puppetClass: NPC_CLASSES[key] ?? ClassKey.Novice, facing: -1});
    }

    return {tiles: tiles, decor: decor, npcs: npcs, fountainX: (PLAZA_X + 0.5) * TILE, fountainY: (PLAZA_Y + 1) * TILE};
}

export function tileAt(map: TownMap, x: number, y: number): TownTile {
    const tx: number = Math.floor(x / TILE);
    const ty: number = Math.floor(y / TILE);
    if (tx < 0 || ty < 0 || tx >= TOWN_W || ty >= TOWN_H) {
        return TownTile.Water;
    }
    return map.tiles[ty * TOWN_W + tx];
}
