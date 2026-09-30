import {L, LocalizedText, tr} from "../core/i18n";
import {Element, ELEMENTS} from "./element";
import {StatKey, statLabel} from "./stat-block";
import {StatusKey, STATUSES} from "./status-effect";

export enum AbilityKind {
    Damage = "damage",
    Heal = "heal",
    Buff = "buff"
}

export enum DamageType {
    Physical = "physical",
    Magical = "magical"
}

export enum AbilityKey {
    FirmStrike = "firm_strike",
    StudyBolt = "study_bolt",
    MinorHeal = "minor_heal",
    Morale = "morale",

    Slash = "slash",
    DoubleCut = "double_cut",
    FlameBlade = "flame_blade",
    WarCry = "war_cry",

    Fireball = "fireball",
    FrostNova = "frost_nova",
    ArcaneMissiles = "arcane_missiles",
    ManaShield = "mana_shield",

    ArrowRain = "arrow_rain",
    PoisonArrow = "poison_arrow",
    NaturesBlessing = "natures_blessing",
    EagleEye = "eagle_eye",

    StaffCombo = "staff_combo",
    CloudStrike = "cloud_strike",
    GoldenBody = "golden_body",
    HeavenlyThunder = "heavenly_thunder",

    ScratchFury = "scratch_fury",
    Pounce = "pounce",
    HypnoticGaze = "hypnotic_gaze",
    NineLives = "nine_lives",

    ShieldBash = "shield_bash",
    HolyStrike = "holy_strike",
    Fortress = "fortress",
    LayOnHands = "lay_on_hands",

    BloodDrain = "blood_drain",
    BatSwarm = "bat_swarm",
    CharmGaze = "charm_gaze",
    CrimsonFeast = "crimson_feast",

    ShadowArrow = "shadow_arrow",
    VenomVolley = "venom_volley",
    NightVeil = "night_veil",
    SoulRend = "soul_rend",

    HexBolt = "hex_bolt",
    CurseOfSleep = "curse_of_sleep",
    Hellfire = "hellfire",
    SoulSiphon = "soul_siphon"
}

export interface BuffSpec {
    stat: StatKey;
    /** Relative bonus, e.g. 0.3 = +30%. For crit it is an absolute bonus in percent points. */
    amount: number;
    turns: number;
}

export interface AbilityDef {
    key: AbilityKey;
    name: LocalizedText;
    kind: AbilityKind;
    manaCost: number;
    element: Element;
    damageType?: DamageType;
    power?: number;
    hits?: number;
    /** Fraction of damage dealt returned as HP. */
    lifesteal?: number;
    status?: StatusKey;
    statusChance?: number;
    /** Extra crit chance (percent points) for this ability. */
    critBonus?: number;
    /** Heal: fraction of max HP. */
    healPct?: number;
    /** Heal: multiplier of magic attack. */
    healPower?: number;
    /** Buffs applied to the user (also allowed on damage abilities). */
    buffs?: BuffSpec[];
}

function dmg(key: AbilityKey, name: LocalizedText, mana: number, type: DamageType, element: Element, power: number, extra: Partial<AbilityDef> = {}): AbilityDef {
    return {key: key, name: name, kind: AbilityKind.Damage, manaCost: mana, element: element, damageType: type, power: power, hits: 1, ...extra};
}

function heal(key: AbilityKey, name: LocalizedText, mana: number, element: Element, healPct: number, healPower: number): AbilityDef {
    return {key: key, name: name, kind: AbilityKind.Heal, manaCost: mana, element: element, healPct: healPct, healPower: healPower};
}

function buff(key: AbilityKey, name: LocalizedText, mana: number, element: Element, buffs: BuffSpec[], extra: Partial<AbilityDef> = {}): AbilityDef {
    return {key: key, name: name, kind: AbilityKind.Buff, manaCost: mana, element: element, buffs: buffs, ...extra};
}

const P: DamageType = DamageType.Physical;
const M: DamageType = DamageType.Magical;

