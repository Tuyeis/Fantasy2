import {L, LocalizedText} from "../core/i18n";
import {AbilityKey, DamageType} from "./abilities";
import {Element} from "./element";
import {ClassKey, CLASSES} from "./hero-classes";
import {StatKey} from "./stat-block";

/**
 * Talent trees in the style of classic WoW.
 * - Every class starts with its first ability; each of its three trees grants one of the others.
 * - One point per level. A tree's row opens after spending enough points in that same tree.
 * - The Novice has a single, simpler tree. Its passives stay after changing class; its spells do not.
 */

/** Points in the same tree needed per row (row n needs n × step). */
export const CLASS_TIER_STEP: number = 3;
export const NOVICE_TIER_STEP: number = 2;
export const CLASS_TIER_COUNT: number = 5;

export enum TalentEffectKind {
    /** Relative bonus to a hero stat (crit: absolute percent points). */
    StatPct = "stat_pct",
    /** Relative bonus to an ability: damage power, heal amount or buff strength. */
    AbilityPower = "ability_power",
    AbilityStatus = "ability_status",
    /** Relative mana cost reduction. */
    AbilityCost = "ability_cost",
    AbilityCrit = "ability_crit",
    AbilityLifesteal = "ability_lifesteal",
    AbilityHits = "ability_hits",
    /** Extra buff turns. */
    AbilityTurns = "ability_turns",
    /** Relative bonus to all damage of one type (abilities and basic attacks). */
    TypePower = "type_power",
    /** Relative bonus to ability damage of one element. */
    ElementPower = "element_power",
    /** Relative bonus to all healing from abilities. */
    HealPower = "heal_power"
}

export interface TalentEffect {
    kind: TalentEffectKind;
    /** Per rank. */
    amount: number;
    stat?: StatKey;
    ability?: AbilityKey;
    damageType?: DamageType;
    element?: Element;
}

/** Position of a talent inside a class tree; part of its stable key. */
export enum TalentSlot {
    Ability = "ability",
    Stat = "stat",
    Mastery = "mastery",
    BaseMod = "base_mod",
    Special = "special",
    Passive = "passive",
    Capstone = "capstone",
    // Novice tree
    NoviceBolt = "novice_bolt",
    NoviceVigor = "novice_vigor",
    NoviceHeal = "novice_heal",
    NoviceMight = "novice_might",
    NoviceMorale = "novice_morale",
    NoviceKeenEye = "novice_keen_eye",
    NoviceResolve = "novice_resolve",
    NoviceSpirit = "novice_spirit"
}

/** Stable talent id: `${classKey}:${tree}:${slot}` (see talentKey). */
export type TalentKey = string;

export interface TalentDef {
    key: TalentKey;
    classKey: ClassKey;
    tree: number;
    /** Row 0..4; row n needs n × tier step points spent in this tree. */
    tier: number;
    /** Column in the row (0 or 1) for the layout. */
    column: number;
    slot: TalentSlot;
    /** Fixed name, or null to build it from the effect (see talentName in logic/talents). */
    name: LocalizedText | null;
    maxRank: number;
    /** Learning it teaches this ability. */
    grants: AbilityKey | null;
    /** Must have at least one rank of this talent first. */
    requires: TalentKey | null;
    /** Effects of ONE rank. */
    effects: TalentEffect[];
}

export interface TalentTreeDef {
    classKey: ClassKey;
    name: LocalizedText;
    talents: TalentDef[];
}

export function talentKey(classKey: ClassKey, tree: number, slot: TalentSlot): TalentKey {
    return classKey + ":" + tree + ":" + slot;
}

// ---------------------------------------------------------------- effect helpers

function statPct(stat: StatKey, amount: number): TalentEffect {
    return {kind: TalentEffectKind.StatPct, stat: stat, amount: amount};
}

type AbilityEffect = (ability: AbilityKey, amount: number) => TalentEffect;

