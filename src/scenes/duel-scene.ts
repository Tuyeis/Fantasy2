import {MusicTrack, Sfx} from "../core/audio-engine";
import {Game, Scene} from "../core/game";
import {t, tr} from "../core/i18n";
import {Input, Vec2} from "../core/input";
import {randFloat} from "../core/rng";
import {SaveData} from "../core/save-store";
import {el, ToastKind} from "../core/ui";
import {AbilityDef, AbilityKey, AbilityKind, DamageType} from "../data/abilities";
import {MonsterSpawn, RunData} from "../data/dungeon-types";
import {Element} from "../data/element";
import {FloorDef, floorDef} from "../data/floors";
import {CLASSES} from "../data/hero-classes";
import {MonsterDef, MONSTERS} from "../data/monsters";
import {StatBlock, StatKey} from "../data/stat-block";
import {StatusKey} from "../data/status-effect";
import {CombatOutcome, createEnemyCombatant, createHeroCombatant} from "../logic/combat-engine";
import {Combatant, DamageRoll, effectiveStat, rollDamage} from "../logic/combat-math";
import {REAL_TIME_REWARD_BONUS, RealTimeBehaviour, realTimeBehaviour} from "../logic/encounter-mode";
import {computeHeroStats, dashCharges, potionMultiplier} from "../logic/hero-stats";
import {basicAttackMultiplier, effectiveAbility} from "../logic/talents";
import {syncActionBar} from "../logic/action-bar";
import {removeItem} from "../logic/inventory";
import {ActionBarSlot} from "../data/action-bar";
import {ItemDef, ItemKey, ITEMS} from "../data/items";
import {ActionBarHud, pressedSlot} from "./action-bar-hud";
import {drawClassHero} from "../render/class-hero";
import {DungeonProp, drawProp, roomFloor} from "../render/dungeon-art";
import {drawText, ellipsePath, glow, rgba, shade} from "../render/draw-utils";
import {FloaterLayer} from "../render/floater-layer";
import {defaultPose} from "../render/hero-sprite";
import {defaultMonsterPose, drawMonster} from "../render/monster-sprite";
import {PuppetView} from "../render/puppet/puppet-types";
import {ARROW_IMPACT_DELAY, FxStyle, fxImpactDelay, fxStyleOf, RANGED_STYLES, SpellFxLayer} from "../render/spell-fx";
import {heroWeaponType} from "../render/class-hero";
import {WeaponType} from "../render/puppet/puppet-types";
import {openBattlePause} from "./battle-pause";
import {CombatScene, CombatSummary} from "./combat-scene";
import {clampToArena, RealTimeBolt, RealTimeHero} from "./real-time-hero";
import {bar} from "./world-helpers";

/** Real-time duel against the monster of a dungeon room (the hybrid-combat alternative to turns). */

const ARENA_W: number = 360;
const ARENA_H: number = 220;
const HERO_SPEED: number = 190;
const DASH: RealTimeHero.DashConfig = {speed: 620, time: 0.17, iframeTime: 0.32, recharge: 2.8};
const MELEE_RANGE: number = 74;
const MELEE_COOLDOWN: number = 0.5;
/** Basic swings come much faster than turns, so each one hits softer. */
const MELEE_POWER: number = 0.75;
const DASH_SLASH_POWER: number = 0.6;
/** Bow basic attack: always reaches, so it is slower and softer than a swing (tuned with tools/duel-bot.js). */
const BOW_COOLDOWN: number = 0.75;
const BOW_POWER: number = 0.6;
const BOW_MOVE_MULT: number = 0.45;
/** A melee swing leaps at a hero this far away (× strike reach): walk-backs don't dodge, dashes do. */
const LEAP_REACH: number = 2;
const CHASE_SPEED_MULT: number = 1.9;
/** Share of max mana regenerated per second. */
const MANA_REGEN: number = 0.025;
/** Real-time pacing of abilities: base cooldown plus a share of the mana cost. */
const ABILITY_BASE_COOLDOWN: number = 2.5;
const ABILITY_COOLDOWN_PER_MANA: number = 0.22;
/**
 * You act several times per enemy attack in real time (turns are 1:1), so monsters need more HP here.
 * Tuned with tools/duel-bot.js so a real-time fight costs about as much HP as the same fight by turns.
 */
const REAL_TIME_ENEMY_HP: number = 4;
/** Hits you fail to dodge hurt more than a turn-based hit: dodging is the skill real time rewards. */
const REAL_TIME_ENEMY_DAMAGE: number = 1.3;
/** Per floor below the first, monsters attack this much more often and move this much faster. */
const AGGRESSION_PER_FLOOR: number = 0.08;
/** Hits push the monster back (px/s), unless it is winding up or lunging: then it keeps coming. */
const KNOCKBACK_LIGHT: number = 70;
const KNOCKBACK_HEAVY: number = 20;
/** One turn of a buff lasts this many seconds in real time. */
const SECONDS_PER_TURN: number = 3;
/** Touching a monster hurts (fraction of its melee power) at most this often. */
const CONTACT_POWER: number = 0.55;
const CONTACT_COOLDOWN: number = 0.75;
const SPRITE_SCALE: number = 1.45;
/** Seconds between potions in real time (no chugging a whole stack mid-fight). */
const POTION_COOLDOWN: number = 2.5;
const FOCUS_PER_HIT: number = 0.12;
const FOCUS_PER_DODGE: number = 0.25;

