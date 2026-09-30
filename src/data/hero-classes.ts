import {L, LocalizedText} from "../core/i18n";
import {AbilityKey} from "./abilities";
import {ItemKey} from "./items";
import {StatBlock, stats} from "./stat-block";

export enum ClassKey {
    Novice = "novice",
    Swordsman = "swordsman",
    Mage = "mage",
    Elf = "elf",
    Wukong = "wukong",
    Cat = "cat",
    Knight = "knight",
    Vampire = "vampire",
    DarkElf = "dark_elf",
    DarkWitch = "dark_witch"
}

export enum HatStyle {
    None = "none",
    Headband = "headband",
    WizardHat = "wizard_hat",
    WitchHat = "witch_hat",
    Helmet = "helmet",
    Circlet = "circlet",
    Hood = "hood"
}

export enum WeaponStyle {
    Sword = "sword",
    Staff = "staff",
    Bow = "bow",
    Dagger = "dagger",
    Pole = "pole"
}

export enum EarStyle {
    Human = "human",
    Elf = "elf",
    Cat = "cat"
}

export enum TailStyle {
    None = "none",
    Cat = "cat",
    Monkey = "monkey"
}

export interface HeroLook {
    skin: string;
    hair: string;
    outfit: string;
    outfitDark: string;
    accent: string;
    hat: HatStyle;
    weapon: WeaponStyle;
    ears: EarStyle;
    tail: TailStyle;
    cape: string | null;
    shield: boolean;
}

export interface ClassDef {
    key: ClassKey;
    name: LocalizedText;
    desc: LocalizedText;
    /** Stats at level 1. */
    base: StatBlock;
    /** Stats gained per level. */
    growth: StatBlock;
    abilities: AbilityKey[];
    /** Exactly two items consumed together with a class tome. Empty for the Novice. */
    recipe: ItemKey[];
    look: HeroLook;
}

function look(skin: string, hair: string, outfit: string, outfitDark: string, accent: string, hat: HatStyle, weapon: WeaponStyle, extra: Partial<HeroLook> = {}): HeroLook {
    return {skin: skin, hair: hair, outfit: outfit, outfitDark: outfitDark, accent: accent, hat: hat, weapon: weapon, ears: EarStyle.Human, tail: TailStyle.None, cape: null, shield: false, ...extra};
}

