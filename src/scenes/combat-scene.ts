import {MusicTrack, Sfx} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {t, tr} from "../core/i18n";
import {Input} from "../core/input";
import {randFloat} from "../core/rng";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {AbilityDef, AbilityKey, ABILITIES, describeAbility} from "../data/abilities";
import {CompanionKey, COMPANIONS} from "../data/companions";
import {MonsterSpawn, RunData} from "../data/dungeon-types";
import {Element, ELEMENTS} from "../data/element";
import {FloorDef, floorDef} from "../data/floors";
import {CLASSES} from "../data/hero-classes";
import {ItemDef, ItemKey, ITEMS} from "../data/items";
import {MonsterDef, MONSTERS} from "../data/monsters";
import {StatBlock} from "../data/stat-block";
import {StatusKey, STATUSES} from "../data/status-effect";
import {
    CombatEngine, CombatEvent, CombatEventKind, CombatOutcome, CombatTone, createEnemyCombatant, createHeroCombatant, HeroAction, HeroActionKind
} from "../logic/combat-engine";
import {Combatant, Side, StatusInstance} from "../logic/combat-math";
import {companionPowerMultiplier, computeHeroStats, potionMultiplier} from "../logic/hero-stats";
import {itemName, ownedStacks, removeItem, stackCount} from "../logic/inventory";
import {abilityIconEl} from "../render/ability-icons";
import {drawClassHero} from "../render/class-hero";
import {battleBackdrop} from "../render/dungeon-art";
import {fxImpactDelay, SpellFxLayer} from "../render/spell-fx";
import {drawText, glow, rectPath, rgba, shade} from "../render/draw-utils";
import {defaultPose} from "../render/hero-sprite";
import {defaultMonsterPose, drawCompanion, drawMonster} from "../render/monster-sprite";
import {openOptions} from "../windows/options-window";

export interface CombatSummary {
    outcome: CombatOutcome;
    hp: number;
    mana: number;
    /** Extra fraction of XP and gold (real-time victories). */
    rewardBonus?: number;
}

/** A turn-based fight that continues a real-time one (Focus switch). */
export interface CombatOpening {
    enemyHp: number;
    /** The Focus freezes time: the enemy loses its first turn. */
    focus: boolean;
}

enum Phase {
    Intro = "intro",
    Animating = "animating",
    Input = "input",
    Ending = "ending",
    Done = "done"
}

interface Lunge {
    actor: Side;
    progress: number;
}

interface Projectile {
    fromHero: boolean;
    toSelf: boolean;
    progress: number;
    color: string;
    companionIndex: number;
}

interface Floater {
    text: string;
    x: number;
    y: number;
    life: number;
    color: string;
    size: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

export class CombatScene implements Scene {
    public readonly music: MusicTrack;
    private readonly engine: CombatEngine;
    private readonly monster: MonsterDef;
    private phase: Phase = Phase.Intro;
    private queue: CombatEvent[] = [];
    private timer: number = 0.9;
    private time: number = 0;
    private lunge: Lunge | null = null;
    private projectile: Projectile | null = null;
    private readonly spells: SpellFxLayer = new SpellFxLayer();
    private floaters: Floater[] = [];
    private particles: Particle[] = [];
    private shake: number = 0;
    private heroFlash: number = 0;
    private enemyFlash: number = 0;
    private enemyAlpha: number = 1;
    private heroAlpha: number = 1;
    private companionHop: number[] = [];
    private shownHeroHp: number;
    private shownHeroMana: number;
    private shownEnemyHp: number;
    private heroStatuses: StatusKey[] = [];
    private enemyStatuses: StatusKey[] = [];
    private itemsOpen: boolean = false;
    private panel: HTMLElement | null = null;
    private logEl: HTMLElement | null = null;
    private actionsEl: HTMLElement | null = null;
    private heroBoxEl: HTMLElement | null = null;
    private endBanner: string = "";
    private logLines: {text: string; tone: CombatTone}[] = [];
    private pendingInput: boolean = false;