const ABILITY_LIST: AbilityDef[] = [
    dmg(AbilityKey.FirmStrike, L("Golpe firme", "Firm strike", "Fester Hieb"), 4, P, Element.Neutral, 1.5),
    dmg(AbilityKey.StudyBolt, L("Rayo de estudio", "Study bolt", "Lernblitz"), 5, M, Element.Neutral, 1.5),
    heal(AbilityKey.MinorHeal, L("Curación menor", "Minor heal", "Kleine Heilung"), 6, Element.Holy, 0.2, 1.0),
    buff(AbilityKey.Morale, L("Moral alta", "Morale", "Kampfgeist"), 5, Element.Neutral, [{stat: StatKey.Atk, amount: 0.25, turns: 3}, {stat: StatKey.Matk, amount: 0.25, turns: 3}]),

    dmg(AbilityKey.Slash, L("Tajo", "Slash", "Hieb"), 5, P, Element.Neutral, 1.7),
    dmg(AbilityKey.DoubleCut, L("Corte doble", "Double cut", "Doppelschnitt"), 8, P, Element.Neutral, 0.95, {hits: 2}),
    dmg(AbilityKey.FlameBlade, L("Hoja llameante", "Flame blade", "Flammenklinge"), 10, P, Element.Fire, 1.6, {status: StatusKey.Burn, statusChance: 0.35}),
    buff(AbilityKey.WarCry, L("Grito de guerra", "War cry", "Kriegsschrei"), 8, Element.Neutral, [{stat: StatKey.Atk, amount: 0.35, turns: 3}, {stat: StatKey.Crit, amount: 10, turns: 3}]),

    dmg(AbilityKey.Fireball, L("Bola de fuego", "Fireball", "Feuerball"), 8, M, Element.Fire, 1.8, {status: StatusKey.Burn, statusChance: 0.3}),
    dmg(AbilityKey.FrostNova, L("Nova de escarcha", "Frost nova", "Frostnova"), 10, M, Element.Ice, 1.5, {status: StatusKey.Freeze, statusChance: 0.35}),
    dmg(AbilityKey.ArcaneMissiles, L("Misiles arcanos", "Arcane missiles", "Arkane Geschosse"), 12, M, Element.Neutral, 0.7, {hits: 3}),
    buff(AbilityKey.ManaShield, L("Escudo de maná", "Mana shield", "Manaschild"), 8, Element.Neutral, [{stat: StatKey.Def, amount: 0.4, turns: 3}, {stat: StatKey.Mdef, amount: 0.4, turns: 3}], {healPct: 0.1}),

    dmg(AbilityKey.ArrowRain, L("Lluvia de flechas", "Arrow rain", "Pfeilregen"), 10, P, Element.Nature, 0.55, {hits: 4}),
    dmg(AbilityKey.PoisonArrow, L("Flecha venenosa", "Poison arrow", "Giftpfeil"), 6, P, Element.Nature, 1.3, {status: StatusKey.Poison, statusChance: 0.6}),
    heal(AbilityKey.NaturesBlessing, L("Bendición natural", "Nature's blessing", "Segen der Natur"), 10, Element.Nature, 0.3, 1.2),
    buff(AbilityKey.EagleEye, L("Ojo de águila", "Eagle eye", "Adlerauge"), 6, Element.Neutral, [{stat: StatKey.Crit, amount: 25, turns: 3}, {stat: StatKey.Atk, amount: 0.15, turns: 3}]),

    dmg(AbilityKey.StaffCombo, L("Combo de bastón", "Staff combo", "Stabkombo"), 9, P, Element.Neutral, 0.7, {hits: 3}),
    dmg(AbilityKey.CloudStrike, L("Golpe de nube", "Cloud strike", "Wolkenschlag"), 10, P, Element.Neutral, 2.1),
    buff(AbilityKey.GoldenBody, L("Cuerpo dorado", "Golden body", "Goldener Körper"), 8, Element.Holy, [{stat: StatKey.Def, amount: 0.5, turns: 3}, {stat: StatKey.Mdef, amount: 0.3, turns: 3}]),
    dmg(AbilityKey.HeavenlyThunder, L("Trueno celestial", "Heavenly thunder", "Himmelsdonner"), 12, M, Element.Holy, 1.8),

    dmg(AbilityKey.ScratchFury, L("Furia de zarpazos", "Scratch fury", "Kratzwut"), 8, P, Element.Neutral, 0.5, {hits: 4}),
    dmg(AbilityKey.Pounce, L("Abalanzarse", "Pounce", "Ansprung"), 8, P, Element.Neutral, 1.9, {critBonus: 30}),
    dmg(AbilityKey.HypnoticGaze, L("Mirada hipnótica", "Hypnotic gaze", "Hypnoblick"), 8, M, Element.Dark, 0.6, {status: StatusKey.Sleep, statusChance: 0.65}),
    heal(AbilityKey.NineLives, L("Siete vidas", "Nine lives", "Sieben Leben"), 12, Element.Holy, 0.35, 0.8),

    dmg(AbilityKey.ShieldBash, L("Golpe de escudo", "Shield bash", "Schildstoß"), 6, P, Element.Neutral, 1.4, {buffs: [{stat: StatKey.Def, amount: 0.25, turns: 2}]}),
    dmg(AbilityKey.HolyStrike, L("Golpe sagrado", "Holy strike", "Heiliger Schlag"), 9, P, Element.Holy, 1.8),
    buff(AbilityKey.Fortress, L("Fortaleza", "Fortress", "Festung"), 8, Element.Neutral, [{stat: StatKey.Def, amount: 0.6, turns: 3}, {stat: StatKey.Mdef, amount: 0.4, turns: 3}]),
    heal(AbilityKey.LayOnHands, L("Imposición de manos", "Lay on hands", "Handauflegen"), 10, Element.Holy, 0.3, 1.5),

    dmg(AbilityKey.BloodDrain, L("Drenaje de sangre", "Blood drain", "Blutentzug"), 8, M, Element.Dark, 1.4, {lifesteal: 0.5}),
    dmg(AbilityKey.BatSwarm, L("Enjambre de murciélagos", "Bat swarm", "Fledermausschwarm"), 10, P, Element.Dark, 0.5, {hits: 3, lifesteal: 0.25}),
    dmg(AbilityKey.CharmGaze, L("Mirada seductora", "Charm gaze", "Betörender Blick"), 7, M, Element.Dark, 0.5, {status: StatusKey.Charm, statusChance: 0.6}),
    dmg(AbilityKey.CrimsonFeast, L("Festín carmesí", "Crimson feast", "Purpurnes Festmahl"), 16, M, Element.Dark, 2.2, {lifesteal: 0.35}),

    dmg(AbilityKey.ShadowArrow, L("Flecha sombría", "Shadow arrow", "Schattenpfeil"), 7, P, Element.Dark, 1.7),
    dmg(AbilityKey.VenomVolley, L("Andanada venenosa", "Venom volley", "Giftsalve"), 10, P, Element.Nature, 0.5, {hits: 3, status: StatusKey.Poison, statusChance: 0.45}),
    buff(AbilityKey.NightVeil, L("Velo nocturno", "Night veil", "Nachtschleier"), 8, Element.Dark, [{stat: StatKey.Atk, amount: 0.3, turns: 3}, {stat: StatKey.Crit, amount: 15, turns: 3}]),
    dmg(AbilityKey.SoulRend, L("Desgarro de alma", "Soul rend", "Seelenriss"), 12, M, Element.Dark, 1.9),

    dmg(AbilityKey.HexBolt, L("Rayo maldito", "Hex bolt", "Fluchblitz"), 7, M, Element.Dark, 1.7),
    dmg(AbilityKey.CurseOfSleep, L("Maldición del sueño", "Curse of sleep", "Schlaffluch"), 8, M, Element.Dark, 0.5, {status: StatusKey.Sleep, statusChance: 0.7}),
    dmg(AbilityKey.Hellfire, L("Fuego infernal", "Hellfire", "Höllenfeuer"), 15, M, Element.Fire, 2.3, {status: StatusKey.Burn, statusChance: 0.4}),
    dmg(AbilityKey.SoulSiphon, L("Sifón de almas", "Soul siphon", "Seelensog"), 8, M, Element.Dark, 1.2, {lifesteal: 0.6})
];

