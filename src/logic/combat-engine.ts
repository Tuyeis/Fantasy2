import {t, tr} from "../core/i18n";
import {chance, weightedPick} from "../core/rng";
import {AbilityDef, AbilityKey, AbilityKind, BuffSpec, DamageType} from "../data/abilities";
import {CompanionAction, CompanionDef, CompanionKey, COMPANIONS} from "../data/companions";
import {Element, elementMultiplier} from "../data/element";
import {ItemDef, ItemKey, ITEMS} from "../data/items";
import {ARMORED_DEF_MULT, ARMORED_HP_MULT, ARMORED_MDEF_MULT, MonsterAttack, MonsterDef} from "../data/monsters";
import {StatBlock, StatKey, statLabel} from "../data/stat-block";
import {CHARM_FAIL_CHANCE, StatusDef, StatusKey, STATUSES} from "../data/status-effect";
import {BuffInstance, Combatant, DamageRoll, effectiveStat, hasStatus, mitigate, rollDamage, Side, StatusInstance} from "./combat-math";

export enum CombatEventKind {
    Log = "log",
    Lunge = "lunge",
    Cast = "cast",
    Damage = "damage",
    Heal = "heal",
    Mana = "mana",
    Status = "status",
    Buff = "buff",
    Defeat = "defeat",
    Companion = "companion"
}

export interface CombatEvent {
    kind: CombatEventKind;
    text?: string;
    /** Side that receives the effect. */
    target?: Side;
    /** Side that performs the action. */
    actor?: Side;
    companionIndex?: number;
    amount?: number;
    crit?: boolean;
    multiplier?: number;
    element?: Element;
    status?: StatusKey;
    hpAfter?: number;
    manaAfter?: number;
    /** Log style hint. */
    tone?: CombatTone;
    /** Hero ability behind a Cast/Lunge (drives the spell visuals). */
    ability?: AbilityKey;
    /** Which hit of a multi-hit ability this is (0 = first). */
    hitIndex?: number;
    hits?: number;
}

export enum CombatTone {
    Neutral = "neutral",
    Good = "good",
    Bad = "bad",
    Special = "special"
}

export enum CombatOutcome {
    Ongoing = "ongoing",
    Won = "won",
    Lost = "lost",
    Fled = "fled"
}

export enum HeroActionKind {
    Attack = "attack",
    Ability = "ability",
    Item = "item",
    Guard = "guard",
    Flee = "flee"
}

export interface HeroAction {
    kind: HeroActionKind;
    ability?: AbilityKey;
    item?: ItemKey;
}

export interface CombatContext {
    heroLevel: number;
    companionMultiplier: number;
    potionMultiplier: number;
    canFlee: boolean;
    /** Removes one item from the inventory; returns false if none is left. */
    consumeItem: (key: ItemKey) => boolean;
    /** The ability as the hero casts it (talents applied). */
    abilityDef: (key: AbilityKey) => AbilityDef;
    /** Power of the basic attack (talents can raise it). */
    basicAttackPower: number;
}

export interface TurnStart {
    events: CombatEvent[];
    canAct: boolean;
}

const CONTROL_STATUSES: StatusKey[] = [StatusKey.Freeze, StatusKey.Sleep, StatusKey.Charm];
const FLEE_CHANCE: number = 0.65;
const HERO_MANA_REGEN: number = 0.04;

export function createEnemyCombatant(def: MonsterDef, armored: boolean, challenge: number): Combatant {
    const scale: number = 1 + 0.35 * challenge;
    const s: StatBlock = {...def.stats};
    s.hp = Math.round(s.hp * scale * (armored ? ARMORED_HP_MULT : 1));
    s.atk = Math.round(s.atk * scale);
    s.matk = Math.round(s.matk * scale);
    s.def = Math.round(s.def * scale * (armored ? ARMORED_DEF_MULT : 1));
    s.mdef = Math.round(s.mdef * scale * (armored ? ARMORED_MDEF_MULT : 1));
    const name: string = armored ? t("armored", {name: tr(def.name)}) : tr(def.name);
    return {
        side: Side.Enemy, name: name, stats: s, hp: s.hp, mana: 0,
        element: def.element, weak: def.weak, resist: def.resist,
        statuses: [], buffs: [], guarding: false, controlResistant: def.controlResistant
    };
}

export function createHeroCombatant(name: string, maxStats: StatBlock, hp: number, mana: number): Combatant {
    return {
        side: Side.Hero, name: name, stats: maxStats, hp: Math.min(hp, maxStats.hp), mana: Math.min(mana, maxStats.mana),
        element: Element.Neutral, weak: [], resist: [],
        statuses: [], buffs: [], guarding: false, controlResistant: false
    };
}