enum EnemyState {
    Approach = "approach",
    WindUp = "wind_up",
    Lunge = "lunge",
    Recover = "recover"
}

enum DuelState {
    Intro = "intro",
    Fighting = "fighting",
    Over = "over"
}

interface PendingHit {
    at: number;
    def: AbilityDef;
    last: boolean;
}

interface TimedBuff {
    stat: StatKey;
    amount: number;
    until: number;
}

interface Dot {
    until: number;
    next: number;
    color: string;
}

function abilityCooldown(def: AbilityDef): number {
    return ABILITY_BASE_COOLDOWN + def.manaCost * ABILITY_COOLDOWN_PER_MANA;
}

export class DuelScene implements Scene, RealTimeHero {
    public readonly music: MusicTrack;
    private readonly monster: MonsterDef;
    private readonly isBoss: boolean;
    private readonly behaviour: RealTimeBehaviour;
    private readonly hero: Combatant;
    private readonly enemy: Combatant;
    // hero
    public x: number = -200;
    public y: number = 20;
    private facing: number = 1;
    private view: PuppetView = PuppetView.Side;
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
    /** A click during the swing cooldown is remembered briefly instead of being lost. */
    private attackBuffer: number = 0;
    /** The current dash already slashed the enemy. */
    private dashHit: boolean = false;
    private dashTrail: {x: number; y: number; life: number; facing: number}[] = [];
    /** Talent bonus to basic attacks and the dash slash. */
    private readonly basicMultiplier: number;
    /** Seconds left per ability. */
    private readonly cooldowns: Map<AbilityKey, number> = new Map<AbilityKey, number>();
    private potionCooldown: number = 0;
    private readonly spells: SpellFxLayer = new SpellFxLayer();
    private pendingHits: PendingHit[] = [];
    /** Landing times of basic-attack arrows in flight. */
    private arrowHits: number[] = [];
    private readonly bowWielder: boolean;
    private timedBuffs: TimedBuff[] = [];
    private actionBar: ActionBarHud | null = null;
    private swing: number = 0;
    private flash: number = 0;
    private focus: number = 0;
    // enemy
    private ex: number = 200;
    private ey: number = 20;
    private enemyState: EnemyState = EnemyState.Approach;
    private enemyTimer: number = 0.5;
    private enemyFlash: number = 0;
    private enemyAttack: number = 0;
    private lungeDir: Vec2 = {x: -1, y: 0};
    private knockX: number = 0;
    private knockY: number = 0;
    private enemyStun: number = 0;
    private stunLabel: string = "";
    private dots: Dot[] = [];
    private contactTimer: number = 0;
    private enemyMoving: boolean = false;
    private enemyWalk: number = 0;
    // world
    private bolts: RealTimeBolt[] = [];
    private readonly floaters: FloaterLayer = new FloaterLayer({riseSpeed: 40, size: 18});
    private state: DuelState = DuelState.Intro;
    private introTimer: number = 1.1;
    private time: number = 0;
    private scale: number = 1;
    private hudEl: HTMLElement | null = null;
    private hudTimer: number = 0;
    private readonly floor: FloorDef;

    constructor(private readonly game: Game, private readonly spawn: MonsterSpawn, private readonly onEnd: (summary: CombatSummary) => void) {
        const save: SaveData = game.save as SaveData;
        const run: RunData = save.run as RunData;
        this.monster = MONSTERS[spawn.key];
        this.isBoss = this.monster.boss;
        this.music = this.isBoss ? MusicTrack.Boss : MusicTrack.Combat;
        const aggression: number = AGGRESSION_PER_FLOOR * (run.floor - 1) + (this.isBoss ? 0.15 : 0);
        const base: RealTimeBehaviour = realTimeBehaviour(this.monster);
        this.behaviour = {...base, speed: base.speed * (1 + aggression), cooldown: base.cooldown / (1 + aggression), windUp: base.windUp / (1 + aggression * 0.5)};
        const max: StatBlock = computeHeroStats(save);
        this.hero = createHeroCombatant(tr(CLASSES[save.hero.classKey].name), max, run.hp, run.mana);
        this.enemy = createEnemyCombatant(this.monster, spawn.armored, save.challenge);
        this.enemy.stats = {...this.enemy.stats, hp: Math.round(this.enemy.stats.hp * REAL_TIME_ENEMY_HP)};
        this.enemy.hp = this.enemy.stats.hp;
        this.maxCharges = dashCharges(save);
        this.charges = this.maxCharges;
        this.floor = floorDef(run.floor);
        this.basicMultiplier = basicAttackMultiplier(save);
        this.bowWielder = heroWeaponType(save.hero.classKey) === WeaponType.Bow;
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
        openBattlePause(this.game, {label: t("flee"), onClick: () => {
            if (this.isBoss) {
                this.game.ui.toast(t("cannotFlee"), ToastKind.Bad);
                return;
            }
            this.end({outcome: CombatOutcome.Fled, hp: this.hero.hp, mana: this.hero.mana});
        }});
    }

    // ------------------------------------------------------------ HUD

    private buildHud(): void {
        this.game.ui.clearHud();
        this.hudEl = el("div", {cls: "hud-top"});
        this.game.ui.hud.append(this.hudEl);
        this.game.ui.hud.append(el("div", {cls: "hud-controls", text: t("realTimeHelp")}));
        this.actionBar = new ActionBarHud(() => this.save, (index: number) => this.useSlot(index), () => this.game.saveGame());
        this.actionBar.refresh();
        this.game.ui.hud.append(this.actionBar.element);
        this.refreshHud();
    }

