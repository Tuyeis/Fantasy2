import {MusicTrack, Sfx} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {Input, Vec2} from "../core/input";
import {t} from "../core/i18n";
import {chance, pick, randFloat} from "../core/rng";
import {SaveData} from "../core/save-store";
import {el, ToastKind} from "../core/ui";
import {DamageType} from "../data/abilities";
import {Element} from "../data/element";
import {floorDef} from "../data/floors";
import {MonsterDef, MonsterKey, MONSTERS} from "../data/monsters";
import {StatBlock} from "../data/stat-block";
import {createEnemyCombatant, createHeroCombatant} from "../logic/combat-engine";
import {Combatant, DamageRoll, rollDamage} from "../logic/combat-math";
import {computeHeroStats, dashCharges} from "../logic/hero-stats";
import {drawClassHero, heroWeaponType} from "../render/class-hero";
import {WeaponType} from "../render/puppet/puppet-types";
import {drawText, ellipsePath, glow, hash, rgba} from "../render/draw-utils";
import {FloaterLayer} from "../render/floater-layer";
import {defaultPose} from "../render/hero-sprite";
import {defaultMonsterPose, drawMonster} from "../render/monster-sprite";
import {openBattlePause} from "./battle-pause";
import {RealTimeBolt, RealTimeHero} from "./real-time-hero";
import {TownScene, TownSpawn} from "./town-scene";
import {bar} from "./world-helpers";

const ARENA_RADIUS: number = 380;
const HERO_SPEED: number = 190;
const DASH: RealTimeHero.DashConfig = {speed: 620, time: 0.17, iframeTime: 0.32, recharge: 2.2};
const MELEE_RANGE: number = 78;
const MELEE_COOLDOWN: number = 0.38;
/** Bow basic attack: an arrow that flies where you aim; slower and softer than a swing. */
const ARROW_COOLDOWN: number = 0.55;
const ARROW_POWER: number = 0.7;
const ARROW_SPEED: number = 520;
const BOLT_COOLDOWN: number = 0.35;
const BOLT_MANA: number = 5;
const WAVES: number = 5;
const SPRITE_SCALE: number = 1.45;

interface ArenaEnemy {
    def: MonsterDef;
    combatant: Combatant;
    x: number;
    y: number;
    hitCooldown: number;
    shootTimer: number;
    flash: number;
    ranged: boolean;
    armored: boolean;
    speed: number;
    knockX: number;
    knockY: number;
}

interface Bolt extends RealTimeBolt {
    /** Cast by the hero (hits monsters) rather than by a monster (hits the hero). */
    friendly: boolean;
    /** A bow's basic shot: physical, drawn as an arrow. */
    arrow: boolean;
}

enum ArenaState {
    Countdown = "countdown",
    Fighting = "fighting",
    Won = "won",
    Lost = "lost"
}

export class ArenaScene implements Scene, RealTimeHero {
    public readonly music: MusicTrack = MusicTrack.Arena;
    private readonly hero: Combatant;
    public x: number = 0;
    public y: number = 120;
    private facing: number = 1;
    private aim: Vec2 = {x: 1, y: 0};
    private walk: number = 0;
    private moving: boolean = false;
    public dashTimer: number = 0;
    public dashDir: Vec2 = {x: 1, y: 0};
    public iframes: number = 0;
    public charges: number;
    public readonly maxCharges: number;
    public rechargeTimer: number = 0;
    private meleeTimer: number = 0;
    private boltTimer: number = 0;
    private swing: number = 0;
    private flash: number = 0;
    private enemies: ArenaEnemy[] = [];
    private bolts: Bolt[] = [];
    private readonly bowWielder: boolean;
    private readonly floaters: FloaterLayer = new FloaterLayer({riseSpeed: 40, size: 18});
    private wave: number = 0;
    private waveTimer: number = 2;
    private state: ArenaState = ArenaState.Countdown;
    private time: number = 0;
    private kills: number = 0;
    private hudEl: HTMLElement | null = null;
    private hudTimer: number = 0;
    private scale: number = 1;