/** Turn-based combat between the hero (plus companions) and a single enemy. */
export class CombatEngine {
    public outcome: CombatOutcome = CombatOutcome.Ongoing;
    private enraged: boolean = false;

    constructor(
        public readonly hero: Combatant,
        public readonly enemy: Combatant,
        public readonly monster: MonsterDef,
        public readonly companions: CompanionKey[],
        private readonly context: CombatContext
    ) {
    }

    public get canFlee(): boolean {
        return this.context.canFlee;
    }

    public startHeroTurn(): TurnStart {
        const events: CombatEvent[] = [];
        this.hero.guarding = false;
        const regen: number = Math.max(1, Math.round(this.hero.stats.mana * HERO_MANA_REGEN));
        this.restoreMana(this.hero, regen, events, false);
        const skip: boolean = this.processTurnStart(this.hero, events);
        return {events: events, canAct: !skip && this.outcome === CombatOutcome.Ongoing};
    }

    /** Resolves the hero action (null = hero skipped), companions and the enemy turn. */
    public resolveRound(action: HeroAction | null): CombatEvent[] {
        const events: CombatEvent[] = [];
        if (action) {
            this.heroAct(action, events);
        }
        if (this.outcome !== CombatOutcome.Ongoing) {
            return events;
        }
        this.companionsAct(events);
        if (this.outcome !== CombatOutcome.Ongoing) {
            return events;
        }
        this.enemyTurn(events);
        this.tickBuffs(this.hero);
        this.tickBuffs(this.enemy);
        return events;
    }

    // ------------------------------------------------------------ hero

    private heroAct(action: HeroAction, events: CombatEvent[]): void {
        if (action.kind === HeroActionKind.Flee) {
            if (!this.context.canFlee) {
                events.push(this.log(t("cannotFlee"), CombatTone.Bad));
                return;
            }
            if (chance(FLEE_CHANCE)) {
                events.push(this.log(t("logFleeOk"), CombatTone.Special));
                this.outcome = CombatOutcome.Fled;
            } else {
                events.push(this.log(t("logFleeFail"), CombatTone.Bad));
            }
            return;
        }
        if (hasStatus(this.hero, StatusKey.Charm) && chance(CHARM_FAIL_CHANCE)) {
            events.push(this.log(t("logCharmed", {target: this.hero.name}), CombatTone.Bad));
            return;
        }
        switch (action.kind) {
            case HeroActionKind.Attack:
                events.push(this.log(t("logAttack", {actor: this.hero.name, skill: t("attack")})));
                events.push({kind: CombatEventKind.Lunge, actor: Side.Hero, target: Side.Enemy});
                this.dealDamage(this.hero, this.enemy, DamageType.Physical, Element.Neutral, this.context.basicAttackPower, 0, 0, events);
                break;
            case HeroActionKind.Ability:
                this.useAbility(this.context.abilityDef(action.ability as AbilityKey), events);
                break;
            case HeroActionKind.Item:
                this.useItem(action.item as ItemKey, events);
                break;
            case HeroActionKind.Guard:
                this.hero.guarding = true;
                events.push(this.log(t("logGuard", {actor: this.hero.name})));
                this.restoreMana(this.hero, Math.round(this.hero.stats.mana * 0.1), events, true);
                break;
            default:
                break;
        }
    }

