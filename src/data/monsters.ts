import {L, LocalizedText} from "../core/i18n";
import {DamageType} from "./abilities";
import {Element} from "./element";
import {StatBlock, stats} from "./stat-block";
import {StatusKey} from "./status-effect";

export enum MonsterKey {
    Slime = "slime",
    Rat = "rat",
    Bat = "bat",
    Goblin = "goblin",
    Mushroom = "mushroom",
    Wolf = "wolf",

    Skeleton = "skeleton",
    Orc = "orc",
    FireImp = "fire_imp",
    IceWisp = "ice_wisp",
    GiantSpider = "giant_spider",
    Harpy = "harpy",
    Zombie = "zombie",

    Minotaur = "minotaur",
    DarkKnight = "dark_knight",
    Lich = "lich",
    FireDrake = "fire_drake",
    Golem = "golem",
    Succubus = "succubus",
    Wraith = "wraith",

    GoblinKing = "goblin_king",
    FrostHydra = "frost_hydra",
    VoidSovereign = "void_sovereign",
    // Town practice target: never in a floor pool, no attacks, no rewards.
    TrainingDummy = "training_dummy"
}

/** Body template; logic/encounter-mode derives movement traits from it. */
export enum MonsterBody {
    Blob = "blob",
    Beast = "beast",
    Flyer = "flyer",
    Humanoid = "humanoid",
    Mushroom = "mushroom",
    Spider = "spider",
    Wisp = "wisp",
    Golem = "golem",
    Dragon = "dragon",
    Hydra = "hydra"
}

export interface MonsterAttack {
    name: LocalizedText;
    type: DamageType;
    element: Element;
    power: number;
    hits: number;
    weight: number;
    status?: StatusKey;
    statusChance?: number;
    lifesteal?: number;
}

export interface MonsterDef {
    key: MonsterKey;
    name: LocalizedText;
    tier: number;
    boss: boolean;
    stats: StatBlock;
    element: Element;
    weak: Element[];
    resist: Element[];
    attacks: MonsterAttack[];
    xp: number;
    gold: number;
    diamonds: number;
    body: MonsterBody;
    colors: {main: string; dark: string; accent: string};
    /** Sprite scale relative to the hero. */
    size: number;
    /** Extra actions per turn once below half HP (bosses). */
    enrageExtraActions: number;
    /** Half chance and one-turn cap for freeze/sleep/charm. */
    controlResistant: boolean;
}

function atk(name: LocalizedText, type: DamageType, element: Element, power: number, extra: Partial<MonsterAttack> = {}): MonsterAttack {
    return {name: name, type: type, element: element, power: power, hits: 1, weight: 1, ...extra};
}

const P: DamageType = DamageType.Physical;
const M: DamageType = DamageType.Magical;
const BITE: LocalizedText = L("Mordisco", "Bite", "Biss");
const CLAW: LocalizedText = L("Zarpazo", "Claw", "Klaue");

type MonsterDefault = "boss" | "diamonds" | "size" | "enrageExtraActions";

/** MonsterDef as written in the table: colors as a tuple, defaulted fields optional, controlResistant derived from boss. */
interface MonsterSpec extends Omit<MonsterDef, MonsterDefault | "colors" | "controlResistant">, Partial<Pick<MonsterDef, MonsterDefault>> {
    colors: [string, string, string];
}

function monster(spec: MonsterSpec): MonsterDef {
    return {
        ...spec,
        boss: spec.boss ?? false,
        diamonds: spec.diamonds ?? 0,
        colors: {main: spec.colors[0], dark: spec.colors[1], accent: spec.colors[2]},
        size: spec.size ?? 1,
        enrageExtraActions: spec.enrageExtraActions ?? 0,
        controlResistant: spec.boss ?? false
    };
}

