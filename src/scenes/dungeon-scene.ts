import {MusicTrack, Sfx} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {t, tr} from "../core/i18n";
import {Input} from "../core/input";
import {chance} from "../core/rng";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {BuildingKey, BUILDINGS} from "../data/buildings";
import {CompanionKey} from "../data/companions";
import {Direction, DropData, DungeonEventKey, MonsterSpawn, RoomData, RoomType, RunData} from "../data/dungeon-types";
import {FloorDef, floorDef, LAST_FLOOR} from "../data/floors";
import {EarStyle, HatStyle, TailStyle, WeaponStyle} from "../data/hero-classes";
import {ItemKey} from "../data/items";
import {MonsterDef, MONSTERS} from "../data/monsters";
import {StatBlock} from "../data/stat-block";
import {rollEvent, rollMonster, roomAt} from "../logic/dungeon-generator";
import {CombatOutcome} from "../logic/combat-engine";
import {CombatMode, EncounterProfile, encounterProfile, EncounterTrait, REAL_TIME_REWARD_BONUS} from "../logic/encounter-mode";
import {computeHeroStats} from "../logic/hero-stats";
import {bagHasRoomFor} from "../logic/bank";
import {addItem, itemName} from "../logic/inventory";
import {chestLoot, combatLoot, combatXp, LootResult} from "../logic/loot";
import {grantXp, nextLockedBuilding, registerBossKill, unlockBuilding} from "../logic/progression";
import {currentRoom, endRunDefeat, endRunReturn, enterFloor, moveThroughDoor} from "../logic/run-manager";
import {drawClassHero} from "../render/class-hero";
import {DungeonProp, drawProp, propArt, roomFloor} from "../render/dungeon-art";
import {drawText, ellipsePath, fillStroke, glow, hash, rectPath, shade} from "../render/draw-utils";
import {defaultPose, drawHero} from "../render/hero-sprite";
import {defaultMonsterPose, drawCompanion, drawMonster} from "../render/monster-sprite";
import {drawCampfire, drawChest, drawCoins, drawLootBag, drawPedestal, drawShrine, drawSignpost, drawSpikes, drawStairs} from "../render/props";
import {openCharacter} from "../windows/character-window";
import {openInventory} from "../windows/inventory-window";
import {openOptions} from "../windows/options-window";
import {openPause} from "../windows/pause-window";
import {CombatScene, CombatSummary} from "./combat-scene";
import {DuelScene} from "./duel-scene";
import {EventResult, resolveEvent, roomCompanion} from "./dungeon-events";
import {MainMenuScene} from "./main-menu-scene";
import {TownMessage, TownScene, TownSpawn} from "./town-scene";
import {VictoryScene} from "./victory-scene";
import {buildHeroHud, buildHudButtons, Camera, HeroWalker} from "./world-helpers";

export const ROOM_TILES_W: number = 17;
export const ROOM_TILES_H: number = 11;
const T: number = 32;
const ROOM_W: number = ROOM_TILES_W * T;
const ROOM_H: number = ROOM_TILES_H * T;
const CENTER_X: number = ROOM_W / 2;
const CENTER_Y: number = 5.6 * T;
const WALK_SPEED: number = 165;
const INTERACT_RANGE: number = 46;
const WANDERING_CHANCE: number = 0.3;

enum Interactable {
    Chest = "chest",
    Fire = "fire",
    Event = "event",
    Stairs = "stairs",
    Sign0 = "sign0",
    Sign1 = "sign1",
    Sign2 = "sign2"
}

interface MonsterEntity {
    spawn: MonsterSpawn;
    x: number;
    y: number;
    delay: number;
    /** Walk cycle while chasing the hero. */
    walk?: number;
}

interface FloatingText {
    text: string;
    x: number;
    y: number;
    life: number;
    color: string;
}

const SIGN_POSITIONS: [number, number][] = [[5 * T, 5.4 * T], [CENTER_X, 4.4 * T], [12 * T, 5.4 * T]];

export function effectiveType(room: RoomData): RoomType {
    if (room.type === RoomType.Crossroads) {
        return room.chosen ?? RoomType.Crossroads;
    }
    return room.type;
}

function pathLabelKey(type: RoomType): "pathCombat" | "pathTreasure" | "pathRest" | "pathEvent" {
    switch (type) {
        case RoomType.Treasure:
            return "pathTreasure";
        case RoomType.Rest:
            return "pathRest";
        case RoomType.Event:
            return "pathEvent";
        default:
            return "pathCombat";
    }
}

const PATH_STYLE: Partial<Record<RoomType, {color: string; symbol: string}>> = {
    [RoomType.Combat]: {color: "#e03131", symbol: "⚔"},
    [RoomType.Treasure]: {color: "#f59f00", symbol: "$"},
    [RoomType.Rest]: {color: "#37b24d", symbol: "♥"},
    [RoomType.Event]: {color: "#7048e8", symbol: "?"}
};

export class DungeonScene implements Scene {
    public readonly music: MusicTrack = MusicTrack.Dungeon;
    private readonly camera: Camera = new Camera(0.9, 2.8);
    private hero: HeroWalker = new HeroWalker(CENTER_X, 8 * T);
    private monster: MonsterEntity | null = null;
    private bagFullCooldown: number = 0;
    private background: HTMLCanvasElement | null = null;
    private time: number = 0;
    private fade: number = 1;
    private hudEl: HTMLElement | null = null;
    private hintEl: HTMLElement | null = null;
    private currentHint: string = "";
    private near: Interactable | null = null;
    private floating: FloatingText[] = [];
    private trail: {x: number; y: number}[] = [];
    private busy: boolean = false;
    private initialized: boolean = false;
    private hudDirty: boolean = true;

    constructor(private readonly game: Game) {
    }

    private get save(): SaveData {
        return this.game.save as SaveData;
    }

    private get run(): RunData {
        return this.save.run as RunData;
    }

    private get room(): RoomData {
        return currentRoom(this.save);
    }

    // ------------------------------------------------------------ lifecycle

    public enter(): void {
        this.buildHud();
        if (!this.initialized) {
            this.initialized = true;
            this.onRoomEnter(false);
            this.game.ui.toast(t("enteringFloor", {n: this.run.floor}), ToastKind.Special);
        } else {
            this.background = this.renderBackground();
        }
        this.camera.zoom = this.fitZoom();
        this.camera.snap(CENTER_X, ROOM_H / 2);
    }

    public exit(): void {
        this.game.ui.clearHud();
    }

    public refreshTexts(): void {
        this.buildHud();
    }

    public onEscape(): void {
        openPause(this.game, {
            inDungeon: true,
            onInventory: () => this.openInventory(),
            onCharacter: () => openCharacter(this.game, {onChange: () => this.markHud()}),
            onAbandon: () => this.defeat(true),
            onQuitToMenu: () => this.game.setScene(new MainMenuScene(this.game))
        });
    }

    private openInventory(): void {
        openInventory(this.game, {inDungeon: true, onChange: () => this.markHud()});
    }

