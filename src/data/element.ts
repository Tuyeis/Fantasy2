import {L, LocalizedText} from "../core/i18n";

export enum Element {
    Neutral = "neutral",
    Fire = "fire",
    Ice = "ice",
    Dark = "dark",
    Holy = "holy",
    Nature = "nature"
}

export interface ElementDef {
    key: Element;
    name: LocalizedText;
    color: string;
    symbol: string;
}

export const ELEMENTS: Record<Element, ElementDef> = {
    [Element.Neutral]: {key: Element.Neutral, name: L("Neutro", "Neutral", "Neutral"), color: "#c9c9c9", symbol: "◆"},
    [Element.Fire]: {key: Element.Fire, name: L("Fuego", "Fire", "Feuer"), color: "#ff7a3d", symbol: "▲"},
    [Element.Ice]: {key: Element.Ice, name: L("Hielo", "Ice", "Eis"), color: "#7fd8ff", symbol: "✦"},
    [Element.Dark]: {key: Element.Dark, name: L("Oscuridad", "Dark", "Dunkel"), color: "#b07cff", symbol: "●"},
    [Element.Holy]: {key: Element.Holy, name: L("Sagrado", "Holy", "Heilig"), color: "#ffe680", symbol: "✚"},
    [Element.Nature]: {key: Element.Nature, name: L("Naturaleza", "Nature", "Natur"), color: "#7ddc6a", symbol: "❦"}
};

export const WEAK_MULTIPLIER: number = 1.5;
export const RESIST_MULTIPLIER: number = 0.5;

export function elementMultiplier(element: Element, weak: Element[], resist: Element[]): number {
    if (element === Element.Neutral) {
        return 1;
    }
    if (weak.includes(element)) {
        return WEAK_MULTIPLIER;
    }
    if (resist.includes(element)) {
        return RESIST_MULTIPLIER;
    }
    return 1;
}