    private refreshHud(): void {
        if (!this.hudEl) {
            return;
        }
        const pips: string = RealTimeHero.pips(this);
        const focusFull: boolean = this.focus >= 1;
        this.hudEl.replaceChildren(
            el("div", {cls: "hud-panel"}, [
                el("div", {cls: "hud-name", text: this.hero.name}),
                bar("hp", this.hero.hp, this.hero.stats.hp, t("hp") + " " + Math.ceil(this.hero.hp) + "/" + this.hero.stats.hp),
                bar("mana", this.hero.mana, this.hero.stats.mana, t("mana") + " " + Math.floor(this.hero.mana) + "/" + this.hero.stats.mana),
                el("div", {cls: "bar xp"}, [
                    el("div", {cls: "fill", style: {width: Math.min(100, this.focus * 100) + "%", background: focusFull ? "#f5c542" : "#b197fc"}}),
                    el("div", {cls: "bar-text", text: focusFull ? t("focusReady") : t("focus") + " " + Math.floor(this.focus * 100) + "%"})
                ]),
                el("div", {cls: "hud-line", style: {marginTop: "5px"}}, [el("span", {}, [t("dashCharges") + ": ", el("b", {text: pips})])])
            ]),
            el("div", {cls: "hud-panel", style: {position: "fixed", top: "10px", right: "12px", minWidth: "200px"}}, [
                el("div", {cls: "hud-name", text: tr(this.monster.name)}),
                bar("hp", this.enemy.hp, this.enemy.stats.hp, Math.ceil(this.enemy.hp) + "/" + this.enemy.stats.hp)
            ])
        );
        if (this.actionBar) {
            this.actionBar.update({
                cooldownOf: (slot: ActionBarSlot) => slot.ability
                    ? {left: this.cooldowns.get(slot.ability) ?? 0, total: abilityCooldown(effectiveAbility(this.save, slot.ability))}
                    : {left: this.potionCooldown, total: POTION_COOLDOWN},
                mana: this.hero.mana
            });
        }
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
        if (this.game.ui.hasModal() || this.state === DuelState.Over) {
            this.moving = false;
            return;
        }
        this.spells.update(dt);
        this.updateHero(dt, this.game.input);
        if (this.state === DuelState.Intro) {
            this.introTimer -= dt;
            if (this.introTimer <= 0) {
                this.state = DuelState.Fighting;
            }
            return;
        }
        this.updateAbilities(dt);
        if (this.state !== DuelState.Fighting) {
            return;
        }
        this.updateEnemy(dt);
        this.updateBolts(dt);
    }

    private updateHero(dt: number, input: Input): void {
        const axis: Vec2 = input.moveAxis();
        // One enemy: attacks aim at it automatically.
        const ax: number = this.ex - this.x;
        const ay: number = this.ey - this.y;
        const len: number = Math.hypot(ax, ay) || 1;
        this.aim = {x: ax / len, y: ay / len};

        this.meleeTimer -= dt;
        RealTimeHero.tick(this, dt, DASH);
        this.swing = Math.max(0, this.swing - dt * 3.5);
        this.flash = Math.max(0, this.flash - dt * 4);
        this.hero.mana = Math.min(this.hero.stats.mana, this.hero.mana + this.hero.stats.mana * MANA_REGEN * dt);
        for (const g of this.dashTrail) {
            g.life -= dt;
        }
        this.dashTrail = this.dashTrail.filter((g: {life: number}) => g.life > 0);
        if (this.dashTimer > 0) {
            this.dashTimer -= dt;
            this.moveHero(this.dashDir.x * DASH.speed * dt, this.dashDir.y * DASH.speed * dt);
            this.dashTrail.push({x: this.x, y: this.y, life: 0.25, facing: this.facing});
            // Dash slash: cutting through (or right past) the monster hits it once.
            if (!this.dashHit && this.state === DuelState.Fighting && Math.hypot(this.ex - this.x, this.ey - this.y) < MELEE_RANGE * 0.8 + 18 * this.monster.size) {
                this.dashHit = true;
                this.swing = 1;
                this.spells.cast(AbilityKey.Slash, Element.Neutral, this.heroCenter(), this.enemyCenter(), SPRITE_SCALE * 0.9, 1);
                this.hitEnemy(rollDamage(this.hero, this.enemy, DamageType.Physical, Element.Neutral, DASH_SLASH_POWER * this.basicMultiplier), this.dashDir.x, this.dashDir.y);
            }
        } else {
            this.moving = axis.x !== 0 || axis.y !== 0;
            if (this.moving) {
                this.walk += dt * 12;
                // Drawing the bow slows you down, like casting.
                const speed: number = this.bowWielder && this.swing > 0 ? HERO_SPEED * BOW_MOVE_MULT : HERO_SPEED;
                this.moveHero(axis.x * speed * dt, axis.y * speed * dt);
                if (Math.abs(axis.x) > Math.abs(axis.y) * 0.9) {
                    this.view = PuppetView.Side;
                } else {
                    this.view = axis.y > 0 ? PuppetView.Front : PuppetView.Back;
                }
            } else {
                this.view = PuppetView.Side;
            }
            // Forward: where you walk, or straight at the monster when standing still.
            if (input.wasPressed("Space", "ShiftLeft") && RealTimeHero.startDash(this, this.moving ? axis : this.aim, DASH)) {
                this.dashHit = false;
                this.game.audio.play(Sfx.Dash);
            }
        }
        this.facing = this.moving && this.view === PuppetView.Side ? (axis.x >= 0 ? 1 : -1) : (this.aim.x >= 0 ? 1 : -1);
        if (this.state !== DuelState.Fighting) {
            return;
        }
        if (input.wasPressed("KeyJ") || input.mouseLeftClicked) {
            this.attackBuffer = 0.25;
        }
        this.attackBuffer -= dt;
        // Holding the button keeps attacking.
        if ((this.attackBuffer > 0 || input.mouseLeftDown || input.isDown("KeyJ")) && this.meleeTimer <= 0) {
            this.attackBuffer = 0;
            this.melee();
        }
        const slot: number = pressedSlot(input);
        if (slot >= 0) {
            this.useSlot(slot);
        }
        if (input.wasPressed("KeyF") && this.focus >= 1) {
            this.switchToTurns();
        }
    }

