import {MusicTrack, Sfx} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {t, tr} from "../core/i18n";
import {Input, Vec2} from "../core/input";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {AbilityDef, AbilityKey, AbilityKind, DamageType} from "../data/abilities";
import {ALL_BUILDINGS, BuildingDef, BuildingKey, BUILDINGS} from "../data/buildings";
import {Element} from "../data/element";
import {ClassKey, CLASSES} from "../data/hero-classes";
import {MonsterKey} from "../data/monsters";
import {DEV_TOOLS_ENABLED} from "../logic/dev-tools";
import {openDevTools} from "../windows/dev-tools-window";
import {CombatScene} from "./combat-scene";
import {StatBlock} from "../data/stat-block";
import {createHeroCombatant} from "../logic/combat-engine";
import {Combatant} from "../logic/combat-math";
import {computeHeroStats} from "../logic/hero-stats";
import {applyLevelUps, isBuildingUnlocked} from "../logic/progression";
import {basicAttackMultiplier, effectiveAbility} from "../logic/talents";
import {syncActionBar} from "../logic/action-bar";
import {ActionBarSlot} from "../data/action-bar";
import {pressedSlot} from "./action-bar-hud";
import {startRun} from "../logic/run-manager";
import {ArtKey} from "../render/art-assets";
import {drawClassHero, heroWeaponType} from "../render/class-hero";
import {ARROW_IMPACT_DELAY, fxImpactDelay, fxStyleOf, RANGED_STYLES, SpellFxLayer} from "../render/spell-fx";
import {WeaponType} from "../render/puppet/puppet-types";
import {groundNoise, organicMask, paintThroughMask} from "../render/organic-ground";
import {ellipsePath, fillStroke, glow, hash} from "../render/draw-utils";
import {defaultPose} from "../render/hero-sprite";
import {drawBuilding, drawBuildingSign, drawBush, drawLamp, drawTree, groundPattern} from "../render/props";
import {PuppetView} from "../render/puppet/puppet-types";
import {openBank} from "../windows/bank-window";
import {openClassLibrary} from "../windows/class-window";
import {openForge} from "../windows/forge-window";
import {openGuild} from "../windows/guild-window";
import {openHouse} from "../windows/house-window";
import {openPreparation} from "../windows/preparation-window";
import {openShop} from "../windows/shop-window";
import {npcLine} from "../windows/window-helpers";
import {ArenaScene} from "./arena-scene";
import {DungeonScene} from "./dungeon-scene";
import {MainMenuScene} from "./main-menu-scene";
import {DUMMY_CHEST, DummyAttack, TrainingYard} from "./training-yard";
import {
    announceLevelUp, buildHeroHud, buildWorldHud, Camera, handleWorldHotkeys, HeroWalker, nearestWithin, openWorldPause, WorldHud, WorldScene
} from "./world-helpers";
import {buildTownMap, DecorKind, doorPoint, TILE, TOWN_H, TOWN_W, TownDecor, TownMap, TownNpc, TownTile, tileAt} from "./town-map";

export enum TownSpawn {
    House = "house",
    Portal = "portal",
    Coliseum = "coliseum",
    /** Back from a practice fight against a training dummy. */
    TrainingYard = "training_yard"
}

/** Things in the practice yard the hero can use with E. */
enum YardSpotKind {
    /** Turn-based practice fight. */
    Dummy = "dummy",
    /** Testing trainer (dev server only). */
    Trainer = "trainer"
}

interface YardSpot {
    kind: YardSpotKind;
    x: number;
    y: number;
}

export interface TownMessage {
    title: string;
    text: string;
}

const INTERACT_RANGE: number = 44;
const WALK_SPEED: number = 160;
const DASH_SPEED: number = 560;
const TOWN_DASH_TIME: number = 0.18;
const TOWN_DASH_COOLDOWN: number = 0.5;
/** Practice dummies in the quiet meadow east of the bank (tile coordinates). */
const TRAINING_SPOTS: Vec2[] = [{x: 40.5, y: 15.6}, {x: 42.7, y: 14.5}, {x: 44.3, y: 16.5}].map((p: Vec2) => ({x: p.x * TILE, y: p.y * TILE}));
const YARD_SPAWN: Vec2 = {x: 41.8 * TILE, y: 16.9 * TILE};
/** Testing trainer ("god mode") beside the yard. */
const TRAINER_SPOT: Vec2 = {x: 39.4 * TILE, y: 17.3 * TILE};
const TRAINER_CLASS: ClassKey = ClassKey.Knight;
const YARD_RANGE: number = 50;
const SPELL_AIM_RANGE: number = 260;
const TOWN_ABILITY_COOLDOWN: number = 0.8;
const MELEE_AIM_RANGE: number = 80;

