import {ItemKey} from "./items";
import {MonsterKey} from "./monsters";

export interface LootEntry {
    item: ItemKey;
    weight: number;
}

export interface FloorDef {
    floor: number;
    /** Grid is size x size rooms. */
    size: number;
    /** How many won combats per floor grant gold and item drops. */
    rewardCap: number;
    pool: MonsterKey[];
    boss: MonsterKey;
    armoredChance: number;
    /** Probability that a (non-capped) combat drops an item. */
    dropChance: number;
    loot: LootEntry[];
    /** Colours of the dungeon theme. */
    floorColor: string;
    floorAlt: string;
    wallColor: string;
    wallTop: string;
}

export const LAST_FLOOR: number = 3;

const LOOT_TIER_1: LootEntry[] = [
    {item: ItemKey.PotionSmall, weight: 10},
    {item: ItemKey.EtherSmall, weight: 6},
    {item: ItemKey.Antidote, weight: 4},
    {item: ItemKey.IronOre, weight: 7},
    {item: ItemKey.Amethyst, weight: 3},
    {item: ItemKey.Emerald, weight: 3},
    {item: ItemKey.Topaz, weight: 3},
    {item: ItemKey.RubyOre, weight: 3},
    {item: ItemKey.GoldOre, weight: 2},
    {item: ItemKey.LeatherCap, weight: 2},
    {item: ItemKey.LeatherBoots, weight: 2},
    {item: ItemKey.WoodenShield, weight: 2},
    {item: ItemKey.Dagger, weight: 2},
    {item: ItemKey.CopperRing, weight: 2},
    {item: ItemKey.LeatherArmor, weight: 1}
];

const LOOT_TIER_2: LootEntry[] = [
    {item: ItemKey.PotionMedium, weight: 10},
    {item: ItemKey.EtherSmall, weight: 6},
    {item: ItemKey.Antidote, weight: 3},
    {item: ItemKey.IronOre, weight: 6},
    {item: ItemKey.GoldOre, weight: 4},
    {item: ItemKey.Onyx, weight: 3},
    {item: ItemKey.ShadowEssence, weight: 3},
    {item: ItemKey.FireEssence, weight: 3},
    {item: ItemKey.Amethyst, weight: 2},
    {item: ItemKey.Emerald, weight: 2},
    {item: ItemKey.Topaz, weight: 2},
    {item: ItemKey.SteelSword, weight: 2},
    {item: ItemKey.ArcaneStaff, weight: 2},
    {item: ItemKey.MirrorShield, weight: 2},
    {item: ItemKey.IronGreaves, weight: 2},
    {item: ItemKey.RubyRing, weight: 2},
    {item: ItemKey.SapphireAmulet, weight: 2},
    {item: ItemKey.ChainMail, weight: 1},
    {item: ItemKey.KnightHelmet, weight: 1}
];

const LOOT_TIER_3: LootEntry[] = [
    {item: ItemKey.PotionLarge, weight: 10},
    {item: ItemKey.EtherLarge, weight: 6},
    {item: ItemKey.Elixir, weight: 3},
    {item: ItemKey.GoldOre, weight: 5},
    {item: ItemKey.Moonstone, weight: 4},
    {item: ItemKey.HolyEssence, weight: 4},
    {item: ItemKey.ShadowEssence, weight: 2},
    {item: ItemKey.Onyx, weight: 2},
    {item: ItemKey.DragonBlade, weight: 2},
    {item: ItemKey.ShadowScythe, weight: 2},
    {item: ItemKey.DragonMail, weight: 2},
    {item: ItemKey.CrownOfValor, weight: 2},
    {item: ItemKey.LifeCharm, weight: 2},
    {item: ItemKey.PlateArmor, weight: 1}
];

export const FLOORS: FloorDef[] = [
    {
        floor: 1, size: 3, rewardCap: 5,
        pool: [MonsterKey.Slime, MonsterKey.Rat, MonsterKey.Bat, MonsterKey.Goblin, MonsterKey.Mushroom, MonsterKey.Wolf],
        boss: MonsterKey.GoblinKing, armoredChance: 0.12, dropChance: 0.55, loot: LOOT_TIER_1,
        floorColor: "#665b4a", floorAlt: "#6e6352", wallColor: "#2b2620", wallTop: "#7d6e57"
    },
    {
        floor: 2, size: 4, rewardCap: 8,
        pool: [MonsterKey.Skeleton, MonsterKey.Orc, MonsterKey.FireImp, MonsterKey.IceWisp, MonsterKey.GiantSpider, MonsterKey.Harpy, MonsterKey.Zombie],
        boss: MonsterKey.FrostHydra, armoredChance: 0.2, dropChance: 0.5, loot: LOOT_TIER_2,
        floorColor: "#48596b", floorAlt: "#4f6275", wallColor: "#1b232c", wallTop: "#62809c"
    },
    {
        floor: 3, size: 5, rewardCap: 11,
        pool: [MonsterKey.Minotaur, MonsterKey.DarkKnight, MonsterKey.Lich, MonsterKey.FireDrake, MonsterKey.Golem, MonsterKey.Succubus, MonsterKey.Wraith],
        boss: MonsterKey.VoidSovereign, armoredChance: 0.28, dropChance: 0.45, loot: LOOT_TIER_3,
        floorColor: "#503e5a", floorAlt: "#584563", wallColor: "#1a121e", wallTop: "#86649a"
    }
];

export function floorDef(floor: number): FloorDef {
    return FLOORS[Math.max(1, Math.min(LAST_FLOOR, floor)) - 1];
}
