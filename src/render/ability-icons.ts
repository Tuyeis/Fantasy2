import {AbilityDef, AbilityKey, ABILITIES, AbilityKind} from "../data/abilities";
import {ELEMENTS} from "../data/element";

/** Painted ability icons (public/art/abilities/<key>.png) with a drawn fallback, as DOM elements for the UI. */

const loaded: Map<AbilityKey, HTMLImageElement> = new Map<AbilityKey, HTMLImageElement>();

export function preloadAbilityIcons(): Promise<void> {
    const keys: AbilityKey[] = Object.values(AbilityKey) as AbilityKey[];
    return Promise.all(keys.map((key: AbilityKey) => new Promise<void>((resolve: () => void) => {
        const img: HTMLImageElement = new Image();
        img.onload = () => {
            loaded.set(key, img);
            resolve();
        };
        img.onerror = () => resolve();
        img.src = "art/abilities/" + key + ".png";
    }))).then(() => undefined);
}

export function getAbilityIcon(key: AbilityKey): HTMLImageElement | undefined {
    return loaded.get(key);
}

/** Square icon element; falls back to an element-coloured badge when the painting is missing. */
export function abilityIconEl(key: AbilityKey, size: number): HTMLElement {
    const art: HTMLImageElement | undefined = loaded.get(key);
    if (art) {
        const img: HTMLImageElement = document.createElement("img");
        img.src = art.src;
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
    const def: AbilityDef = ABILITIES[key];
    const badge: HTMLElement = document.createElement("div");
    badge.style.width = size + "px";
    badge.style.height = size + "px";
    badge.style.flex = "none";
    badge.style.borderRadius = Math.round(size * 0.18) + "px";
    badge.style.background = "radial-gradient(circle at 50% 40%, " + ELEMENTS[def.element].color + ", #1a1422)";
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.justifyContent = "center";
    badge.style.fontSize = Math.round(size * 0.5) + "px";
    badge.textContent = def.kind === AbilityKind.Heal ? "✚" : def.kind === AbilityKind.Buff ? "▲" : ELEMENTS[def.element].symbol;
    return badge;
}