    constructor(private readonly game: Game) {
        this.bowWielder = heroWeaponType((game.save as SaveData).hero.classKey) === WeaponType.Bow;
        const save: SaveData = game.save as SaveData;
        const stats: StatBlock = computeHeroStats(save);
        this.hero = createHeroCombatant("hero", stats, stats.hp, stats.mana);
        this.maxCharges = dashCharges(save);
        this.charges = this.maxCharges;
    }

    private get save(): SaveData {
        return this.game.save as SaveData;
    }

    public enter(): void {
        this.buildHud();
    }

    public exit(): void {
        this.game.ui.clearHud();
    }

    public refreshTexts(): void {
        this.buildHud();
    }

    public onEscape(): void {
        openBattlePause(this.game, {label: t("returnToTown"), onClick: () => this.leave()});
    }

    private leave(): void {
        this.game.setScene(new TownScene(this.game, TownSpawn.Coliseum));
    }

    private buildHud(): void {
        this.game.ui.clearHud();
        this.hudEl = el("div", {cls: "hud-top"});
        this.game.ui.hud.append(this.hudEl);
        this.game.ui.hud.append(el("div", {cls: "hud-controls", text: t("coliseumGreeting")}));
        this.refreshHud();
    }

    private refreshHud(): void {
        if (!this.hudEl) {
            return;
        }
        this.hudEl.replaceChildren(el("div", {cls: "hud-panel"}, [
            el("div", {cls: "hud-name", text: t("coliseum") + " · " + t("wave", {n: Math.max(1, this.wave), max: WAVES})}),
            bar("hp", this.hero.hp, this.hero.stats.hp, t("hp") + " " + Math.ceil(this.hero.hp) + "/" + this.hero.stats.hp),
            bar("mana", this.hero.mana, this.hero.stats.mana, t("mana") + " " + Math.floor(this.hero.mana) + "/" + this.hero.stats.mana),
            el("div", {cls: "hud-line", style: {marginTop: "5px"}}, [el("span", {}, [t("dashCharges") + ": ", el("b", {text: RealTimeHero.pips(this)})])])
        ]));
    }

    // ------------------------------------------------------------ waves

    private spawnWave(): void {
        this.wave++;
        // Monster tier follows the hero level, so the arena is fair at any point of the game.
        const level: number = this.save.hero.level;
        const pool: MonsterKey[] = floorDef(level < 5 ? 1 : level < 9 ? 2 : 3).pool;
        const count: number = 2 + this.wave;
        for (let i: number = 0; i < count; i++) {
            const angle: number = (i / count) * Math.PI * 2 + randFloat(0, 0.5);
            const def: MonsterDef = MONSTERS[pick(pool)];
            const armored: boolean = (this.wave === WAVES && i === 0) || chance(0.1 * this.wave);
            this.addEnemy(def, armored, Math.cos(angle) * (ARENA_RADIUS - 40), Math.sin(angle) * (ARENA_RADIUS - 40) * 0.62);
        }
        this.game.ui.toast(t("wave", {n: this.wave, max: WAVES}), ToastKind.Special);
        this.game.audio.play(Sfx.Unlock);
    }

    private addEnemy(def: MonsterDef, armored: boolean, x: number, y: number): void {
        const combatant: Combatant = createEnemyCombatant(def, armored, this.save.challenge);
        combatant.stats.hp = Math.round(combatant.stats.hp * 0.6);
        combatant.hp = combatant.stats.hp;
        const ranged: boolean = def.attacks[0].type === DamageType.Magical;
        this.enemies.push({
            def: def, combatant: combatant, x: x, y: y, hitCooldown: 1, shootTimer: randFloat(1.5, 3), flash: 0,
            ranged: ranged, armored: armored, speed: ranged ? 55 : randFloat(75, 105), knockX: 0, knockY: 0
        });
    }

    // ------------------------------------------------------------ update

