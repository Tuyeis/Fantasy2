import {Input, Vec2} from "../core/input";
import {t, tr} from "../core/i18n";
import {clamp} from "../core/rng";
import {SaveData} from "../core/save-store";
import {button, el} from "../core/ui";
import {CompanionKey, COMPANIONS} from "../data/companions";
import {RunBuffKey} from "../data/dungeon-types";
import {floorDef} from "../data/floors";
import {CLASSES} from "../data/hero-classes";
import {StatBlock} from "../data/stat-block";
import {computeHeroStats, MAX_LEVEL, xpToNext} from "../logic/hero-stats";
import {canLevelUp} from "../logic/progression";
import {PuppetView} from "../render/puppet/puppet-types";

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

    public screenToWorld(sx: number, sy: number, viewW: number, viewH: number): Vec2 {
        return {x: (sx - viewW / 2) / this.zoom + this.x, y: (sy - viewH / 2) / this.zoom + this.y};
    }
}

/** 8-direction walking hero with axis-separated collision. */
export class HeroWalker {
    public facing: number = 1;
    /** Which painted view of the puppet to show: sideways, towards the camera or away from it. */
    public view: PuppetView = PuppetView.Front;
    public walk: number = 0;
    public moving: boolean = false;
    private stepTimer: number = 0;

    constructor(public x: number, public y: number, public radius: number = 10) {
        // radius can be enlarged by scenes whose art is drawn bigger
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
        if (!blocked(nx, this.y, this.radius)) {
            this.x = nx;
        }
        const ny: number = this.y + axis.y * speed * dt;
        if (!blocked(this.x, ny, this.radius)) {
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

function bar(cls: string, value: number, max: number, label: string): HTMLElement {
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
    children.push(bar("xp", save.hero.xp, level >= MAX_LEVEL ? 1 : need, t("xpPending") + " " + save.hero.xp + (level >= MAX_LEVEL ? "" : "/" + need)));
    children.push(el("div", {cls: "hud-line", style: {marginTop: "6px"}}, [
        el("span", {}, ["● ", el("b", {text: String(save.hero.gold)})]),
        el("span", {}, ["◆ ", el("b", {text: String(save.hero.diamonds)})]),
        save.featPoints > 0 ? el("span", {}, ["★ ", el("b", {text: String(save.featPoints)})]) : null
    ].filter((n: HTMLElement | null) => n !== null) as HTMLElement[]));
    if (!save.run && canLevelUp(save)) {
        children.push(el("div", {cls: "good-text", style: {fontSize: "13px", marginTop: "4px"}, text: "▲ " + t("guild") + ": " + t("levelUp")}));
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

export interface HudButtons {
    onInventory: () => void;
    onCharacter: () => void;
    onOptions: () => void;
    onPause: () => void;
}

export function buildHudButtons(handlers: HudButtons): HTMLElement {
    return el("div", {cls: "hud-buttons"}, [
        button(t("bag") + " (I)", handlers.onInventory, {cls: "btn-small"}),
        button(t("character") + " (C)", handlers.onCharacter, {cls: "btn-small"}),
        button(t("options"), handlers.onOptions, {cls: "btn-small"}),
        button("☰ " + t("paused"), handlers.onPause, {cls: "btn-small"})
    ]);
}