    private moveHero(dx: number, dy: number): void {
        RealTimeHero.move(this, dx, dy, ARENA_W, ARENA_H);
    }

    private shootArrow(): void {
        this.meleeTimer = BOW_COOLDOWN;
        this.swing = 1;
        this.game.audio.play(Sfx.Swing);
        this.spells.shootArrow(this.heroCenter(), this.enemyCenter(), SPRITE_SCALE * 0.9);
        this.arrowHits.push(this.time + ARROW_IMPACT_DELAY);
    }

    private melee(): void {
        if (this.bowWielder) {
            this.shootArrow();
            return;
        }
        this.meleeTimer = MELEE_COOLDOWN;
        this.swing = 1;
        this.game.audio.play(Sfx.Swing);
        let dist: number = Math.hypot(this.ex - this.x, this.ey - this.y);
        const reach: number = MELEE_RANGE + 18 * this.monster.size;
        // Slightly out of reach: step into the swing.
        if (dist > reach && dist < reach + 70) {
            const step: number = dist - reach + 6;
            this.moveHero(this.aim.x * step, this.aim.y * step);
            dist = Math.hypot(this.ex - this.x, this.ey - this.y);
        }
        if (dist <= reach) {
            this.hitEnemy(rollDamage(this.hero, this.enemy, DamageType.Physical, Element.Neutral, MELEE_POWER * this.basicMultiplier), this.aim.x, this.aim.y);
        }
    }

    // ------------------------------------------------------------ abilities

    private heroCenter(): {x: number; y: number} {
        return {x: this.x + this.facing * 10, y: this.y - 48};
    }

    private enemyCenter(): {x: number; y: number} {
        return {x: this.ex, y: this.ey - 42 * this.monster.size};
    }

    /** Action bar slot 1-8: an ability or a potion. */
    private useSlot(index: number): void {
        const slot: ActionBarSlot | null = syncActionBar(this.save)[index] ?? null;
        if (!slot) {
            return;
        }
        if (slot.kind === ActionBarSlot.Kind.Item && slot.item) {
            this.drinkPotion(slot.item);
        } else if (slot.ability) {
            this.useAbility(slot.ability);
        }
    }

    private drinkPotion(key: ItemKey): void {
        const def: ItemDef = ITEMS[key];
        if (this.state !== DuelState.Fighting || !def.heal) {
            return;
        }
        if (this.potionCooldown > 0) {
            this.game.audio.play(Sfx.Error);
            this.floaters.push({text: t("potionCooldown"), x: this.x, y: this.y - 80, life: 0.9, color: "#ffd43b"});
            return;
        }
        if (!removeItem(this.save, key, 1)) {
            this.game.audio.play(Sfx.Error);
            this.floaters.push({text: t("noUsableItems"), x: this.x, y: this.y - 80, life: 0.9, color: "#ffd43b"});
            return;
        }
        const mult: number = potionMultiplier(this.save);
        this.potionCooldown = POTION_COOLDOWN;
        this.game.audio.play(Sfx.Heal);
        if (def.heal.hp) {
            this.healHero(Math.round(def.heal.hp * mult));
        }
        if (def.heal.mana) {
            this.hero.mana = Math.min(this.hero.stats.mana, this.hero.mana + Math.round(def.heal.mana * mult));
            this.floaters.push({text: "+" + Math.round(def.heal.mana * mult), x: this.x + 18, y: this.y - 60, life: 0.9, color: "#74c0fc"});
        }
        if (def.heal.cureStatus) {
            this.flash = 0;
        }
        this.game.saveGame();
        if (this.actionBar) {
            this.actionBar.refresh();
        }
    }

