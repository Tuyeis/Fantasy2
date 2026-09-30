import {Input, Vec2} from "../core/input";
import {t, tr} from "../core/i18n";
import {clamp} from "../core/rng";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind} from "../core/ui";
import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {CompanionKey, COMPANIONS} from "../data/companions";
import {RunBuffKey} from "../data/dungeon-types";
import {floorDef} from "../data/floors";
import {CLASSES} from "../data/hero-classes";
import {StatBlock} from "../data/stat-block";
import {computeHeroStats, MAX_LEVEL, xpToNext} from "../logic/hero-stats";
import {availableTalentPoints} from "../logic/talents";
import {PuppetView} from "../render/puppet/puppet-types";
import {openCharacter} from "../windows/character-window";
import {openInventory} from "../windows/inventory-window";
import {openOptions} from "../windows/options-window";
import {openPause} from "../windows/pause-window";
import {openTalents} from "../windows/talent-window";
import {ActionBarHud} from "./action-bar-hud";

export class Camera {
    public x: number = 0;
    public y: number = 0;
    public zoom: number = 1.4;

    constructor(public minZoom: number = 0.7, public maxZoom: number = 2.6) {
    }

    public handleWheel(input: Input): void {
        if (input.wheel !== 0) {
            this.zoom = clamp(this.zoom * Math.pow(1.12, -input.wheel), this.minZoom, this.maxZoom);
        }
    }

    public follow(targetX: number, targetY: number, dt: number, worldW: number, worldH: number, viewW: number, viewH: number): void {
        const halfW: number = viewW / 2 / this.zoom;
        const halfH: number = viewH / 2 / this.zoom;
        const lerp: number = 1 - Math.pow(0.001, dt);
        this.x += (targetX - this.x) * lerp;
        this.y += (targetY - this.y) * lerp;
        this.x = worldW <= halfW * 2 ? worldW / 2 : clamp(this.x, halfW, worldW - halfW);
        this.y = worldH <= halfH * 2 ? worldH / 2 : clamp(this.y, halfH, worldH - halfH);
    }

    public snap(targetX: number, targetY: number): void {
        this.x = targetX;
        this.y = targetY;
    }

    public apply(ctx: CanvasRenderingContext2D, viewW: number, viewH: number): void {
        ctx.translate(viewW / 2, viewH / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }
}

/** Collision radius of the walking hero. */
const HERO_RADIUS: number = 10;

/** 8-direction walking hero with axis-separated collision. */
export class HeroWalker {
    public facing: number = 1;
    /** Which painted view of the puppet to show: sideways, towards the camera or away from it. */
    public view: PuppetView = PuppetView.Front;
    public walk: number = 0;
    public moving: boolean = false;
    private stepTimer: number = 0;

    constructor(public x: number, public y: number) {
    }

    /** Where the hero is looking (down, up or sideways), for attacks without a target. */
    public aim(): Vec2 {
        if (this.view === PuppetView.Front) {
            return {x: 0, y: 1};
        }
        if (this.view === PuppetView.Back) {
            return {x: 0, y: -1};
        }
        return {x: this.facing, y: 0};
    }