    constructor(private readonly game: Game, private readonly spawn: MonsterSpawn, private readonly isBoss: boolean, private readonly onEnd: (summary: CombatSummary) => void,
                private readonly opening: CombatOpening | undefined = undefined) {
        this.music = isBoss ? MusicTrack.Boss : MusicTrack.Combat;
        const save: SaveData = game.save as SaveData;
        const run: RunData = save.run as RunData;
        this.monster = MONSTERS[spawn.key];
        const max: StatBlock = computeHeroStats(save);
        const hero: Combatant = createHeroCombatant(tr(CLASSES[save.hero.classKey].name), max, run.hp, run.mana);
        const enemy: Combatant = createEnemyCombatant(this.monster, spawn.armored, save.challenge);
        if (opening) {
            enemy.hp = Math.max(1, Math.min(enemy.stats.hp, opening.enemyHp));
            if (opening.focus) {
                enemy.statuses.push({key: StatusKey.Freeze, turns: 1});
            }
        }
        this.engine = new CombatEngine(hero, enemy, this.monster, [...run.companions], {
            heroLevel: save.hero.level,
            companionMultiplier: companionPowerMultiplier(save),
            potionMultiplier: potionMultiplier(save),
            canFlee: !isBoss,
            consumeItem: (key: ItemKey) => {
                const ok: boolean = removeItem(save, key, 1);
                if (ok) {
                    this.game.saveGame();
                }
                return ok;
            }
        });
        this.shownHeroHp = hero.hp;
        this.shownHeroMana = hero.mana;
        this.shownEnemyHp = enemy.hp;
        this.companionHop = run.companions.map(() => 0);
    }

    private get save(): SaveData {
        return this.game.save as SaveData;
    }

    public enter(): void {
        this.buildPanel();
        this.addLog(t("combatStart", {enemy: this.engine.enemy.name}), CombatTone.Special);
        if (this.opening?.focus) {
            this.addLog(t("focusSwitched"), CombatTone.Special);
        }
    }

    public exit(): void {
        this.game.ui.clearHud();
    }

    public refreshTexts(): void {
        this.buildPanel();
    }

    public onEscape(): void {
        if (this.itemsOpen) {
            this.itemsOpen = false;
            this.renderActions();
            return;
        }
        const win: WindowHandle = this.game.ui.openWindow({title: t("paused"), cls: "window-small"});
        win.body.append(el("div", {style: {display: "flex", flexDirection: "column", gap: "8px"}}, [
            button(t("resume"), () => win.close(), {cls: "btn-primary"}),
            button(t("options"), () => openOptions(this.game))
        ]));
    }

    // ------------------------------------------------------------ DOM

    private buildPanel(): void {
        this.game.ui.clearHud();
        this.heroBoxEl = el("div", {cls: "combat-box"});
        this.actionsEl = el("div", {cls: "combat-box"});
        this.logEl = el("div", {cls: "combat-box combat-log"});
        this.panel = el("div", {cls: "combat-panel"}, [this.heroBoxEl, this.actionsEl, this.logEl]);
        this.game.ui.hud.append(this.panel);
        this.renderHeroBox();
        this.renderActions();
        this.renderLog();
    }

    private renderHeroBox(): void {
        if (!this.heroBoxEl) {
            return;
        }
        const hero: Combatant = this.engine.hero;
        const hpPct: number = Math.max(0, (this.shownHeroHp / hero.stats.hp) * 100);
        const manaPct: number = Math.max(0, (this.shownHeroMana / Math.max(1, hero.stats.mana)) * 100);
        this.heroBoxEl.replaceChildren(
            el("div", {cls: "hud-name", text: hero.name + " · " + t("lvShort") + " " + this.save.hero.level}),
            el("div", {cls: "bar hp"}, [el("div", {cls: "fill", style: {width: hpPct + "%"}}), el("div", {cls: "bar-text", text: t("hp") + " " + this.shownHeroHp + "/" + hero.stats.hp})]),
            el("div", {cls: "bar mana"}, [el("div", {cls: "fill", style: {width: manaPct + "%"}}), el("div", {cls: "bar-text", text: t("mana") + " " + this.shownHeroMana + "/" + hero.stats.mana})]),
            el("div", {cls: "status-chips"}, this.heroStatuses.map((s: StatusKey) => el("span", {cls: "status-chip", text: tr(STATUSES[s].name), style: {background: STATUSES[s].color}}))),
            el("div", {cls: "companion-chips"}, this.engine.companions.map((c: CompanionKey) => el("span", {cls: "chip", text: tr(COMPANIONS[c].name)})))
        );
    }