const CLASS_LIST: ClassDef[] = [
    {
        key: ClassKey.Novice,
        name: L("Novato", "Novice", "Novize"),
        desc: L("Un aventurero equilibrado que aún busca su senda.", "A balanced adventurer still seeking a path.", "Ein ausgewogener Abenteurer auf der Suche nach seinem Pfad."),
        base: stats(110, 30, 12, 8, 10, 8, 5),
        growth: stats(15, 4.5, 2.5, 1.9, 2.3, 1.8, 0.2),
        abilities: [AbilityKey.FirmStrike, AbilityKey.StudyBolt, AbilityKey.MinorHeal, AbilityKey.Morale],
        recipe: [],
        look: look("#f1c27d", "#6b4226", "#4c6ef5", "#364fc7", "#f5c542", HatStyle.None, WeaponStyle.Sword)
    },
    {
        key: ClassKey.Swordsman,
        name: L("Espadachín", "Swordsman", "Schwertkämpfer"),
        desc: L("Maestro del filo: gran ataque físico y golpes múltiples.", "Master of the blade: high physical attack and multi-hits.", "Meister der Klinge: hoher physischer Angriff und Mehrfachtreffer."),
        base: stats(130, 30, 16, 11, 6, 7, 8),
        growth: stats(16, 3, 3.2, 2.0, 0.8, 1.2, 0.3),
        abilities: [AbilityKey.Slash, AbilityKey.DoubleCut, AbilityKey.FlameBlade, AbilityKey.WarCry],
        recipe: [ItemKey.IronSword, ItemKey.KnightHelmet],
        look: look("#f1c27d", "#2b2b2b", "#c92a2a", "#8f1d1d", "#ffd43b", HatStyle.Headband, WeaponStyle.Sword)
    },
    {
        key: ClassKey.Mage,
        name: L("Mago", "Mage", "Magier"),
        desc: L("Dominio elemental: fuego, hielo y misiles arcanos.", "Elemental mastery: fire, ice and arcane missiles.", "Elementare Meisterschaft: Feuer, Eis und arkane Geschosse."),
        base: stats(90, 60, 7, 6, 18, 12, 5),
        growth: stats(10, 7, 1.0, 1.0, 3.4, 2.2, 0.2),
        abilities: [AbilityKey.Fireball, AbilityKey.FrostNova, AbilityKey.ArcaneMissiles, AbilityKey.ManaShield],
        recipe: [ItemKey.MageStaff, ItemKey.Amethyst],
        look: look("#f1c27d", "#e9ecef", "#5f3dc4", "#3b2593", "#ffd43b", HatStyle.WizardHat, WeaponStyle.Staff)
    },
    {
        key: ClassKey.Elf,
        name: L("Elfa", "Elf", "Elfe"),
        desc: L("Arquera ágil: lluvias de flechas, veneno y curación natural.", "Agile archer: arrow rain, poison and natural healing.", "Flinke Bogenschützin: Pfeilregen, Gift und Naturheilung."),
        base: stats(105, 45, 14, 8, 12, 10, 12),
        growth: stats(12, 5, 2.6, 1.4, 2.2, 1.8, 0.4),
        abilities: [AbilityKey.ArrowRain, AbilityKey.PoisonArrow, AbilityKey.NaturesBlessing, AbilityKey.EagleEye],
        recipe: [ItemKey.OakBow, ItemKey.Emerald],
        look: look("#f8d7b5", "#ffe066", "#2b8a3e", "#1b5e2a", "#d8f5a2", HatStyle.None, WeaponStyle.Bow, {ears: EarStyle.Elf})
    },
    {
        key: ClassKey.Wukong,
        name: L("Wukong", "Wukong", "Wukong"),
        desc: L("El rey mono y su bastón: combos, trueno celestial y cuerpo dorado.", "The monkey king and his staff: combos, heavenly thunder, golden body.", "Der Affenkönig und sein Stab: Kombos, Himmelsdonner, goldener Körper."),
        base: stats(125, 40, 15, 10, 10, 9, 10),
        growth: stats(15, 4.5, 2.9, 1.8, 1.8, 1.6, 0.3),
        abilities: [AbilityKey.StaffCombo, AbilityKey.CloudStrike, AbilityKey.GoldenBody, AbilityKey.HeavenlyThunder],
        recipe: [ItemKey.Quarterstaff, ItemKey.GoldOre],
        look: look("#d9a066", "#8a5a2b", "#f08c00", "#b8590a", "#ffd43b", HatStyle.Circlet, WeaponStyle.Pole, {tail: TailStyle.Monkey})
    },
    {
        key: ClassKey.Cat,
        name: L("Gato", "Cat", "Katze"),
        desc: L("Rápido y letal: críticos enormes, zarpazos y mirada hipnótica.", "Fast and lethal: huge crits, claws and hypnotic gaze.", "Schnell und tödlich: riesige Krits, Krallen und Hypnoblick."),
        base: stats(100, 40, 15, 8, 9, 9, 18),
        growth: stats(12, 4, 2.8, 1.4, 1.6, 1.6, 0.5),
        abilities: [AbilityKey.ScratchFury, AbilityKey.Pounce, AbilityKey.HypnoticGaze, AbilityKey.NineLives],
        recipe: [ItemKey.FeatherBoots, ItemKey.Topaz],
        look: look("#f1c27d", "#f76707", "#495057", "#2b2f33", "#ffa94d", HatStyle.None, WeaponStyle.Dagger, {ears: EarStyle.Cat, tail: TailStyle.Cat})
    },
    {
        key: ClassKey.Knight,
        name: L("Caballero", "Knight", "Ritter"),
        desc: L("Muralla viviente: la mayor defensa y vida, golpes sagrados.", "A living wall: highest defense and HP, holy strikes.", "Eine lebende Mauer: höchste Abwehr und LP, heilige Schläge."),
        base: stats(160, 30, 13, 16, 5, 12, 4),
        growth: stats(20, 3, 2.4, 3.0, 0.8, 2.2, 0.1),
        abilities: [AbilityKey.ShieldBash, AbilityKey.HolyStrike, AbilityKey.Fortress, AbilityKey.LayOnHands],
        recipe: [ItemKey.IronShield, ItemKey.ChainMail],
        look: look("#f1c27d", "#a0663a", "#ced4da", "#868e96", "#4dabf7", HatStyle.Helmet, WeaponStyle.Sword, {shield: true})
    },
    {
        key: ClassKey.Vampire,
        name: L("Vampiro", "Vampire", "Vampir"),
        desc: L("Se alimenta de sus enemigos: robo de vida y hechizos de seducción.", "Feeds on foes: life drain and charm spells.", "Nährt sich von Feinden: Lebensraub und Betörungszauber."),
        base: stats(115, 50, 13, 8, 15, 10, 10),
        growth: stats(13, 5.5, 2.2, 1.4, 2.8, 1.8, 0.3),
        abilities: [AbilityKey.BloodDrain, AbilityKey.BatSwarm, AbilityKey.CharmGaze, AbilityKey.CrimsonFeast],
        recipe: [ItemKey.Dagger, ItemKey.RubyOre],
        look: look("#e9ecef", "#212529", "#862e9c", "#5a1d6b", "#e03131", HatStyle.None, WeaponStyle.Dagger, {cape: "#c92a2a"})
    },
    {
        key: ClassKey.DarkElf,
        name: L("Elfo oscuro", "Dark Elf", "Dunkelelf"),
        desc: L("Cazador de las sombras: flechas oscuras, veneno y críticos.", "Shadow hunter: dark arrows, poison and crits.", "Schattenjäger: dunkle Pfeile, Gift und Krits."),
        base: stats(105, 45, 16, 8, 13, 9, 14),
        growth: stats(12, 5, 3.0, 1.4, 2.4, 1.6, 0.4),
        abilities: [AbilityKey.ShadowArrow, AbilityKey.VenomVolley, AbilityKey.NightVeil, AbilityKey.SoulRend],
        recipe: [ItemKey.OakBow, ItemKey.ShadowEssence],
        look: look("#7d6b91", "#f8f9fa", "#343a40", "#1e2124", "#9775fa", HatStyle.Hood, WeaponStyle.Bow, {ears: EarStyle.Elf})
    },
    {
        key: ClassKey.DarkWitch,
        name: L("Bruja oscura", "Dark Witch", "Dunkle Hexe"),
        desc: L("El mayor poder mágico y maná: maldiciones y fuego infernal.", "Highest magic power and mana: curses and hellfire.", "Höchste Magiekraft und Mana: Flüche und Höllenfeuer."),
        base: stats(85, 70, 6, 5, 21, 13, 6),
        growth: stats(9, 8, 0.8, 0.9, 3.8, 2.4, 0.2),
        abilities: [AbilityKey.HexBolt, AbilityKey.CurseOfSleep, AbilityKey.Hellfire, AbilityKey.SoulSiphon],
        recipe: [ItemKey.WitchHat, ItemKey.Onyx],
        look: look("#f1e3d3", "#5c1a70", "#212529", "#101113", "#be4bdb", HatStyle.WitchHat, WeaponStyle.Staff)
    }
];

export const CLASSES: Record<ClassKey, ClassDef> = Object.fromEntries(CLASS_LIST.map((def: ClassDef) => [def.key, def])) as Record<ClassKey, ClassDef>;

export const ADVANCED_CLASSES: ClassKey[] = CLASS_LIST.filter((def: ClassDef) => def.key !== ClassKey.Novice).map((def: ClassDef) => def.key);