export const ABILITIES: Record<AbilityKey, AbilityDef> = Object.fromEntries(ABILITY_LIST.map((def: AbilityDef) => [def.key, def])) as Record<AbilityKey, AbilityDef>;

const TEXT_PHYSICAL: LocalizedText = L("Físico", "Physical", "Physisch");
const TEXT_MAGICAL: LocalizedText = L("Mágico", "Magical", "Magisch");
const TEXT_HEAL: LocalizedText = L("Cura", "Heal", "Heilung");
const TEXT_DRAIN: LocalizedText = L("Robo de vida", "Life drain", "Lebensraub");
const TEXT_TURNS: LocalizedText = L("turnos", "turns", "Züge");

/** Builds a compact, translated description from the ability data. */
export function describeAbility(def: AbilityDef): string {
    const parts: string[] = [];
    if (def.kind === AbilityKind.Damage) {
        parts.push(tr(def.damageType === DamageType.Physical ? TEXT_PHYSICAL : TEXT_MAGICAL));
        parts.push(tr(ELEMENTS[def.element].name));
        const hits: number = def.hits ?? 1;
        parts.push("x" + (def.power ?? 1).toFixed(2).replace(/0$/, "") + (hits > 1 ? " ×" + hits : ""));
        if (def.lifesteal) {
            parts.push(tr(TEXT_DRAIN) + " " + Math.round(def.lifesteal * 100) + "%");
        }
        if (def.status && def.statusChance) {
            parts.push(Math.round(def.statusChance * 100) + "% " + tr(STATUSES[def.status].name));
        }
        if (def.critBonus) {
            parts.push("+" + def.critBonus + "% crit");
        }
    }
    if (def.healPct) {
        parts.push(tr(TEXT_HEAL) + " " + Math.round(def.healPct * 100) + "%" + (def.healPower ? " + " + def.healPower + "×" + statLabel(StatKey.Matk) : ""));
    }
    if (def.buffs) {
        for (const b of def.buffs) {
            const amount: string = b.stat === StatKey.Crit ? "+" + b.amount : "+" + Math.round(b.amount * 100) + "%";
            parts.push(amount + " " + statLabel(b.stat) + " (" + b.turns + " " + tr(TEXT_TURNS) + ")");
        }
    }
    return parts.join(" · ");
}