    private useAbility(def: AbilityDef, events: CombatEvent[]): void {
        if (this.hero.mana < def.manaCost) {
            events.push(this.log(t("notEnoughMana"), CombatTone.Bad));
            return;
        }
        this.hero.mana -= def.manaCost;
        events.push({kind: CombatEventKind.Mana, target: Side.Hero, amount: -def.manaCost, manaAfter: this.hero.mana});
        events.push(this.log(t("logAttack", {actor: this.hero.name, skill: tr(def.name)}), CombatTone.Special));

        if (def.kind === AbilityKind.Damage) {
            const physical: boolean = def.damageType === DamageType.Physical;
            const hits: number = def.hits ?? 1;
            for (let i: number = 0; i < hits && this.outcome === CombatOutcome.Ongoing; i++) {
                const visual: Partial<CombatEvent> = {ability: def.key, hitIndex: i, hits: hits};
                if (physical) {
                    events.push({kind: CombatEventKind.Lunge, actor: Side.Hero, target: Side.Enemy, element: def.element, ...visual});
                } else {
                    events.push({kind: CombatEventKind.Cast, actor: Side.Hero, target: Side.Enemy, element: def.element, ...visual});
                }
                this.dealDamage(this.hero, this.enemy, def.damageType ?? DamageType.Physical, def.element, def.power ?? 1, def.critBonus ?? 0, def.lifesteal ?? 0, events);
            }
            if (this.outcome === CombatOutcome.Ongoing && def.status && def.statusChance) {
                this.tryApplyStatus(this.enemy, def.status, def.statusChance, events);
            }
        } else {
            events.push({kind: CombatEventKind.Cast, actor: Side.Hero, target: Side.Hero, element: def.element, ability: def.key, hitIndex: 0, hits: 1});
        }
        if (def.healPct !== undefined) {
            const amount: number = Math.round(this.hero.stats.hp * def.healPct + effectiveStat(this.hero, StatKey.Matk) * (def.healPower ?? 0));
            this.heal(this.hero, amount, events);
        }
        if (def.buffs) {
            this.applyBuffs(this.hero, def.buffs, def.key, events);
        }
    }

    private useItem(key: ItemKey, events: CombatEvent[]): void {
        const def: ItemDef = ITEMS[key];
        if (!def.heal || !this.context.consumeItem(key)) {
            events.push(this.log(t("noUsableItems"), CombatTone.Bad));
            return;
        }
        events.push(this.log(t("logUseItem", {actor: this.hero.name, item: tr(def.name)})));
        events.push({kind: CombatEventKind.Cast, actor: Side.Hero, target: Side.Hero, element: Element.Holy});
        const mult: number = this.context.potionMultiplier;
        if (def.heal.hp) {
            this.heal(this.hero, Math.round(def.heal.hp * mult), events);
        }
        if (def.heal.mana) {
            this.restoreMana(this.hero, Math.round(def.heal.mana * mult), events, true);
        }
        if (def.heal.cureStatus && this.hero.statuses.length > 0) {
            this.hero.statuses = [];
            events.push({kind: CombatEventKind.Status, target: Side.Hero});
            events.push(this.log(t("logCured", {target: this.hero.name}), CombatTone.Good));
        }
    }

    // ------------------------------------------------------------ companions

    private companionsAct(events: CombatEvent[]): void {
        this.companions.forEach((key: CompanionKey, index: number) => {
            if (this.outcome !== CombatOutcome.Ongoing) {
                return;
            }
            const def: CompanionDef = COMPANIONS[key];
            const mult: number = this.context.companionMultiplier;
            events.push({kind: CombatEventKind.Companion, companionIndex: index, element: def.element, target: def.action === CompanionAction.Attack ? Side.Enemy : Side.Hero});
            switch (def.action) {
                case CompanionAction.Attack: {
                    const raw: number = def.power * mult * (6 + this.context.heroLevel * 2.5);
                    const amount: number = mitigate(raw, this.enemy.stats.mdef * 0.5) * elementMultiplier(def.element, this.enemy.weak, this.enemy.resist);
                    events.push(this.log(t("logAttack", {actor: tr(def.name), skill: t("attack")})));
                    this.applyDamage(this.enemy, Math.max(1, Math.round(amount)), false, 1, events);
                    if (this.outcome === CombatOutcome.Ongoing && def.status && def.statusChance) {
                        this.tryApplyStatus(this.enemy, def.status, def.statusChance, events);
                    }
                    break;
                }
                case CompanionAction.Heal:
                    if (this.hero.hp < this.hero.stats.hp) {
                        this.heal(this.hero, Math.round(this.hero.stats.hp * def.power * mult), events);
                    }
                    break;
                case CompanionAction.Mana:
                    if (this.hero.mana < this.hero.stats.mana) {
                        this.restoreMana(this.hero, Math.max(1, Math.round(this.hero.stats.mana * def.power * mult)), events, true);
                    }
                    break;
                case CompanionAction.Buff:
                    this.applyBuffs(this.hero, [
                        {stat: StatKey.Atk, amount: def.power * mult, turns: 2},
                        {stat: StatKey.Matk, amount: def.power * mult, turns: 2}
                    ], "companion_" + def.key, events, true);
                    break;
            }
        });
    }

    // ------------------------------------------------------------ enemy