interface Drawable {
    y: number;
    draw: () => void;
}

/** A building door the hero can walk up to. */
interface DoorSpot {
    key: BuildingKey;
    x: number;
    y: number;
}

export class TownScene implements Scene {
    public readonly music: MusicTrack = MusicTrack.Town;
    private readonly map: TownMap = buildTownMap();
    private readonly camera: Camera = new Camera(0.6, 2.6);
    private readonly hero: HeroWalker;
    private ground: HTMLCanvasElement | null = null;
    private time: number = 0;
    private hud: WorldHud | null = null;
    private readonly world: WorldScene = {
        inDungeon: false,
        onChange: () => this.refreshHud(),
        onUseSlot: (index: number) => this.useSlot(index),
        onAbandon: () => undefined,
        onQuitToMenu: () => this.game.setScene(new MainMenuScene(this.game))
    };
    private nearBuilding: BuildingKey | null = null;
    private nearYard: YardSpot | null = null;
    /** Town is a safe place to try your moves: dash, basic attack and class abilities (no enemies, no mana). */
    private readonly spells: SpellFxLayer = new SpellFxLayer();
    private dashTimer: number = 0;
    private dashCooldown: number = 0;
    private dashDir: Vec2 = {x: 0, y: 1};
    private swing: number = 0;
    /** Cooldown left per ability (town practice pacing, no mana). */
    private readonly cooldowns: Map<AbilityKey, number> = new Map<AbilityKey, number>();
    private barTimer: number = 0;
    private dashTrail: {x: number; y: number; life: number}[] = [];
    private dashStruck: boolean = false;
    private readonly yard: TrainingYard = new TrainingYard(TRAINING_SPOTS);

    constructor(private readonly game: Game, spawn: TownSpawn = TownSpawn.House, private readonly messages: TownMessage[] = []) {
        if (spawn === TownSpawn.TrainingYard) {
            this.hero = new HeroWalker(YARD_SPAWN.x, YARD_SPAWN.y);
        } else {
            const target: BuildingKey = spawn === TownSpawn.Portal ? BuildingKey.Portal : spawn === TownSpawn.Coliseum ? BuildingKey.Coliseum : BuildingKey.House;
            const door: {x: number; y: number} = doorPoint(BUILDINGS[target]);
            this.hero = new HeroWalker(door.x, door.y + 24);
        }
        this.camera.snap(this.hero.x, this.hero.y);
    }

    private get save(): SaveData {
        return this.game.save as SaveData;
    }

    public enter(): void {
        // XP saved before levels became instant (or earned at the end of a run) turns into levels now.
        const levels: number = applyLevelUps(this.save);
        this.ground = this.renderGround();
        this.buildHud();
        this.game.saveGame();
        const queue: TownMessage[] = [...this.messages];
        if (!this.save.seenWelcome) {
            this.save.seenWelcome = true;
            queue.unshift({title: t("gameTitle"), text: t("welcome")});
            this.game.saveGame();
        }
        const showNext: () => void = () => {
            const next: TownMessage | undefined = queue.shift();
            if (next) {
                this.game.ui.message(next.title, next.text, showNext);
            }
        };
        showNext();
        announceLevelUp(this.game, levels);
    }

    public exit(): void {
        this.game.ui.clearHud();
    }

    public refreshTexts(): void {
        this.buildHud();
    }

    public onEscape(): void {
        openWorldPause(this.game, this.world);
    }

    private buildHud(): void {
        this.hud = buildWorldHud(this.game, this.world);
        this.refreshHud();
        this.game.ui.hud.append(el("div", {cls: "hud-controls", text: t("controlsHint")}));
    }