function abilityEffect(kind: TalentEffectKind): AbilityEffect {
    return (ability: AbilityKey, amount: number): TalentEffect => ({kind: kind, ability: ability, amount: amount});
}

const power: AbilityEffect = abilityEffect(TalentEffectKind.AbilityPower);
const status: AbilityEffect = abilityEffect(TalentEffectKind.AbilityStatus);
const cost: AbilityEffect = abilityEffect(TalentEffectKind.AbilityCost);
const crit: AbilityEffect = abilityEffect(TalentEffectKind.AbilityCrit);
const leech: AbilityEffect = abilityEffect(TalentEffectKind.AbilityLifesteal);
const hits: AbilityEffect = abilityEffect(TalentEffectKind.AbilityHits);
const turns: AbilityEffect = abilityEffect(TalentEffectKind.AbilityTurns);

function typePower(damageType: DamageType, amount: number): TalentEffect {
    return {kind: TalentEffectKind.TypePower, damageType: damageType, amount: amount};
}

function elementPower(element: Element, amount: number): TalentEffect {
    return {kind: TalentEffectKind.ElementPower, element: element, amount: amount};
}

function healPower(amount: number): TalentEffect {
    return {kind: TalentEffectKind.HealPower, amount: amount};
}

/** Per-rank bonus of the row-0 stat talent. */
const STAT_TALENT_AMOUNT: Record<StatKey, number> = {
    [StatKey.Hp]: 0.04,
    [StatKey.Mana]: 0.05,
    [StatKey.Atk]: 0.03,
    [StatKey.Def]: 0.03,
    [StatKey.Matk]: 0.03,
    [StatKey.Mdef]: 0.03,
    [StatKey.Crit]: 1.5
};
const MASTERY_PER_RANK: number = 0.06;

// ---------------------------------------------------------------- class trees

interface NamedEffects {
    name: LocalizedText;
    effects: TalentEffect[];
}

/** Compact description of one tree; the rows are built from it by buildClassTree. */
interface TreeSpec {
    name: LocalizedText;
    /** Ability learned in row 0 (one of the class abilities 2-4). */
    ability: AbilityKey;
    /** Row 0, 3 ranks. */
    stat: StatKey;
    /** Row 1, 2 ranks: improves the class's first ability. */
    baseMod: TalentEffect;
    /** Row 2, 2 ranks: improves this tree's ability. */
    special: TalentEffect;
    /** Row 3, 3 ranks. */
    passive: NamedEffects;
    /** Row 4, 1 rank. */
    capstone: NamedEffects;
}

const P: DamageType = DamageType.Physical;
const M: DamageType = DamageType.Magical;
const A: typeof AbilityKey = AbilityKey;