    private fitZoom(): number {
        return Math.max(0.9, Math.min((this.game.width - 40) / ROOM_W, (this.game.height - 60) / ROOM_H, 2.4));
    }

    private buildHud(): void {
        this.game.ui.clearHud();
        this.hudEl = el("div", {cls: "hud-top"});
        this.game.ui.hud.append(this.hudEl);
        this.game.ui.hud.append(buildHudButtons({
            onInventory: () => this.openInventory(),
            onCharacter: () => openCharacter(this.game, {onChange: () => this.markHud()}),
            onOptions: () => openOptions(this.game),
            onPause: () => this.onEscape()
        }));
        this.hintEl = el("div", {cls: "hud-hint"});
        this.currentHint = "";
        this.game.ui.hud.append(this.hintEl);
        this.markHud();
    }

    private markHud(): void {
        this.hudDirty = true;
    }

    private refreshHud(): void {
        if (this.hudEl && this.save.run) {
            this.hudEl.replaceChildren(buildHeroHud(this.save));
        }
        this.hudDirty = false;
    }

    // ------------------------------------------------------------ room flow

    private onRoomEnter(allowWandering: boolean): void {
        const room: RoomData = this.room;
        const firstVisit: boolean = !room.visited;
        room.visited = true;
        this.fade = 1;
        this.floating = [];
        this.placeHero();
        this.trail = [];

        if (allowWandering && !firstVisit && room.cleared && effectiveType(room) === RoomType.Combat && chance(WANDERING_CHANCE)) {
            room.monster = rollMonster(this.run.floor);
            room.cleared = false;
        }
        this.monster = null;
        if (room.monster && !room.cleared) {
            const spawnPos: {x: number; y: number} = this.monsterSpawnPoint();
            this.monster = {spawn: room.monster, x: spawnPos.x, y: spawnPos.y, delay: room.type === RoomType.Boss ? 1.2 : 0.7};
            if (room.type === RoomType.Boss) {
                this.game.ui.toast(t("bossRoom") + ": " + tr(MONSTERS[room.monster.key].name), ToastKind.Bad);
            }
        }
        if (effectiveType(room) === RoomType.Event && room.event === DungeonEventKey.Trap && !room.used) {
            this.game.audio.play(Sfx.Hit);
            this.showEvent(resolveEvent(this.game, room, DungeonEventKey.Trap));
        }
        if (room.type === RoomType.Crossroads && !room.chosen && firstVisit) {
            this.game.ui.toast(t("crossroads") + " — " + t("crossroadsHint"), ToastKind.Info);
        }
        this.background = this.renderBackground();
        this.markHud();
        this.game.saveGame();
    }

    private placeHero(): void {
        const entry: Direction | null = this.run.entryDir;
        let x: number = CENTER_X;
        let y: number = 8.6 * T;
        if (entry === Direction.North) {
            y = 2.9 * T;
        } else if (entry === Direction.South) {
            y = 9.3 * T;
        } else if (entry === Direction.West) {
            x = 1.9 * T;
            y = 6.3 * T;
        } else if (entry === Direction.East) {
            x = ROOM_W - 1.9 * T;
            y = 6.3 * T;
        }
        this.hero = new HeroWalker(x, y);
        this.hero.facing = entry === Direction.East ? -1 : 1;
    }

    private monsterSpawnPoint(): {x: number; y: number} {
        const entry: Direction | null = this.run.entryDir;
        if (entry === Direction.West) {
            return {x: ROOM_W - 4 * T, y: 6 * T};
        }
        if (entry === Direction.East) {
            return {x: 4 * T, y: 6 * T};
        }
        if (entry === Direction.North) {
            return {x: CENTER_X, y: 8 * T};
        }
        return {x: CENTER_X, y: 4.2 * T};
    }

    private doorsLocked(): boolean {
        const room: RoomData = this.room;
        return (this.monster !== null) || (room.type === RoomType.Crossroads && !room.chosen);
    }

    private leaveThrough(dir: Direction): void {
        if (this.busy) {
            return;
        }
        const target: RoomData | null = moveThroughDoor(this.save, dir);
        if (!target) {
            return;
        }
        this.game.audio.play(Sfx.Door);
        this.onRoomEnter(true);
    }

    // ------------------------------------------------------------ combat

    private startCombat(): void {
        if (!this.monster || this.busy) {
            return;
        }
        this.busy = true;
        const spawn: MonsterSpawn = this.monster.spawn;
        const def: MonsterDef = MONSTERS[spawn.key];
        const isBoss: boolean = def.boss;
        const onEnd: (summary: CombatSummary) => void = (summary: CombatSummary) => this.onCombatEnd(summary);
        const profile: EncounterProfile = encounterProfile(def);
        let chosen: boolean = false;
        const start: (mode: CombatMode) => void = (mode: CombatMode): void => {
            chosen = true;
            win.close();
            this.game.setScene(mode === CombatMode.RealTime ? new DuelScene(this.game, spawn, isBoss, onEnd) : new CombatScene(this.game, spawn, isBoss, onEnd));
        };
        const win: WindowHandle = this.game.ui.openWindow({title: tr(def.name), cls: "window-small", onClose: () => {
            if (!chosen) {
                // Closing the choice backs off one step; the monster keeps waiting.
                this.busy = false;
                this.hero.y += 26;
            }
        }});
        const option: (mode: CombatMode, title: string, desc: string) => HTMLElement = (mode: CombatMode, title: string, desc: string): HTMLElement => {
            const recommended: boolean = profile.recommended === mode;
            return el("button", {cls: "btn" + (recommended ? " btn-primary" : ""), style: {textAlign: "left", padding: "10px 12px", whiteSpace: "normal", height: "auto"}, onClick: () => start(mode)}, [
                el("div", {style: {fontWeight: "700", fontSize: "16px"}}, [title, recommended ? el("span", {cls: "tag good", style: {marginLeft: "8px"}, text: t("recommended")}) : null]),
                el("div", {style: {fontSize: "12px", opacity: "0.85", marginTop: "2px"}, text: desc})
            ]);
        };
        const traitText: Record<EncounterTrait, string> = {
            [EncounterTrait.Heavy]: t("traitHeavy"),
            [EncounterTrait.Swift]: t("traitSwift"),
            [EncounterTrait.Caster]: t("traitCaster"),
            [EncounterTrait.Balanced]: t("traitBalanced")
        };
        win.body.append(
            el("div", {cls: "row-sub", style: {marginBottom: "8px"}, text: traitText[profile.trait]}),
            el("div", {style: {fontWeight: "600", marginBottom: "6px"}, text: t("chooseMode")}),
            el("div", {style: {display: "flex", flexDirection: "column", gap: "8px"}}, [
                option(CombatMode.Turns, t("modeTurns"), t("modeTurnsDesc")),
                option(CombatMode.RealTime, t("modeRealTime"), t("modeRealTimeDesc", {pct: Math.round(REAL_TIME_REWARD_BONUS * 100)}))
            ])
        );
    }

