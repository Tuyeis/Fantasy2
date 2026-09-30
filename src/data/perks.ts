import {L, LocalizedText} from "../core/i18n";

export enum PerkKey {
    StartingGold = "starting_gold",
    Vitality = "vitality",
    ArcaneWell = "arcane_well",
    Fortune = "fortune",
    Scholar = "scholar",
    Merchant = "merchant",
    PotionMaster = "potion_master",
    BeastTamer = "beast_tamer",
    Lucky = "lucky",
    ExtraDash = "extra_dash"
}

export interface PerkDef {
    key: PerkKey;
    name: LocalizedText;
    /** Description of ONE rank. */
    desc: LocalizedText;
    maxRank: number;
    costPerRank: number;
}

const PERK_LIST: PerkDef[] = [
    {key: PerkKey.StartingGold, name: L("Bolsa de expedición", "Expedition purse", "Expeditionsbeutel"), desc: L("+60 de oro al preparar cada expedición.", "+60 gold when preparing each run.", "+60 Gold bei jeder Expeditionsvorbereitung."), maxRank: 3, costPerRank: 1},
    {key: PerkKey.Vitality, name: L("Vitalidad", "Vitality", "Vitalität"), desc: L("+10% PV máximos.", "+10% max HP.", "+10% max. LP."), maxRank: 3, costPerRank: 1},
    {key: PerkKey.ArcaneWell, name: L("Pozo arcano", "Arcane well", "Arkaner Brunnen"), desc: L("+10% maná máximo.", "+10% max mana.", "+10% max. Mana."), maxRank: 2, costPerRank: 1},
    {key: PerkKey.Fortune, name: L("Fortuna", "Fortune", "Glück"), desc: L("+15% probabilidad de botín.", "+15% drop chance.", "+15% Beutechance."), maxRank: 3, costPerRank: 1},
    {key: PerkKey.Scholar, name: L("Erudito", "Scholar", "Gelehrter"), desc: L("+10% XP ganada.", "+10% XP gained.", "+10% erhaltene EP."), maxRank: 3, costPerRank: 1},
    {key: PerkKey.Merchant, name: L("Regateo", "Haggling", "Feilschen"), desc: L("-8% precios de la tienda.", "-8% shop prices.", "-8% Ladenpreise."), maxRank: 2, costPerRank: 1},
    {key: PerkKey.PotionMaster, name: L("Alquimista", "Alchemist", "Alchemist"), desc: L("Las pociones curan un 25% más.", "Potions heal 25% more.", "Tränke heilen 25% mehr."), maxRank: 2, costPerRank: 1},
    {key: PerkKey.BeastTamer, name: L("Domador", "Beast tamer", "Bändiger"), desc: L("Compañeros +30% de poder y más frecuentes.", "Companions +30% power and more frequent.", "Gefährten +30% Kraft und häufiger."), maxRank: 2, costPerRank: 1},
    {key: PerkKey.Lucky, name: L("Suerte", "Luck", "Fortuna"), desc: L("+3% probabilidad de crítico.", "+3% critical chance.", "+3% kritische Chance."), maxRank: 3, costPerRank: 1},
    {key: PerkKey.ExtraDash, name: L("Pies ligeros", "Light feet", "Leichtfüßig"), desc: L("+1 carga de esquiva en la arena.", "+1 dash charge in the arena.", "+1 Ausweichladung in der Arena."), maxRank: 2, costPerRank: 1}
];

export const PERKS: Record<PerkKey, PerkDef> = Object.fromEntries(PERK_LIST.map((def: PerkDef) => [def.key, def])) as Record<PerkKey, PerkDef>;
export const ALL_PERKS: PerkKey[] = PERK_LIST.map((def: PerkDef) => def.key);