const CLASS_TREES: Partial<Record<ClassKey, TreeSpec[]>> = {
    [ClassKey.Swordsman]: [
        {
            name: L("Armas", "Arms", "Waffen"), ability: A.DoubleCut, stat: StatKey.Atk,
            baseMod: power(A.Slash, 0.06), special: crit(A.DoubleCut, 6),
            passive: {name: L("Filo templado", "Tempered edge", "Gehärtete Klinge"), effects: [typePower(P, 0.03)]},
            capstone: {name: L("Tercer corte", "Third cut", "Dritter Schnitt"), effects: [hits(A.DoubleCut, 1)]}
        },
        {
            name: L("Llama", "Flame", "Flamme"), ability: A.FlameBlade, stat: StatKey.Crit,
            baseMod: crit(A.Slash, 5), special: status(A.FlameBlade, 0.1),
            passive: {name: L("Brasas", "Embers", "Glut"), effects: [elementPower(Element.Fire, 0.05)]},
            capstone: {name: L("Acero infernal", "Hellforged steel", "Höllenstahl"), effects: [power(A.FlameBlade, 0.25), status(A.FlameBlade, 0.2)]}
        },
        {
            name: L("Mando", "Command", "Befehl"), ability: A.WarCry, stat: StatKey.Hp,
            baseMod: cost(A.Slash, 0.15), special: power(A.WarCry, 0.1),
            passive: {name: L("Coraza", "Plating", "Panzerung"), effects: [statPct(StatKey.Def, 0.04)]},
            capstone: {name: L("Estandarte", "Banner", "Banner"), effects: [turns(A.WarCry, 2)]}
        }
    ],
    [ClassKey.Mage]: [
        {
            name: L("Escarcha", "Frost", "Frost"), ability: A.FrostNova, stat: StatKey.Matk,
            baseMod: power(A.Fireball, 0.06), special: status(A.FrostNova, 0.1),
            passive: {name: L("Invierno eterno", "Endless winter", "Ewiger Winter"), effects: [elementPower(Element.Ice, 0.05)]},
            capstone: {name: L("Cero absoluto", "Absolute zero", "Absoluter Nullpunkt"), effects: [power(A.FrostNova, 0.2), status(A.FrostNova, 0.25)]}
        },
        {
            name: L("Arcano", "Arcane", "Arkan"), ability: A.ArcaneMissiles, stat: StatKey.Mana,
            baseMod: cost(A.Fireball, 0.15), special: crit(A.ArcaneMissiles, 6),
            passive: {name: L("Mente arcana", "Arcane mind", "Arkaner Geist"), effects: [typePower(M, 0.03)]},
            capstone: {name: L("Aluvión arcano", "Arcane barrage", "Arkanes Sperrfeuer"), effects: [hits(A.ArcaneMissiles, 1)]}
        },
        {
            name: L("Salvaguarda", "Warding", "Schutz"), ability: A.ManaShield, stat: StatKey.Mdef,
            baseMod: status(A.Fireball, 0.08), special: power(A.ManaShield, 0.1),
            passive: {name: L("Aura protectora", "Warding aura", "Schutzaura"), effects: [statPct(StatKey.Def, 0.03), statPct(StatKey.Mdef, 0.03)]},
            capstone: {name: L("Barrera eterna", "Everlasting barrier", "Ewige Barriere"), effects: [turns(A.ManaShield, 2), power(A.ManaShield, 0.2)]}
        }
    ],
    [ClassKey.Elf]: [
        {
            name: L("Veneno", "Venom", "Gift"), ability: A.PoisonArrow, stat: StatKey.Atk,
            baseMod: power(A.ArrowRain, 0.06), special: status(A.PoisonArrow, 0.1),
            passive: {name: L("Toxinas", "Toxins", "Toxine"), effects: [elementPower(Element.Nature, 0.05)]},
            capstone: {name: L("Plaga del bosque", "Forest plague", "Waldseuche"), effects: [power(A.PoisonArrow, 0.25), status(A.PoisonArrow, 0.2)]}
        },
        {
            name: L("Naturaleza", "Nature", "Natur"), ability: A.NaturesBlessing, stat: StatKey.Hp,
            baseMod: cost(A.ArrowRain, 0.15), special: power(A.NaturesBlessing, 0.1),
            passive: {name: L("Savia", "Sap", "Lebenssaft"), effects: [healPower(0.06)]},
            capstone: {name: L("Árbol madre", "Mother tree", "Mutterbaum"), effects: [power(A.NaturesBlessing, 0.25), cost(A.NaturesBlessing, 0.3)]}
        },
        {
            name: L("Puntería", "Marksmanship", "Treffsicherheit"), ability: A.EagleEye, stat: StatKey.Crit,
            baseMod: crit(A.ArrowRain, 5), special: power(A.EagleEye, 0.1),
            passive: {name: L("Tirador", "Sharpshooter", "Scharfschütze"), effects: [typePower(P, 0.03)]},
            capstone: {name: L("Lluvia de acero", "Steel rain", "Stahlregen"), effects: [hits(A.ArrowRain, 1)]}
        }
    ],
    [ClassKey.Wukong]: [
        {
            name: L("Nube", "Cloud", "Wolke"), ability: A.CloudStrike, stat: StatKey.Atk,
            baseMod: power(A.StaffCombo, 0.06), special: crit(A.CloudStrike, 6),
            passive: {name: L("Rey mono", "Monkey king", "Affenkönig"), effects: [typePower(P, 0.03)]},
            capstone: {name: L("Salto de mil li", "Thousand-li leap", "Tausend-Li-Sprung"), effects: [power(A.CloudStrike, 0.25), crit(A.CloudStrike, 10)]}
        },
        {
            name: L("Oro", "Gold", "Gold"), ability: A.GoldenBody, stat: StatKey.Hp,
            baseMod: cost(A.StaffCombo, 0.15), special: power(A.GoldenBody, 0.1),
            passive: {name: L("Cuerpo de diamante", "Diamond body", "Diamantkörper"), effects: [statPct(StatKey.Def, 0.03), statPct(StatKey.Mdef, 0.03)]},
            capstone: {name: L("Inmortal", "Immortal", "Unsterblich"), effects: [turns(A.GoldenBody, 2), power(A.GoldenBody, 0.2)]}
        },
        {
            name: L("Cielo", "Heaven", "Himmel"), ability: A.HeavenlyThunder, stat: StatKey.Matk,
            baseMod: crit(A.StaffCombo, 5), special: cost(A.HeavenlyThunder, 0.15),
            passive: {name: L("Trueno sagrado", "Sacred thunder", "Heiliger Donner"), effects: [elementPower(Element.Holy, 0.05)]},
            capstone: {name: L("Ira del cielo", "Heaven's wrath", "Himmelszorn"), effects: [power(A.HeavenlyThunder, 0.3)]}
        }
    ],
    [ClassKey.Cat]: [
        {
            name: L("Caza", "Hunt", "Jagd"), ability: A.Pounce, stat: StatKey.Crit,
            baseMod: power(A.ScratchFury, 0.06), special: crit(A.Pounce, 6),
            passive: {name: L("Garras afiladas", "Sharp claws", "Scharfe Krallen"), effects: [typePower(P, 0.03)]},
            capstone: {name: L("Zarpazo letal", "Lethal swipe", "Tödlicher Hieb"), effects: [hits(A.ScratchFury, 1)]}
        },
        {
            name: L("Hipnosis", "Hypnosis", "Hypnose"), ability: A.HypnoticGaze, stat: StatKey.Matk,
            baseMod: crit(A.ScratchFury, 5), special: status(A.HypnoticGaze, 0.1),
            passive: {name: L("Ojos de luna", "Moon eyes", "Mondaugen"), effects: [elementPower(Element.Dark, 0.05)]},
            capstone: {name: L("Sueño eterno", "Endless dream", "Ewiger Traum"), effects: [status(A.HypnoticGaze, 0.2), power(A.HypnoticGaze, 0.4)]}
        },
        {
            name: L("Vidas", "Lives", "Leben"), ability: A.NineLives, stat: StatKey.Hp,
            baseMod: cost(A.ScratchFury, 0.15), special: power(A.NineLives, 0.1),
            passive: {name: L("Caer de pie", "Land on your feet", "Auf den Pfoten landen"), effects: [healPower(0.06)]},
            capstone: {name: L("Novena vida", "Ninth life", "Neuntes Leben"), effects: [power(A.NineLives, 0.25), cost(A.NineLives, 0.3)]}
        }
    ],
    [ClassKey.Knight]: [
        {
            name: L("Justicia", "Justice", "Gerechtigkeit"), ability: A.HolyStrike, stat: StatKey.Atk,
            baseMod: power(A.ShieldBash, 0.06), special: crit(A.HolyStrike, 6),
            passive: {name: L("Luz sagrada", "Holy light", "Heiliges Licht"), effects: [elementPower(Element.Holy, 0.05)]},
            capstone: {name: L("Juicio", "Judgement", "Richtspruch"), effects: [power(A.HolyStrike, 0.3)]}
        },
        {
            name: L("Baluarte", "Bulwark", "Bollwerk"), ability: A.Fortress, stat: StatKey.Def,
            baseMod: cost(A.ShieldBash, 0.15), special: power(A.Fortress, 0.1),
            passive: {name: L("Escudo de torre", "Tower shield", "Turmschild"), effects: [statPct(StatKey.Def, 0.03), statPct(StatKey.Mdef, 0.03)]},
            capstone: {name: L("Muralla", "Rampart", "Wall"), effects: [turns(A.Fortress, 2), power(A.Fortress, 0.2)]}
        },
        {
            name: L("Devoción", "Devotion", "Hingabe"), ability: A.LayOnHands, stat: StatKey.Hp,
            baseMod: crit(A.ShieldBash, 5), special: power(A.LayOnHands, 0.1),
            passive: {name: L("Fe", "Faith", "Glaube"), effects: [healPower(0.06)]},
            capstone: {name: L("Mártir", "Martyr", "Märtyrer"), effects: [power(A.LayOnHands, 0.25), cost(A.LayOnHands, 0.3)]}
        }
    ],
    [ClassKey.Vampire]: [
        {
            name: L("Noche", "Night", "Nacht"), ability: A.BatSwarm, stat: StatKey.Atk,
            baseMod: power(A.BloodDrain, 0.06), special: leech(A.BatSwarm, 0.08),
            passive: {name: L("Colmillos", "Fangs", "Fangzähne"), effects: [typePower(P, 0.03)]},
            capstone: {name: L("Colonia", "Colony", "Kolonie"), effects: [hits(A.BatSwarm, 1)]}
        },
        {
            name: L("Seducción", "Seduction", "Verführung"), ability: A.CharmGaze, stat: StatKey.Mdef,
            baseMod: cost(A.BloodDrain, 0.15), special: status(A.CharmGaze, 0.1),
            passive: {name: L("Encanto", "Allure", "Anmut"), effects: [elementPower(Element.Dark, 0.05)]},
            capstone: {name: L("Esclavo", "Thrall", "Knecht"), effects: [status(A.CharmGaze, 0.2), power(A.CharmGaze, 0.5)]}
        },
        {
            name: L("Sangre", "Blood", "Blut"), ability: A.CrimsonFeast, stat: StatKey.Matk,
            baseMod: leech(A.BloodDrain, 0.08), special: cost(A.CrimsonFeast, 0.12),
            passive: {name: L("Sed eterna", "Eternal thirst", "Ewiger Durst"), effects: [typePower(M, 0.03)]},
            capstone: {name: L("Banquete", "Banquet", "Bankett"), effects: [power(A.CrimsonFeast, 0.2), leech(A.CrimsonFeast, 0.15)]}
        }
    ],
    [ClassKey.DarkElf]: [
        {
            name: L("Ponzoña", "Poison", "Gift"), ability: A.VenomVolley, stat: StatKey.Atk,
            baseMod: power(A.ShadowArrow, 0.06), special: status(A.VenomVolley, 0.1),
            passive: {name: L("Glándulas", "Venom glands", "Giftdrüsen"), effects: [elementPower(Element.Nature, 0.05)]},
            capstone: {name: L("Tormenta tóxica", "Toxic storm", "Giftsturm"), effects: [hits(A.VenomVolley, 1)]}
        },
        {
            name: L("Sombras", "Shadows", "Schatten"), ability: A.NightVeil, stat: StatKey.Crit,
            baseMod: crit(A.ShadowArrow, 5), special: power(A.NightVeil, 0.1),
            passive: {name: L("Acechador", "Stalker", "Pirscher"), effects: [typePower(P, 0.03)]},
            capstone: {name: L("Eclipse", "Eclipse", "Finsternis"), effects: [turns(A.NightVeil, 2), power(A.NightVeil, 0.2)]}
        },
        {
            name: L("Alma", "Soul", "Seele"), ability: A.SoulRend, stat: StatKey.Matk,
            baseMod: cost(A.ShadowArrow, 0.15), special: crit(A.SoulRend, 6),
            passive: {name: L("Vacío", "Void", "Leere"), effects: [elementPower(Element.Dark, 0.05)]},
            capstone: {name: L("Cosecha", "Harvest", "Ernte"), effects: [power(A.SoulRend, 0.3)]}
        }
    ],
    [ClassKey.DarkWitch]: [
        {
            name: L("Maldiciones", "Curses", "Flüche"), ability: A.CurseOfSleep, stat: StatKey.Mdef,
            baseMod: power(A.HexBolt, 0.06), special: status(A.CurseOfSleep, 0.1),
            passive: {name: L("Maleficio", "Malefice", "Unheil"), effects: [elementPower(Element.Dark, 0.05)]},
            capstone: {name: L("Pesadilla", "Nightmare", "Albtraum"), effects: [status(A.CurseOfSleep, 0.2), power(A.CurseOfSleep, 0.6)]}
        },
        {
            name: L("Infierno", "Inferno", "Inferno"), ability: A.Hellfire, stat: StatKey.Matk,
            baseMod: crit(A.HexBolt, 5), special: status(A.Hellfire, 0.1),
            passive: {name: L("Llama negra", "Black flame", "Schwarze Flamme"), effects: [elementPower(Element.Fire, 0.05)]},
            capstone: {name: L("Apocalipsis", "Apocalypse", "Apokalypse"), effects: [power(A.Hellfire, 0.25), cost(A.Hellfire, 0.2)]}
        },
        {
            name: L("Almas", "Souls", "Seelen"), ability: A.SoulSiphon, stat: StatKey.Mana,
            baseMod: cost(A.HexBolt, 0.15), special: leech(A.SoulSiphon, 0.08),
            passive: {name: L("Pacto", "Pact", "Pakt"), effects: [typePower(M, 0.03)]},
            capstone: {name: L("Devorador", "Devourer", "Verschlinger"), effects: [power(A.SoulSiphon, 0.3), leech(A.SoulSiphon, 0.15)]}
        }
    ]
};