    private onCombatEnd(summary: CombatSummary): void {
        this.busy = false;
        const save: SaveData = this.save;
        if (summary.outcome === CombatOutcome.Lost) {
            this.defeat(false);
            return;
        }
        const run: RunData = this.run;
        run.hp = Math.max(1, summary.hp);
        run.mana = summary.mana;
        const room: RoomData = this.room;
        const spawn: MonsterSpawn = room.monster as MonsterSpawn;
        if (summary.outcome === CombatOutcome.Fled) {
            // Back to the previous room; the monster keeps waiting.
            const fromX: number = run.roomX;
            const fromY: number = run.roomY;
            run.roomX = run.prevRoomX;
            run.roomY = run.prevRoomY;
            run.entryDir = fromX > run.roomX ? Direction.East : fromX < run.roomX ? Direction.West : fromY > run.roomY ? Direction.South : Direction.North;
            this.game.setScene(this);
            this.onRoomEnter(false);
            return;
        }

        // Victory.
        const def: MonsterDef = MONSTERS[spawn.key];
        const fd: FloorDef = floorDef(run.floor);
        const bonus: number = 1 + (summary.rewardBonus ?? 0);
        const xp: number = grantXp(save, Math.round(combatXp(def, spawn.armored, save.challenge) * bonus));
        run.xpEarned += xp;
        run.kills++;
        save.records.kills++;
        if (spawn.armored) {
            save.records.armoredKills++;
        }
        const messages: TownMessage[] = [];
        let loot: LootResult | null = null;
        if (def.boss) {
            const firstKill: boolean = registerBossKill(save, def.key);
            save.hero.diamonds += def.diamonds;
            run.bossDefeated = true;
            loot = combatLoot(save, def, false, fd);
            this.game.ui.toast(t("featPointGained"), ToastKind.Special);
            this.game.ui.toast(t("diamondsGained", {n: def.diamonds}), ToastKind.Special);
            if (firstKill) {
                const building: BuildingKey | null = nextLockedBuilding(save);
                if (building) {
                    unlockBuilding(save, building);
                    messages.push({title: t("eventBlueprintTitle"), text: t("blueprintBoss", {building: tr(BUILDINGS[building].name)})});
                }
            }
        } else if (run.rewardCombats < fd.rewardCap) {
            run.rewardCombats++;
            loot = combatLoot(save, def, spawn.armored, fd);
        } else {
            this.game.ui.toast(t("rewardCapReached"), ToastKind.Bad);
        }
        if (loot && bonus > 1) {
            loot.gold = Math.round(loot.gold * bonus);
        }
        room.cleared = true;
        room.monster = null;
        const monsterPos: {x: number; y: number} = this.monster ? {x: this.monster.x, y: this.monster.y} : {x: CENTER_X, y: CENTER_Y};
        this.monster = null;
        if (loot) {
            this.spawnDrops(loot, monsterPos.x, monsterPos.y);
        }
        this.game.setScene(this);
        this.game.ui.toast(loot ? t("victoryRewards", {xp: xp, gold: loot.gold}) : t("victoryXpOnly", {xp: xp}), ToastKind.Good);
        this.background = this.renderBackground();
        this.game.saveGame();

        if (def.boss && run.floor >= LAST_FLOOR) {
            this.finalVictory();
            return;
        }
        for (const m of messages) {
            this.game.ui.message(m.title, m.text);
            this.game.audio.play(Sfx.Unlock);
        }
    }

    private spawnDrops(loot: LootResult, x: number, y: number): void {
        const run: RunData = this.run;
        const room: RoomData = this.room;
        const clampX: (v: number) => number = (v: number) => Math.max(1.8 * T, Math.min(ROOM_W - 1.8 * T, v));
        const clampY: (v: number) => number = (v: number) => Math.max(3 * T, Math.min(ROOM_H - 1.8 * T, v));
        if (loot.gold > 0) {
            room.drops.push({id: run.nextDropId++, x: clampX(x), y: clampY(y), gold: loot.gold, item: null});
        }
        loot.items.forEach((item: ItemKey, index: number) => {
            const angle: number = (index / Math.max(1, loot.items.length)) * Math.PI * 2 + 0.5;
            room.drops.push({id: run.nextDropId++, x: clampX(x + Math.cos(angle) * 40), y: clampY(y + Math.sin(angle) * 26), gold: 0, item: item});
        });
    }

    private defeat(abandoned: boolean): void {
        const save: SaveData = this.save;
        const run: RunData = this.run;
        const summary: string = t("xpEarned") + ": " + run.xpEarned + " · " + t("totalKills") + ": " + run.kills;
        endRunDefeat(save);
        this.game.saveGame();
        this.game.audio.play(Sfx.Defeat);
        const text: string = t("runOverText") + "\n" + summary;
        this.game.setScene(new TownScene(this.game, TownSpawn.House, [{title: abandoned ? t("abandonRun") : t("runOver"), text: text}]));
    }

    private returnToTown(): void {
        const save: SaveData = this.save;
        const run: RunData = this.run;
        const summary: string = t("xpEarned") + ": " + run.xpEarned + " · " + t("goldEarned") + ": " + run.goldEarned + " · " + t("totalKills") + ": " + run.kills;
        endRunReturn(save);
        this.game.saveGame();
        this.game.setScene(new TownScene(this.game, TownSpawn.Portal, [{title: t("returnedToTown"), text: summary}]));
    }

    private finalVictory(): void {
        const save: SaveData = this.save;
        const run: RunData = this.run;
        const stats: {xp: number; gold: number; kills: number} = {xp: run.xpEarned, gold: run.goldEarned, kills: run.kills};
        endRunReturn(save);
        save.records.victories++;
        save.challenge++;
        this.game.saveGame();
        this.game.setScene(new VictoryScene(this.game, stats));
    }

    private descend(): void {
        const next: number = this.run.floor + 1;
        const isNew: boolean = enterFloor(this.save, next);
        this.game.audio.play(Sfx.Door);
        if (isNew) {
            this.game.ui.toast(t("floorUnlocked", {n: next}), ToastKind.Special);
        }
        this.game.ui.toast(t("enteringFloor", {n: next}), ToastKind.Special);
        this.onRoomEnter(false);
    }

    // ------------------------------------------------------------ interactions