    private refreshHud(): void {
        if (this.hud) {
            this.hud.top.replaceChildren(buildHeroHud(this.save));
            this.hud.actionBar.refresh();
        }
    }

    // ------------------------------------------------------------ interaction

    private interact(key: BuildingKey): void {
        const save: SaveData = this.save;
        const def: BuildingDef = BUILDINGS[key];
        if (!isBuildingUnlocked(save, key)) {
            this.game.audio.play(Sfx.Error);
            this.game.ui.message(tr(def.name), t("needsBlueprint"));
            return;
        }
        this.game.audio.play(Sfx.Door);
        const onChange: () => void = () => this.refreshHud();
        switch (key) {
            case BuildingKey.Shop:
                openShop(this.game, onChange);
                break;
            case BuildingKey.Forge:
                openForge(this.game, onChange);
                break;
            case BuildingKey.Guild:
                openGuild(this.game, onChange);
                break;
            case BuildingKey.ClassLibrary:
                openClassLibrary(this.game, onChange);
                break;
            case BuildingKey.House:
                openHouse(this.game, onChange);
                break;
            case BuildingKey.Bank:
                openBank(this.game, onChange);
                break;
            case BuildingKey.Portal:
                openPreparation(this.game, (floor: number) => this.startExpedition(floor), onChange);
                break;
            case BuildingKey.Coliseum: {
                const win: WindowHandle = this.game.ui.openWindow({title: t("coliseum"), cls: "window-small"});
                win.body.append(npcLine(t("coliseumGreeting")));
                win.footer.append(
                    button(t("cancel"), () => win.close()),
                    button(t("startArena"), () => {
                        win.close();
                        this.game.setScene(new ArenaScene(this.game));
                    }, {cls: "btn-primary"})
                );
                break;
            }
        }
    }

    private startExpedition(floor: number): void {
        startRun(this.save, floor);
        this.game.saveGame();
        this.game.setScene(new DungeonScene(this.game));
    }

    // ------------------------------------------------------------ update

    private blocked(x: number, y: number, r: number): boolean {
        if (x < 2.6 * TILE || x > (TOWN_W - 2.6) * TILE || y < 2.9 * TILE || y > (TOWN_H - 1.1) * TILE) {
            return true;
        }
        if (this.yard.blocks(x, y, r)) {
            return true;
        }
        if (DEV_TOOLS_ENABLED && Math.hypot(x - TRAINER_SPOT.x, (y - TRAINER_SPOT.y) * 1.4) < 12 + r * 0.5) {
            return true;
        }
        if (tileAt(this.map, x, y) === TownTile.Water) {
            return true;
        }
        for (const key of ALL_BUILDINGS) {
            const def: BuildingDef = BUILDINGS[key];
            const bx: number = def.tx * TILE;
            const by: number = def.ty * TILE;
            if (x > bx - r * 0.6 && x < bx + def.tw * TILE + r * 0.6 && y > by && y < (def.ty + def.th) * TILE + 2) {
                return true;
            }
        }
        for (const d of this.map.decor) {
            if (d.kind === DecorKind.Tree || d.kind === DecorKind.Lamp) {
                const radius: number = d.kind === DecorKind.Tree ? 13 : 6;
                if (Math.hypot(x - d.x, (y - d.y) * 1.4) < radius + r * 0.5) {
                    return true;
                }
            }
        }
        return this.map.npcs.some((n: TownNpc) => Math.hypot(x - n.x, y - n.y) < 14);
    }

    public update(dt: number): void {
        this.time += dt;
        const input: Input = this.game.input;
        if (!this.game.ui.hasModal()) {
            this.camera.handleWheel(input);
            this.updateActions(dt, input);
            const axis: Vec2 = this.dashTimer > 0 ? this.dashDir : input.moveAxis();
            const speed: number = this.dashTimer > 0 ? DASH_SPEED : WALK_SPEED;
            const stepped: boolean = this.hero.update(dt, axis, speed, (x: number, y: number, r: number) => this.blocked(x, y, r));
            if (stepped && this.dashTimer <= 0) {
                this.game.audio.play(Sfx.Step);
            }
            this.updateInteraction();
            if (this.nearBuilding && input.wasPressed("KeyE", "Enter")) {
                this.interact(this.nearBuilding);
            } else if (this.nearYard && input.wasPressed("KeyE", "Enter")) {
                this.useYardSpot(this.nearYard);
            } else {
                handleWorldHotkeys(this.game, this.world, input);
            }
        } else {
            this.hero.moving = false;
        }
        this.camera.follow(this.hero.x, this.hero.y - 20, dt, TOWN_W * TILE, TOWN_H * TILE, this.game.width, this.game.height);
    }

