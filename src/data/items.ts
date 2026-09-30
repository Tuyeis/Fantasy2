import {L, LocalizedText} from "../core/i18n";
import {StatBlock} from "./stat-block";

export enum ItemCategory {
    Potion = "potion",
    Weapon = "weapon",
    Armor = "armor",
    Shield = "shield",
    Helmet = "helmet",
    Boots = "boots",
    Accessory = "accessory",
    Material = "material",
    Special = "special"
}

export enum EquipSlot {
    Weapon = "weapon",
    Armor = "armor",
    Shield = "shield",
    Helmet = "helmet",
    Boots = "boots",
    Accessory = "accessory"
}

export const ALL_SLOTS: EquipSlot[] = [EquipSlot.Weapon, EquipSlot.Armor, EquipSlot.Shield, EquipSlot.Helmet, EquipSlot.Boots, EquipSlot.Accessory];

export enum IconShape {
    Potion = "potion",
    Sword = "sword",
    Dagger = "dagger",
    Staff = "staff",
    Bow = "bow",
    Scythe = "scythe",
    Armor = "armor",
    Robe = "robe",
    Shield = "shield",
    Helmet = "helmet",
    Hat = "hat",
    Crown = "crown",
    Boots = "boots",
    Ring = "ring",
    Amulet = "amulet",
    Ore = "ore",
    Gem = "gem",
    Essence = "essence",
    Tome = "tome"
}

export enum ItemKey {
    PotionSmall = "potion_small",
    PotionMedium = "potion_medium",
    PotionLarge = "potion_large",
    EtherSmall = "ether_small",
    EtherLarge = "ether_large",
    Elixir = "elixir",
    Antidote = "antidote",

    WoodenSword = "wooden_sword",
    IronSword = "iron_sword",
    SteelSword = "steel_sword",
    DragonBlade = "dragon_blade",
    Dagger = "dagger",
    MageStaff = "mage_staff",
    ArcaneStaff = "arcane_staff",
    OakBow = "oak_bow",
    Quarterstaff = "quarterstaff",
    ShadowScythe = "shadow_scythe",

    ClothTunic = "cloth_tunic",
    LeatherArmor = "leather_armor",
    MageRobe = "mage_robe",
    ChainMail = "chain_mail",
    PlateArmor = "plate_armor",
    DragonMail = "dragon_mail",

    WoodenShield = "wooden_shield",
    IronShield = "iron_shield",
    MirrorShield = "mirror_shield",

    LeatherCap = "leather_cap",
    KnightHelmet = "knight_helmet",
    WitchHat = "witch_hat",
    CrownOfValor = "crown_of_valor",

    LeatherBoots = "leather_boots",
    FeatherBoots = "feather_boots",
    IronGreaves = "iron_greaves",

    CopperRing = "copper_ring",
    RubyRing = "ruby_ring",
    SapphireAmulet = "sapphire_amulet",
    LifeCharm = "life_charm",

    IronOre = "iron_ore",
    GoldOre = "gold_ore",
    RubyOre = "ruby_ore",
    Amethyst = "amethyst",
    Emerald = "emerald",
    Topaz = "topaz",
    Onyx = "onyx",
    Moonstone = "moonstone",
    FireEssence = "fire_essence",
    ShadowEssence = "shadow_essence",
    HolyEssence = "holy_essence",

    ClassTome = "class_tome"
}

export interface ItemHeal {
    hp?: number;
    mana?: number;
    cureStatus?: boolean;
}

export interface ItemDef {
    key: ItemKey;
    name: LocalizedText;
    desc: LocalizedText;
    category: ItemCategory;
    /** Buy price in gold (sell price is half). */
    price: number;
    /** Optional alternative price in diamonds (premium corner). */
    diamondPrice?: number;
    stats?: Partial<StatBlock>;
    heal?: ItemHeal;
    icon: IconShape;
    color: string;
    /** Sold by the town shop for gold. */
    inShop: boolean;
}