    private useAbility(key: AbilityKey): void {
        if (this.state !== DuelState.Fighting || (this.cooldowns.get(key) ?? 0) > 0) {
            return;
        }
        const def: AbilityDef = effectiveAbility(this.save, key);
        if (this.hero.mana < def.manaCost) {
            this.game.audio.play(Sfx.Error);
            this.floaters.push({text: t("notEnoughMana"), x: this.x, y: this.y - 80, life: 0.8, color: "#74c0fc"});
            return;
        }
        const style: FxStyle = fxStyleOf(key);
        const dist: number = Math.hypot(this.ex - this.x, this.ey - this.y);
        const reach: number = MELEE_RANGE + 18 * this.monster.size;
        if (def.kind === AbilityKind.Damage && !RANGED_STYLES.includes(style) && dist > reach * 1.25) {
            if (key === AbilityKey.Pounce || key === AbilityKey.CloudStrike) {
                // Gap closers: leap at the enemy.
                this.dashDir = {x: this.aim.x, y: this.aim.y};
                this.dashTimer = Math.min(0.35, (dist - reach * 0.6) / DASH.speed);
                this.iframes = this.dashTimer;
            } else {
                this.game.audio.play(Sfx.Error);
                this.floaters.push({text: t("tooFar"), x: this.x, y: this.y - 80, life: 0.8, color: "#ffd43b"});
                return;
            }
        }
        this.hero.mana -= def.manaCost;
        this.cooldowns.set(key, abilityCooldown(def));
        const from: {x: number; y: number} = this.heroCenter();
        if (def.kind === AbilityKind.Damage) {
            const hits: number = def.hits ?? 1;
            this.spells.cast(key, def.element, from, this.enemyCenter(), SPRITE_SCALE * 0.9, hits);
            const delay: number = fxImpactDelay(key) + Math.max(0, this.dashTimer);
            for (let i: number = 0; i < hits; i++) {
                this.pendingHits.push({at: this.time + delay + i * 0.14, def: def, last: i === hits - 1});
            }
            if (def.damageType === DamageType.Physical) {
                this.swing = 1;
                this.game.audio.play(Sfx.Swing);
            } else {
                this.game.audio.play(Sfx.Magic);
            }
        } else {
            this.spells.cast(key, def.element, from, from, SPRITE_SCALE * 0.9, 1);
            this.game.audio.play(def.kind === AbilityKind.Heal ? Sfx.Heal : Sfx.Unlock);
        }
        if (def.healPct !== undefined) {
            const amount: number = Math.round(this.hero.stats.hp * def.healPct + effectiveStat(this.hero, StatKey.Matk) * (def.healPower ?? 0));
            this.healHero(amount);
        }
        for (const b of def.buffs ?? []) {
            this.timedBuffs.push({stat: b.stat, amount: b.amount, until: this.time + b.turns * SECONDS_PER_TURN});
        }
    }

    private healHero(amount: number): void {
        const before: number = this.hero.hp;
        this.hero.hp = Math.min(this.hero.stats.hp, this.hero.hp + amount);
        const gained: number = Math.round(this.hero.hp - before);
        if (gained > 0) {
            this.floaters.push({text: "+" + gained, x: this.x, y: this.y - 70, life: 0.9, color: "#69db7c"});
        }
    }

    private updateAbilities(dt: number): void {
        for (const [key, left] of this.cooldowns) {
            this.cooldowns.set(key, Math.max(0, left - dt));
        }
        this.potionCooldown = Math.max(0, this.potionCooldown - dt);
        this.timedBuffs = this.timedBuffs.filter((b: TimedBuff) => b.until > this.time);
        this.hero.buffs = this.timedBuffs.map((b: TimedBuff) => ({stat: b.stat, amount: b.amount, turns: 1, source: "rt"}));
        const landed: number = this.arrowHits.filter((at: number) => at <= this.time).length;
        this.arrowHits = this.arrowHits.filter((at: number) => at > this.time);
        for (let i: number = 0; i < landed && this.state === DuelState.Fighting; i++) {
            this.hitEnemy(rollDamage(this.hero, this.enemy, DamageType.Physical, Element.Neutral, BOW_POWER * this.basicMultiplier), this.aim.x, this.aim.y);
        }
        const due: PendingHit[] = this.pendingHits.filter((h: PendingHit) => h.at <= this.time);
        this.pendingHits = this.pendingHits.filter((h: PendingHit) => h.at > this.time);
        for (const hit of due) {
            if (this.state !== DuelState.Fighting) {
                return;
            }
            const def: AbilityDef = hit.def;
            const dist: number = Math.hypot(this.ex - this.x, this.ey - this.y);
            if (!RANGED_STYLES.includes(fxStyleOf(def.key)) && dist > (MELEE_RANGE + 18 * this.monster.size) * 1.4) {
                continue;
            }
            const roll: DamageRoll = rollDamage(this.hero, this.enemy, def.damageType ?? DamageType.Physical, def.element, def.power ?? 1, def.critBonus ?? 0);
            this.hitEnemy(roll, this.aim.x, this.aim.y);
            if (def.lifesteal) {
                this.healHero(Math.round(roll.amount * def.lifesteal));
            }
            if (hit.last && def.status && def.statusChance && Math.random() < def.statusChance) {
                this.applyStatus(def.status);
            }
        }
    }

    private applyStatus(status: StatusKey): void {
        if (status === StatusKey.Burn || status === StatusKey.Poison) {
            this.dots.push({until: this.time + 4, next: this.time + 1, color: status === StatusKey.Burn ? "#ff922b" : "#94d82d"});
            return;
        }
        // Freeze, sleep and charm stop the monster for a while (shorter on control-resistant bosses).
        const seconds: number = (status === StatusKey.Sleep ? 3 : 2.2) * (this.enemy.controlResistant ? 0.45 : 1);
        this.enemyStun = Math.max(this.enemyStun, seconds);
        this.stunLabel = status === StatusKey.Freeze ? "❄" : status === StatusKey.Sleep ? "z z" : "♥";
        this.enemyState = EnemyState.Recover;
        this.enemyTimer = seconds;
    }

