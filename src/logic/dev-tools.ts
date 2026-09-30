import {SaveData} from "../core/save-store";
import {ClassKey} from "../data/hero-classes";
import {TALENT_TREES, TalentTreeDef} from "../data/talents";
import {MAX_LEVEL} from "./hero-stats";
import {unlockClass} from "./progression";
import {pointsInTree} from "./talents";

/** Testing tools ("god mode" trainer in town). Only in the dev server, never in a built game. */
export const DEV_TOOLS_ENABLED: boolean = import.meta.env.DEV;

function clearTrees(save: SaveData, classKey: ClassKey): void {
    for (const tree of TALENT_TREES[classKey]) {
        for (const def of tree.talents) {
            delete save.hero.talents[def.key];
        }
    }
}

function spent(save: SaveData, classKey: ClassKey): number {
    return TALENT_TREES[classKey].reduce((sum: number, tree: TalentTreeDef) => sum + pointsInTree(save, tree), 0);
}

/** After lowering the level, give back talents the hero can no longer afford (class tree first, then the Novice one). */
function trimTalentsToLevel(save: SaveData): void {
    const earned: number = save.hero.level - 1;
    const classSpent: number = save.hero.classKey === ClassKey.Novice ? 0 : spent(save, save.hero.classKey);
    if (spent(save, ClassKey.Novice) + classSpent <= earned) {
        return;
    }
    if (save.hero.classKey !== ClassKey.Novice) {
        clearTrees(save, save.hero.classKey);
    }
    if (spent(save, ClassKey.Novice) > earned) {
        clearTrees(save, ClassKey.Novice);
    }
}

export function devSetLevel(save: SaveData, level: number): void {
    save.hero.level = Math.max(1, Math.min(MAX_LEVEL, Math.round(level)));
    save.hero.xp = 0;
    trimTalentsToLevel(save);
}

/** Any class at once, including back to Novice; each class keeps its own talent tree. */
export function devSwitchClass(save: SaveData, classKey: ClassKey): boolean {
    if (save.run) {
        return false;
    }
    unlockClass(save, classKey);
    save.hero.classKey = classKey;
    trimTalentsToLevel(save);
    return true;
}

/** Free respec of the current class tree (and the Novice tree when the hero is a Novice). */
export function devResetTalents(save: SaveData): void {
    clearTrees(save, save.hero.classKey);
}

