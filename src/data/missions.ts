import {L, LocalizedText} from "../core/i18n";
import {MonsterKey} from "./monsters";

export enum MissionKind {
    KillMonsters = "kill_monsters",
    KillArmored = "kill_armored",
    ReachFloor = "reach_floor",
    DefeatBoss = "defeat_boss",
    OpenChests = "open_chests",
    BefriendBeasts = "befriend_beasts",
    ClearArena = "clear_arena"
}

export enum MissionKey {
    Hunt10 = "hunt_10",
    Hunt40 = "hunt_40",
    Hunt100 = "hunt_100",
    Armored5 = "armored_5",
    Reach2 = "reach_2",
    Reach3 = "reach_3",
    BossGoblinKing = "boss_goblin_king",
    BossFrostHydra = "boss_frost_hydra",
    BossVoidSovereign = "boss_void_sovereign",
    Chests5 = "chests_5",
    Beasts2 = "beasts_2",
    ArenaClear = "arena_clear"
}

export interface MissionDef {
    key: MissionKey;
    kind: MissionKind;
    name: LocalizedText;
    /** Count to reach (for ReachFloor: the floor number, for DefeatBoss: 1). */
    target: number;
    boss?: MonsterKey;
    rewardGold: number;
    rewardDiamonds: number;
}

const MISSION_LIST: MissionDef[] = [
    {key: MissionKey.Hunt10, kind: MissionKind.KillMonsters, name: L("Cazador novato: derrota 10 monstruos", "Rookie hunter: defeat 10 monsters", "Jungjäger: besiege 10 Monster"), target: 10, rewardGold: 100, rewardDiamonds: 0},
    {key: MissionKey.Reach2, kind: MissionKind.ReachFloor, name: L("Explorador: llega al piso 2", "Explorer: reach floor 2", "Entdecker: erreiche Ebene 2"), target: 2, rewardGold: 150, rewardDiamonds: 0},
    {key: MissionKey.BossGoblinKing, kind: MissionKind.DefeatBoss, name: L("Regicidio: derrota al Rey Goblin", "Regicide: defeat the Goblin King", "Königsmord: besiege den Goblinkönig"), target: 1, boss: MonsterKey.GoblinKing, rewardGold: 100, rewardDiamonds: 1},
    {key: MissionKey.Chests5, kind: MissionKind.OpenChests, name: L("Saqueador: abre 5 cofres", "Looter: open 5 chests", "Plünderer: öffne 5 Truhen"), target: 5, rewardGold: 150, rewardDiamonds: 0},
    {key: MissionKey.Armored5, kind: MissionKind.KillArmored, name: L("Rompecorazas: derrota 5 acorazados", "Shellbreaker: defeat 5 armored foes", "Panzerbrecher: besiege 5 Gepanzerte"), target: 5, rewardGold: 200, rewardDiamonds: 1},
    {key: MissionKey.Hunt40, kind: MissionKind.KillMonsters, name: L("Cazador veterano: derrota 40 monstruos", "Veteran hunter: defeat 40 monsters", "Veteranjäger: besiege 40 Monster"), target: 40, rewardGold: 300, rewardDiamonds: 1},
    {key: MissionKey.Beasts2, kind: MissionKind.BefriendBeasts, name: L("Amigo de las bestias: consigue 2 compañeros", "Beast friend: befriend 2 companions", "Tierfreund: gewinne 2 Gefährten"), target: 2, rewardGold: 100, rewardDiamonds: 1},
    {key: MissionKey.Reach3, kind: MissionKind.ReachFloor, name: L("Abismo: llega al piso 3", "Abyss: reach floor 3", "Abgrund: erreiche Ebene 3"), target: 3, rewardGold: 300, rewardDiamonds: 1},
    {key: MissionKey.BossFrostHydra, kind: MissionKind.DefeatBoss, name: L("Deshielo: derrota a la Hidra de escarcha", "Thaw: defeat the Frost Hydra", "Tauwetter: besiege die Frosthydra"), target: 1, boss: MonsterKey.FrostHydra, rewardGold: 250, rewardDiamonds: 2},
    {key: MissionKey.ArenaClear, kind: MissionKind.ClearArena, name: L("Gladiador: supera el Coliseo", "Gladiator: clear the Coliseum", "Gladiator: bezwinge das Kolosseum"), target: 1, rewardGold: 200, rewardDiamonds: 2},
    {key: MissionKey.Hunt100, kind: MissionKind.KillMonsters, name: L("Leyenda: derrota 100 monstruos", "Legend: defeat 100 monsters", "Legende: besiege 100 Monster"), target: 100, rewardGold: 500, rewardDiamonds: 2},
    {key: MissionKey.BossVoidSovereign, kind: MissionKind.DefeatBoss, name: L("Salvador: derrota al Soberano del Vacío", "Savior: defeat the Void Sovereign", "Retter: besiege den Leeren-Souverän"), target: 1, boss: MonsterKey.VoidSovereign, rewardGold: 1000, rewardDiamonds: 3}
];

export const MISSIONS: Record<MissionKey, MissionDef> = Object.fromEntries(MISSION_LIST.map((def: MissionDef) => [def.key, def])) as Record<MissionKey, MissionDef>;
export const ALL_MISSIONS: MissionKey[] = MISSION_LIST.map((def: MissionDef) => def.key);