function item(key: ItemKey, category: ItemCategory, icon: IconShape, color: string, price: number, name: LocalizedText, desc: LocalizedText, extra: Partial<ItemDef> = {}): ItemDef {
    return {key: key, name: name, desc: desc, category: category, price: price, icon: icon, color: color, inShop: false, ...extra};
}

const NO_DESC: LocalizedText = L("", "", "");

const ITEM_LIST: ItemDef[] = [
    // Potions
    item(ItemKey.PotionSmall, ItemCategory.Potion, IconShape.Potion, "#e5484d", 25, L("Poción pequeña", "Small potion", "Kleiner Trank"), L("Restaura 60 PV.", "Restores 60 HP.", "Stellt 60 LP her."), {heal: {hp: 60}, inShop: true}),
    item(ItemKey.PotionMedium, ItemCategory.Potion, IconShape.Potion, "#d6336c", 60, L("Poción mediana", "Medium potion", "Mittlerer Trank"), L("Restaura 150 PV.", "Restores 150 HP.", "Stellt 150 LP her."), {heal: {hp: 150}, inShop: true}),
    item(ItemKey.PotionLarge, ItemCategory.Potion, IconShape.Potion, "#a61e4d", 130, L("Poción grande", "Large potion", "Großer Trank"), L("Restaura 350 PV.", "Restores 350 HP.", "Stellt 350 LP her."), {heal: {hp: 350}, inShop: true}),
    item(ItemKey.EtherSmall, ItemCategory.Potion, IconShape.Potion, "#4dabf7", 30, L("Éter pequeño", "Small ether", "Kleiner Äther"), L("Restaura 25 de maná.", "Restores 25 mana.", "Stellt 25 Mana her."), {heal: {mana: 25}, inShop: true}),
    item(ItemKey.EtherLarge, ItemCategory.Potion, IconShape.Potion, "#1c7ed6", 85, L("Éter grande", "Large ether", "Großer Äther"), L("Restaura 70 de maná.", "Restores 70 mana.", "Stellt 70 Mana her."), {heal: {mana: 70}, inShop: true}),
    item(ItemKey.Elixir, ItemCategory.Potion, IconShape.Potion, "#f59f00", 220, L("Elixir", "Elixir", "Elixier"), L("Restaura 300 PV y 100 de maná y cura estados.", "Restores 300 HP, 100 mana and cures ailments.", "Stellt 300 LP, 100 Mana her und heilt Leiden."), {heal: {hp: 300, mana: 100, cureStatus: true}, inShop: true, diamondPrice: 2}),
    item(ItemKey.Antidote, ItemCategory.Potion, IconShape.Potion, "#82c91e", 20, L("Antídoto", "Antidote", "Gegengift"), L("Cura veneno, quemadura, sueño y hechizo.", "Cures poison, burn, sleep and charm.", "Heilt Gift, Verbrennung, Schlaf und Betörung."), {heal: {cureStatus: true}, inShop: true}),

    // Weapons
    item(ItemKey.WoodenSword, ItemCategory.Weapon, IconShape.Sword, "#b07b45", 30, L("Espada de madera", "Wooden sword", "Holzschwert"), NO_DESC, {stats: {atk: 4}, inShop: true}),
    item(ItemKey.IronSword, ItemCategory.Weapon, IconShape.Sword, "#adb5bd", 95, L("Espada de hierro", "Iron sword", "Eisenschwert"), NO_DESC, {stats: {atk: 10}, inShop: true}),
    item(ItemKey.SteelSword, ItemCategory.Weapon, IconShape.Sword, "#dee2e6", 210, L("Espada de acero", "Steel sword", "Stahlschwert"), NO_DESC, {stats: {atk: 18, crit: 2}}),
    item(ItemKey.DragonBlade, ItemCategory.Weapon, IconShape.Sword, "#ff6b6b", 420, L("Hoja de dragón", "Dragon blade", "Drachenklinge"), NO_DESC, {stats: {atk: 30, crit: 5}}),
    item(ItemKey.Dagger, ItemCategory.Weapon, IconShape.Dagger, "#ced4da", 60, L("Daga", "Dagger", "Dolch"), NO_DESC, {stats: {atk: 6, crit: 6}, inShop: true}),
    item(ItemKey.MageStaff, ItemCategory.Weapon, IconShape.Staff, "#9775fa", 95, L("Bastón de mago", "Mage staff", "Magierstab"), NO_DESC, {stats: {matk: 10, mana: 10}, inShop: true}),
    item(ItemKey.ArcaneStaff, ItemCategory.Weapon, IconShape.Staff, "#5f3dc4", 230, L("Bastón arcano", "Arcane staff", "Arkaner Stab"), NO_DESC, {stats: {matk: 22, mana: 20}}),
    item(ItemKey.OakBow, ItemCategory.Weapon, IconShape.Bow, "#8d6e45", 85, L("Arco de roble", "Oak bow", "Eichenbogen"), NO_DESC, {stats: {atk: 8, crit: 4}, inShop: true}),
    item(ItemKey.Quarterstaff, ItemCategory.Weapon, IconShape.Staff, "#c08a3e", 75, L("Bastón de combate", "Quarterstaff", "Kampfstab"), NO_DESC, {stats: {atk: 6, matk: 5}, inShop: true}),
    item(ItemKey.ShadowScythe, ItemCategory.Weapon, IconShape.Scythe, "#7048e8", 400, L("Guadaña sombría", "Shadow scythe", "Schattensense"), NO_DESC, {stats: {atk: 20, matk: 20}}),

    // Armor
    item(ItemKey.ClothTunic, ItemCategory.Armor, IconShape.Robe, "#c5a47e", 40, L("Túnica de tela", "Cloth tunic", "Stofftunika"), NO_DESC, {stats: {def: 3, mdef: 3}, inShop: true}),
    item(ItemKey.LeatherArmor, ItemCategory.Armor, IconShape.Armor, "#a0663a", 85, L("Armadura de cuero", "Leather armor", "Lederrüstung"), NO_DESC, {stats: {def: 7, mdef: 2}, inShop: true}),
    item(ItemKey.MageRobe, ItemCategory.Armor, IconShape.Robe, "#7950f2", 140, L("Túnica de mago", "Mage robe", "Magierrobe"), NO_DESC, {stats: {mdef: 10, matk: 5, mana: 10}, inShop: true}),
    item(ItemKey.ChainMail, ItemCategory.Armor, IconShape.Armor, "#adb5bd", 160, L("Cota de malla", "Chain mail", "Kettenhemd"), NO_DESC, {stats: {def: 13, mdef: 3}, inShop: true}),
    item(ItemKey.PlateArmor, ItemCategory.Armor, IconShape.Armor, "#dee2e6", 300, L("Armadura de placas", "Plate armor", "Plattenrüstung"), NO_DESC, {stats: {def: 22, hp: 40}, inShop: true}),
    item(ItemKey.DragonMail, ItemCategory.Armor, IconShape.Armor, "#e03131", 480, L("Malla de dragón", "Dragon mail", "Drachenpanzer"), NO_DESC, {stats: {def: 28, mdef: 18, hp: 60}}),

    // Shields
    item(ItemKey.WoodenShield, ItemCategory.Shield, IconShape.Shield, "#9c6b3c", 40, L("Escudo de madera", "Wooden shield", "Holzschild"), NO_DESC, {stats: {def: 3}, inShop: true}),
    item(ItemKey.IronShield, ItemCategory.Shield, IconShape.Shield, "#adb5bd", 120, L("Escudo de hierro", "Iron shield", "Eisenschild"), NO_DESC, {stats: {def: 8, mdef: 2}, inShop: true}),
    item(ItemKey.MirrorShield, ItemCategory.Shield, IconShape.Shield, "#99e9f2", 260, L("Escudo espejo", "Mirror shield", "Spiegelschild"), NO_DESC, {stats: {def: 8, mdef: 14}}),

    // Helmets
    item(ItemKey.LeatherCap, ItemCategory.Helmet, IconShape.Helmet, "#a0663a", 35, L("Gorro de cuero", "Leather cap", "Lederkappe"), NO_DESC, {stats: {def: 2, mdef: 1}, inShop: true}),
    item(ItemKey.KnightHelmet, ItemCategory.Helmet, IconShape.Helmet, "#ced4da", 110, L("Yelmo de caballero", "Knight helmet", "Ritterhelm"), NO_DESC, {stats: {def: 6, hp: 20}, inShop: true}),
    item(ItemKey.WitchHat, ItemCategory.Helmet, IconShape.Hat, "#5c3d8f", 100, L("Sombrero de bruja", "Witch hat", "Hexenhut"), NO_DESC, {stats: {matk: 6, mdef: 4, mana: 10}, inShop: true}),
    item(ItemKey.CrownOfValor, ItemCategory.Helmet, IconShape.Crown, "#fcc419", 380, L("Corona del valor", "Crown of valor", "Krone der Tapferkeit"), NO_DESC, {stats: {atk: 8, matk: 8, hp: 40}}),

    // Boots
    item(ItemKey.LeatherBoots, ItemCategory.Boots, IconShape.Boots, "#8b5a2b", 40, L("Botas de cuero", "Leather boots", "Lederstiefel"), NO_DESC, {stats: {def: 2, crit: 1}, inShop: true}),
    item(ItemKey.FeatherBoots, ItemCategory.Boots, IconShape.Boots, "#e9ecef", 95, L("Botas de pluma", "Feather boots", "Federstiefel"), NO_DESC, {stats: {def: 2, crit: 5}, inShop: true}),
    item(ItemKey.IronGreaves, ItemCategory.Boots, IconShape.Boots, "#868e96", 200, L("Grebas de hierro", "Iron greaves", "Eisenbeinschienen"), NO_DESC, {stats: {def: 9, hp: 20}}),

    // Accessories
    item(ItemKey.CopperRing, ItemCategory.Accessory, IconShape.Ring, "#d9480f", 50, L("Anillo de cobre", "Copper ring", "Kupferring"), NO_DESC, {stats: {atk: 2, matk: 2}, inShop: true}),
    item(ItemKey.RubyRing, ItemCategory.Accessory, IconShape.Ring, "#e03131", 220, L("Anillo de rubí", "Ruby ring", "Rubinring"), NO_DESC, {stats: {atk: 7, crit: 3}}),
    item(ItemKey.SapphireAmulet, ItemCategory.Accessory, IconShape.Amulet, "#1971c2", 220, L("Amuleto de zafiro", "Sapphire amulet", "Saphiramulett"), NO_DESC, {stats: {matk: 8, mana: 20}}),
    item(ItemKey.LifeCharm, ItemCategory.Accessory, IconShape.Amulet, "#40c057", 300, L("Talismán vital", "Life charm", "Lebensamulett"), NO_DESC, {stats: {hp: 60, mdef: 5}}),

    // Materials
    item(ItemKey.IronOre, ItemCategory.Material, IconShape.Ore, "#868e96", 30, L("Mineral de hierro", "Iron ore", "Eisenerz"), L("Material de forja.", "Forging material.", "Schmiedematerial."), {inShop: true}),
    item(ItemKey.GoldOre, ItemCategory.Material, IconShape.Ore, "#fab005", 70, L("Mineral de oro", "Gold ore", "Golderz"), L("Forja avanzada. Receta de Wukong.", "Advanced forging. Wukong recipe.", "Fortgeschrittenes Schmieden. Wukong-Rezept."), {diamondPrice: 1}),
    item(ItemKey.RubyOre, ItemCategory.Material, IconShape.Ore, "#c92a2a", 60, L("Mineral de rubí", "Ruby ore", "Rubinerz"), L("Receta del Vampiro.", "Vampire recipe.", "Vampir-Rezept."), {diamondPrice: 1}),
    item(ItemKey.Amethyst, ItemCategory.Material, IconShape.Gem, "#9c36b5", 55, L("Amatista", "Amethyst", "Amethyst"), L("Receta del Mago.", "Mage recipe.", "Magier-Rezept."), {diamondPrice: 1}),
    item(ItemKey.Emerald, ItemCategory.Material, IconShape.Gem, "#2f9e44", 55, L("Esmeralda", "Emerald", "Smaragd"), L("Receta de la Elfa.", "Elf recipe.", "Elfen-Rezept."), {diamondPrice: 1}),
    item(ItemKey.Topaz, ItemCategory.Material, IconShape.Gem, "#f08c00", 55, L("Topacio", "Topaz", "Topas"), L("Receta del Gato.", "Cat recipe.", "Katzen-Rezept."), {diamondPrice: 1}),
    item(ItemKey.Onyx, ItemCategory.Material, IconShape.Gem, "#343a40", 70, L("Ónice", "Onyx", "Onyx"), L("Receta de la Bruja Oscura.", "Dark Witch recipe.", "Rezept der Dunklen Hexe."), {diamondPrice: 1}),
    item(ItemKey.Moonstone, ItemCategory.Material, IconShape.Gem, "#d0ebff", 90, L("Piedra lunar", "Moonstone", "Mondstein"), L("Material raro. Se vende bien.", "Rare material. Sells well.", "Seltenes Material. Gut verkäuflich."), {}),
    item(ItemKey.FireEssence, ItemCategory.Material, IconShape.Essence, "#ff6b00", 50, L("Esencia ígnea", "Fire essence", "Feueressenz"), L("Material raro. Se vende bien.", "Rare material. Sells well.", "Seltenes Material. Gut verkäuflich."), {}),
    item(ItemKey.ShadowEssence, ItemCategory.Material, IconShape.Essence, "#6741d9", 65, L("Esencia sombría", "Shadow essence", "Schattenessenz"), L("Receta del Elfo Oscuro.", "Dark Elf recipe.", "Dunkelelfen-Rezept."), {diamondPrice: 1}),
    item(ItemKey.HolyEssence, ItemCategory.Material, IconShape.Essence, "#ffe066", 65, L("Esencia sagrada", "Holy essence", "Heilige Essenz"), L("Material raro. Se vende bien.", "Rare material. Sells well.", "Seltenes Material. Gut verkäuflich."), {}),

    // Special
    item(ItemKey.ClassTome, ItemCategory.Special, IconShape.Tome, "#e8590c", 150, L("Tomo de clase", "Class tome", "Klassenfolio"), L("Necesario para cambiar a una clase avanzada.", "Required to become an advanced class.", "Nötig für eine fortgeschrittene Klasse."), {diamondPrice: 3})
];

export const ITEMS: Record<ItemKey, ItemDef> = Object.fromEntries(ITEM_LIST.map((def: ItemDef) => [def.key, def])) as Record<ItemKey, ItemDef>;

const CATEGORY_TO_SLOT: Partial<Record<ItemCategory, EquipSlot>> = {
    [ItemCategory.Weapon]: EquipSlot.Weapon,
    [ItemCategory.Armor]: EquipSlot.Armor,
    [ItemCategory.Shield]: EquipSlot.Shield,
    [ItemCategory.Helmet]: EquipSlot.Helmet,
    [ItemCategory.Boots]: EquipSlot.Boots,
    [ItemCategory.Accessory]: EquipSlot.Accessory
};

export function slotOf(key: ItemKey): EquipSlot | null {
    return CATEGORY_TO_SLOT[ITEMS[key].category] ?? null;
}

export function isGear(key: ItemKey): boolean {
    return slotOf(key) !== null;
}

export function sellPrice(key: ItemKey): number {
    return Math.max(1, Math.floor(ITEMS[key].price / 2));
}
