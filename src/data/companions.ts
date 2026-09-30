import {L, LocalizedText} from "../core/i18n";
import {Element} from "./element";
import {StatusKey} from "./status-effect";

export enum CompanionKey {
    Fairy = "fairy",
    BabyDragon = "baby_dragon",
    Mossling = "mossling",
    Owlet = "owlet",
    FrostFox = "frost_fox",
    Glowbug = "glowbug"
}

export enum CompanionAction {
    Attack = "attack",
    Heal = "heal",
    Buff = "buff",
    Mana = "mana"
}

export interface CompanionDef {
    key: CompanionKey;
    name: LocalizedText;
    desc: LocalizedText;
    action: CompanionAction;
    /** Attack: damage = power * (4 + heroLevel * 2). Heal/Mana: percent of max. Buff: relative atk/matk bonus. */
    power: number;
    element: Element;
    status?: StatusKey;
    statusChance?: number;
    color: string;
    accent: string;
}

const COMPANION_LIST: CompanionDef[] = [
    {key: CompanionKey.Fairy, name: L("Hada", "Fairy", "Fee"), desc: L("Cura un 7% de tus PV cada turno.", "Heals 7% of your HP each turn.", "Heilt jeden Zug 7% deiner LP."), action: CompanionAction.Heal, power: 0.07, element: Element.Holy, color: "#fcc2d7", accent: "#fff3bf"},
    {key: CompanionKey.BabyDragon, name: L("Dragoncito", "Baby dragon", "Babydrache"), desc: L("Escupe fuego al enemigo; puede quemar.", "Spits fire at the enemy; may burn.", "Spuckt Feuer; kann verbrennen."), action: CompanionAction.Attack, power: 1.4, element: Element.Fire, status: StatusKey.Burn, statusChance: 0.15, color: "#ff8787", accent: "#ffd43b"},
    {key: CompanionKey.Mossling, name: L("Musguito", "Mossling", "Moosling"), desc: L("Lanza esporas; puede envenenar.", "Throws spores; may poison.", "Wirft Sporen; kann vergiften."), action: CompanionAction.Attack, power: 1.0, element: Element.Nature, status: StatusKey.Poison, statusChance: 0.3, color: "#8ce99a", accent: "#5c940d"},
    {key: CompanionKey.Owlet, name: L("Buhito", "Owlet", "Eulchen"), desc: L("Te anima: +10% ataque y ataque mágico.", "Cheers you on: +10% attack and magic attack.", "Feuert dich an: +10% Angriff und Magieangriff."), action: CompanionAction.Buff, power: 0.1, element: Element.Neutral, color: "#d8a47f", accent: "#fff9db"},
    {key: CompanionKey.FrostFox, name: L("Zorrito de escarcha", "Frost fox", "Frostfuchs"), desc: L("Muerde con hielo; puede congelar.", "Bites with ice; may freeze.", "Beißt mit Eis; kann einfrieren."), action: CompanionAction.Attack, power: 1.2, element: Element.Ice, status: StatusKey.Freeze, statusChance: 0.12, color: "#d0ebff", accent: "#4dabf7"},
    {key: CompanionKey.Glowbug, name: L("Luciérnaga", "Glowbug", "Glühwürmchen"), desc: L("Recupera un 8% de tu maná cada turno.", "Restores 8% of your mana each turn.", "Stellt jeden Zug 8% deines Manas her."), action: CompanionAction.Mana, power: 0.08, element: Element.Neutral, color: "#ffe066", accent: "#94d82d"}
];

export const COMPANIONS: Record<CompanionKey, CompanionDef> = Object.fromEntries(COMPANION_LIST.map((def: CompanionDef) => [def.key, def])) as Record<CompanionKey, CompanionDef>;

export const MAX_COMPANIONS: number = 3;