// stats(hp, mana, atk, def, matk, mdef, crit)
const MONSTER_LIST: MonsterDef[] = [
    // ---------- Tier 1 (floor 1)
    monster({key: MonsterKey.Slime, name: L("Limo", "Slime", "Schleim"), tier: 1, stats: stats(60, 0, 10, 3, 7, 6, 3), element: Element.Nature, weak: [Element.Fire], resist: [Element.Nature],
        attacks: [atk(L("Salpicón", "Splash", "Platscher"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Ácido", "Acid", "Säure"), M, Element.Nature, 1.0, {status: StatusKey.Poison, statusChance: 0.25})],
        xp: 12, gold: 8, body: MonsterBody.Blob, colors: ["#69db7c", "#2f9e44", "#d3f9d8"]}),
    monster({key: MonsterKey.Rat, name: L("Rata gigante", "Giant rat", "Riesenratte"), tier: 1, stats: stats(52, 0, 12, 3, 3, 5, 8), element: Element.Neutral, weak: [], resist: [],
        attacks: [atk(BITE, P, Element.Neutral, 1.0, {weight: 3}), atk(L("Mordisco infecto", "Filthy bite", "Fauler Biss"), P, Element.Nature, 0.9, {status: StatusKey.Poison, statusChance: 0.35})],
        xp: 12, gold: 7, body: MonsterBody.Beast, colors: ["#868e96", "#495057", "#ffc9c9"], size: 0.8}),
    monster({key: MonsterKey.Bat, name: L("Murciélago", "Bat", "Fledermaus"), tier: 1, stats: stats(46, 0, 11, 2, 9, 7, 10), element: Element.Dark, weak: [Element.Holy], resist: [Element.Dark],
        attacks: [atk(BITE, P, Element.Neutral, 1.0, {weight: 2}), atk(L("Chupar sangre", "Blood suck", "Blutsaugen"), P, Element.Dark, 0.8, {lifesteal: 0.5})],
        xp: 13, gold: 8, body: MonsterBody.Flyer, colors: ["#5c5f66", "#25262b", "#fa5252"], size: 0.8}),
    monster({key: MonsterKey.Goblin, name: L("Goblin", "Goblin", "Goblin"), tier: 1, stats: stats(72, 0, 13, 5, 4, 6, 6), element: Element.Neutral, weak: [], resist: [],
        attacks: [atk(L("Garrotazo", "Club", "Keule"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Puñalada doble", "Double stab", "Doppelstich"), P, Element.Neutral, 0.6, {hits: 2})],
        xp: 15, gold: 12, body: MonsterBody.Humanoid, colors: ["#8ce99a", "#2b8a3e", "#a0663a"], size: 0.85}),
    monster({key: MonsterKey.Mushroom, name: L("Seta tóxica", "Toxic shroom", "Giftpilz"), tier: 1, stats: stats(66, 0, 9, 6, 12, 9, 3), element: Element.Nature, weak: [Element.Fire], resist: [Element.Nature, Element.Dark],
        attacks: [atk(L("Esporas", "Spores", "Sporen"), M, Element.Nature, 0.8, {status: StatusKey.Poison, statusChance: 0.5, weight: 2}), atk(L("Nube soporífera", "Sleep cloud", "Schlafwolke"), M, Element.Nature, 0.5, {status: StatusKey.Sleep, statusChance: 0.35})],
        xp: 14, gold: 10, body: MonsterBody.Mushroom, colors: ["#e03131", "#862e2e", "#fff5f5"], size: 0.85}),
    monster({key: MonsterKey.Wolf, name: L("Lobo", "Wolf", "Wolf"), tier: 1, stats: stats(80, 0, 14, 4, 3, 6, 10), element: Element.Nature, weak: [Element.Fire], resist: [Element.Ice],
        attacks: [atk(BITE, P, Element.Neutral, 1.0, {weight: 2}), atk(L("Dentellada", "Savage bite", "Wilder Biss"), P, Element.Neutral, 1.35)],
        xp: 17, gold: 13, body: MonsterBody.Beast, colors: ["#a5a5a5", "#5c5f66", "#ffe066"]}),

    // ---------- Tier 2 (floor 2)
    monster({key: MonsterKey.Skeleton, name: L("Esqueleto", "Skeleton", "Skelett"), tier: 2, stats: stats(105, 0, 24, 14, 10, 8, 6), element: Element.Dark, weak: [Element.Holy], resist: [Element.Dark, Element.Ice],
        attacks: [atk(L("Tajo oxidado", "Rusty slash", "Rostiger Hieb"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Golpe doble", "Twin strike", "Doppelschlag"), P, Element.Neutral, 0.65, {hits: 2})],
        xp: 38, gold: 24, body: MonsterBody.Humanoid, colors: ["#f1f3f5", "#adb5bd", "#495057"]}),
    monster({key: MonsterKey.Orc, name: L("Orco", "Orc", "Ork"), tier: 2, stats: stats(135, 0, 28, 12, 6, 7, 6), element: Element.Neutral, weak: [], resist: [],
        attacks: [atk(L("Hachazo", "Axe chop", "Axthieb"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Golpe brutal", "Brutal smash", "Brutaler Schlag"), P, Element.Neutral, 1.5)],
        xp: 44, gold: 30, body: MonsterBody.Humanoid, colors: ["#74b816", "#3b5b0b", "#a0663a"], size: 1.15}),
    monster({key: MonsterKey.FireImp, name: L("Diablillo ígneo", "Fire imp", "Feuerkobold"), tier: 2, stats: stats(90, 0, 16, 9, 26, 12, 8), element: Element.Fire, weak: [Element.Ice], resist: [Element.Fire],
        attacks: [atk(L("Llamarada", "Flare", "Stichflamme"), M, Element.Fire, 1.0, {weight: 2, status: StatusKey.Burn, statusChance: 0.3}), atk(CLAW, P, Element.Neutral, 1.0)],
        xp: 40, gold: 26, body: MonsterBody.Flyer, colors: ["#ff6b00", "#a33a00", "#ffe066"], size: 0.85}),
    monster({key: MonsterKey.IceWisp, name: L("Fuego fatuo helado", "Ice wisp", "Eisirrlicht"), tier: 2, stats: stats(85, 0, 10, 10, 25, 16, 5), element: Element.Ice, weak: [Element.Fire], resist: [Element.Ice, Element.Nature],
        attacks: [atk(L("Aliento gélido", "Frost breath", "Frostatem"), M, Element.Ice, 1.0, {weight: 2}), atk(L("Prisión de hielo", "Ice prison", "Eisgefängnis"), M, Element.Ice, 0.6, {status: StatusKey.Freeze, statusChance: 0.4})],
        xp: 40, gold: 25, body: MonsterBody.Wisp, colors: ["#a5d8ff", "#1c7ed6", "#ffffff"], size: 0.85}),
    monster({key: MonsterKey.GiantSpider, name: L("Araña gigante", "Giant spider", "Riesenspinne"), tier: 2, stats: stats(110, 0, 25, 11, 12, 9, 8), element: Element.Nature, weak: [Element.Fire], resist: [Element.Nature],
        attacks: [atk(BITE, P, Element.Neutral, 1.0, {weight: 2}), atk(L("Colmillo venenoso", "Venom fang", "Giftzahn"), P, Element.Nature, 0.8, {status: StatusKey.Poison, statusChance: 0.55})],
        xp: 42, gold: 27, body: MonsterBody.Spider, colors: ["#5c3d2e", "#2d1e16", "#ff6b6b"]}),
    monster({key: MonsterKey.Harpy, name: L("Arpía", "Harpy", "Harpyie"), tier: 2, stats: stats(95, 0, 23, 9, 20, 11, 10), element: Element.Neutral, weak: [Element.Ice], resist: [Element.Nature],
        attacks: [atk(L("Garras", "Talons", "Krallen"), P, Element.Neutral, 0.55, {hits: 2, weight: 2}), atk(L("Canto seductor", "Siren song", "Sirenengesang"), M, Element.Dark, 0.6, {status: StatusKey.Charm, statusChance: 0.35})],
        xp: 42, gold: 28, body: MonsterBody.Flyer, colors: ["#e599f7", "#862e9c", "#ffd8a8"]}),
    monster({key: MonsterKey.Zombie, name: L("Zombi", "Zombie", "Zombie"), tier: 2, stats: stats(150, 0, 24, 10, 6, 6, 3), element: Element.Dark, weak: [Element.Fire, Element.Holy], resist: [Element.Dark, Element.Nature],
        attacks: [atk(L("Zarpazo pútrido", "Rotten claw", "Faulige Klaue"), P, Element.Neutral, 1.0, {weight: 3}), atk(BITE, P, Element.Dark, 1.0, {status: StatusKey.Poison, statusChance: 0.4})],
        xp: 40, gold: 22, body: MonsterBody.Humanoid, colors: ["#94d82d", "#5c7a1f", "#5f3dc4"]}),

    // ---------- Tier 3 (floor 3)
    monster({key: MonsterKey.Minotaur, name: L("Minotauro", "Minotaur", "Minotaurus"), tier: 3, stats: stats(270, 0, 44, 24, 10, 16, 8), element: Element.Neutral, weak: [], resist: [],
        attacks: [atk(L("Embestida", "Charge", "Ansturm"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Hacha giratoria", "Whirling axe", "Wirbelaxt"), P, Element.Neutral, 0.6, {hits: 3})],
        xp: 95, gold: 60, body: MonsterBody.Humanoid, colors: ["#8d5a3a", "#4a2d1c", "#e9ecef"], size: 1.3}),
    monster({key: MonsterKey.DarkKnight, name: L("Caballero oscuro", "Dark knight", "Dunkler Ritter"), tier: 3, stats: stats(250, 0, 40, 34, 20, 22, 8), element: Element.Dark, weak: [Element.Holy], resist: [Element.Dark],
        attacks: [atk(L("Espada negra", "Black blade", "Schwarze Klinge"), P, Element.Dark, 1.0, {weight: 3}), atk(L("Tajo del abismo", "Abyss slash", "Abgrundhieb"), P, Element.Dark, 1.4)],
        xp: 100, gold: 65, body: MonsterBody.Humanoid, colors: ["#343a40", "#141517", "#be4bdb"], size: 1.15}),
    monster({key: MonsterKey.Lich, name: L("Liche", "Lich", "Lich"), tier: 3, stats: stats(210, 0, 18, 18, 45, 30, 6), element: Element.Dark, weak: [Element.Holy, Element.Fire], resist: [Element.Dark, Element.Ice],
        attacks: [atk(L("Rayo necrótico", "Necrotic ray", "Nekrostrahl"), M, Element.Dark, 1.0, {weight: 3}), atk(L("Sueño eterno", "Eternal slumber", "Ewiger Schlummer"), M, Element.Dark, 0.5, {status: StatusKey.Sleep, statusChance: 0.4}), atk(L("Drenar vida", "Life drain", "Leben entziehen"), M, Element.Dark, 0.9, {lifesteal: 0.5})],
        xp: 105, gold: 70, body: MonsterBody.Humanoid, colors: ["#5f3dc4", "#2b1a66", "#8ce99a"]}),
    monster({key: MonsterKey.FireDrake, name: L("Draco ígneo", "Fire drake", "Feuerdrache"), tier: 3, stats: stats(260, 0, 38, 24, 42, 22, 8), element: Element.Fire, weak: [Element.Ice], resist: [Element.Fire, Element.Nature],
        attacks: [atk(L("Aliento de fuego", "Fire breath", "Feueratem"), M, Element.Fire, 1.0, {weight: 2, status: StatusKey.Burn, statusChance: 0.35}), atk(CLAW, P, Element.Neutral, 1.0, {weight: 2})],
        xp: 105, gold: 70, body: MonsterBody.Dragon, colors: ["#fa5252", "#a61e1e", "#ffd43b"], size: 1.2}),
    monster({key: MonsterKey.Golem, name: L("Gólem", "Golem", "Golem"), tier: 3, stats: stats(330, 0, 42, 42, 10, 18, 3), element: Element.Neutral, weak: [Element.Nature], resist: [Element.Fire, Element.Ice],
        attacks: [atk(L("Puño de piedra", "Stone fist", "Steinfaust"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Terremoto", "Quake", "Erdbeben"), P, Element.Nature, 1.5)],
        xp: 100, gold: 60, body: MonsterBody.Golem, colors: ["#868e96", "#495057", "#74c0fc"], size: 1.3}),
    monster({key: MonsterKey.Succubus, name: L("Súcubo", "Succubus", "Sukkubus"), tier: 3, stats: stats(220, 0, 28, 18, 42, 26, 10), element: Element.Dark, weak: [Element.Holy], resist: [Element.Dark, Element.Fire],
        attacks: [atk(L("Látigo", "Whip", "Peitsche"), P, Element.Neutral, 0.55, {hits: 2, weight: 2}), atk(L("Beso fatal", "Fatal kiss", "Tödlicher Kuss"), M, Element.Dark, 0.8, {status: StatusKey.Charm, statusChance: 0.45, lifesteal: 0.4})],
        xp: 100, gold: 68, body: MonsterBody.Humanoid, colors: ["#e64980", "#8a1c4a", "#212529"]}),
    monster({key: MonsterKey.Wraith, name: L("Espectro", "Wraith", "Gespenst"), tier: 3, stats: stats(200, 0, 33, 16, 40, 30, 10), element: Element.Dark, weak: [Element.Holy, Element.Fire], resist: [Element.Dark, Element.Ice, Element.Nature],
        attacks: [atk(L("Toque helado", "Chill touch", "Eisige Berührung"), M, Element.Ice, 1.0, {weight: 2, status: StatusKey.Freeze, statusChance: 0.25}), atk(L("Lamento", "Wail", "Klagen"), M, Element.Dark, 1.1)],
        xp: 98, gold: 64, body: MonsterBody.Wisp, colors: ["#495057", "#1a1b1e", "#b2f2bb"], size: 1.1}),

    // ---------- Bosses
    monster({key: MonsterKey.GoblinKing, name: L("Rey Goblin Grukk", "Goblin King Grukk", "Goblinkönig Grukk"), tier: 1, boss: true, stats: stats(380, 0, 15, 9, 10, 10, 8), element: Element.Neutral, weak: [Element.Fire], resist: [],
        attacks: [atk(L("Cetro real", "Royal scepter", "Königszepter"), P, Element.Neutral, 1.0, {weight: 3}), atk(L("Aplastamiento real", "Royal smash", "Königlicher Schlag"), P, Element.Neutral, 1.5), atk(L("Ráfaga de golpes", "Flurry", "Schlaghagel"), P, Element.Neutral, 0.55, {hits: 3})],
        xp: 150, gold: 150, diamonds: 1, body: MonsterBody.Humanoid, colors: ["#8ce99a", "#2b8a3e", "#fcc419"], size: 1.5, enrageExtraActions: 0}),
    monster({key: MonsterKey.FrostHydra, name: L("Hidra de escarcha", "Frost hydra", "Frosthydra"), tier: 2, boss: true, stats: stats(540, 0, 24, 15, 26, 15, 6), element: Element.Ice, weak: [Element.Fire], resist: [Element.Ice, Element.Nature],
        attacks: [atk(L("Tres cabezas", "Three heads", "Drei Köpfe"), P, Element.Neutral, 0.5, {hits: 3, weight: 3}), atk(L("Ventisca", "Blizzard", "Schneesturm"), M, Element.Ice, 1.1, {status: StatusKey.Freeze, statusChance: 0.3, weight: 2}), atk(L("Aliento venenoso", "Venom breath", "Giftatem"), M, Element.Nature, 0.9, {status: StatusKey.Poison, statusChance: 0.5})],
        xp: 400, gold: 350, diamonds: 2, body: MonsterBody.Hydra, colors: ["#74c0fc", "#1864ab", "#e7f5ff"], size: 1.7, enrageExtraActions: 1}),
    monster({key: MonsterKey.VoidSovereign, name: L("Soberano del Vacío", "Void Sovereign", "Leeren-Souverän"), tier: 3, boss: true, stats: stats(1150, 0, 42, 25, 44, 25, 10), element: Element.Dark, weak: [Element.Holy], resist: [Element.Dark, Element.Ice],
        attacks: [atk(L("Garra del vacío", "Void claw", "Leerenklaue"), P, Element.Dark, 1.0, {weight: 3}), atk(L("Aliento abisal", "Abyssal breath", "Abgrundatem"), M, Element.Dark, 1.2, {weight: 2, status: StatusKey.Burn, statusChance: 0.3}), atk(L("Tormenta de sombras", "Shadow storm", "Schattensturm"), M, Element.Dark, 0.45, {hits: 4}), atk(L("Mirada del vacío", "Void gaze", "Leerenblick"), M, Element.Dark, 0.6, {status: StatusKey.Charm, statusChance: 0.4})],
        xp: 1000, gold: 800, diamonds: 4, body: MonsterBody.Dragon, colors: ["#3b1f6b", "#140a26", "#e599f7"], size: 2.0, enrageExtraActions: 1}),
    monster({key: MonsterKey.TrainingDummy, name: L("Muñeco de práctica", "Training dummy", "Übungspuppe"), tier: 1, stats: stats(5000, 0, 0, 0, 0, 0, 0), element: Element.Neutral, weak: [], resist: [],
        attacks: [], xp: 0, gold: 0, body: MonsterBody.Golem, colors: ["#c9a56a", "#5a4122", "#e8e2d0"]})
];

export const MONSTERS: Record<MonsterKey, MonsterDef> = Object.fromEntries(MONSTER_LIST.map((def: MonsterDef) => [def.key, def])) as Record<MonsterKey, MonsterDef>;

/** Stat changes of the "armored" variant. */
export const ARMORED_DEF_MULT: number = 1.8;
export const ARMORED_MDEF_MULT: number = 1.4;
export const ARMORED_HP_MULT: number = 1.2;
export const ARMORED_REWARD_MULT: number = 1.5;
