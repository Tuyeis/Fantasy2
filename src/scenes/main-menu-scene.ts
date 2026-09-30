import {MusicTrack} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {t} from "../core/i18n";
import {createNewSave, deleteSave, hasSave, loadSave, SaveData} from "../core/save-store";
import {button, el, WindowHandle} from "../core/ui";
import {ClassKey} from "../data/hero-classes";
import {MonsterKey, MONSTERS} from "../data/monsters";
import {drawClassHero} from "../render/class-hero";
import {glow, hash} from "../render/draw-utils";
import {defaultPose} from "../render/hero-sprite";
import {defaultMonsterPose, drawMonster} from "../render/monster-sprite";
import {openOptions} from "../windows/options-window";
import {DungeonScene} from "./dungeon-scene";
import {TownScene} from "./town-scene";

export function creditsNode(): HTMLElement {
    return el("div", {style: {textAlign: "center", lineHeight: "1.7"}}, [
        el("div", {cls: "section-title", text: t("gameTitle")}),
        el("div", {text: t("creditsDesign")}),
        el("div", {cls: "muted", text: "Claude (Anthropic)"}),
        el("div", {cls: "section-title", text: t("creditsFor")}),
        el("div", {cls: "muted", text: t("creditsTech")}),
        el("div", {cls: "section-title", text: t("creditsThanks")})
    ]);
}

export class MainMenuScene implements Scene {
    public readonly music: MusicTrack = MusicTrack.Menu;
    private menu: HTMLElement | null = null;
    private time: number = 0;

    constructor(private readonly game: Game) {
    }

    public enter(): void {
        this.buildMenu();
    }

    public exit(): void {
        this.menu?.remove();
        this.menu = null;
    }

    public refreshTexts(): void {
        this.buildMenu();
    }

    public onEscape(): void {
        // Nothing to pause in the menu.
    }

    private buildMenu(): void {
        this.menu?.remove();
        const saveExists: boolean = hasSave();
        const buttons: HTMLElement[] = [];
        if (saveExists) {
            buttons.push(button(t("continueGame"), () => this.continueGame(), {cls: "btn-big btn-primary"}));
        }
        buttons.push(button(t("newGame"), () => {
            if (saveExists) {
                this.game.ui.confirm(t("confirmNewGame"), () => this.newGame());
            } else {
                this.newGame();
            }
        }, {cls: "btn-big" + (saveExists ? "" : " btn-primary")}));
        buttons.push(button(t("options"), () => openOptions(this.game), {cls: "btn-big"}));
        buttons.push(button(t("credits"), () => {
            const win: WindowHandle = this.game.ui.openWindow({title: t("credits"), cls: "window-small"});
            win.body.append(creditsNode());
            win.footer.append(button(t("close"), () => win.close(), {cls: "btn-primary"}));
        }, {cls: "btn-big"}));
        this.menu = el("div", {cls: "menu"}, [
            el("h1", {cls: "menu-title", text: t("gameTitle")}),
            el("div", {cls: "menu-subtitle", text: t("gameSubtitle")}),
            ...buttons
        ]);
        this.menu.append(el("div", {cls: "menu-footer", text: t("controlsHint")}));
        this.game.ui.hud.append(this.menu);
    }

    private newGame(): void {
        deleteSave();
        this.game.save = createNewSave();
        this.game.saveGame();
        this.game.setScene(new TownScene(this.game));
    }

    private continueGame(): void {
        const save: SaveData | null = loadSave();
        if (!save) {
            this.newGame();
            return;
        }
        this.game.save = save;
        if (save.run) {
            this.game.setScene(new DungeonScene(this.game));
        } else {
            this.game.setScene(new TownScene(this.game));
        }
    }

    public update(dt: number): void {
        this.time += dt;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        const sky: CanvasGradient = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#0b0820");
        sky.addColorStop(0.6, "#2a1747");
        sky.addColorStop(1, "#5a2d4a");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        for (let i: number = 0; i < 140; i++) {
            const sx: number = hash(i, 1) * w;
            const sy: number = hash(i, 2) * h * 0.65;
            const twinkle: number = 0.4 + 0.6 * Math.abs(Math.sin(this.time * (0.5 + hash(i, 3) * 2) + i));
            ctx.fillStyle = "rgba(255,255,255," + twinkle * 0.8 + ")";
            ctx.fillRect(sx, sy, hash(i, 4) > 0.85 ? 2 : 1.2, hash(i, 4) > 0.85 ? 2 : 1.2);
        }
        glow(ctx, w * 0.8, h * 0.2, 110, "#fff3bf", 0.25);
        ctx.fillStyle = "#fff3bf";
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.2, 38, 0, Math.PI * 2);
        ctx.fill();
        // Mountains
        ctx.fillStyle = "#1c1233";
        ctx.beginPath();
        ctx.moveTo(0, h * 0.75);
        for (let x: number = 0; x <= w; x += 40) {
            ctx.lineTo(x, h * 0.62 + Math.sin(x * 0.012) * 40 + Math.sin(x * 0.031) * 18);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
        // Castle silhouette
        ctx.fillStyle = "#120b22";
        const cx: number = w * 0.18;
        const cy: number = h * 0.7;
        ctx.fillRect(cx - 60, cy - 70, 120, 90);
        for (const tx of [-70, -10, 50]) {
            ctx.fillRect(cx + tx, cy - 120, 24, 140);
            ctx.beginPath();
            ctx.moveTo(cx + tx - 4, cy - 120);
            ctx.lineTo(cx + tx + 12, cy - 150);
            ctx.lineTo(cx + tx + 28, cy - 120);
            ctx.fill();
        }
        for (const wx of [-40, 20]) {
            glow(ctx, cx + wx, cy - 40, 14, "#ffa94d", 0.6 + Math.sin(this.time * 5 + wx) * 0.15);
        }
        // Foreground hill
        ctx.fillStyle = "#0e0a18";
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.5, h * 0.72, w, h);
        ctx.fill();
        const heroClass: ClassKey = this.game.save?.hero.classKey ?? ClassKey.Novice;
        drawClassHero(ctx, w * 0.62, h * 0.86, heroClass, defaultPose({scale: 2.4, time: this.time, facing: 1}));
        drawMonster(ctx, w * 0.82, h * 0.93, MONSTERS[MonsterKey.Slime], defaultMonsterPose({scale: 2.2, time: this.time}));
    }
}
