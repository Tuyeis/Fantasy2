import {AbilityKey} from "../data/abilities";
import {loadImage} from "./draw-utils";

/** Painted ability icons (public/art/abilities/<key>.png) as DOM elements for the UI. */

function iconSrc(key: AbilityKey): string {
    return "art/abilities/" + key + ".png";
}

/** Loaded icons are kept alive so the browser serves every icon element straight from its memory cache. */
const loaded: HTMLImageElement[] = [];

export function preloadAbilityIcons(): Promise<void> {
    const keys: AbilityKey[] = Object.values(AbilityKey) as AbilityKey[];
    return Promise.all(keys.map(async (key: AbilityKey): Promise<void> => {
        const img: HTMLImageElement | undefined = await loadImage(iconSrc(key));
        if (img) {
            loaded.push(img);
        }
    })).then(() => undefined);
}

/** Square icon element with the ability's painting. */
export function abilityIconEl(key: AbilityKey, size: number): HTMLElement {
    const img: HTMLImageElement = document.createElement("img");
    img.src = iconSrc(key);
    img.width = size;
    img.height = size;
    img.draggable = false;
    img.style.width = size + "px";
    img.style.height = size + "px";
    img.style.borderRadius = Math.round(size * 0.18) + "px";
    img.style.flex = "none";
    img.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.5)";
    return img;
}