    private interact(what: Interactable): void {
        const room: RoomData = this.room;
        const run: RunData = this.run;
        switch (what) {
            case Interactable.Chest: {
                room.used = true;
                room.cleared = true;
                this.save.records.chestsOpened++;
                const loot: LootResult = chestLoot(this.save, floorDef(run.floor));
                this.spawnDrops(loot, CENTER_X, CENTER_Y + 36);
                this.game.audio.play(Sfx.Chest);
                break;
            }
            case Interactable.Fire: {
                room.used = true;
                room.cleared = true;
                const max: StatBlock = computeHeroStats(this.save);
                run.hp = Math.min(max.hp, run.hp + Math.round(max.hp * 0.5));
                run.mana = Math.min(max.mana, run.mana + Math.round(max.mana * 0.5));
                this.game.audio.play(Sfx.Heal);
                this.game.ui.toast(t("rested"), ToastKind.Good);
                break;
            }
            case Interactable.Event: {
                if (room.event) {
                    this.showEvent(resolveEvent(this.game, room, room.event));
                }
                break;
            }
            case Interactable.Stairs:
                this.openStairs();
                return;
            case Interactable.Sign0:
            case Interactable.Sign1:
            case Interactable.Sign2: {
                const index: number = what === Interactable.Sign0 ? 0 : what === Interactable.Sign1 ? 1 : 2;
                this.choosePath((room.crossOptions as RoomType[])[index]);
                return;
            }
        }
        this.background = this.renderBackground();
        this.markHud();
        this.game.saveGame();
    }

    private choosePath(type: RoomType): void {
        const room: RoomData = this.room;
        room.chosen = type;
        this.game.audio.play(Sfx.Door);
        if (type === RoomType.Combat) {
            room.monster = rollMonster(this.run.floor, 0.15);
            room.cleared = false;
            this.monster = {spawn: room.monster, x: CENTER_X, y: 4.4 * T, delay: 0.8};
        } else if (type === RoomType.Event) {
            room.event = rollEvent(this.save, this.run.layout);
            if (room.event === DungeonEventKey.Trap) {
                this.showEvent(resolveEvent(this.game, room, DungeonEventKey.Trap));
            }
        }
        this.background = this.renderBackground();
        this.markHud();
        this.game.saveGame();
    }

    private showEvent(result: EventResult): void {
        this.game.audio.play(result.special ? Sfx.Unlock : Sfx.Pickup);
        this.game.ui.message(result.title, result.text);
        this.markHud();
        this.game.saveGame();
    }

    private openStairs(): void {
        const run: RunData = this.run;
        const win: WindowHandle = this.game.ui.openWindow({title: t("floor") + " " + run.floor, cls: "window-small"});
        win.body.append(el("p", {cls: "dialog-text", text: t("stairsChoice")}));
        win.footer.append(
            button(t("returnKeepLoot"), () => {
                win.close();
                this.returnToTown();
            }),
            button(t("descendTo", {n: run.floor + 1}), () => {
                win.close();
                this.descend();
            }, {cls: "btn-primary"})
        );
    }

    private interactablePositions(): {kind: Interactable; x: number; y: number}[] {
        const room: RoomData = this.room;
        const list: {kind: Interactable; x: number; y: number}[] = [];
        const type: RoomType = effectiveType(room);
        if (room.type === RoomType.Crossroads && !room.chosen) {
            [Interactable.Sign0, Interactable.Sign1, Interactable.Sign2].forEach((kind: Interactable, i: number) => {
                list.push({kind: kind, x: SIGN_POSITIONS[i][0], y: SIGN_POSITIONS[i][1]});
            });
            return list;
        }
        if (type === RoomType.Treasure && !room.used) {
            list.push({kind: Interactable.Chest, x: CENTER_X, y: CENTER_Y});
        }
        if (type === RoomType.Rest && !room.used) {
            list.push({kind: Interactable.Fire, x: CENTER_X, y: CENTER_Y});
        }
        if (type === RoomType.Event && !room.used && room.event && room.event !== DungeonEventKey.Trap) {
            list.push({kind: Interactable.Event, x: CENTER_X, y: CENTER_Y});
        }
        if (room.type === RoomType.Boss && room.cleared && this.run.floor < LAST_FLOOR) {
            list.push({kind: Interactable.Stairs, x: CENTER_X, y: 4 * T});
        }
        return list;
    }

    // ------------------------------------------------------------ update

    private blocked(x: number, y: number, r: number): boolean {
        const room: RoomData = this.room;
        const locked: boolean = this.doorsLocked();
        const inNorthGap: boolean = room.doors.n && !locked && x > 7.2 * T && x < 9.8 * T;
        const inSouthGap: boolean = room.doors.s && !locked && x > 7.2 * T && x < 9.8 * T;
        const inWestGap: boolean = room.doors.w && !locked && y > 5.2 * T && y < 7.4 * T;
        const inEastGap: boolean = room.doors.e && !locked && y > 5.2 * T && y < 7.4 * T;
        if (y < 2.5 * T && !inNorthGap) {
            return true;
        }
        if (y > ROOM_H - T - r * 0.3 && !inSouthGap) {
            return true;
        }
        if (x < T + r && !inWestGap) {
            return true;
        }
        if (x > ROOM_W - T - r && !inEastGap) {
            return true;
        }
        const type: RoomType = effectiveType(room);
        const solids: [number, number, number][] = [];
        if (type === RoomType.Treasure || type === RoomType.Rest) {
            solids.push([CENTER_X, CENTER_Y, 18]);
        }
        if (type === RoomType.Event && room.event && room.event !== DungeonEventKey.Trap) {
            solids.push([CENTER_X, CENTER_Y, room.event === DungeonEventKey.Shrine ? 24 : 14]);
        }
        if (room.type === RoomType.Crossroads && !room.chosen) {
            for (const [sx, sy] of SIGN_POSITIONS) {
                solids.push([sx, sy, 9]);
            }
        }
        return solids.some((s: [number, number, number]) => Math.hypot(x - s[0], (y - s[1]) * 1.3) < s[2] + r * 0.6);
    }