    public update(dt: number): void {
        this.time += dt;
        this.floaters.update(dt);
        this.hudTimer -= dt;
        if (this.hudTimer <= 0) {
            this.hudTimer = 0.1;
            this.refreshHud();
        }
        if (this.game.ui.hasModal() || this.state === ArenaState.Won || this.state === ArenaState.Lost) {
            this.moving = false;
            return;
        }
        const input: Input = this.game.input;
        this.updateHero(dt, input);
        if (this.state === ArenaState.Countdown) {
            this.waveTimer -= dt;
            if (this.waveTimer <= 0) {
                this.state = ArenaState.Fighting;
                this.spawnWave();
            }
            return;
        }
        this.updateEnemies(dt);
        this.updateBolts(dt);
        if (this.enemies.length === 0) {
            if (this.wave >= WAVES) {
                this.win();
            } else {
                this.state = ArenaState.Countdown;
                this.waveTimer = 2.2;
                this.hero.hp = Math.min(this.hero.stats.hp, this.hero.hp + this.hero.stats.hp * 0.15);
            }
        }
    }

    private updateHero(dt: number, input: Input): void {
        const axis: Vec2 = input.moveAxis();
        const s: number = this.scale || 1;
        const mouseWorld: Vec2 = {x: (input.mouseX - this.game.width / 2) / s, y: (input.mouseY - this.game.height / 2) / s};
        const ax: number = mouseWorld.x - this.x;
        const ay: number = mouseWorld.y - (this.y - 40);
        const len: number = Math.hypot(ax, ay) || 1;
        this.aim = {x: ax / len, y: ay / len};
        this.facing = this.aim.x >= 0 ? 1 : -1;

        this.meleeTimer -= dt;
        this.boltTimer -= dt;
        RealTimeHero.tick(this, dt, DASH);
        this.swing = Math.max(0, this.swing - dt * 3.5);
        this.flash = Math.max(0, this.flash - dt * 4);
        this.hero.mana = Math.min(this.hero.stats.mana, this.hero.mana + this.hero.stats.mana * 0.04 * dt);

        if (this.dashTimer > 0) {
            this.dashTimer -= dt;
            this.moveHero(this.dashDir.x * DASH.speed * dt, this.dashDir.y * DASH.speed * dt);
        } else {
            this.moving = axis.x !== 0 || axis.y !== 0;
            if (this.moving) {
                this.walk += dt * 12;
                this.moveHero(axis.x * HERO_SPEED * dt, axis.y * HERO_SPEED * dt);
            }
            if (input.wasPressed("Space", "ShiftLeft") && RealTimeHero.startDash(this, this.moving ? axis : this.aim, DASH)) {
                this.game.audio.play(Sfx.Dash);
            }
        }
        if ((input.wasPressed("KeyJ") || input.mouseLeftClicked) && this.meleeTimer <= 0 && this.state === ArenaState.Fighting) {
            this.melee();
        }
        if ((input.wasPressed("KeyK") || input.mouseRightClicked) && this.boltTimer <= 0 && this.state === ArenaState.Fighting) {
            this.castBolt();
        }
    }

    private moveHero(dx: number, dy: number): void {
        RealTimeHero.move(this, dx, dy, ARENA_RADIUS, ARENA_RADIUS * 0.62);
    }

    private melee(): void {
        if (this.bowWielder) {
            this.meleeTimer = ARROW_COOLDOWN;
            this.swing = 1;
            this.game.audio.play(Sfx.Swing);
            this.bolts.push({x: this.x, y: this.y - 40, vx: this.aim.x * ARROW_SPEED, vy: this.aim.y * ARROW_SPEED, life: 0.9, friendly: true, arrow: true, color: "#f1e3c2", damage: 0});
            return;
        }
        this.meleeTimer = MELEE_COOLDOWN;
        this.swing = 1;
        this.game.audio.play(Sfx.Swing);
        for (const enemy of this.enemies) {
            const dx: number = enemy.x - this.x;
            const dy: number = enemy.y - this.y;
            const dist: number = Math.hypot(dx, dy);
            if (dist > MELEE_RANGE + 18 * enemy.def.size) {
                continue;
            }
            const dot: number = (dx * this.aim.x + dy * this.aim.y) / (dist || 1);
            if (dot < 0.25 && dist > 30) {
                continue;
            }
            const roll: DamageRoll = rollDamage(this.hero, enemy.combatant, DamageType.Physical, Element.Neutral, 1.1);
            this.hitEnemy(enemy, roll, dx / (dist || 1), dy / (dist || 1));
        }
    }