    private renderActions(): void {
        if (!this.actionsEl) {
            return;
        }
        const enabled: boolean = this.phase === Phase.Input;
        if (this.itemsOpen) {
            const usable: ItemKey[] = ownedStacks(this.save).filter((k: ItemKey) => ITEMS[k].heal !== undefined);
            const list: HTMLElement = el("div", {cls: "submenu"}, usable.length === 0
                ? [el("div", {cls: "muted", text: t("noUsableItems")})]
                : usable.map((key: ItemKey) => {
                    const def: ItemDef = ITEMS[key];
                    const b: HTMLButtonElement = button("", () => this.act({kind: HeroActionKind.Item, item: key}), {cls: "btn-small", disabled: !enabled});
                    b.append(el("span", {text: itemName(key) + " ×" + stackCount(this.save, key)}), el("span", {cls: "muted", text: tr(def.desc)}));
                    return b;
                }));
            this.actionsEl.replaceChildren(list, el("div", {style: {marginTop: "6px"}}, [button("← " + t("back"), () => {
                this.itemsOpen = false;
                this.renderActions();
            }, {cls: "btn-small"})]));
            return;
        }
        const abilityButtons: HTMLElement[] = CLASSES[this.save.hero.classKey].abilities.map((key: AbilityKey, index: number) => {
            const def: AbilityDef = ABILITIES[key];
            const b: HTMLButtonElement = button("", () => this.act({kind: HeroActionKind.Ability, ability: key}), {
                cls: "ability-btn",
                disabled: !enabled || this.shownHeroMana < def.manaCost,
                title: describeAbility(def)
            });
            b.style.borderColor = ELEMENTS[def.element].color;
            b.append(abilityIconEl(key, 26), el("span", {cls: "ability-text"}, [(index + 1) + ". " + tr(def.name), el("small", {text: def.manaCost + " " + t("mana") + " · " + tr(ELEMENTS[def.element].name)})]));
            return b;
        });
        this.actionsEl.replaceChildren(el("div", {cls: "combat-actions"}, [
            button(t("attack") + " (A)", () => this.act({kind: HeroActionKind.Attack}), {cls: "btn-primary", disabled: !enabled, title: t("clickEnemyToAttack")}),
            ...abilityButtons.slice(0, 3),
            abilityButtons[3],
            button(t("items") + " (Q)", () => {
                this.itemsOpen = true;
                this.renderActions();
            }, {disabled: !enabled}),
            button(t("guard") + " (G)", () => this.act({kind: HeroActionKind.Guard}), {disabled: !enabled}),
            button(t("flee") + " (F)", () => this.act({kind: HeroActionKind.Flee}), {disabled: !enabled || !this.engine.canFlee, title: this.engine.canFlee ? "" : t("cannotFlee")})
        ]));
    }

    private addLog(text: string, tone: CombatTone): void {
        this.logLines.push({text: text, tone: tone});
        if (this.logLines.length > 60) {
            this.logLines.shift();
        }
        this.renderLog();
    }

    private renderLog(): void {
        if (!this.logEl) {
            return;
        }
        this.logEl.replaceChildren(...this.logLines.map((line: {text: string; tone: CombatTone}) => el("div", {cls: "log-" + line.tone, text: line.text})));
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }

    // ------------------------------------------------------------ flow

    private act(action: HeroAction): void {
        if (this.phase !== Phase.Input) {
            return;
        }
        if (action.kind === HeroActionKind.Ability) {
            const def: AbilityDef = ABILITIES[action.ability as AbilityKey];
            if (this.engine.hero.mana < def.manaCost) {
                this.game.audio.play(Sfx.Error);
                this.game.ui.toast(t("notEnoughMana"), ToastKind.Bad);
                return;
            }
        }
        if (action.kind === HeroActionKind.Flee && !this.engine.canFlee) {
            this.game.audio.play(Sfx.Error);
            this.game.ui.toast(t("cannotFlee"), ToastKind.Bad);
            return;
        }
        this.itemsOpen = false;
        this.phase = Phase.Animating;
        this.renderActions();
        this.queue.push(...this.engine.resolveRound(action));
        this.timer = 0;
    }

    private startHeroTurn(): void {
        const start: {events: CombatEvent[]; canAct: boolean} = this.engine.startHeroTurn();
        this.queue.push(...start.events);
        if (this.engine.outcome !== CombatOutcome.Ongoing) {
            this.phase = Phase.Animating;
            return;
        }
        if (start.canAct) {
            this.pendingInput = true;
        } else {
            this.queue.push(...this.engine.resolveRound(null));
        }
        this.phase = Phase.Animating;
    }

    private onQueueDrained(): void {
        if (this.engine.outcome !== CombatOutcome.Ongoing) {
            this.finish();
            return;
        }
        if (this.pendingInput) {
            this.pendingInput = false;
            this.phase = Phase.Input;
            this.renderActions();
            return;
        }
        this.startHeroTurn();
    }