    /** Returns true when a footstep should sound. */
    public update(dt: number, axis: Vec2, speed: number, blocked: (x: number, y: number, r: number) => boolean): boolean {
        this.moving = axis.x !== 0 || axis.y !== 0;
        if (!this.moving) {
            this.walk = 0;
            return false;
        }
        if (axis.x !== 0) {
            this.facing = axis.x > 0 ? 1 : -1;
        }
        if (Math.abs(axis.x) > Math.abs(axis.y) * 0.9) {
            this.view = PuppetView.Side;
        } else {
            this.view = axis.y > 0 ? PuppetView.Front : PuppetView.Back;
        }
        const nx: number = this.x + axis.x * speed * dt;
        if (!blocked(nx, this.y, HERO_RADIUS)) {
            this.x = nx;
        }
        const ny: number = this.y + axis.y * speed * dt;
        if (!blocked(this.x, ny, HERO_RADIUS)) {
            this.y = ny;
        }
        this.walk += dt * 11;
        this.stepTimer -= dt;
        if (this.stepTimer <= 0) {
            this.stepTimer = 0.32;
            return true;
        }
        return false;
    }
}

/** HUD bar (hp, mana, xp...) filled to value / max, with a text label. */
export function bar(cls: string, value: number, max: number, label: string): HTMLElement {
    const pct: number = max <= 0 ? 0 : clamp((value / max) * 100, 0, 100);
    return el("div", {cls: "bar " + cls}, [
        el("div", {cls: "fill", style: {width: pct + "%"}}),
        el("div", {cls: "bar-text", text: label})
    ]);
}

const BUFF_LABEL_KEYS: Record<RunBuffKey, "buffAtk" | "buffMatk" | "buffDef" | "buffHp" | "buffCrit"> = {
    [RunBuffKey.Atk]: "buffAtk",
    [RunBuffKey.Matk]: "buffMatk",
    [RunBuffKey.Def]: "buffDef",
    [RunBuffKey.Hp]: "buffHp",
    [RunBuffKey.Crit]: "buffCrit"
};

export function buffLabel(key: RunBuffKey): string {
    return t(BUFF_LABEL_KEYS[key]);
}

/** Rebuilds the HUD panel (top-left) with hero status. */
export function buildHeroHud(save: SaveData): HTMLElement {
    const max: StatBlock = computeHeroStats(save);
    const level: number = save.hero.level;
    const need: number = xpToNext(level);
    const children: HTMLElement[] = [
        el("div", {cls: "hud-name", text: tr(CLASSES[save.hero.classKey].name) + " · " + t("lvShort") + " " + level + (save.run ? " 🔒" : "")})
    ];
    if (save.run) {
        children.push(bar("hp", save.run.hp, max.hp, t("hp") + " " + save.run.hp + "/" + max.hp));
        children.push(bar("mana", save.run.mana, max.mana, t("mana") + " " + save.run.mana + "/" + max.mana));
    }
    children.push(bar("xp", save.hero.xp, level >= MAX_LEVEL ? 1 : need, level >= MAX_LEVEL ? t("levelCap") : t("xp") + " " + save.hero.xp + "/" + need));
    children.push(el("div", {cls: "hud-line", style: {marginTop: "6px"}}, [
        el("span", {}, ["● ", el("b", {text: String(save.hero.gold)})]),
        el("span", {}, ["◆ ", el("b", {text: String(save.hero.diamonds)})]),
        save.featPoints > 0 ? el("span", {}, ["★ ", el("b", {text: String(save.featPoints)})]) : null
    ].filter((n: HTMLElement | null) => n !== null) as HTMLElement[]));
    const points: number = availableTalentPoints(save);
    if (points > 0) {
        children.push(el("div", {cls: "good-text", style: {fontSize: "13px", marginTop: "4px"}, text: "▲ " + t("talentPointsFree", {n: points}) + " (N)"}));
    }
    if (save.run) {
        const cap: number = floorDef(save.run.floor).rewardCap;
        children.push(el("div", {cls: "hud-line", style: {marginTop: "4px"}}, [
            el("span", {}, [t("floor") + " ", el("b", {text: String(save.run.floor)})]),
            el("span", {cls: save.run.rewardCombats >= cap ? "bad-text" : ""}, [t("rewards") + " ", el("b", {text: save.run.rewardCombats + "/" + cap})])
        ]));
        if (save.run.companions.length > 0) {
            children.push(el("div", {cls: "companion-chips"}, save.run.companions.map((c: CompanionKey) => el("span", {cls: "chip", text: tr(COMPANIONS[c].name)}))));
        }
        if (save.run.buffs.length > 0) {
            children.push(el("div", {cls: "companion-chips"}, save.run.buffs.map((b: RunBuffKey) => el("span", {cls: "chip good-text", text: buffLabel(b)}))));
        }
    }
    return el("div", {cls: "hud-panel"}, children);
}

/** Level-ups happen at once: fanfare and a reminder of the new talent points. */
export function announceLevelUp(game: Game, levels: number): void {
    if (levels <= 0 || !game.save) {
        return;
    }
    game.audio.play(Sfx.LevelUp);
    game.ui.toast(t("levelUpDone", {level: game.save.hero.level}) + " " + t("talentPointsFree", {n: availableTalentPoints(game.save)}), ToastKind.Special);
}

export interface HudButtons {
    onInventory: () => void;
    onCharacter: () => void;
    onTalents: () => void;
    onOptions: () => void;
    onPause: () => void;
}

export function buildHudButtons(handlers: HudButtons): HTMLElement {
    return el("div", {cls: "hud-buttons"}, [
        button(t("bag") + " (I)", handlers.onInventory, {cls: "btn-small"}),
        button(t("character") + " (C)", handlers.onCharacter, {cls: "btn-small"}),
        button(t("talents") + " (N)", handlers.onTalents, {cls: "btn-small"}),
        button(t("options"), handlers.onOptions, {cls: "btn-small"}),
        button("☰ " + t("paused"), handlers.onPause, {cls: "btn-small"})
    ]);
}

/** How a walkable scene (town, dungeon) plugs into the shared HUD, hotkeys and pause menu. */
export interface WorldScene {
    inDungeon: boolean;
    /** A window changed the hero: refresh the HUD. */
    onChange: () => void;
    /** Action bar slot clicked. */
    onUseSlot: (index: number) => void;
    onAbandon: () => void;
    onQuitToMenu: () => void;
}

/** Interaction hint at the bottom of the screen; only touches the DOM when the text changes. */
export class HudHint {
    public readonly element: HTMLElement = el("div", {cls: "hud-hint"});
    private current: string = "";

