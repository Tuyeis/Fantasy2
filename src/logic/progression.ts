import {SaveData} from "../core/save-store";
import {BLUEPRINT_ORDER, BuildingKey} from "../data/buildings";
import {ClassKey, CLASSES} from "../data/hero-classes";
import {ItemKey} from "../data/items";
import {MissionDef, MissionKey, MissionKind, MISSIONS} from "../data/missions";
import {MonsterKey} from "../data/monsters";
import {PerkDef, PerkKey, PERKS} from "../data/perks";
import {countItem, removeItem} from "./inventory";
import {MAX_LEVEL, perkRank, xpToNext} from "./hero-stats";

// ---------------------------------------------------------------- XP / levels

export function grantXp(save: SaveData, amount: number): number {
    const granted: number = Math.round(amount * (1 + 0.1 * perkRank(save, PerkKey.Scholar)));
    save.hero.xp += granted;
    return granted;
}

export function canLevelUp(save: SaveData): boolean {
    return save.hero.level < MAX_LEVEL && save.hero.xp >= xpToNext(save.hero.level);
}

/** Spends XP for one level. Only called from the Guild. */
export function levelUp(save: SaveData): boolean {
    if (!canLevelUp(save)) {
        return false;
    }
    save.hero.xp -= xpToNext(save.hero.level);
    save.hero.level++;
    return true;
}

// ---------------------------------------------------------------- Missions

export function missionProgress(save: SaveData, key: MissionKey): number {
    const def: MissionDef = MISSIONS[key];
    switch (def.kind) {
        case MissionKind.KillMonsters:
            return save.records.kills;
        case MissionKind.KillArmored:
            return save.records.armoredKills;
        case MissionKind.ReachFloor:
            return save.deepestFloor;
        case MissionKind.DefeatBoss:
            return def.boss && save.bossesDefeated.includes(def.boss) ? 1 : 0;
        case MissionKind.OpenChests:
            return save.records.chestsOpened;
        case MissionKind.BefriendBeasts:
            return save.records.beastsBefriended;
        case MissionKind.ClearArena:
            return save.arenaCleared ? 1 : 0;
    }
}

export function isMissionComplete(save: SaveData, key: MissionKey): boolean {
    return missionProgress(save, key) >= MISSIONS[key].target;
}

export function isMissionClaimed(save: SaveData, key: MissionKey): boolean {
    return save.missionsClaimed.includes(key);
}

export function claimMission(save: SaveData, key: MissionKey): boolean {
    if (!isMissionComplete(save, key) || isMissionClaimed(save, key)) {
        return false;
    }
    const def: MissionDef = MISSIONS[key];
    save.hero.gold += def.rewardGold;
    save.hero.diamonds += def.rewardDiamonds;
    save.missionsClaimed.push(key);
    return true;
}

export function claimableMissions(save: SaveData): number {
    return (Object.keys(MISSIONS) as MissionKey[]).filter((key: MissionKey) => isMissionComplete(save, key) && !isMissionClaimed(save, key)).length;
}

// ---------------------------------------------------------------- Buildings

export function isBuildingUnlocked(save: SaveData, key: BuildingKey): boolean {
    return save.unlockedBuildings.includes(key);
}

export function nextLockedBuilding(save: SaveData): BuildingKey | null {
    return BLUEPRINT_ORDER.find((key: BuildingKey) => !isBuildingUnlocked(save, key)) ?? null;
}

export function unlockBuilding(save: SaveData, key: BuildingKey): void {
    if (!isBuildingUnlocked(save, key)) {
        save.unlockedBuildings.push(key);
    }
}

// ---------------------------------------------------------------- Bosses / feats

/** Returns true when it is the first time this boss is defeated. */
export function registerBossKill(save: SaveData, boss: MonsterKey): boolean {
    save.featPoints++;
    save.records.bossKills++;
    if (save.bossesDefeated.includes(boss)) {
        return false;
    }
    save.bossesDefeated.push(boss);
    return true;
}

export function canLearnPerk(save: SaveData, key: PerkKey): boolean {
    const def: PerkDef = PERKS[key];
    return perkRank(save, key) < def.maxRank && save.featPoints >= def.costPerRank;
}

export function learnPerk(save: SaveData, key: PerkKey): boolean {
    if (!canLearnPerk(save, key)) {
        return false;
    }
    save.featPoints -= PERKS[key].costPerRank;
    save.perks[key] = perkRank(save, key) + 1;
    return true;
}

// ---------------------------------------------------------------- Classes

export function missingForClass(save: SaveData, classKey: ClassKey): ItemKey[] {
    const missing: ItemKey[] = [];
    if (countItem(save, ItemKey.ClassTome) < 1) {
        missing.push(ItemKey.ClassTome);
    }
    for (const item of CLASSES[classKey].recipe) {
        if (countItem(save, item) < 1) {
            missing.push(item);
        }
    }
    return missing;
}

/** Consumes the tome and the two recipe items, unlocks and switches to the class. */
export function transformClass(save: SaveData, classKey: ClassKey): boolean {
    if (save.run || missingForClass(save, classKey).length > 0) {
        return false;
    }
    removeItem(save, ItemKey.ClassTome, 1);
    for (const item of CLASSES[classKey].recipe) {
        removeItem(save, item, 1);
    }
    unlockClass(save, classKey);
    save.hero.classKey = classKey;
    return true;
}

export function unlockClass(save: SaveData, classKey: ClassKey): void {
    if (!save.hero.unlockedClasses.includes(classKey)) {
        save.hero.unlockedClasses.push(classKey);
    }
}

/** Switching between already unlocked classes is free, but only in town (the class is locked during a run). */
export function switchClass(save: SaveData, classKey: ClassKey): boolean {
    if (save.run || !save.hero.unlockedClasses.includes(classKey)) {
        return false;
    }
    save.hero.classKey = classKey;
    return true;
}