    public update(dt: number): void {
        this.time += dt;
        this.fade = Math.max(0, this.fade - dt * 3);
        if (this.hudDirty) {
            this.refreshHud();
        }
        this.floating = this.floating.filter((f: FloatingText) => {
            f.life -= dt;
            f.y -= dt * 30;
            return f.life > 0;
        });
        if (this.busy || !this.save.run) {
            return;
        }
        const input: Input = this.game.input;
        if (this.game.ui.hasModal()) {
            this.hero.moving = false;
            return;
        }
        this.camera.handleWheel(input);
        const stepped: boolean = this.hero.update(dt, input.moveAxis(), WALK_SPEED, (x: number, y: number, r: number) => this.blocked(x, y, r));
        if (stepped) {
            this.game.audio.play(Sfx.Step);
        }
        this.trail.push({x: this.hero.x, y: this.hero.y});
        if (this.trail.length > 90) {
            this.trail.shift();
        }

        // Door transitions.
        const room: RoomData = this.room;
        if (this.hero.y < 1.3 * T && room.doors.n) {
            this.leaveThrough(Direction.North);
            return;
        }
        if (this.hero.y > ROOM_H - 0.2 * T && room.doors.s) {
            this.leaveThrough(Direction.South);
            return;
        }
        if (this.hero.x < 0.35 * T && room.doors.w) {
            this.leaveThrough(Direction.West);
            return;
        }
        if (this.hero.x > ROOM_W - 0.35 * T && room.doors.e) {
            this.leaveThrough(Direction.East);
            return;
        }

        // Monster approach.
        if (this.monster) {
            this.monster.delay -= dt;
            if (this.monster.delay <= 0) {
                const dx: number = this.hero.x - this.monster.x;
                const dy: number = this.hero.y - this.monster.y;
                const dist: number = Math.hypot(dx, dy);
                if (dist < 38) {
                    this.startCombat();
                    return;
                }
                const speed: number = MONSTERS[this.monster.spawn.key].boss ? 70 : 95;
                this.monster.x += (dx / dist) * speed * dt;
                this.monster.y += (dy / dist) * speed * dt;
                this.monster.walk = (this.monster.walk ?? 0) + dt * 9;
            }
        }

        // Pick up drops.
        this.bagFullCooldown -= dt;
        for (const drop of [...room.drops]) {
            if (Math.hypot(this.hero.x - drop.x, this.hero.y - drop.y) < 24) {
                if (drop.item && !bagHasRoomFor(this.save, drop.item)) {
                    // Bag full: take the gold, leave the item on the floor.
                    if (drop.gold > 0) {
                        this.pickUp({...drop, item: null});
                        room.drops.push({...drop, gold: 0});
                    }
                    if (this.bagFullCooldown <= 0) {
                        this.bagFullCooldown = 2;
                        this.game.audio.play(Sfx.Error);
                        this.game.ui.toast(t("bagFull"), ToastKind.Bad);
                    }
                    continue;
                }
                this.pickUp(drop);
            }
        }

        // Interactions.
        let best: {kind: Interactable; x: number; y: number} | null = null;
        let bestDist: number = INTERACT_RANGE;
        for (const it of this.interactablePositions()) {
            const d: number = Math.hypot(this.hero.x - it.x, this.hero.y - it.y);
            if (d < bestDist) {
                bestDist = d;
                best = it;
            }
        }
        this.near = best ? best.kind : null;
        this.updateHint();
        if (this.near && input.wasPressed("KeyE", "Space", "Enter")) {
            this.interact(this.near);
        } else if (input.wasPressed("KeyI")) {
            this.openInventory();
        } else if (input.wasPressed("KeyC")) {
            openCharacter(this.game, {onChange: () => this.markHud()});
        }
    }

    private pickUp(drop: DropData): void {
        const room: RoomData = this.room;
        const run: RunData = this.run;
        room.drops = room.drops.filter((d: DropData) => d.id !== drop.id);
        if (drop.gold > 0) {
            this.save.hero.gold += drop.gold;
            run.goldEarned += drop.gold;
            this.floating.push({text: t("pickedGold", {gold: drop.gold}), x: drop.x, y: drop.y - 20, life: 1.2, color: "#ffd43b"});
            this.game.audio.play(Sfx.Coin);
        }
        if (drop.item) {
            addItem(this.save, drop.item, 1);
            this.floating.push({text: t("pickedUp", {item: itemName(drop.item)}), x: drop.x, y: drop.y - 34, life: 1.6, color: "#d0bfff"});
            this.game.ui.toast(t("pickedUp", {item: itemName(drop.item)}), ToastKind.Good);
            this.game.audio.play(Sfx.Pickup);
        }
        this.markHud();
        this.game.saveGame();
    }

    private updateHint(): void {
        let hint: string = "";
        switch (this.near) {
            case Interactable.Chest:
                hint = t("pressToInteract", {name: t("openChest")});
                break;
            case Interactable.Fire:
                hint = t("pressToInteract", {name: t("rest")});
                break;
            case Interactable.Event:
                hint = t("pressToInteract", {name: t("investigate")});
                break;
            case Interactable.Stairs:
                hint = t("pressToInteract", {name: t("descend")});
                break;
            case Interactable.Sign0:
            case Interactable.Sign1:
            case Interactable.Sign2: {
                const index: number = this.near === Interactable.Sign0 ? 0 : this.near === Interactable.Sign1 ? 1 : 2;
                const option: RoomType = (this.room.crossOptions as RoomType[])[index];
                hint = t("pressToInteract", {name: t("choose") + ": " + t(pathLabelKey(option))});
                break;
            }
            default:
                hint = this.monster ? tr(MONSTERS[this.monster.spawn.key].name) + (this.monster.spawn.armored ? " ⛨" : "") : "";
        }
        if (hint !== this.currentHint && this.hintEl) {
            this.currentHint = hint;
            this.hintEl.textContent = hint;
        }
    }

    // ------------------------------------------------------------ render