    private castBolt(): void {
        if (this.hero.mana < BOLT_MANA) {
            this.game.audio.play(Sfx.Error);
            return;
        }
        this.hero.mana -= BOLT_MANA;
        this.boltTimer = BOLT_COOLDOWN;
        this.game.audio.play(Sfx.Magic);
        this.bolts.push({x: this.x, y: this.y - 40, vx: this.aim.x * 440, vy: this.aim.y * 440, life: 1.2, friendly: true, arrow: false, color: "#9775fa", damage: 0});
    }

    private hitEnemy(enemy: ArenaEnemy, roll: DamageRoll, nx: number, ny: number): void {
        enemy.combatant.hp -= roll.amount;
        enemy.flash = 1;
        enemy.knockX = nx * 220;
        enemy.knockY = ny * 220;
        this.floaters.push({text: roll.amount + (roll.crit ? "!" : ""), x: enemy.x, y: enemy.y - 50, life: 0.8, color: roll.crit ? "#ffd43b" : "#fff"});
        this.game.audio.play(roll.crit ? Sfx.Crit : Sfx.Hit);
        if (enemy.combatant.hp <= 0) {
            this.enemies = this.enemies.filter((e: ArenaEnemy) => e !== enemy);
            this.kills++;
        }
    }

    private hurtHero(amount: number): void {
        if (this.iframes > 0 || this.dashTimer > 0) {
            return;
        }
        this.hero.hp -= amount;
        this.iframes = 0.5;
        this.flash = 1;
        this.floaters.push({text: String(amount), x: this.x, y: this.y - 60, life: 0.8, color: "#ff6b6b"});
        this.game.audio.play(Sfx.Hit);
        if (this.hero.hp <= 0) {
            this.hero.hp = 0;
            this.lose();
        }
    }

    private updateEnemies(dt: number): void {
        for (const enemy of this.enemies) {
            enemy.flash = Math.max(0, enemy.flash - dt * 4);
            enemy.hitCooldown -= dt;
            enemy.x += enemy.knockX * dt;
            enemy.y += enemy.knockY * dt;
            enemy.knockX *= Math.pow(0.002, dt);
            enemy.knockY *= Math.pow(0.002, dt);
            const dx: number = this.x - enemy.x;
            const dy: number = this.y - enemy.y;
            const dist: number = Math.hypot(dx, dy) || 1;
            const preferred: number = enemy.ranged ? 190 : 0;
            if (dist > preferred) {
                enemy.x += (dx / dist) * enemy.speed * dt;
                enemy.y += (dy / dist) * enemy.speed * dt;
            } else if (enemy.ranged) {
                enemy.x -= (dx / dist) * enemy.speed * 0.6 * dt;
                enemy.y -= (dy / dist) * enemy.speed * 0.6 * dt;
            }
            if (!enemy.ranged && dist < 36 + 14 * enemy.def.size && enemy.hitCooldown <= 0) {
                enemy.hitCooldown = 0.9;
                const roll: DamageRoll = rollDamage(enemy.combatant, this.hero, DamageType.Physical, Element.Neutral, 0.8);
                this.hurtHero(roll.amount);
            }
            if (enemy.ranged) {
                enemy.shootTimer -= dt;
                if (enemy.shootTimer <= 0) {
                    enemy.shootTimer = randFloat(2, 3.2);
                    const roll: DamageRoll = rollDamage(enemy.combatant, this.hero, DamageType.Magical, Element.Neutral, 0.8);
                    this.bolts.push({x: enemy.x, y: enemy.y - 40, vx: (dx / dist) * 200, vy: (dy / dist) * 200, life: 3, friendly: false, arrow: false, color: enemy.def.colors.accent, damage: roll.amount});
                }
            }
        }
        // Keep enemies apart.
        for (let i: number = 0; i < this.enemies.length; i++) {
            for (let j: number = i + 1; j < this.enemies.length; j++) {
                const a: ArenaEnemy = this.enemies[i];
                const b: ArenaEnemy = this.enemies[j];
                const dx: number = b.x - a.x;
                const dy: number = b.y - a.y;
                const d: number = Math.hypot(dx, dy) || 1;
                if (d < 36) {
                    const push: number = (36 - d) / 2;
                    a.x -= (dx / d) * push;
                    a.y -= (dy / d) * push;
                    b.x += (dx / d) * push;
                    b.y += (dy / d) * push;
                }
            }
        }
    }

