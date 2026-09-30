import {BuildingKey} from "../data/buildings";

/**
 * Painted art (ComfyUI, anime cel style) that replaces the procedural drawings where available.
 * Every image is optional: if it is missing or fails to load, the caller falls back to the procedural drawing.
 * Files live in public/art/ and are addressed by stable keys, never by display names.
 */
export enum ArtKey {
    BuildingPortal = "building_portal",
    BuildingGuild = "building_guild",
    BuildingShop = "building_shop",
    BuildingClassLibrary = "building_class_library",
    BuildingForge = "building_forge",
    BuildingHouse = "building_house",
    BuildingColiseum = "building_coliseum",
    BuildingBank = "building_bank",
    TreeRound = "tree_round",
    TreePine = "tree_pine",
    Bush = "bush",
    FlowerBush = "flower_bush",
    Lamp = "lamp",
    Fountain = "fountain",
    GroundGrass = "ground_grass",
    GroundPath = "ground_path",
    GroundPlaza = "ground_plaza",
    GroundWater = "ground_water"
}

const ART_FILES: Record<ArtKey, string> = {
    [ArtKey.BuildingPortal]: "art/town/building_portal.png",
    [ArtKey.BuildingGuild]: "art/town/building_guild.png",
    [ArtKey.BuildingShop]: "art/town/building_shop.png",
    [ArtKey.BuildingClassLibrary]: "art/town/building_class_library.png",
    [ArtKey.BuildingForge]: "art/town/building_forge.png",
    [ArtKey.BuildingHouse]: "art/town/building_house.png",
    [ArtKey.BuildingColiseum]: "art/town/building_coliseum.png",
    [ArtKey.BuildingBank]: "art/town/building_bank.png",
    [ArtKey.TreeRound]: "art/town/tree_round.png",
    [ArtKey.TreePine]: "art/town/tree_pine.png",
    [ArtKey.Bush]: "art/town/bush.png",
    [ArtKey.FlowerBush]: "art/town/flower_bush.png",
    [ArtKey.Lamp]: "art/town/lamp.png",
    [ArtKey.Fountain]: "art/town/fountain.png",
    [ArtKey.GroundGrass]: "art/town/ground_grass.png",
    [ArtKey.GroundPath]: "art/town/ground_path.png",
    [ArtKey.GroundPlaza]: "art/town/ground_plaza.png",
    [ArtKey.GroundWater]: "art/town/ground_water.png"
};

export const BUILDING_ART: Record<BuildingKey, ArtKey> = {
    [BuildingKey.Portal]: ArtKey.BuildingPortal,
    [BuildingKey.Guild]: ArtKey.BuildingGuild,
    [BuildingKey.Shop]: ArtKey.BuildingShop,
    [BuildingKey.ClassLibrary]: ArtKey.BuildingClassLibrary,
    [BuildingKey.Forge]: ArtKey.BuildingForge,
    [BuildingKey.House]: ArtKey.BuildingHouse,
    [BuildingKey.Coliseum]: ArtKey.BuildingColiseum,
    [BuildingKey.Bank]: ArtKey.BuildingBank
};

const loaded: Map<ArtKey, HTMLImageElement> = new Map<ArtKey, HTMLImageElement>();

function loadOne(key: ArtKey): Promise<void> {
    return new Promise<void>((resolve: () => void) => {
        const img: HTMLImageElement = new Image();
        img.onload = () => {
            loaded.set(key, img);
            resolve();
        };
        img.onerror = () => {
            console.warn("Art missing, using procedural fallback:", ART_FILES[key]);
            resolve();
        };
        img.src = ART_FILES[key];
    });
}

/** Loads every painted asset; never rejects (missing files simply keep the procedural look). */
export function preloadArt(): Promise<void> {
    const keys: ArtKey[] = Object.values(ArtKey) as ArtKey[];
    return Promise.all(keys.map((key: ArtKey) => loadOne(key))).then(() => undefined);
}

export function getArt(key: ArtKey): HTMLImageElement | undefined {
    return loaded.get(key);
}