    private renderBackground(): HTMLCanvasElement {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = ROOM_W;
        canvas.height = ROOM_H;
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
        const fd: FloorDef = floorDef(this.run.floor);
        const room: RoomData = this.room;
        const seed: number = room.x * 31 + room.y * 17 + this.run.floor * 101;
        const painted: HTMLImageElement | undefined = roomFloor(this.run.floor, seed);
        for (let ty: number = 0; ty < ROOM_TILES_H && !painted; ty++) {
            for (let tx: number = 0; tx < ROOM_TILES_W; tx++) {
                const n: number = hash(tx, ty, seed);
                ctx.fillStyle = shade((tx + ty) % 2 === 0 ? fd.floorColor : fd.floorAlt, (n - 0.5) * 0.12);
                ctx.fillRect(tx * T, ty * T, T, T);
                ctx.strokeStyle = "rgba(0,0,0,0.18)";
                ctx.strokeRect(tx * T + 0.5, ty * T + 0.5, T - 1, T - 1);
                if (n > 0.9) {
                    ctx.strokeStyle = "rgba(0,0,0,0.3)";
                    ctx.beginPath();
                    ctx.moveTo(tx * T + 6, ty * T + 8);
                    ctx.lineTo(tx * T + 14, ty * T + 15);
                    ctx.lineTo(tx * T + 12, ty * T + 24);
                    ctx.stroke();
                }
            }
        }
        if (painted) {
            // One painted floor for the whole room (cover-fit), a touch darker so characters stand out.
            const scale: number = Math.max(ROOM_W / painted.width, ROOM_H / painted.height);
            const dw: number = painted.width * scale;
            const dh: number = painted.height * scale;
            ctx.drawImage(painted, (ROOM_W - dw) / 2, (ROOM_H - dh) / 2, dw, dh);
            ctx.fillStyle = "rgba(10,6,14,0.18)";
            ctx.fillRect(0, 0, ROOM_W, ROOM_H);
        }
        // Walls
        ctx.fillStyle = fd.wallColor;
        ctx.fillRect(0, 0, ROOM_W, 2 * T);
        ctx.fillRect(0, 0, T, ROOM_H);
        ctx.fillRect(ROOM_W - T, 0, T, ROOM_H);
        ctx.fillRect(0, ROOM_H - T, ROOM_W, T);
        // Top wall face with bricks
        ctx.fillStyle = fd.wallTop;
        ctx.fillRect(T, T * 0.9, ROOM_W - 2 * T, T * 1.1);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        for (let row: number = 0; row < 2; row++) {
            const by: number = T * 0.9 + row * (T * 0.55);
            ctx.beginPath();
            ctx.moveTo(T, by);
            ctx.lineTo(ROOM_W - T, by);
            ctx.stroke();
            for (let bx: number = T + (row % 2) * 12; bx < ROOM_W - T; bx += 24) {
                ctx.beginPath();
                ctx.moveTo(bx, by);
                ctx.lineTo(bx, by + T * 0.55);
                ctx.stroke();
            }
        }
        if (painted) {
            this.paintWalls(ctx, painted, fd);
        }
        // Soft contact shadow along every wall so the floor sinks into the room.
        const shadowBand: (x: number, y: number, w: number, h: number, x1: number, y1: number) => void = (x: number, y: number, w: number, h: number, x1: number, y1: number): void => {
            const g: CanvasGradient = ctx.createLinearGradient(x, y, x1, y1);
            g.addColorStop(0, "rgba(0,0,0,0.5)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x, y, w, h);
        };
        shadowBand(T, 2 * T, ROOM_W - 2 * T, 26, T, 2 * T + 26);
        shadowBand(T, 2 * T, 18, ROOM_H - 3 * T, T + 18, 2 * T);
        shadowBand(ROOM_W - T - 18, 2 * T, 18, ROOM_H - 3 * T, ROOM_W - T - 18, 2 * T);
        shadowBand(T, ROOM_H - T - 14, ROOM_W - 2 * T, 14, T, ROOM_H - T);
        // Door openings
        ctx.fillStyle = "#07050a";
        if (room.doors.n) {
            rectPath(ctx, 7.2 * T, 0, 2.6 * T, 2 * T, 10);
            ctx.fill();
        }
        if (room.doors.s) {
            ctx.fillRect(7.2 * T, ROOM_H - T, 2.6 * T, T);
        }
        if (room.doors.w) {
            ctx.fillRect(0, 5.2 * T, T, 2.2 * T);
        }
        if (room.doors.e) {
            ctx.fillRect(ROOM_W - T, 5.2 * T, T, 2.2 * T);
        }
        // Painted clutter in the corners (away from the middle and the doors).
        const clutter: [number, number][] = [[1.9 * T, 3 * T], [ROOM_W - 1.9 * T, 3 * T], [1.9 * T, ROOM_H - 1.6 * T], [ROOM_W - 1.9 * T, ROOM_H - 1.6 * T]];
        clutter.forEach(([cx, cy]: [number, number], i: number) => {
            const r: number = hash(i, seed, 9);
            if (r < 0.45) {
                drawProp(ctx, r < 0.22 ? DungeonProp.Bones : DungeonProp.Barrels, cx, cy, r < 0.22 ? 26 : 40);
            }
        });
        // Decorative debris
        for (let i: number = 0; i < 5; i++) {
            const dx: number = 2 * T + hash(i, seed, 1) * (ROOM_W - 4 * T);
            const dy: number = 3 * T + hash(i, seed, 2) * (ROOM_H - 5 * T);
            if (Math.hypot(dx - CENTER_X, dy - CENTER_Y) < 70) {
                continue;
            }
            ellipsePath(ctx, dx, dy, 3 + hash(i, seed, 3) * 4, 2 + hash(i, seed, 4) * 3);
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.fill();
        }
        return canvas;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        ctx.fillStyle = "#07050a";
        ctx.fillRect(0, 0, w, h);
        if (!this.save.run) {
            return;
        }
        const fit: number = this.fitZoom();
        this.camera.minZoom = fit * 0.75;
        this.camera.maxZoom = fit * 1.8;
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, this.camera.zoom));
        this.camera.follow(this.hero.x, this.hero.y, 1 / 60, ROOM_W, ROOM_H, w, h);
        ctx.save();
        this.camera.apply(ctx, w, h);
        if (this.background) {
            ctx.drawImage(this.background, 0, 0);
        }
        this.drawTorches(ctx);
        this.drawDoorBars(ctx);
        this.drawRoomContents(ctx);
        for (const f of this.floating) {
            ctx.globalAlpha = Math.min(1, f.life * 2);
            drawText(ctx, f.text, f.x, f.y, 13, f.color);
            ctx.globalAlpha = 1;
        }
        // Vignette
        const v: CanvasGradient = ctx.createRadialGradient(this.hero.x, this.hero.y, 90, this.hero.x, this.hero.y, 520);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.4)");
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, ROOM_W, ROOM_H);
        ctx.restore();
        this.drawMinimap(ctx);
        if (this.fade > 0) {
            ctx.fillStyle = "rgba(0,0,0," + this.fade + ")";
            ctx.fillRect(0, 0, w, h);
        }
    }

    /** Stone walls made from the floor painting of the same floor (darker, smaller blocks), so walls and floor match. */
    private paintWalls(ctx: CanvasRenderingContext2D, painted: HTMLImageElement, fd: FloorDef): void {
        const tex: CanvasPattern | null = ctx.createPattern(painted, "repeat");
        if (!tex) {
            return;
        }
        tex.setTransform(new DOMMatrix().scaleSelf(0.28, 0.28));
        const regions: [number, number, number, number][] = [[0, 0, ROOM_W, 2 * T], [0, 0, T, ROOM_H], [ROOM_W - T, 0, T, ROOM_H], [0, ROOM_H - T, ROOM_W, T]];
        ctx.save();
        ctx.fillStyle = tex;
        for (const [x, y, w, h] of regions) {
            ctx.fillRect(x, y, w, h);
        }
        // Wall tops (seen from above) are dark; the north wall face catches the torch light.
        ctx.fillStyle = "rgba(8,5,12,0.62)";
        for (const [x, y, w, h] of regions) {
            ctx.fillRect(x, y, w, h);
        }
        const face: CanvasGradient = ctx.createLinearGradient(0, 0.9 * T, 0, 2 * T);
        face.addColorStop(0, "rgba(0,0,0,0.1)");
        face.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = tex;
        ctx.fillRect(T, 0.9 * T, ROOM_W - 2 * T, 1.1 * T);
        ctx.fillStyle = face;
        ctx.fillRect(T, 0.9 * T, ROOM_W - 2 * T, 1.1 * T);
        ctx.fillStyle = shade(fd.wallTop, -0.2);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(T, 0.9 * T, ROOM_W - 2 * T, 1.1 * T);
        ctx.globalAlpha = 1;
        // Rim light along the inner edge of the walls.
        ctx.strokeStyle = "rgba(255,220,170,0.18)";
        ctx.lineWidth = 2;
        ctx.strokeRect(T + 1, 0.9 * T + 1, ROOM_W - 2 * T - 2, ROOM_H - 1.9 * T - 2);
        ctx.restore();
    }

    private drawCampfireArt(ctx: CanvasRenderingContext2D, lit: boolean): void {
        const unlitArt: boolean = !lit && !propArt(DungeonProp.CampfireOut) && propArt(DungeonProp.Campfire) !== undefined;
        ctx.save();
        if (unlitArt) {
            // Used campfire: the same painting, cold and dark.
            ctx.filter = "grayscale(0.85) brightness(0.55)";
        }
        const drawn: boolean = drawProp(ctx, lit || unlitArt ? DungeonProp.Campfire : DungeonProp.CampfireOut, CENTER_X, CENTER_Y + 8, 48);
        ctx.restore();
        if (!drawn) {
            drawCampfire(ctx, CENTER_X, CENTER_Y, lit, this.time);
            return;
        }
        if (lit) {
            glow(ctx, CENTER_X, CENTER_Y - 14, 70 + Math.sin(this.time * 8) * 5, "#ff922b", 0.35);
            // Rising sparks.
            for (let i: number = 0; i < 5; i++) {
                const k: number = (this.time * 0.8 + i / 5) % 1;
                ctx.fillStyle = "rgba(255,200,120," + (1 - k) + ")";
                ctx.beginPath();
                ctx.arc(CENTER_X + Math.sin(this.time * 3 + i * 2) * 8, CENTER_Y - 20 - k * 40, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private drawStairsArt(ctx: CanvasRenderingContext2D): boolean {
        if (!propArt(DungeonProp.Stairs)) {
            return false;
        }
        glow(ctx, CENTER_X, 4 * T - 16, 56 + Math.sin(this.time * 2) * 5, "#b197fc", 0.32);
        return drawProp(ctx, DungeonProp.Stairs, CENTER_X, 4 * T + 14, 64);
    }

    private drawTorches(ctx: CanvasRenderingContext2D): void {
        for (const tx of [3.5 * T, ROOM_W - 3.5 * T]) {
            const flick: number = Math.sin(this.time * 10 + tx) * 2;
            if (propArt(DungeonProp.Torch)) {
                glow(ctx, tx, 1.1 * T, 70 + flick * 2, "#ff922b", 0.4);
                drawProp(ctx, DungeonProp.Torch, tx, 1.75 * T, 40);
                glow(ctx, tx, 0.95 * T, 14 + flick, "#ffe8a3", 0.5);
                continue;
            }
            glow(ctx, tx, 1.2 * T, 50 + flick, "#ff922b", 0.35);
            rectPath(ctx, tx - 2, 1.2 * T, 4, 12, 1);
            fillStroke(ctx, "#6b4226", 1);
            ctx.beginPath();
            ctx.moveTo(tx - 5, 1.2 * T);
            ctx.quadraticCurveTo(tx, 1.2 * T - 16 + flick, tx + 5, 1.2 * T);
            ctx.fillStyle = "#ffa94d";
            ctx.fill();
        }
    }

    private drawDoorBars(ctx: CanvasRenderingContext2D): void {
        if (!this.doorsLocked()) {
            return;
        }
        const room: RoomData = this.room;
        ctx.strokeStyle = "#adb5bd";
        ctx.lineWidth = 4;
        const barsV: (x0: number, y0: number, len: number) => void = (x0: number, y0: number, len: number) => {
            for (let i: number = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(x0 + i * 0.6 * T, y0);
                ctx.lineTo(x0 + i * 0.6 * T, y0 + len);
                ctx.stroke();
            }
        };
        const barsH: (x0: number, y0: number, len: number) => void = (x0: number, y0: number, len: number) => {
            for (let i: number = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x0, y0 + i * 0.6 * T);
                ctx.lineTo(x0 + len, y0 + i * 0.6 * T);
                ctx.stroke();
            }
        };
        if (room.doors.n) {
            barsV(7.4 * T, 0.2 * T, 1.8 * T);
        }
        if (room.doors.s) {
            barsV(7.4 * T, ROOM_H - T, T);
        }
        if (room.doors.w) {
            barsH(0, 5.4 * T, T);
        }
        if (room.doors.e) {
            barsH(ROOM_W - T, 5.4 * T, T);
        }
    }

    private drawRoomContents(ctx: CanvasRenderingContext2D): void {
        const room: RoomData = this.room;
        const type: RoomType = effectiveType(room);
        const items: {y: number; draw: () => void}[] = [];
        const nearGlow: (kind: Interactable) => boolean = (kind: Interactable) => this.near === kind;

        if (room.type === RoomType.Crossroads && !room.chosen && room.crossOptions) {
            room.crossOptions.forEach((option: RoomType, i: number) => {
                const style: {color: string; symbol: string} = PATH_STYLE[option] ?? {color: "#868e96", symbol: "?"};
                const kind: Interactable = [Interactable.Sign0, Interactable.Sign1, Interactable.Sign2][i];
                items.push({y: SIGN_POSITIONS[i][1], draw: () => {
                    drawSignpost(ctx, SIGN_POSITIONS[i][0], SIGN_POSITIONS[i][1], style.color, style.symbol, nearGlow(kind));
                    drawText(ctx, t(pathLabelKey(option)), SIGN_POSITIONS[i][0], SIGN_POSITIONS[i][1] + 12, 10, "#f1e3c4");
                }});
            });
        }
        if (type === RoomType.Treasure) {
            items.push({y: CENTER_Y, draw: () => (drawProp(ctx, room.used ? DungeonProp.ChestOpen : DungeonProp.Chest, CENTER_X, CENTER_Y + 8, 44) || drawChest(ctx, CENTER_X, CENTER_Y, room.used, this.time))});
        }
        if (type === RoomType.Rest) {
            items.push({y: CENTER_Y, draw: () => this.drawCampfireArt(ctx, !room.used)});
        }
        if (type === RoomType.Event && room.event) {
            items.push({y: CENTER_Y, draw: () => this.drawEventObject(ctx, room)});
        }
        if (room.type === RoomType.Boss && room.cleared && this.run.floor < LAST_FLOOR) {
            items.push({y: 4 * T - 30, draw: () => (this.drawStairsArt(ctx) || drawStairs(ctx, CENTER_X, 4 * T, this.time))});
        }
        for (const drop of room.drops) {
            items.push({y: drop.y - 5, draw: () => (drop.item ? drawLootBag(ctx, drop.x, drop.y, this.time) : drawCoins(ctx, drop.x, drop.y, this.time))});
        }
        if (this.monster) {
            const m: MonsterEntity = this.monster;
            items.push({y: m.y, draw: () => {
                drawMonster(ctx, m.x, m.y, MONSTERS[m.spawn.key], defaultMonsterPose({
                    scale: 1.1, time: this.time, armored: m.spawn.armored, facing: this.hero.x < m.x ? -1 : 1, moving: m.delay <= 0, walk: m.walk ?? 0
                }));
                if (MONSTERS[m.spawn.key].boss) {
                    drawText(ctx, t("boss"), m.x, m.y - 100, 12, "#ff6b6b");
                }
            }});
        }
        // Companions follow the hero along its trail.
        this.run.companions.forEach((companion: CompanionKey, i: number) => {
            const idx: number = Math.max(0, this.trail.length - 1 - (i + 1) * 14);
            const p: {x: number; y: number} = this.trail[idx] ?? {x: this.hero.x - 20 * (i + 1), y: this.hero.y};
            items.push({y: p.y - 1, draw: () => drawCompanion(ctx, p.x - 14, p.y + 4, companion, this.time, 1.1, this.hero.facing)});
        });
        items.push({y: this.hero.y, draw: () => drawClassHero(ctx, this.hero.x, this.hero.y, this.save.hero.classKey, defaultPose({
            view: this.hero.view,
            facing: this.hero.facing, walk: this.hero.walk, moving: this.hero.moving, time: this.time
        }))});
        items.sort((a: {y: number}, b: {y: number}) => a.y - b.y);
        for (const item of items) {
            item.draw();
        }
    }

    private drawEventObject(ctx: CanvasRenderingContext2D, room: RoomData): void {
        const x: number = CENTER_X;
        const y: number = CENTER_Y;
        switch (room.event) {
            case DungeonEventKey.Blueprint:
                if (!drawProp(ctx, DungeonProp.Pedestal, x, y + 6, 56)) {
                    drawPedestal(ctx, x, y, this.time, "#74c0fc", !room.used);
                } else if (!room.used) {
                    glow(ctx, x, y - 40, 30 + Math.sin(this.time * 3) * 4, "#74c0fc", 0.35);
                }
                break;
            case DungeonEventKey.ClassOffer:
                if (!room.used) {
                    glow(ctx, x, y - 20, 40, "#b197fc", 0.4);
                    drawHero(ctx, x, y, {skin: "#2b2233", hair: "#2b2233", outfit: "#3b2a55", outfitDark: "#21172f", accent: "#b197fc", hat: HatStyle.Hood, weapon: WeaponStyle.Staff, ears: EarStyle.Human, tail: TailStyle.None, cape: "#21172f", shield: false}, defaultPose({time: this.time, facing: -1, scale: 1.1}));
                    ellipsePath(ctx, x - 1, y - 40, 11, 11);
                    ctx.fillStyle = "#21172f";
                    ctx.fill();
                    ctx.fillStyle = "#e599f7";
                    ctx.fillRect(x - 5, y - 41, 2.5, 2.5);
                    ctx.fillRect(x + 1, y - 41, 2.5, 2.5);
                }
                break;
            case DungeonEventKey.Companion:
                if (!room.used) {
                    glow(ctx, x, y - 10, 30, "#ffe066", 0.3);
                    drawCompanion(ctx, x, y, roomCompanion(this.save, room), this.time, 1.6, -1);
                }
                break;
            case DungeonEventKey.Shrine:
                if (!drawProp(ctx, DungeonProp.Shrine, x, y + 6, 64)) {
                    drawShrine(ctx, x, y, this.time, !room.used);
                } else if (!room.used) {
                    glow(ctx, x, y - 48, 34 + Math.sin(this.time * 2.5) * 5, "#74c0fc", 0.4);
                }
                break;
            case DungeonEventKey.Wanderer:
                if (!room.used) {
                    drawHero(ctx, x, y, {skin: "#e0ac69", hair: "#adb5bd", outfit: "#8d6e45", outfitDark: "#5c4630", accent: "#e9ecef", hat: HatStyle.Hood, weapon: WeaponStyle.Staff, ears: EarStyle.Human, tail: TailStyle.None, cape: null, shield: false}, defaultPose({time: this.time, facing: -1}));
                }
                break;
            case DungeonEventKey.Trap:
                if (!drawProp(ctx, DungeonProp.Spikes, x, y + 22, room.used ? 30 : 38)) {
                    drawSpikes(ctx, x, y + 10, room.used);
                }
                break;
            default:
                break;
        }
    }

    private drawMinimap(ctx: CanvasRenderingContext2D): void {
        const run: RunData = this.run;
        const size: number = run.layout.size;
        const cell: number = Math.min(26, 150 / size);
        const pad: number = 10;
        const mapW: number = size * cell + pad * 2;
        const x0: number = this.game.width - mapW - 12;
        const y0: number = 56;
        rectPath(ctx, x0, y0, mapW, mapW + 16, 8);
        ctx.fillStyle = "rgba(20,16,28,0.85)";
        ctx.fill();
        ctx.strokeStyle = "#6b5a3a";
        ctx.lineWidth = 1;
        ctx.stroke();
        drawText(ctx, t("floor") + " " + run.floor, x0 + mapW / 2, y0 + 10, 11, "#f5c542");
        const known: (r: RoomData) => boolean = (r: RoomData) => r.visited || this.neighbours(r).some((n: RoomData) => n.visited);
        for (const room of run.layout.rooms) {
            const cx: number = x0 + pad + room.x * cell + cell / 2;
            const cy: number = y0 + 18 + pad + room.y * cell + cell / 2;
            const isBoss: boolean = room.type === RoomType.Boss;
            if (!known(room) && !isBoss) {
                continue;
            }
            ctx.strokeStyle = "rgba(245,197,66,0.35)";
            ctx.lineWidth = 2;
            if (room.visited) {
                if (room.doors.e) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + cell, cy);
                    ctx.stroke();
                }
                if (room.doors.s) {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx, cy + cell);
                    ctx.stroke();
                }
            }
            const current: boolean = room.x === run.roomX && room.y === run.roomY;
            rectPath(ctx, cx - cell * 0.36, cy - cell * 0.36, cell * 0.72, cell * 0.72, 3);
            ctx.fillStyle = current ? "#f5c542" : room.visited ? "#5c5470" : "rgba(92,84,112,0.35)";
            ctx.fill();
            if (isBoss) {
                ctx.strokeStyle = "#ff6b6b";
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            const symbol: string = this.roomSymbol(room);
            if (symbol && (room.visited || isBoss)) {
                ctx.fillStyle = current ? "#1b1406" : "#fff";
                ctx.font = "700 " + Math.round(cell * 0.45) + "px 'Segoe UI', sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(symbol, cx, cy + 0.5);
            }
        }
    }

    private roomSymbol(room: RoomData): string {
        const type: RoomType = effectiveType(room);
        if (room.type === RoomType.Boss) {
            return room.cleared ? "▼" : "☠";
        }
        if (room.drops.length > 0) {
            return "•";
        }
        switch (type) {
            case RoomType.Combat:
                return room.cleared ? "" : "⚔";
            case RoomType.Treasure:
                return room.used ? "" : "$";
            case RoomType.Rest:
                return room.used ? "" : "♥";
            case RoomType.Event:
                return room.used ? "" : "?";
            case RoomType.Crossroads:
                return "✦";
            default:
                return "";
        }
    }

    private neighbours(room: RoomData): RoomData[] {
        const layout: RunData["layout"] = this.run.layout;
        const list: (RoomData | null)[] = [
            room.doors.n ? roomAt(layout, room.x, room.y - 1) : null,
            room.doors.s ? roomAt(layout, room.x, room.y + 1) : null,
            room.doors.w ? roomAt(layout, room.x - 1, room.y) : null,
            room.doors.e ? roomAt(layout, room.x + 1, room.y) : null
        ];
        return list.filter((r: RoomData | null) => r !== null) as RoomData[];
    }
}