    private updateBolts(dt: number): void {
        for (const bolt of [...this.bolts]) {
            RealTimeBolt.advance(bolt, dt);
            let consumed: boolean = bolt.life <= 0;
            if (bolt.friendly) {
                for (const enemy of this.enemies) {
                    if (!consumed && Math.hypot(enemy.x - bolt.x, enemy.y - 40 - bolt.y) < 34 * enemy.def.size) {
                        const roll: DamageRoll = bolt.arrow
                            ? rollDamage(this.hero, enemy.combatant, DamageType.Physical, Element.Neutral, ARROW_POWER)
                            : rollDamage(this.hero, enemy.combatant, DamageType.Magical, Element.Neutral, 1.3);
                        const len: number = Math.hypot(bolt.vx, bolt.vy) || 1;
                        this.hitEnemy(enemy, roll, bolt.vx / len, bolt.vy / len);
                        consumed = true;
                    }
                }
            } else if (Math.hypot(this.x - bolt.x, this.y - 40 - bolt.y) < 22) {
                this.hurtHero(bolt.damage);
                consumed = true;
            }
            if (consumed) {
                this.bolts = this.bolts.filter((b: Bolt) => b !== bolt);
            }
        }
    }

    private win(): void {
        this.state = ArenaState.Won;
        const save: SaveData = this.save;
        const first: boolean = !save.arenaCleared;
        // The first clear pays well; repeats pay a modest amount so the arena is not a gold farm.
        const gold: number = first ? 250 : 40 + this.kills * 4;
        save.hero.gold += gold;
        save.arenaCleared = true;
        if (first) {
            save.hero.diamonds += 1;
        }
        this.game.saveGame();
        this.game.audio.play(Sfx.Victory);
        this.game.ui.message(t("arenaWon"), t("arenaReward", {gold: gold}) + (first ? " · " + t("diamondsGained", {n: 1}) : ""), () => this.leave());
    }

    private lose(): void {
        this.state = ArenaState.Lost;
        this.game.audio.play(Sfx.Defeat);
        this.game.ui.message(t("arenaLost"), t("wave", {n: this.wave, max: WAVES}) + " · " + t("totalKills") + ": " + this.kills, () => this.leave());
    }