type NodeBuilder = (slot: TalentSlot, tier: number, column: number, maxRank: number, effects: TalentEffect[], extra?: Partial<TalentDef>) => TalentDef;

/** Talent node factory for one tree; `extra` overrides the defaults (no name, grant or requirement). */
function nodeBuilder(classKey: ClassKey, tree: number): NodeBuilder {
    return (slot: TalentSlot, tier: number, column: number, maxRank: number, effects: TalentEffect[], extra: Partial<TalentDef> = {}): TalentDef => ({
        key: talentKey(classKey, tree, slot), classKey: classKey, tree: tree, tier: tier, column: column, slot: slot,
        name: null, maxRank: maxRank, grants: null, requires: null, effects: effects, ...extra
    });
}

function buildClassTree(classKey: ClassKey, index: number, spec: TreeSpec): TalentTreeDef {
    const node: NodeBuilder = nodeBuilder(classKey, index);
    const grant: TalentKey = talentKey(classKey, index, TalentSlot.Ability);
    return {
        classKey: classKey,
        name: spec.name,
        talents: [
            node(TalentSlot.Ability, 0, 0, 1, [], {grants: spec.ability}),
            node(TalentSlot.Stat, 0, 1, 3, [statPct(spec.stat, STAT_TALENT_AMOUNT[spec.stat])]),
            node(TalentSlot.Mastery, 1, 0, 3, [power(spec.ability, MASTERY_PER_RANK)], {requires: grant}),
            node(TalentSlot.BaseMod, 1, 1, 2, [spec.baseMod]),
            node(TalentSlot.Special, 2, 0, 2, [spec.special], {requires: grant}),
            node(TalentSlot.Passive, 3, 1, 3, spec.passive.effects, {name: spec.passive.name}),
            node(TalentSlot.Capstone, 4, 0, 1, spec.capstone.effects, {name: spec.capstone.name, requires: talentKey(classKey, index, TalentSlot.Special)})
        ]
    };
}