    private finish(): void {
        this.phase = Phase.Ending;
        const outcome: CombatOutcome = this.engine.outcome;
        if (outcome === CombatOutcome.Won) {
            this.endBanner = t("victory");
            this.game.audio.play(Sfx.Victory);
            this.timer = 1.5;
        } else if (outcome === CombatOutcome.Lost) {
            this.endBanner = t("defeat");
            this.game.audio.play(Sfx.Defeat);
            this.timer = 2.2;
        } else {
            this.endBanner = t("logFleeOk");
            this.game.audio.play(Sfx.Dash);
            this.timer = 0.8;
        }
        this.renderActions();
    }

    public update(dt: number): void {
        this.time += dt;
        this.shake = Math.max(0, this.shake - dt * 18);
        this.heroFlash = Math.max(0, this.heroFlash - dt * 4);
        this.enemyFlash = Math.max(0, this.enemyFlash - dt * 4);
        this.companionHop = this.companionHop.map((v: number) => Math.max(0, v - dt * 3));
        if (this.lunge) {
            this.lunge.progress += dt / 0.4;
            if (this.lunge.progress >= 1) {
                this.lunge = null;
            }
        }
        this.spells.update(dt);
        if (this.projectile) {
            this.projectile.progress += dt / 0.3;
            if (this.projectile.progress >= 1) {
                this.projectile = null;
            }
        }
        this.floaters = this.floaters.filter((f: Floater) => {
            f.life -= dt;
            f.y -= dt * 40;
            return f.life > 0;
        });
        this.particles = this.particles.filter((p: Particle) => {
            p.life -= dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;
            return p.life > 0;
        });
        if (this.engine.outcome === CombatOutcome.Won && this.enemyAlpha < 1 && this.queue.length === 0) {
            this.enemyAlpha = Math.max(0, this.enemyAlpha - dt * 1.5);
        }

        if (this.phase === Phase.Input && !this.game.ui.hasModal()) {
            this.handleKeys();
            return;
        }
        if (this.phase === Phase.Done) {
            return;
        }
        this.timer -= dt;
        if (this.timer > 0) {
            return;
        }
        if (this.phase === Phase.Intro) {
            this.startHeroTurn();
            return;
        }
        if (this.phase === Phase.Ending) {
            this.phase = Phase.Done;
            this.onEnd({outcome: this.engine.outcome, hp: this.engine.hero.hp, mana: this.engine.hero.mana});
            return;
        }
        const next: CombatEvent | undefined = this.queue.shift();
        if (!next) {
            this.onQueueDrained();
            return;
        }
        this.timer = this.playEvent(next);
    }

    /** Clicking the monster is a basic attack. */
    private clickOnEnemy(x: number, y: number): boolean {
        const pos: {x: number; y: number} = this.enemyPos();
        const h: number = this.headOffset(Side.Enemy) * 2.2;
        return Math.abs(x - pos.x) < Math.max(60, h * 0.6) && y < pos.y + 20 && y > pos.y - h;
    }

    private handleKeys(): void {
        const input: Input = this.game.input;
        const abilities: AbilityKey[] = CLASSES[this.save.hero.classKey].abilities;
        if (input.wasPressed("KeyA") || (input.mouseLeftClicked && this.clickOnEnemy(input.mouseX, input.mouseY))) {
            this.act({kind: HeroActionKind.Attack});
        } else if (input.wasPressed("Digit1") && abilities[0]) {
            this.act({kind: HeroActionKind.Ability, ability: abilities[0]});
        } else if (input.wasPressed("Digit2") && abilities[1]) {
            this.act({kind: HeroActionKind.Ability, ability: abilities[1]});
        } else if (input.wasPressed("Digit3") && abilities[2]) {
            this.act({kind: HeroActionKind.Ability, ability: abilities[2]});
        } else if (input.wasPressed("Digit4") && abilities[3]) {
            this.act({kind: HeroActionKind.Ability, ability: abilities[3]});
        } else if (input.wasPressed("KeyG")) {
            this.act({kind: HeroActionKind.Guard});
        } else if (input.wasPressed("KeyF")) {
            this.act({kind: HeroActionKind.Flee});
        } else if (input.wasPressed("KeyQ")) {
            this.itemsOpen = !this.itemsOpen;
            this.renderActions();
        }
    }