    private heroCombatant(): Combatant {
        const max: StatBlock = computeHeroStats(this.save);
        return createHeroCombatant(tr(CLASSES[this.save.hero.classKey].name), max, max.hp, max.mana);
    }

    private updateActions(dt: number, input: Input): void {
        this.spells.update(dt);
        this.yard.update(dt);
        this.dashTimer = Math.max(0, this.dashTimer - dt);
        this.dashCooldown = Math.max(0, this.dashCooldown - dt);
        this.swing = Math.max(0, this.swing - dt * 3.5);
        for (const [key, left] of this.cooldowns) {
            this.cooldowns.set(key, Math.max(0, left - dt));
        }
        this.barTimer -= dt;
        if (this.hud) {
            if (this.barTimer <= 0) {
                this.barTimer = 0.25;
                this.hud.actionBar.refresh();
            }
            this.hud.actionBar.update({
                cooldownOf: (slot: ActionBarSlot) => ({left: slot.ability ? this.cooldowns.get(slot.ability) ?? 0 : 0, total: TOWN_ABILITY_COOLDOWN}),
                mana: null
            });
        }
        for (const g of this.dashTrail) {
            g.life -= dt;
        }
        this.dashTrail = this.dashTrail.filter((g: {life: number}) => g.life > 0);
        if (this.dashTimer > 0) {
            this.dashTrail.push({x: this.hero.x, y: this.hero.y, life: 0.25});
        }
        if (input.wasPressed("Space") && this.dashCooldown <= 0) {
            const axis: Vec2 = input.moveAxis();
            this.dashDir = axis.x !== 0 || axis.y !== 0 ? axis : this.hero.aim();
            this.dashTimer = TOWN_DASH_TIME;
            this.dashCooldown = TOWN_DASH_COOLDOWN;
            this.dashStruck = false;
            this.game.audio.play(Sfx.Dash);
        }
        // Dash slash: the first dummy you brush past takes a hit.
        if (this.dashTimer > 0 && !this.dashStruck) {
            const at: Vec2 = {x: this.hero.x + this.dashDir.x * 14, y: this.hero.y - DUMMY_CHEST + this.dashDir.y * 14};
            if (this.yard.strike(this.heroCombatant(), at, 30, {type: DamageType.Physical, element: Element.Neutral, power: 0.8 * basicAttackMultiplier(this.save), critBonus: 0, hits: 1}, 0) > 0) {
                this.dashStruck = true;
                this.game.audio.play(Sfx.Hit);
            }
        }
        if ((input.mouseLeftClicked || input.wasPressed("KeyJ")) && this.swing <= 0) {
            this.basicAttack();
        }
        const slot: number = pressedSlot(input);
        if (slot >= 0) {
            this.useSlot(slot);
        }
    }

    /** Click/J: bow wielders shoot an arrow (aimed at a dummy in front, if any); everyone else swings. */
    private basicAttack(): void {
        this.swing = 1;
        this.game.audio.play(Sfx.Swing);
        const aim: Vec2 = this.hero.aim();
        const attack: DummyAttack = {type: DamageType.Physical, element: Element.Neutral, power: basicAttackMultiplier(this.save), critBonus: 0, hits: 1};
        if (heroWeaponType(this.save.hero.classKey) === WeaponType.Bow) {
            const from: Vec2 = {x: this.hero.x + aim.x * 10, y: this.hero.y - 30};
            const target: Vec2 | null = this.yard.aimTarget(from, aim, SPELL_AIM_RANGE);
            const to: Vec2 = target ?? {x: from.x + aim.x * 200, y: from.y + aim.y * 150};
            this.spells.shootArrow(from, to, 0.75);
            this.yard.strike(this.heroCombatant(), to, 34, attack, ARROW_IMPACT_DELAY);
            return;
        }
        const at: Vec2 = {x: this.hero.x + aim.x * 26, y: this.hero.y - DUMMY_CHEST + aim.y * 22};
        if (this.yard.strike(this.heroCombatant(), at, 32, attack, 0.12) > 0) {
            this.game.audio.play(Sfx.Hit);
        }
    }

