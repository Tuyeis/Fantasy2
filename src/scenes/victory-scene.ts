import {MusicTrack} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el} from "../core/ui";
import {CLASSES} from "../data/hero-classes";
import {drawClassHero} from "../render/class-hero";
import {glow, hash} from "../render/draw-utils";
import {defaultPose} from "../render/hero-sprite";
import {formatPlayTime} from "../windows/house-window";
import {TownScene, TownSpawn} from "./town-scene";

export interface VictoryStats {
    xp: number;
    gold: number;
    kills: number;
}

interface Firework {
    x: number;
    y: number;
    life: number;
    color: string;
}

export class VictoryScene implements Scene {
    public readonly music: MusicTrack = MusicTrack.Victory;
    private time: number = 0;
    private fireworks: Firework[] = [];
    private nextFirework: number = 0.3;

    constructor(private readonly game: Game, private readonly stats: VictoryStats) {
    }

    private get save(): SaveData {
        return this.game.save as SaveData;
    }

    public enter(): void {
        this.build();
    }

    public exit(): void {
        this.game.ui.clearHud();
    }

    public refreshTexts(): void {
        this.build();
    }

    public onEscape(): void {
        this.back();
    }

    private back(): void {
        this.game.setScene(new TownScene(this.game, TownSpawn.Portal, [
            {title: t("victory"), text: t("challengeUp", {n: this.save.challenge})}
        ]));
    }

    private build(): void {
        this.game.ui.clearHud();
        const save: SaveData = this.save;
        const roll: HTMLElement = el("div", {cls: "credits-roll"}, [
            el("h1", {text: t("finalVictory")}),
            el("p", {text: t("finalVictoryText"), style: {maxWidth: "640px", margin: "0 auto", lineHeight: "1.6"}}),
            el("h2", {text: t("runSummary")}),
            el("p", {text: tr(CLASSES[save.hero.classKey].name) + " · " + t("level") + " " + save.hero.level}),
            el("p", {text: t("xpEarned") + ": " + this.stats.xp + " · " + t("goldEarned") + ": " + this.stats.gold + " · " + t("totalKills") + ": " + this.stats.kills}),
            el("p", {text: t("playTime") + ": " + formatPlayTime(save.records.playTime)}),
            el("h2", {text: t("creditsTitle")}),
            el("p", {text: t("gameTitle")}),
            el("p", {text: t("creditsDesign") + ": Claude (Anthropic)"}),
            el("p", {text: t("creditsTech")}),
            el("h2", {text: t("creditsFor")}),
            el("h2", {text: t("creditsThanks")})
        ]);
        this.game.ui.hud.append(el("div", {cls: "credits"}, [roll]));
        this.game.ui.hud.append(el("div", {cls: "victory-actions"}, [button(t("returnToTown"), () => this.back(), {cls: "btn-primary btn-big"})]));
    }

    public update(dt: number): void {
        this.time += dt;
        this.nextFirework -= dt;
        if (this.nextFirework <= 0) {
            this.nextFirework = 0.5 + Math.random() * 0.7;
            this.fireworks.push({
                x: this.game.width * (0.15 + Math.random() * 0.7),
                y: this.game.height * (0.12 + Math.random() * 0.3),
                life: 1.4,
                color: ["#ffd43b", "#ff8787", "#74c0fc", "#b197fc", "#69db7c"][Math.floor(Math.random() * 5)]
            });
        }
        this.fireworks = this.fireworks.filter((f: Firework) => {
            f.life -= dt;
            return f.life > 0;
        });
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        const sky: CanvasGradient = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#1a1440");
        sky.addColorStop(0.55, "#b8577a");
        sky.addColorStop(1, "#ffb56b");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        glow(ctx, w * 0.5, h * 0.85, 320, "#ffe066", 0.6);
        for (let i: number = 0; i < 60; i++) {
            ctx.fillStyle = "rgba(255,255,255," + (0.3 + 0.4 * Math.abs(Math.sin(this.time + i))) + ")";
            ctx.fillRect(hash(i, 5) * w, hash(i, 6) * h * 0.4, 1.5, 1.5);
        }
        for (const f of this.fireworks) {
            const progress: number = 1 - f.life / 1.4;
            for (let i: number = 0; i < 16; i++) {
                const a: number = (i / 16) * Math.PI * 2;
                const r: number = progress * 90;
                ctx.globalAlpha = Math.max(0, 1 - progress);
                ctx.fillStyle = f.color;
                ctx.fillRect(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + progress * progress * 30, 3.5, 3.5);
            }
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#2b1d33";
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.quadraticCurveTo(w * 0.5, h * 0.74, w, h);
        ctx.fill();
        drawClassHero(ctx, w * 0.5, h * 0.86, this.save.hero.classKey, defaultPose({scale: 2.8, time: this.time, attack: (Math.sin(this.time * 1.5) + 1) / 4}));
    }
}