    /** Applies the visual side of an event; returns the delay before the next one. */
    private playEvent(e: CombatEvent): number {
        const heroPos: {x: number; y: number} = this.heroPos();
        const enemyPos: {x: number; y: number} = this.enemyPos();
        switch (e.kind) {
            case CombatEventKind.Log:
                this.addLog(e.text ?? "", e.tone ?? CombatTone.Neutral);
                return 0.12;
            case CombatEventKind.Lunge:
                this.lunge = {actor: e.actor as Side, progress: 0};
                this.game.audio.play(Sfx.Swing);
                if (e.ability) {
                    return this.castSpellFx(e);
                }
                return 0.2;
            case CombatEventKind.Cast: {
                if (e.ability) {
                    this.game.audio.play(Sfx.Magic);
                    return this.castSpellFx(e);
                }
                const fromHero: boolean = e.actor === Side.Hero;
                const toSelf: boolean = e.actor === e.target;
                this.projectile = {fromHero: fromHero, toSelf: toSelf, progress: 0, color: ELEMENTS[e.element ?? Element.Neutral].color, companionIndex: -1};
                this.game.audio.play(Sfx.Magic);
                return toSelf ? 0.2 : 0.3;
            }
            case CombatEventKind.Companion: {
                const index: number = e.companionIndex ?? 0;
                this.companionHop[index] = 1;
                if (e.target === Side.Enemy) {
                    this.projectile = {fromHero: true, toSelf: false, progress: 0, color: ELEMENTS[e.element ?? Element.Neutral].color, companionIndex: index};
                    this.game.audio.play(Sfx.Magic);
                    return 0.3;
                }
                return 0.15;
            }
            case CombatEventKind.Damage: {
                const onHero: boolean = e.target === Side.Hero;
                const pos: {x: number; y: number} = onHero ? heroPos : enemyPos;
                const amount: number = e.amount ?? 0;
                if (onHero) {
                    this.shownHeroHp = e.hpAfter ?? this.shownHeroHp;
                    this.heroFlash = 1;
                    this.renderHeroBox();
                } else {
                    this.shownEnemyHp = e.hpAfter ?? this.shownEnemyHp;
                    this.enemyFlash = 1;
                }
                const color: string = e.status ? STATUSES[e.status].color : e.crit ? "#ffd43b" : onHero ? "#ff8787" : "#ffffff";
                this.floaters.push({text: String(amount) + (e.crit ? "!" : ""), x: pos.x + randFloat(-14, 14), y: pos.y - this.headOffset(e.target as Side) - 10, life: 1.1, color: color, size: e.crit ? 34 : 26});
                if (e.multiplier && e.multiplier > 1) {
                    this.floaters.push({text: "▲", x: pos.x + 34, y: pos.y - this.headOffset(e.target as Side) - 30, life: 0.9, color: "#69db7c", size: 18});
                }
                this.burst(pos.x, pos.y - this.headOffset(e.target as Side) * 0.5, e.element ? ELEMENTS[e.element].color : "#ffffff", e.crit ? 18 : 10);
                this.shake = e.crit ? 10 : this.isBoss && onHero ? 6 : 4;
                this.game.audio.play(e.crit ? Sfx.Crit : Sfx.Hit);
                return 0.3;
            }
            case CombatEventKind.Heal: {
                const onHero: boolean = e.target === Side.Hero;
                const pos: {x: number; y: number} = onHero ? heroPos : enemyPos;
                if (onHero) {
                    this.shownHeroHp = e.hpAfter ?? this.shownHeroHp;
                    this.renderHeroBox();
                } else {
                    this.shownEnemyHp = e.hpAfter ?? this.shownEnemyHp;
                }
                if ((e.amount ?? 0) > 0) {
                    this.floaters.push({text: "+" + e.amount, x: pos.x, y: pos.y - this.headOffset(e.target as Side) - 20, life: 1.1, color: "#69db7c", size: 24});
                    this.game.audio.play(Sfx.Heal);
                }
                return 0.25;
            }
            case CombatEventKind.Mana:
                if (e.target === Side.Hero) {
                    this.shownHeroMana = e.manaAfter ?? this.shownHeroMana;
                    this.renderHeroBox();
                    if ((e.amount ?? 0) > 3) {
                        this.floaters.push({text: "+" + e.amount, x: heroPos.x - 30, y: heroPos.y - 80, life: 0.9, color: "#74c0fc", size: 18});
                    }
                }
                return 0.05;
            case CombatEventKind.Status:
                this.heroStatuses = this.engine.hero.statuses.map((s: StatusInstance) => s.key);
                this.enemyStatuses = this.engine.enemy.statuses.map((s: StatusInstance) => s.key);
                if (e.status) {
                    const pos: {x: number; y: number} = e.target === Side.Hero ? heroPos : enemyPos;
                    this.floaters.push({text: tr(STATUSES[e.status].name), x: pos.x, y: pos.y - this.headOffset(e.target as Side) - 34, life: 1.2, color: STATUSES[e.status].color, size: 18});
                    this.game.audio.play(Sfx.Status);
                }
                this.renderHeroBox();
                return 0.2;
            case CombatEventKind.Buff: {
                const pos: {x: number; y: number} = e.target === Side.Hero ? heroPos : enemyPos;
                this.burst(pos.x, pos.y - 40, "#ffe066", 8);
                return 0.12;
            }
            case CombatEventKind.Defeat:
                if (e.target === Side.Enemy) {
                    this.enemyAlpha = 0.99;
                } else {
                    this.heroAlpha = 0.35;
                }
                return 0.5;
        }
    }

