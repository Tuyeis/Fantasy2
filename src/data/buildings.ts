import {L, LocalizedText} from "../core/i18n";

export enum BuildingKey {
    Shop = "shop",
    Forge = "forge",
    Guild = "guild",
    ClassLibrary = "class_library",
    Portal = "portal",
    House = "house",
    Coliseum = "coliseum",
    Bank = "bank"
}

export interface BuildingDef {
    key: BuildingKey;
    name: LocalizedText;
    startsUnlocked: boolean;
    /** Tile rectangle of the building body in the town map. */
    tx: number;
    ty: number;
    tw: number;
    th: number;
    wall: string;
    roof: string;
    /** Colour of the sign above the door. */
    sign: string;
}

const BUILDING_LIST: BuildingDef[] = [
    {key: BuildingKey.Portal, name: L("Portal de la mazmorra", "Dungeon portal", "Dungeonportal"), startsUnlocked: true, tx: 22, ty: 3, tw: 5, th: 4, wall: "#5c5f66", roof: "#7048e8", sign: "#b197fc"},
    {key: BuildingKey.Guild, name: L("Gremio de aventureros", "Adventurers' guild", "Abenteurergilde"), startsUnlocked: true, tx: 7, ty: 6, tw: 8, th: 5, wall: "#d9c7a7", roof: "#1864ab", sign: "#74c0fc"},
    {key: BuildingKey.Shop, name: L("Tienda", "Shop", "Laden"), startsUnlocked: true, tx: 33, ty: 6, tw: 7, th: 5, wall: "#e9d8b4", roof: "#c92a2a", sign: "#ffa8a8"},
    {key: BuildingKey.ClassLibrary, name: L("Biblioteca de clases", "Class library", "Klassenbibliothek"), startsUnlocked: false, tx: 6, ty: 19, tw: 7, th: 5, wall: "#cfc1e6", roof: "#5f3dc4", sign: "#d0bfff"},
    {key: BuildingKey.Forge, name: L("Forja", "Forge", "Schmiede"), startsUnlocked: false, tx: 35, ty: 19, tw: 6, th: 5, wall: "#a3a3a3", roof: "#495057", sign: "#ffa94d"},
    {key: BuildingKey.House, name: L("Tu casa", "Your house", "Dein Haus"), startsUnlocked: true, tx: 12, ty: 27, tw: 5, th: 4, wall: "#f1dfc0", roof: "#2b8a3e", sign: "#b2f2bb"},
    {key: BuildingKey.Bank, name: L("Banco", "Bank", "Bank"), startsUnlocked: true, tx: 13, ty: 14, tw: 6, th: 4, wall: "#bfb6a4", roof: "#2f6b4f", sign: "#ffd43b"},
    {key: BuildingKey.Coliseum, name: L("Coliseo", "Coliseum", "Kolosseum"), startsUnlocked: false, tx: 31, ty: 27, tw: 8, th: 4, wall: "#e6d3a3", roof: "#b08900", sign: "#ffe066"}
];

export const BUILDINGS: Record<BuildingKey, BuildingDef> = Object.fromEntries(BUILDING_LIST.map((def: BuildingDef) => [def.key, def])) as Record<BuildingKey, BuildingDef>;
export const ALL_BUILDINGS: BuildingKey[] = BUILDING_LIST.map((def: BuildingDef) => def.key);

/** Order in which blueprints unlock the locked buildings. */
export const BLUEPRINT_ORDER: BuildingKey[] = [BuildingKey.ClassLibrary, BuildingKey.Forge, BuildingKey.Coliseum];