// ---------------------------------------------------------------- novice tree

function buildNoviceTree(): TalentTreeDef {
    const node: NodeBuilder = nodeBuilder(ClassKey.Novice, 0);
    return {
        classKey: ClassKey.Novice,
        name: L("Aprendiz", "Apprentice", "Lehrling"),
        talents: [
            node(TalentSlot.NoviceBolt, 0, 0, 1, [], {grants: A.StudyBolt}),
            node(TalentSlot.NoviceVigor, 0, 1, 3, [statPct(StatKey.Hp, 0.04)], {name: L("Vigor", "Vigor", "Tatkraft")}),
            node(TalentSlot.NoviceHeal, 1, 0, 1, [], {grants: A.MinorHeal}),
            node(TalentSlot.NoviceMight, 1, 1, 3, [statPct(StatKey.Atk, 0.02), statPct(StatKey.Matk, 0.02)], {name: L("Entrenamiento", "Training", "Training")}),
            node(TalentSlot.NoviceMorale, 2, 0, 1, [], {grants: A.Morale}),
            node(TalentSlot.NoviceKeenEye, 2, 1, 2, [statPct(StatKey.Crit, 1)], {name: L("Ojo avizor", "Keen eye", "Adlerblick")}),
            node(TalentSlot.NoviceResolve, 3, 1, 2, [statPct(StatKey.Def, 0.03), statPct(StatKey.Mdef, 0.03)], {name: L("Temple", "Resolve", "Entschlossenheit")}),
            node(TalentSlot.NoviceSpirit, 4, 0, 1, [
                statPct(StatKey.Hp, 0.03), statPct(StatKey.Atk, 0.03), statPct(StatKey.Matk, 0.03), statPct(StatKey.Def, 0.03), statPct(StatKey.Mdef, 0.03)
            ], {name: L("Espíritu aventurero", "Adventurer's spirit", "Abenteuergeist")})
        ]
    };
}