    /** Hero ability visuals; returns the delay before the damage event plays. */
    private castSpellFx(e: CombatEvent): number {
        const key: AbilityKey = e.ability as AbilityKey;
        if ((e.hitIndex ?? 0) > 0) {
            return 0.16;
        }
        const heroPos: {x: number; y: number} = this.heroPos();
        const enemyPos: {x: number; y: number} = this.enemyPos();
        const from: {x: number; y: number} = {x: heroPos.x + 18, y: heroPos.y - this.headOffset(Side.Hero) * 0.6};
        const self: boolean = e.target === Side.Hero;
        const to: {x: number; y: number} = self ? from : {x: enemyPos.x, y: enemyPos.y - this.headOffset(Side.Enemy) * 0.55};
        this.spells.cast(key, e.element ?? Element.Neutral, from, to, this.unitScale(), e.hits ?? 1);
        return self ? 0.35 : fxImpactDelay(key);
    }

    private burst(x: number, y: number, color: string, count: number): void {
        for (let i: number = 0; i < count; i++) {
            const angle: number = Math.random() * Math.PI * 2;
            const speed: number = randFloat(60, 220);
            this.particles.push({x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life: randFloat(0.3, 0.7), color: color});
        }
    }

    // ------------------------------------------------------------ render

    private heroPos(): {x: number; y: number} {
        return {x: this.game.width * 0.3, y: this.game.height * 0.58};
    }

    private enemyPos(): {x: number; y: number} {
        return {x: this.game.width * 0.7, y: this.game.height * 0.56};
    }

    /** Very large bosses are capped so they fit between the info box and the action panel. */
    private enemyScale(): number {
        return this.unitScale() * 1.05 * Math.min(1, 1.6 / this.monster.size);
    }

    /** Screen height of the target's head, used to place floating numbers. */
    private headOffset(side: Side): number {
        if (side === Side.Hero) {
            return 46 * this.unitScale();
        }
        return 40 * this.enemyScale() * this.monster.size;
    }

    private unitScale(): number {
        return Math.max(1.6, Math.min(3, this.game.height / 300));
    }

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        const fd: FloorDef = floorDef(this.save.run?.floor ?? 1);
        ctx.save();
        if (this.shake > 0) {
            ctx.translate(randFloat(-this.shake, this.shake), randFloat(-this.shake, this.shake));
        }
        const backdrop: HTMLImageElement | undefined = battleBackdrop(fd.floor, this.isBoss);
        if (backdrop) {
            this.drawBackdrop(ctx, backdrop, w, h);
        } else {
            this.drawProceduralBackdrop(ctx, fd, w, h);
        }
        if (this.isBoss) {
            glow(ctx, this.enemyPos().x, this.enemyPos().y - 80, 260, this.monster.colors.accent, 0.18 + Math.sin(this.time * 2) * 0.05);
        }
        this.drawCombatBody(ctx, w, h);
    }