    /** Action bar slot 1-8: abilities can be practised in town; potions only work in the dungeon. */
    private useSlot(index: number): void {
        const slot: ActionBarSlot | null = syncActionBar(this.save)[index] ?? null;
        if (!slot) {
            return;
        }
        if (slot.kind === ActionBarSlot.Kind.Item) {
            this.game.audio.play(Sfx.Error);
            this.game.ui.toast(t("cannotUseHere"), ToastKind.Bad);
            return;
        }
        const key: AbilityKey | undefined = slot.ability;
        if (!key || (this.cooldowns.get(key) ?? 0) > 0) {
            return;
        }
        const def: AbilityDef = effectiveAbility(this.save, key);
        const aim: Vec2 = this.hero.aim();
        const from: Vec2 = {x: this.hero.x + aim.x * 10, y: this.hero.y - 30};
        const self: boolean = def.kind !== AbilityKind.Damage;
        const ranged: boolean = RANGED_STYLES.includes(fxStyleOf(key));
        // Damage spells lock on to a practice dummy in front of you, if there is one.
        const target: Vec2 | null = self ? null : this.yard.aimTarget(from, aim, ranged ? SPELL_AIM_RANGE : MELEE_AIM_RANGE);
        const to: Vec2 = self ? from : target ?? {x: from.x + aim.x * (ranged ? 150 : 50), y: from.y + aim.y * (ranged ? 110 : 40)};
        this.spells.cast(key, def.element, from, to, 0.75, def.hits ?? 1);
        if (!self) {
            this.yard.strike(this.heroCombatant(), to, 40, {
                type: def.damageType ?? DamageType.Physical, element: def.element, power: def.power ?? 1, critBonus: def.critBonus ?? 0, hits: def.hits ?? 1
            }, fxImpactDelay(key));
        }
        this.cooldowns.set(key, TOWN_ABILITY_COOLDOWN);
        if (def.damageType === DamageType.Physical) {
            this.swing = 1;
        }
        this.game.audio.play(def.kind === AbilityKind.Heal ? Sfx.Heal : def.damageType === DamageType.Physical ? Sfx.Swing : Sfx.Magic);
    }

    private useYardSpot(spot: YardSpot): void {
        if (spot.kind === YardSpotKind.Trainer) {
            openDevTools(this.game, () => this.refreshHud());
            return;
        }
        // Turn-based practice: a dummy that never hits back and gives no rewards.
        this.game.audio.play(Sfx.Door);
        this.game.setScene(new CombatScene(this.game, {key: MonsterKey.TrainingDummy, armored: false},
            () => this.game.setScene(new TownScene(this.game, TownSpawn.TrainingYard))));
    }

    private updateInteraction(): void {
        const doors: DoorSpot[] = ALL_BUILDINGS.map((key: BuildingKey) => {
            const door: {x: number; y: number} = doorPoint(BUILDINGS[key]);
            return {key: key, x: door.x, y: door.y};
        });
        const best: DoorSpot | null = nearestWithin(this.hero, doors, INTERACT_RANGE);
        this.nearBuilding = best ? best.key : null;
        const yardSpots: YardSpot[] = this.yard.positions.map((p: Vec2) => ({kind: YardSpotKind.Dummy, x: p.x, y: p.y}));
        if (DEV_TOOLS_ENABLED) {
            yardSpots.push({kind: YardSpotKind.Trainer, x: TRAINER_SPOT.x, y: TRAINER_SPOT.y});
        }
        this.nearYard = best ? null : nearestWithin(this.hero, yardSpots, YARD_RANGE);
        let hint: string = "";
        if (best) {
            const def: BuildingDef = BUILDINGS[best.key];
            hint = t("pressToInteract", {name: t("enter") + " · " + tr(def.name)}) + (isBuildingUnlocked(this.save, best.key) ? "" : " (" + t("locked") + ")");
        } else if (this.nearYard) {
            hint = t("pressToInteract", {name: this.nearYard.kind === YardSpotKind.Dummy ? t("dummyFight") : t("devTalk")});
        }
        this.hud?.hint.set(hint);
    }