    private hitEnemy(roll: DamageRoll, nx: number, ny: number): void {
        this.enemy.hp -= roll.amount;
        this.enemyFlash = 1;
        // Heavy monsters barely move when hit, and nobody is pushed out of their own attack.
        const committed: boolean = this.enemyState === EnemyState.WindUp || this.enemyState === EnemyState.Lunge;
        const knock: number = committed ? 0 : this.behaviour.meleePower > 1.1 ? KNOCKBACK_HEAVY : KNOCKBACK_LIGHT;
        this.knockX = nx * knock;
        this.knockY = ny * knock;
        this.focus = Math.min(1, this.focus + FOCUS_PER_HIT);
        this.floaters.push({text: roll.amount + (roll.crit ? "!" : ""), x: this.ex, y: this.ey - 60, life: 0.8, color: roll.crit ? "#ffd43b" : "#fff"});
        this.game.audio.play(roll.crit ? Sfx.Crit : Sfx.Hit);
        if (this.enemy.hp <= 0) {
            this.killEnemy();
        }
    }

    private killEnemy(): void {
        this.enemy.hp = 0;
        this.game.audio.play(Sfx.Victory);
        this.end({outcome: CombatOutcome.Won, hp: this.hero.hp, mana: this.hero.mana, rewardBonus: REAL_TIME_REWARD_BONUS});
    }

    /** An enemy attack reaches the hero: dodged while dashing (perfect dodge fills the Focus), otherwise it hurts. */
    private attackHero(amount: number, contact: boolean = false): void {
        if (this.dashTimer > 0 || this.iframes > 0) {
            if (this.dashTimer > 0 && !contact) {
                this.perfectDodge();
            }
            return;
        }
        amount = Math.max(1, Math.round(amount * REAL_TIME_ENEMY_DAMAGE));
        this.hero.hp -= amount;
        this.iframes = 0.5;
        this.flash = 1;
        this.floaters.push({text: String(amount), x: this.x, y: this.y - 60, life: 0.8, color: "#ff6b6b"});
        this.game.audio.play(Sfx.Hit);
        if (this.hero.hp <= 0) {
            this.hero.hp = 0;
            this.game.audio.play(Sfx.Defeat);
            this.end({outcome: CombatOutcome.Lost, hp: 0, mana: this.hero.mana});
        }
    }

    private perfectDodge(): void {
        this.focus = Math.min(1, this.focus + FOCUS_PER_DODGE);
        this.floaters.push({text: t("perfectDodge"), x: this.x, y: this.y - 70, life: 0.9, color: "#74c0fc"});
        this.game.audio.play(Sfx.Dash);
    }

    private updateEnemy(dt: number): void {
        const b: RealTimeBehaviour = this.behaviour;
        this.enemyFlash = Math.max(0, this.enemyFlash - dt * 4);
        this.contactTimer -= dt;
        for (const dot of this.dots) {
            if (this.time >= dot.next && dot.next <= dot.until) {
                dot.next += 1;
                const amount: number = Math.max(1, Math.round(this.enemy.stats.hp * 0.04));
                this.enemy.hp -= amount;
                this.enemyFlash = 0.6;
                this.floaters.push({text: String(amount), x: this.ex + 16, y: this.ey - 70, life: 0.7, color: dot.color});
                if (this.enemy.hp <= 0) {
                    this.killEnemy();
                    return;
                }
            }
        }
        this.dots = this.dots.filter((d: Dot) => d.next <= d.until);
        const prevX: number = this.ex;
        const prevY: number = this.ey;
        this.ex += this.knockX * dt;
        this.ey += this.knockY * dt;
        this.knockX *= Math.pow(0.002, dt);
        this.knockY *= Math.pow(0.002, dt);
        if (this.enemyStun > 0) {
            this.enemyStun -= dt;
            this.enemyMoving = false;
            return;
        }

        const dx: number = this.x - this.ex;
        const dy: number = this.y - this.ey;
        const dist: number = Math.hypot(dx, dy) || 1;
        const reach: number = 40 + 16 * this.monster.size;
        const strikeReach: number = this.strikeReach();
        this.enemyTimer -= dt;
        switch (this.enemyState) {
            case EnemyState.Approach: {
                // Melee monsters press right into you: touching them hurts.
                const wanted: number = b.preferredRange > 0 ? b.preferredRange : reach * 0.45;
                // Melee monsters sprint after a hero who keeps them at a distance (archers can't kite forever).
                const chase: number = b.preferredRange === 0 && dist > strikeReach * 1.1 ? CHASE_SPEED_MULT : 1;
                const step: number = b.speed * chase * (this.enemy.hp < this.enemy.stats.hp / 2 && this.isBoss ? 1.3 : 1) * dt;
                if (dist > wanted) {
                    this.ex += dx / dist * step;
                    this.ey += dy / dist * step;
                } else if (b.preferredRange > 0 && dist < wanted * 0.7) {
                    this.ex -= dx / dist * step * 0.7;
                    this.ey -= dy / dist * step * 0.7;
                }
                const inRange: boolean = b.preferredRange > 0 || b.lungeSpeed > 0 ? dist < Math.max(b.preferredRange * 1.3, 260) : dist < strikeReach * 1.15;
                if (this.enemyTimer <= 0 && inRange) {
                    this.enemyState = EnemyState.WindUp;
                    this.enemyTimer = b.windUp;
                    this.lungeDir = {x: dx / dist, y: dy / dist};
                }
                break;
            }
            case EnemyState.WindUp:
                // Telegraph: the ring on the floor closes in; dodge when it fills.
                if (this.enemyTimer <= 0) {
                    this.enemyAttack = 1;
                    if (b.volley > 0) {
                        this.fireVolley();
                        this.recover();
                    } else if (b.lungeSpeed > 0) {
                        this.enemyState = EnemyState.Lunge;
                        this.enemyTimer = 0.22;
                    } else {
                        if (dist < strikeReach * LEAP_REACH) {
                            // Stepping back is not enough: the swing leaps at you. Only the dash dodges it.
                            if (dist > strikeReach) {
                                const leap: number = dist - strikeReach * 0.8;
                                this.ex += dx / dist * leap;
                                this.ey += dy / dist * leap;
                            }
                            this.attackHero(rollDamage(this.enemy, this.hero, DamageType.Physical, Element.Neutral, b.meleePower * 0.9).amount);
                        } else if (this.dashTimer > 0 && dist < reach * 3) {
                            // Dashed out of the swing at the last moment: that is the perfect dodge.
                            this.perfectDodge();
                        }
                        this.recover();
                    }
                }
                break;
            case EnemyState.Lunge:
                this.ex += this.lungeDir.x * b.lungeSpeed * dt;
                this.ey += this.lungeDir.y * b.lungeSpeed * dt;
                if (dist < strikeReach * 0.8) {
                    this.attackHero(rollDamage(this.enemy, this.hero, DamageType.Physical, Element.Neutral, b.meleePower).amount);
                    this.recover();
                } else if (this.enemyTimer <= 0) {
                    this.recover();
                }
                break;
            case EnemyState.Recover:
                if (this.enemyTimer <= 0) {
                    this.enemyState = EnemyState.Approach;
                    this.enemyTimer = randFloat(0.2, 0.6);
                }
                break;
        }
        this.enemyAttack = Math.max(0, this.enemyAttack - dt * 2.5);
        // Body contact.
        if (dist < reach * 0.8 && this.contactTimer <= 0 && this.state === DuelState.Fighting) {
            this.contactTimer = CONTACT_COOLDOWN;
            this.attackHero(rollDamage(this.enemy, this.hero, DamageType.Physical, Element.Neutral, b.meleePower * CONTACT_POWER).amount, true);
        }
        this.enemyMoving = Math.hypot(this.ex - prevX, this.ey - prevY) > 20 * dt;
        if (this.enemyMoving) {
            this.enemyWalk += dt * 10;
        }
        const inside: Vec2 = clampToArena(this.ex, this.ey, ARENA_W, ARENA_H);
        this.ex = inside.x;
        this.ey = inside.y;
    }