    public set(text: string): void {
        if (text !== this.current) {
            this.current = text;
            this.element.textContent = text;
        }
    }
}

/** The HUD pieces of a walkable scene. */
export interface WorldHud {
    /** Hero panel (top-left); the scene fills it with buildHeroHud. */
    top: HTMLElement;
    actionBar: ActionBarHud;
    hint: HudHint;
}

function openWorldInventory(game: Game, world: WorldScene): void {
    openInventory(game, {inDungeon: world.inDungeon, onChange: world.onChange});
}

export function openWorldPause(game: Game, world: WorldScene): void {
    openPause(game, {
        inDungeon: world.inDungeon,
        onInventory: () => openWorldInventory(game, world),
        onCharacter: () => openCharacter(game, {onChange: world.onChange}),
        onTalents: () => openTalents(game, {onChange: world.onChange}),
        onAbandon: world.onAbandon,
        onQuitToMenu: world.onQuitToMenu
    });
}

/** Clears the HUD and builds hero panel, menu buttons, action bar and hint (in this order). */
export function buildWorldHud(game: Game, world: WorldScene): WorldHud {
    game.ui.clearHud();
    const top: HTMLElement = el("div", {cls: "hud-top"});
    game.ui.hud.append(top);
    game.ui.hud.append(buildHudButtons({
        onInventory: () => openWorldInventory(game, world),
        onCharacter: () => openCharacter(game, {onChange: world.onChange}),
        onTalents: () => openTalents(game, {onChange: world.onChange}),
        onOptions: () => openOptions(game),
        onPause: () => openWorldPause(game, world)
    }));
    const actionBar: ActionBarHud = new ActionBarHud(() => game.save as SaveData, world.onUseSlot, () => game.saveGame());
    actionBar.refresh();
    game.ui.hud.append(actionBar.element);
    const hint: HudHint = new HudHint();
    game.ui.hud.append(hint.element);
    return {top: top, actionBar: actionBar, hint: hint};
}

/** Bag (I), character (C) and talents (N) hotkeys. */
export function handleWorldHotkeys(game: Game, world: WorldScene, input: Input): void {
    if (input.wasPressed("KeyI")) {
        openWorldInventory(game, world);
    } else if (input.wasPressed("KeyC")) {
        openCharacter(game, {onChange: world.onChange});
    } else if (input.wasPressed("KeyN")) {
        openTalents(game, {onChange: world.onChange});
    }
}

/** The candidate closest to `from` within `range`, or null. */
export function nearestWithin<T extends Vec2>(from: Vec2, candidates: T[], range: number): T | null {
    let best: T | null = null;
    let bestDist: number = range;
    for (const candidate of candidates) {
        const d: number = Math.hypot(from.x - candidate.x, from.y - candidate.y);
        if (d < bestDist) {
            bestDist = d;
            best = candidate;
        }
    }
    return best;
}
