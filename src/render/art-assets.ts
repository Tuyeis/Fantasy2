import {BuildingKey} from "../data/buildings";
import {loadImage} from "./draw-utils";

/**
 * Painted town art (ComfyUI, anime cel style). Files live in public/art/town/<key>.png
 * and are addressed by stable keys, never by display names.
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
    GroundPath = "ground_path",
    GroundWater = "ground_water"
}

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

async function loadOne(key: ArtKey): Promise<void> {
    const src: string = "art/town/" + key + ".png";
    const img: HTMLImageElement | undefined = await loadImage(src);
    if (img) {
        loaded.set(key, img);
    } else {
        console.warn("Art missing:", src);
    }
}

/** Loads every painted town asset; never rejects. */
export function preloadArt(): Promise<void> {
    const keys: ArtKey[] = Object.values(ArtKey) as ArtKey[];
    return Promise.all(keys.map((key: ArtKey) => loadOne(key))).then(() => undefined);
}

export function getArt(key: ArtKey): HTMLImageElement | undefined {
    return loaded.get(key);
}