// ---------------------------------------------------------------- registry

export const TALENT_TREES: Record<ClassKey, TalentTreeDef[]> = Object.fromEntries((Object.values(ClassKey) as ClassKey[]).map((classKey: ClassKey) => {
    if (classKey === ClassKey.Novice) {
        return [classKey, [buildNoviceTree()]];
    }
    const specs: TreeSpec[] = CLASS_TREES[classKey] ?? [];
    return [classKey, specs.map((spec: TreeSpec, index: number) => buildClassTree(classKey, index, spec))];
})) as Record<ClassKey, TalentTreeDef[]>;

export const TALENTS: Record<TalentKey, TalentDef> = Object.fromEntries(
    (Object.values(TALENT_TREES) as TalentTreeDef[][]).flat().flatMap((tree: TalentTreeDef) => tree.talents).map((def: TalentDef) => [def.key, def])
) as Record<TalentKey, TalentDef>;

export function tierStep(classKey: ClassKey): number {
    return classKey === ClassKey.Novice ? NOVICE_TIER_STEP : CLASS_TIER_STEP;
}

/** Sanity check at startup: every class ability except the first must be granted by exactly one talent. */
export function validateTalentTrees(): string[] {
    const problems: string[] = [];
    for (const classKey of Object.values(ClassKey) as ClassKey[]) {
        const granted: AbilityKey[] = TALENT_TREES[classKey].flatMap((tree: TalentTreeDef) => tree.talents).map((d: TalentDef) => d.grants).filter((a: AbilityKey | null): a is AbilityKey => a !== null);
        for (const ability of CLASSES[classKey].abilities.slice(1)) {
            if (granted.filter((a: AbilityKey) => a === ability).length !== 1) {
                problems.push(classKey + ": " + ability);
            }
        }
    }
    return problems;
}