    private enemyTurn(events: CombatEvent[]): void {
        const skip: boolean = this.processTurnStart(this.enemy, events);
        if (skip || this.outcome !== CombatOutcome.Ongoing) {
            return;
        }
        if (!this.enraged && this.monster.enrageExtraActions > 0 && this.enemy.hp < this.enemy.stats.hp / 2) {
            this.enraged = true;
            events.push(this.log(t("logEnrage", {target: this.enemy.name}), CombatTone.Bad));
        }
        if (this.monster.attacks.length === 0) {
            // Practice dummies just wobble.
            events.push(this.log(t("logIdle", {target: this.enemy.name})));
            return;
        }
        const actions: number = 1 + (this.enraged ? this.monster.enrageExtraActions : 0);
        for (let a: number = 0; a < actions && this.outcome === CombatOutcome.Ongoing; a++) {
            if (hasStatus(this.enemy, StatusKey.Charm) && chance(CHARM_FAIL_CHANCE)) {
                const roll: DamageRoll = rollDamage(this.enemy, this.enemy, DamageType.Physical, Element.Neutral, 0.6);
                events.push(this.log(t("logCharmSelfHit", {target: this.enemy.name, dmg: roll.amount}), CombatTone.Good));
                this.applyDamage(this.enemy, roll.amount, false, 1, events);
                continue;
            }
            const attack: MonsterAttack = weightedPick(this.monster.attacks, (m: MonsterAttack) => m.weight);
            events.push(this.log(t("logAttack", {actor: this.enemy.name, skill: tr(attack.name)})));
            for (let h: number = 0; h < attack.hits && this.outcome === CombatOutcome.Ongoing; h++) {
                if (attack.type === DamageType.Physical) {
                    events.push({kind: CombatEventKind.Lunge, actor: Side.Enemy, target: Side.Hero, element: attack.element});
                } else {
                    events.push({kind: CombatEventKind.Cast, actor: Side.Enemy, target: Side.Hero, element: attack.element});
                }
                this.dealDamage(this.enemy, this.hero, attack.type, attack.element, attack.power, 0, attack.lifesteal ?? 0, events);
            }
            if (this.outcome === CombatOutcome.Ongoing && attack.status && attack.statusChance) {
                this.tryApplyStatus(this.hero, attack.status, attack.statusChance, events);
            }
        }
    }

    // ------------------------------------------------------------ shared helpers

    /** Damage over time, skip checks and status countdown. Returns true if the combatant loses its turn. */
    private processTurnStart(c: Combatant, events: CombatEvent[]): boolean {
        let skip: boolean = false;
        for (const status of [...c.statuses]) {
            const def: StatusDef = STATUSES[status.key];
            if (def.tickPct > 0 && this.outcome === CombatOutcome.Ongoing) {
                const pct: number = c.controlResistant ? def.tickPct * 0.4 : def.tickPct;
                const amount: number = Math.max(1, Math.round(c.stats.hp * pct));
                events.push(this.log(t("logStatusTick", {target: c.name, dmg: amount, status: tr(def.name)}), c.side === Side.Hero ? CombatTone.Bad : CombatTone.Good));
                this.applyDamage(c, amount, false, 1, events, status.key);
            }
            if (def.skipsTurn) {
                skip = true;
                events.push(this.log(t(status.key === StatusKey.Freeze ? "logFrozen" : "logAsleep", {target: c.name}), c.side === Side.Hero ? CombatTone.Bad : CombatTone.Good));
            }
            status.turns--;
            if (status.turns <= 0) {
                this.removeStatus(c, status.key, events);
            }
        }
        return skip;
    }

    private dealDamage(attacker: Combatant, defender: Combatant, type: DamageType, element: Element, power: number, critBonus: number, lifesteal: number, events: CombatEvent[]): void {
        const roll: DamageRoll = rollDamage(attacker, defender, type, element, power, critBonus);
        this.applyDamage(defender, roll.amount, roll.crit, roll.multiplier, events, undefined, element);
        if (roll.crit) {
            events.push(this.log(t("logCrit"), CombatTone.Special));
        }
        if (roll.multiplier > 1) {
            events.push(this.log(t("logWeak"), CombatTone.Special));
        } else if (roll.multiplier < 1) {
            events.push(this.log(t("logResist")));
        }
        if (lifesteal > 0 && attacker.hp > 0) {
            const drained: number = Math.max(1, Math.round(roll.amount * lifesteal));
            events.push(this.log(t("logLifesteal", {actor: attacker.name, hp: drained}), attacker.side === Side.Hero ? CombatTone.Good : CombatTone.Bad));
            this.heal(attacker, drained, events, false);
        }
    }