    /** Monster swings reach about as far as yours: you cannot poke them from just outside their range. */
    private strikeReach(): number {
        return MELEE_RANGE * 0.92 + 18 * this.monster.size;
    }

    private recover(): void {
        this.enemyState = EnemyState.Recover;
        this.enemyTimer = this.behaviour.cooldown;
    }

    private fireVolley(): void {
        const n: number = this.behaviour.volley;
        const base: number = Math.atan2(this.y - 40 - (this.ey - 40), this.x - this.ex);
        for (let i: number = 0; i < n; i++) {
            const a: number = base + (i - (n - 1) / 2) * 0.28;
            const roll: DamageRoll = rollDamage(this.enemy, this.hero, DamageType.Magical, this.monster.element, 0.55);
            this.bolts.push({x: this.ex, y: this.ey - 40, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 3, damage: roll.amount, color: this.monster.colors.accent});
        }
        this.game.audio.play(Sfx.Magic);
    }

    private updateBolts(dt: number): void {
        for (const bolt of [...this.bolts]) {
            RealTimeBolt.advance(bolt, dt);
            let consumed: boolean = bolt.life <= 0 || Math.hypot(bolt.x / ARENA_W, (bolt.y + 40) / ARENA_H) > 1.05;
            if (!consumed && Math.hypot(this.x - bolt.x, this.y - 40 - bolt.y) < 22) {
                consumed = true;
                this.attackHero(bolt.damage);
            }
            if (consumed) {
                this.bolts = this.bolts.filter((b: RealTimeBolt) => b !== bolt);
            }
            if (this.state === DuelState.Over) {
                return;
            }
        }
    }

    private switchToTurns(): void {
        this.state = DuelState.Over;
        this.game.audio.play(Sfx.Unlock);
        this.game.ui.toast(t("focusSwitched"), ToastKind.Special);
        const run: RunData = this.save.run as RunData;
        run.hp = Math.max(1, Math.round(this.hero.hp));
        run.mana = Math.round(this.hero.mana);
        this.game.setScene(new CombatScene(this.game, this.spawn, this.onEnd, {enemyHp: this.enemy.hp / REAL_TIME_ENEMY_HP}));
    }

    private end(summary: CombatSummary): void {
        if (this.state === DuelState.Over) {
            return;
        }
        this.state = DuelState.Over;
        // A short beat so the last hit reads before leaving the arena.
        window.setTimeout(() => this.onEnd({...summary, hp: Math.round(summary.hp), mana: Math.round(summary.mana)}), 650);
    }

    // ------------------------------------------------------------ render