    // ------------------------------------------------------------ render

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        this.scale = Math.min(w / (ARENA_RADIUS * 2.2), h / (ARENA_RADIUS * 1.5), 1.6);
        ctx.fillStyle = "#1b140c";
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(this.scale, this.scale);
        // Stands
        ellipsePath(ctx, 0, 0, ARENA_RADIUS + 70, (ARENA_RADIUS + 70) * 0.66);
        ctx.fillStyle = "#6b5a3a";
        ctx.fill();
        for (let i: number = 0; i < 90; i++) {
            const a: number = (i / 90) * Math.PI * 2;
            const bob: number = Math.sin(this.time * 6 + i) * (this.state === ArenaState.Fighting ? 2 : 0.5);
            ctx.fillStyle = ["#e03131", "#1c7ed6", "#f59f00", "#37b24d", "#ae3ec9"][i % 5];
            ctx.beginPath();
            ctx.arc(Math.cos(a) * (ARENA_RADIUS + 42), Math.sin(a) * (ARENA_RADIUS + 42) * 0.66 + bob, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        // Sand
        ellipsePath(ctx, 0, 0, ARENA_RADIUS, ARENA_RADIUS * 0.62);
        const sand: CanvasGradient = ctx.createRadialGradient(0, 0, 40, 0, 0, ARENA_RADIUS);
        sand.addColorStop(0, "#e6c98f");
        sand.addColorStop(1, "#b8955a");
        ctx.fillStyle = sand;
        ctx.fill();
        ctx.strokeStyle = "#5c4630";
        ctx.lineWidth = 8;
        ctx.stroke();
        for (let i: number = 0; i < 40; i++) {
            ctx.fillStyle = "rgba(120,90,50,0.25)";
            ctx.fillRect((hash(i, 1) - 0.5) * ARENA_RADIUS * 1.6, (hash(i, 2) - 0.5) * ARENA_RADIUS, 4, 2);
        }

        const drawables: {y: number; draw: () => void}[] = [];
        for (const enemy of this.enemies) {
            drawables.push({y: enemy.y, draw: () => {
                drawMonster(ctx, enemy.x, enemy.y, enemy.def, defaultMonsterPose({scale: SPRITE_SCALE, time: this.time, flash: enemy.flash, armored: enemy.armored, facing: this.x < enemy.x ? -1 : 1}), "monster_" + this.enemies.indexOf(enemy));
                const pct: number = Math.max(0, enemy.combatant.hp / enemy.combatant.stats.hp);
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.fillRect(enemy.x - 22, enemy.y + 8, 44, 5);
                ctx.fillStyle = "#e5484d";
                ctx.fillRect(enemy.x - 22, enemy.y + 8, 44 * pct, 5);
            }});
        }
        drawables.push({y: this.y, draw: () => {
            if (this.iframes > 0 && this.dashTimer <= 0) {
                ctx.globalAlpha = 0.55 + Math.sin(this.time * 40) * 0.3;
            }
            if (this.dashTimer > 0) {
                glow(ctx, this.x, this.y - 25, 40, "#74c0fc", 0.5);
            }
            drawClassHero(ctx, this.x, this.y, this.save.hero.classKey, defaultPose({
                scale: SPRITE_SCALE, facing: this.facing, walk: this.walk, moving: this.moving, time: this.time, attack: this.swing > 0 ? 1 - this.swing : 0, flash: this.flash
            }));
            ctx.globalAlpha = 1;
            if (this.swing > 0.3) {
                const angle: number = Math.atan2(this.aim.y, this.aim.x);
                ctx.strokeStyle = rgba("#ffffff", this.swing * 0.8);
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(this.x, this.y - 30, MELEE_RANGE * 0.9, angle - 0.9, angle + 0.9);
                ctx.stroke();
            }
        }});
        drawables.sort((a: {y: number}, b: {y: number}) => a.y - b.y);
        for (const d of drawables) {
            d.draw();
        }
        for (const bolt of this.bolts) {
            if (bolt.arrow) {
                drawArrow(ctx, bolt);
            } else {
                RealTimeBolt.draw(ctx, bolt);
            }
        }
        this.floaters.draw(ctx);
        ctx.restore();
        if (this.state === ArenaState.Countdown) {
            drawText(ctx, t("wave", {n: this.wave + 1, max: WAVES}), w / 2, h * 0.2, 40, "#f5c542");
        }
    }
}

/** Shaft and head along the flight direction. */
function drawArrow(ctx: CanvasRenderingContext2D, bolt: RealTimeBolt): void {
    const len: number = Math.hypot(bolt.vx, bolt.vy) || 1;
    const dx: number = bolt.vx / len;
    const dy: number = bolt.vy / len;
    ctx.save();
    ctx.strokeStyle = "#8d6e3f";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bolt.x - dx * 20, bolt.y - dy * 20);
    ctx.lineTo(bolt.x, bolt.y);
    ctx.stroke();
    ctx.fillStyle = "#dee2e6";
    ctx.beginPath();
    ctx.moveTo(bolt.x + dx * 7, bolt.y + dy * 7);
    ctx.lineTo(bolt.x - dy * 4, bolt.y + dx * 4);
    ctx.lineTo(bolt.x + dy * 4, bolt.y - dx * 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}