    private applyDamage(target: Combatant, amount: number, crit: boolean, multiplier: number, events: CombatEvent[], fromStatus?: StatusKey, element?: Element): void {
        target.hp = Math.max(0, target.hp - amount);
        events.push({kind: CombatEventKind.Damage, target: target.side, amount: amount, crit: crit, multiplier: multiplier, hpAfter: target.hp, status: fromStatus, element: element});
        if (fromStatus === undefined && target.hp > 0) {
            // Direct hits break the statuses flagged in the data (Sleep).
            const broken: StatusInstance[] = target.statuses.filter((s: StatusInstance) => STATUSES[s.key].breaksOnHit);
            for (const status of broken) {
                this.removeStatus(target, status.key, events);
            }
        }
        if (target.hp <= 0) {
            events.push({kind: CombatEventKind.Defeat, target: target.side});
            events.push(this.log(t("logDefeated", {target: target.name}), target.side === Side.Enemy ? CombatTone.Good : CombatTone.Bad));
            this.outcome = target.side === Side.Enemy ? CombatOutcome.Won : CombatOutcome.Lost;
        }
    }

    private heal(target: Combatant, amount: number, events: CombatEvent[], withLog: boolean = true): void {
        const before: number = target.hp;
        target.hp = Math.min(target.stats.hp, target.hp + amount);
        const healed: number = target.hp - before;
        events.push({kind: CombatEventKind.Heal, target: target.side, amount: healed, hpAfter: target.hp});
        if (withLog) {
            events.push(this.log(t("logHeal", {target: target.name, hp: healed}), CombatTone.Good));
        }
    }

    private restoreMana(target: Combatant, amount: number, events: CombatEvent[], withLog: boolean): void {
        const before: number = target.mana;
        target.mana = Math.min(target.stats.mana, target.mana + amount);
        const restored: number = target.mana - before;
        if (restored <= 0) {
            return;
        }
        events.push({kind: CombatEventKind.Mana, target: target.side, amount: restored, manaAfter: target.mana});
        if (withLog) {
            events.push(this.log(t("logMana", {target: target.name, mana: restored}), CombatTone.Good));
        }
    }

    private tryApplyStatus(target: Combatant, key: StatusKey, baseChance: number, events: CombatEvent[]): void {
        let probability: number = baseChance;
        let turns: number = STATUSES[key].defaultTurns;
        if (target.controlResistant && CONTROL_STATUSES.includes(key)) {
            probability *= 0.5;
            turns = 1;
        }
        if (!chance(probability)) {
            return;
        }
        const existing: StatusInstance | undefined = target.statuses.find((s: StatusInstance) => s.key === key);
        if (existing) {
            existing.turns = Math.max(existing.turns, turns);
        } else {
            target.statuses.push({key: key, turns: turns});
        }
        events.push({kind: CombatEventKind.Status, target: target.side, status: key});
        events.push(this.log(t("logStatus", {target: target.name, status: tr(STATUSES[key].name)}), target.side === Side.Enemy ? CombatTone.Good : CombatTone.Bad));
    }

    private removeStatus(c: Combatant, key: StatusKey, events: CombatEvent[]): void {
        if (!hasStatus(c, key)) {
            return;
        }
        c.statuses = c.statuses.filter((s: StatusInstance) => s.key !== key);
        events.push({kind: CombatEventKind.Status, target: c.side});
        if (key === StatusKey.Sleep) {
            events.push(this.log(t("logWakes", {target: c.name})));
        } else {
            events.push(this.log(t("logStatusEnd", {target: c.name, status: tr(STATUSES[key].name)})));
        }
    }

    private applyBuffs(target: Combatant, buffs: BuffSpec[], source: string, events: CombatEvent[], quiet: boolean = false): void {
        for (const spec of buffs) {
            // A buff from the same source replaces the previous one instead of stacking.
            target.buffs = target.buffs.filter((b: BuffInstance) => !(b.source === source && b.stat === spec.stat));
            target.buffs.push({stat: spec.stat, amount: spec.amount, turns: spec.turns, source: source});
            if (!quiet) {
                events.push(this.log(t("logBuff", {target: target.name, stat: statLabel(spec.stat)}), CombatTone.Good));
            }
        }
        events.push({kind: CombatEventKind.Buff, target: target.side});
    }

    private tickBuffs(c: Combatant): void {
        for (const b of c.buffs) {
            b.turns--;
        }
        c.buffs = c.buffs.filter((b: BuffInstance) => b.turns > 0);
    }

    private log(text: string, tone: CombatTone = CombatTone.Neutral): CombatEvent {
        return {kind: CombatEventKind.Log, text: text, tone: tone};
    }
}