    public render(ctx: CanvasRenderingContext2D): void {
        const w: number = this.game.width;
        const h: number = this.game.height;
        this.scale = Math.min(w / (ARENA_W * 2.4), h / (ARENA_H * 2.8), 1.7);
        ctx.fillStyle = "#0d0a10";
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h * 0.56);
        ctx.scale(this.scale, this.scale);
        // Dungeon floor in the floor's colours, lit from the middle.
        ellipsePath(ctx, 0, 0, ARENA_W + 40, ARENA_H + 34);
        ctx.fillStyle = this.floor.wallColor;
        ctx.fill();
        const painted: HTMLImageElement | undefined = roomFloor(this.floor.floor, this.spawn.key.length * 7);
        const tex: CanvasPattern | null = painted ? ctx.createPattern(painted, "repeat") : null;
        if (tex) {
            // Painted stone of this floor, darkened at the rim, torch-lit in the middle.
            tex.setTransform(new DOMMatrix().translateSelf(-ARENA_W, -ARENA_H).scaleSelf(0.55, 0.55));
            ellipsePath(ctx, 0, 0, ARENA_W + 40, ARENA_H + 34);
            ctx.fillStyle = tex;
            ctx.fill();
            ctx.fillStyle = "rgba(6,4,10,0.7)";
            ctx.fill();
            ellipsePath(ctx, 0, 0, ARENA_W, ARENA_H);
            ctx.fillStyle = tex;
            ctx.fill();
            const light: CanvasGradient = ctx.createRadialGradient(0, 0, 40, 0, 0, ARENA_W);
            light.addColorStop(0, "rgba(255,190,120,0.12)");
            light.addColorStop(0.6, "rgba(0,0,0,0.1)");
            light.addColorStop(1, "rgba(0,0,0,0.6)");
            ctx.fillStyle = light;
            ctx.fill();
        }
        ellipsePath(ctx, 0, 0, ARENA_W, ARENA_H);
        ctx.strokeStyle = shade(this.floor.wallTop, -0.2);
        ctx.lineWidth = 6;
        ctx.stroke();
        // Torches around the arena.
        for (const [tx, ty] of [[-ARENA_W * 0.72, -ARENA_H * 0.72], [ARENA_W * 0.72, -ARENA_H * 0.72], [-ARENA_W * 0.95, ARENA_H * 0.1], [ARENA_W * 0.95, ARENA_H * 0.1]] as [number, number][]) {
            const flick: number = Math.sin(this.time * 9 + tx) * 3;
            glow(ctx, tx, ty - 30, 60 + flick, "#ff922b", 0.3);
            drawProp(ctx, DungeonProp.Torch, tx, ty + 6, 44);
        }

        // Enemy telegraph ring.
        if (this.enemyState === EnemyState.WindUp) {
            const k: number = 1 - Math.max(0, this.enemyTimer) / Math.max(0.01, this.behaviour.windUp);
            const r: number = this.behaviour.volley > 0 ? 30 : this.strikeReach() * LEAP_REACH;
            ellipsePath(ctx, this.ex, this.ey, r, r * 0.5);
            ctx.strokeStyle = rgba("#ff6b6b", 0.35 + k * 0.5);
            ctx.lineWidth = 3;
            ctx.stroke();
            ellipsePath(ctx, this.ex, this.ey, r * k, r * 0.5 * k);
            ctx.fillStyle = rgba("#ff6b6b", 0.18 + k * 0.2);
            ctx.fill();
            drawText(ctx, "!", this.ex, this.ey - 95 * this.monster.size, 30, "#ffd43b");
        }

        const drawables: {y: number; draw: () => void}[] = [];
        drawables.push({y: this.ey, draw: () => {
            drawMonster(ctx, this.ex, this.ey, this.monster, defaultMonsterPose({
                scale: SPRITE_SCALE, time: this.time, flash: this.enemyFlash, armored: this.spawn.armored, facing: this.x < this.ex ? -1 : 1,
                attack: this.enemyState === EnemyState.Lunge ? 0.5 : this.enemyAttack > 0 ? 1 - this.enemyAttack : 0,
                moving: this.enemyMoving, walk: this.enemyWalk
            }));
        }});
        drawables.push({y: this.y, draw: () => {
            if (this.iframes > 0 && this.dashTimer <= 0) {
                ctx.globalAlpha = 0.55 + Math.sin(this.time * 40) * 0.3;
            }
            for (const g of this.dashTrail) {
                glow(ctx, g.x, g.y - 30, 26, "#74c0fc", g.life * 1.6);
            }
            if (this.dashTimer > 0) {
                glow(ctx, this.x, this.y - 25, 40, "#74c0fc", 0.5);
            }
            drawClassHero(ctx, this.x, this.y, this.save.hero.classKey, defaultPose({
                scale: SPRITE_SCALE, facing: this.facing, walk: this.walk, moving: this.moving, time: this.time,
                attack: this.swing > 0 ? 1 - this.swing : 0, flash: this.flash, view: this.swing > 0 ? PuppetView.Side : this.view
            }));
            ctx.globalAlpha = 1;
        }});
        drawables.sort((a: {y: number}, b: {y: number}) => a.y - b.y);
        for (const d of drawables) {
            d.draw();
        }
        this.spells.draw(ctx);
        if (this.enemyStun > 0) {
            drawText(ctx, this.stunLabel, this.ex, this.ey - 100 * this.monster.size + Math.sin(this.time * 6) * 4, 24, "#a5d8ff");
        }
        for (const dot of this.dots) {
            glow(ctx, this.ex, this.ey - 40, 30, dot.color, 0.25 + Math.sin(this.time * 10) * 0.1);
        }
        for (const bolt of this.bolts) {
            RealTimeBolt.draw(ctx, bolt);
        }
        this.floaters.draw(ctx);
        ctx.restore();
        if (this.state === DuelState.Intro) {
            drawText(ctx, t("modeRealTime") + "!", w / 2, h * 0.24, 40, "#f5c542");
        }
    }
}