    // ------------------------------------------------------------ render

    private renderGround(): HTMLCanvasElement {
        const canvas: HTMLCanvasElement = document.createElement("canvas");
        canvas.width = TOWN_W * TILE;
        canvas.height = TOWN_H * TILE;
        const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
        const pathTex: CanvasPattern | undefined = groundPattern(ctx, ArtKey.GroundPath, TILE * 6);
        const waterTex: CanvasPattern | undefined = groundPattern(ctx, ArtKey.GroundWater, TILE * 8);
        const tileIs: (kind: TownTile) => (tx: number, ty: number) => boolean = (kind: TownTile) => (tx: number, ty: number): boolean =>
            this.map.tiles[ty * TOWN_W + tx] === kind;

        // Grass: one colour with soft large-scale light/shade variation (no per-tile checkerboard).
        ctx.fillStyle = "#5c9e3e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const shadeLayer: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px: Uint8ClampedArray = shadeLayer.data;
        for (let y: number = 0; y < canvas.height; y++) {
            for (let x: number = 0; x < canvas.width; x++) {
                const v: number = (groundNoise(x * 0.35, y * 0.35, 3) - 0.5) * 22;
                const i: number = (y * canvas.width + x) * 4;
                // Uint8ClampedArray clamps to 0..255 by itself.
                px[i] = px[i] + v;
                px[i + 1] = px[i + 1] + v * 1.2;
                px[i + 2] = px[i + 2] + v * 0.6;
            }
        }
        ctx.putImageData(shadeLayer, 0, 0);
        // Grass tufts and flowers scattered freely (not one set per tile).
        ctx.strokeStyle = "rgba(30,70,20,0.35)";
        ctx.lineWidth = 1.2;
        for (let i: number = 0; i < TOWN_W * TOWN_H * 3; i++) {
            const gx: number = hash(i, 101) * canvas.width;
            const gy: number = hash(i, 202) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx - 2, gy - 5);
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + 2, gy - 4);
            ctx.stroke();
        }
        for (let i: number = 0; i < TOWN_W * TOWN_H * 0.08; i++) {
            ctx.fillStyle = hash(i, 303) > 0.5 ? "#ffe066" : "#f8f9fa";
            ctx.beginPath();
            ctx.arc(hash(i, 304) * canvas.width, hash(i, 305) * canvas.height, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Paths: darker worn rim, then the path itself with round, irregular edges.
        const pathRim: HTMLCanvasElement = organicMask(TOWN_W, TOWN_H, TILE, tileIs(TownTile.Path), {round: 9, wobble: 0.18, grow: 0.1, seed: 11});
        paintThroughMask(ctx, pathRim, "rgba(78,62,38,0.45)");
        const pathMask: HTMLCanvasElement = organicMask(TOWN_W, TOWN_H, TILE, tileIs(TownTile.Path), {round: 9, wobble: 0.18, grow: 0, seed: 11});
        paintThroughMask(ctx, pathMask, pathTex ?? "#c2a270");
        // Pond: muddy bank, then water, both with natural shores.
        const bank: HTMLCanvasElement = organicMask(TOWN_W, TOWN_H, TILE, tileIs(TownTile.Water), {round: 18, wobble: 0.2, grow: 0.12, seed: 31});
        paintThroughMask(ctx, bank, "#6f5a3c");
        const water: HTMLCanvasElement = organicMask(TOWN_W, TOWN_H, TILE, tileIs(TownTile.Water), {round: 18, wobble: 0.2, grow: 0, seed: 31});
        paintThroughMask(ctx, water, waterTex ?? "#3d8bd6");
        return canvas;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        ctx.fillStyle = "#2b5a1e";
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        this.camera.apply(ctx, w, h);
        if (this.ground) {
            ctx.drawImage(this.ground, 0, 0);
        }
        this.drawWaterShimmer(ctx);
        this.yard.drawGround(ctx);

        const drawables: Drawable[] = [];
        const save: SaveData = this.save;
        for (const key of ALL_BUILDINGS) {
            const def: BuildingDef = BUILDINGS[key];
            drawables.push({y: (def.ty + def.th) * TILE, draw: () => drawBuilding(ctx, def, TILE, !isBuildingUnlocked(save, key), this.time)});
        }
        for (const d of this.map.decor) {
            drawables.push({y: d.y, draw: () => this.drawDecor(ctx, d)});
        }
        for (const npc of this.map.npcs) {
            if (!isBuildingUnlocked(save, npc.building)) {
                continue;
            }
            drawables.push({y: npc.y, draw: () => drawClassHero(ctx, npc.x, npc.y, npc.puppetClass, defaultPose({
                time: this.time + npc.x, facing: this.hero.x < npc.x ? -1 : 1, view: PuppetView.Side
            }), "npc_" + npc.building)});
        }
        // Signpost with a pictogram beside every door, so each building reads at a glance.
        for (const key of ALL_BUILDINGS) {
            const door: {x: number; y: number} = doorPoint(BUILDINGS[key]);
            const sx: number = door.x - 42;
            const sy: number = door.y + 2;
            drawables.push({y: sy, draw: () => drawBuildingSign(ctx, key, sx, sy, this.nearBuilding === key, !isBuildingUnlocked(save, key))});
        }
        drawables.push(...this.yard.drawables(ctx));
        if (DEV_TOOLS_ENABLED) {
            drawables.push({y: TRAINER_SPOT.y, draw: () => drawClassHero(ctx, TRAINER_SPOT.x, TRAINER_SPOT.y, TRAINER_CLASS, defaultPose({
                time: this.time, facing: this.hero.x < TRAINER_SPOT.x ? -1 : 1, view: PuppetView.Side
            }), "dev_trainer")});
        }
        drawables.push({y: this.hero.y, draw: () => {
            for (const g of this.dashTrail) {
                glow(ctx, g.x, g.y - 22, 20, "#74c0fc", g.life * 1.6);
            }
            drawClassHero(ctx, this.hero.x, this.hero.y, save.hero.classKey, defaultPose({
                view: this.swing > 0 && this.hero.view === PuppetView.Side ? PuppetView.Side : this.hero.view,
                facing: this.hero.facing, walk: this.hero.walk, moving: this.hero.moving, time: this.time,
                attack: this.swing > 0 ? 1 - this.swing : 0
            }));
        }});
        drawables.sort((a: Drawable, b: Drawable) => a.y - b.y);
        for (const d of drawables) {
            d.draw();
        }
        this.spells.draw(ctx);
        this.yard.drawPopups(ctx);

        if (this.nearBuilding) {
            const door: {x: number; y: number} = doorPoint(BUILDINGS[this.nearBuilding]);
            const bob: number = Math.sin(this.time * 5) * 3;
            ellipsePath(ctx, door.x, door.y - 90 + bob, 7, 7);
            fillStroke(ctx, "#ffe066", 1.5);
        }
        ctx.restore();
    }

    private drawWaterShimmer(ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.2;
        for (let ty: number = 0; ty < TOWN_H; ty++) {
            for (let tx: number = 0; tx < TOWN_W; tx++) {
                if (this.map.tiles[ty * TOWN_W + tx] !== TownTile.Water) {
                    continue;
                }
                const phase: number = this.time * 1.5 + hash(tx, ty) * 6;
                const x: number = tx * TILE + 8 + Math.sin(phase) * 4;
                const y: number = ty * TILE + 12 + hash(tx, ty, 2) * 10;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + 5, y - 3, x + 10, y);
                ctx.stroke();
            }
        }
    }

    private drawDecor(ctx: CanvasRenderingContext2D, d: TownDecor): void {
        switch (d.kind) {
            case DecorKind.Tree:
                drawTree(ctx, d.x, d.y, 1 + d.variant * 0.3, d.variant, this.time);
                break;
            case DecorKind.Bush:
                drawBush(ctx, d.x, d.y, false);
                break;
            case DecorKind.FlowerBush:
                drawBush(ctx, d.x, d.y, true);
                break;
            case DecorKind.Lamp:
                drawLamp(ctx, d.x, d.y, this.time);
                break;
        }
    }
}