    /** Painted battle background, cover-fit, with living light: flickering warm light, drifting motes, floor vignette. */
    private drawBackdrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
        // The painted floor starts at about 60% of the picture height: put that line just above the fighters' feet.
        const FLOOR_LINE: number = 0.6;
        const feetY: number = Math.max(this.heroPos().y, this.enemyPos().y) - 18;
        const scale: number = Math.max((w + 40) / img.width, (h + 40) / img.height,
            (feetY + 20) / (FLOOR_LINE * img.height), (h - feetY + 20) / ((1 - FLOOR_LINE) * img.height));
        const dw: number = img.width * scale;
        const dh: number = img.height * scale;
        // Slow parallax sway gives the room some air.
        const sway: number = Math.sin(this.time * 0.25) * 6;
        ctx.drawImage(img, (w - dw) / 2 + sway, feetY - FLOOR_LINE * dh, dw, dh);
        ctx.fillStyle = "rgba(255,170,90," + (0.03 + Math.sin(this.time * 7) * 0.012) + ")";
        ctx.fillRect(-20, -20, w + 40, h + 40);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i: number = 0; i < 28; i++) {
            const k: number = (this.time * (0.03 + (i % 5) * 0.008) + i * 0.137) % 1;
            const x: number = ((i * 97.3) % w + Math.sin(this.time * 0.6 + i) * 20 + w) % w;
            const y: number = h * (1 - k);
            ctx.fillStyle = "rgba(255,230,190," + (0.25 * Math.sin(k * Math.PI)) + ")";
            ctx.beginPath();
            ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        const v: CanvasGradient = ctx.createRadialGradient(w / 2, h * 0.62, h * 0.25, w / 2, h * 0.62, Math.max(w, h) * 0.75);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = v;
        ctx.fillRect(-20, -20, w + 40, h + 40);
    }

    private drawProceduralBackdrop(ctx: CanvasRenderingContext2D, fd: FloorDef, w: number, h: number): void {
        // Back wall + floor
        const wall: CanvasGradient = ctx.createLinearGradient(0, 0, 0, h * 0.45);
        wall.addColorStop(0, shade(fd.wallColor, -0.3));
        wall.addColorStop(1, fd.wallTop);
        ctx.fillStyle = wall;
        ctx.fillRect(-20, -20, w + 40, h * 0.45 + 20);
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2;
        for (let row: number = 0; row < 6; row++) {
            const y: number = h * 0.45 - row * 34;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
            for (let x: number = (row % 2) * 40; x < w; x += 80) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y - 34);
                ctx.stroke();
            }
        }
        const floor: CanvasGradient = ctx.createLinearGradient(0, h * 0.45, 0, h);
        floor.addColorStop(0, fd.floorColor);
        floor.addColorStop(1, shade(fd.floorColor, -0.5));
        ctx.fillStyle = floor;
        ctx.fillRect(-20, h * 0.45, w + 40, h * 0.55 + 20);
        for (const tx of [w * 0.12, w * 0.5, w * 0.88]) {
            const flick: number = Math.sin(this.time * 9 + tx) * 3;
            glow(ctx, tx, h * 0.26, 90 + flick, "#ff922b", 0.28);
            ctx.fillStyle = "#ffa94d";
            ctx.beginPath();
            ctx.moveTo(tx - 7, h * 0.28);
            ctx.quadraticCurveTo(tx, h * 0.28 - 22 + flick, tx + 7, h * 0.28);
            ctx.fill();
            ctx.fillStyle = "#6b4226";
            ctx.fillRect(tx - 3, h * 0.28, 6, 16);
        }
    }

    private drawCombatBody(ctx: CanvasRenderingContext2D, w: number, h: number): void {

        const scale: number = this.unitScale();
        const heroPos: {x: number; y: number} = this.heroPos();
        const enemyPos: {x: number; y: number} = this.enemyPos();
        let heroOffset: number = 0;
        let enemyOffset: number = 0;
        let heroAttack: number = 0;
        if (this.lunge) {
            const reach: number = Math.sin(this.lunge.progress * Math.PI) * (enemyPos.x - heroPos.x) * 0.55;
            if (this.lunge.actor === Side.Hero) {
                heroOffset = reach;
                heroAttack = this.lunge.progress;
            } else {
                enemyOffset = -reach;
            }
        }

        // Companions
        this.engine.companions.forEach((c: CompanionKey, i: number) => {
            const hop: number = Math.sin(this.companionHop[i] * Math.PI) * 18;
            drawCompanion(ctx, heroPos.x - 70 - i * 42, heroPos.y + 30 - hop, c, this.time, scale * 0.9, 1);
        });
        // Hero
        ctx.globalAlpha = this.heroAlpha;
        drawClassHero(ctx, heroPos.x + heroOffset, heroPos.y, this.save.hero.classKey, defaultPose({
            scale: scale, facing: 1, time: this.time, attack: heroAttack, flash: this.heroFlash, moving: this.lunge?.actor === Side.Hero, walk: this.time * 14
        }));
        if (this.engine.hero.guarding && this.phase !== Phase.Input) {
            ctx.strokeStyle = "rgba(116,192,252,0.7)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(heroPos.x, heroPos.y - 24 * scale, 30 * scale, -1, 1);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // Enemy
        ctx.globalAlpha = this.enemyAlpha;
        drawMonster(ctx, enemyPos.x + enemyOffset, enemyPos.y, this.monster, defaultMonsterPose({
            scale: this.enemyScale(), time: this.time, flash: this.enemyFlash, armored: this.spawn.armored, facing: -1
        }));
        ctx.globalAlpha = 1;

        this.spells.draw(ctx);
        // Projectile
        if (this.projectile) {
            const p: Projectile = this.projectile;
            let fromX: number = p.fromHero ? heroPos.x + 20 : enemyPos.x - 20;
            let fromY: number = (p.fromHero ? heroPos.y : enemyPos.y) - 60;
            if (p.companionIndex >= 0) {
                fromX = heroPos.x - 70 - p.companionIndex * 42;
                fromY = heroPos.y;
            }
            const toX: number = p.toSelf ? fromX : p.fromHero ? enemyPos.x : heroPos.x;
            const toY: number = p.toSelf ? fromY - 30 : (p.fromHero ? enemyPos.y : heroPos.y) - 60;
            const px: number = fromX + (toX - fromX) * p.progress;
            const py: number = fromY + (toY - fromY) * p.progress - Math.sin(p.progress * Math.PI) * (p.toSelf ? 0 : 40);
            if (p.toSelf) {
                ctx.strokeStyle = rgba(p.color, 1 - p.progress);
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(fromX, fromY + 20, 20 + p.progress * 60, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                glow(ctx, px, py, 34, p.color, 0.8);
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(px, py, 7, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        for (const part of this.particles) {
            ctx.globalAlpha = Math.min(1, part.life * 2);
            ctx.fillStyle = part.color;
            ctx.fillRect(part.x - 2.5, part.y - 2.5, 5, 5);
        }
        ctx.globalAlpha = 1;
        for (const f of this.floaters) {
            ctx.globalAlpha = Math.min(1, f.life * 2);
            drawText(ctx, f.text, f.x, f.y, f.size, f.color);
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        this.drawEnemyInfo(ctx);
        if (this.phase === Phase.Input) {
            drawText(ctx, t("yourTurn"), heroPos.x, heroPos.y - 150 * scale / 2.4 - 40, 18, "#f5c542");
        }
        if (this.endBanner && (this.phase === Phase.Ending || this.phase === Phase.Done)) {
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(0, h * 0.3, w, 90);
            drawText(ctx, this.endBanner, w / 2, h * 0.3 + 45, 52, this.engine.outcome === CombatOutcome.Lost ? "#ff6b6b" : "#f5c542");
        }
    }

    private drawEnemyInfo(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const enemy: Combatant = this.engine.enemy;
        const boxW: number = Math.min(520, w - 40);
        const x: number = (w - boxW) / 2;
        const y: number = 16;
        rectPath(ctx, x, y, boxW, 74, 9);
        ctx.fillStyle = "rgba(20,16,28,0.88)";
        ctx.fill();
        ctx.strokeStyle = this.isBoss ? "#ff6b6b" : "#6b5a3a";
        ctx.lineWidth = this.isBoss ? 2 : 1;
        ctx.stroke();
        drawText(ctx, (this.isBoss ? "☠ " : "") + enemy.name, x + 14, y + 16, 17, this.isBoss ? "#ff8787" : "#f5c542", "left");
        const pct: number = Math.max(0, this.shownEnemyHp / enemy.stats.hp);
        rectPath(ctx, x + 14, y + 30, boxW - 28, 14, 7);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fill();
        rectPath(ctx, x + 14, y + 30, Math.max(0, (boxW - 28) * pct), 14, 7);
        ctx.fillStyle = "#e5484d";
        ctx.fill();
        drawText(ctx, this.shownEnemyHp + "/" + enemy.stats.hp, x + boxW / 2, y + 37, 11, "#fff");
        let cursor: number = x + 14;
        const parts: {text: string; color: string}[] = [];
        if (this.monster.weak.length > 0) {
            parts.push({text: t("weakTo") + ": " + this.monster.weak.map((e: Element) => tr(ELEMENTS[e].name)).join(", "), color: "#69db7c"});
        }
        if (this.monster.resist.length > 0) {
            parts.push({text: t("resists") + ": " + this.monster.resist.map((e: Element) => tr(ELEMENTS[e].name)).join(", "), color: "#ffa8a8"});
        }
        for (const s of this.enemyStatuses) {
            parts.push({text: tr(STATUSES[s].name), color: STATUSES[s].color});
        }
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        for (const part of parts) {
            drawText(ctx, part.text, cursor, y + 60, 12, part.color, "left", false);
            cursor += ctx.measureText(part.text).width + 16;
        }
    }
}
