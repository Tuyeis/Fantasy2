p = 'C:/VScodeProjects/fantasy-rpg-web/src/scenes/duel-scene.ts'
s = open(p, encoding='utf-8').read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)


# ---- imports
rep('''import {DamageType} from "../data/abilities";''', '''import {AbilityDef, AbilityKey, AbilityKind, ABILITIES, DamageType} from "../data/abilities";''')
rep('''import {StatBlock} from "../data/stat-block";''', '''import {StatBlock, StatKey} from "../data/stat-block";
import {StatusKey} from "../data/status-effect";''')
rep('''import {Combatant, DamageRoll, rollDamage} from "../logic/combat-math";''', '''import {Combatant, DamageRoll, effectiveStat, rollDamage} from "../logic/combat-math";''')
rep('''import {drawClassHero} from "../render/class-hero";''', '''import {abilityIconEl} from "../render/ability-icons";
import {drawClassHero} from "../render/class-hero";''')
rep('''import {PuppetView} from "../render/puppet/puppet-types";''', '''import {PuppetView} from "../render/puppet/puppet-types";
import {FxStyle, fxImpactDelay, fxStyleOf, SpellFxLayer} from "../render/spell-fx";''')

# ---- constants
rep('''const BOLT_COOLDOWN: number = 0.35;
const BOLT_MANA: number = 5;''', '''/** Real-time pacing of abilities: base cooldown plus a share of the mana cost. */
const ABILITY_BASE_COOLDOWN: number = 1.2;
const ABILITY_COOLDOWN_PER_MANA: number = 0.18;
/** One turn of a buff lasts this many seconds in real time. */
const SECONDS_PER_TURN: number = 3;
/** Touching a monster hurts (fraction of its melee power) at most this often. */
const CONTACT_POWER: number = 0.55;
const CONTACT_COOLDOWN: number = 0.75;
/** Styles that reach the enemy from any distance. */
const RANGED_STYLES: FxStyle[] = [FxStyle.Bolt, FxStyle.Fireball, FxStyle.Missiles, FxStyle.Arrow, FxStyle.ArrowRain, FxStyle.Nova, FxStyle.SkyBeam,
    FxStyle.Pillar, FxStyle.Drain, FxStyle.Swarm, FxStyle.Gaze];''')

rep('''interface Floater {''', '''interface PendingHit {
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

interface HotbarSlot {
    root: HTMLElement;
    shade: HTMLElement;
    label: HTMLElement;
}

interface Floater {''')

# ---- fields
rep('''    private boltTimer: number = 0;''', '''    private readonly abilities: AbilityKey[];
    private cooldowns: number[] = [0, 0, 0, 0];
    private readonly spells: SpellFxLayer = new SpellFxLayer();
    private pendingHits: PendingHit[] = [];
    private timedBuffs: TimedBuff[] = [];
    private hotbar: HotbarSlot[] = [];''')
rep('''    private knockY: number = 0;
    // world''', '''    private knockY: number = 0;
    private enemyStun: number = 0;
    private stunLabel: string = "";
    private dots: Dot[] = [];
    private contactTimer: number = 0;
    private enemyMoving: boolean = false;
    private enemyWalk: number = 0;
    // world''')
rep('''        this.floor = floorDef(run.floor);
    }''', '''        this.floor = floorDef(run.floor);
        this.abilities = [...CLASSES[save.hero.classKey].abilities];
    }''')

# ---- HUD hotbar
rep('''        this.game.ui.hud.append(el("div", {cls: "hud-controls", text: t("realTimeHelp")}));
        this.refreshHud();''', '''        this.game.ui.hud.append(el("div", {cls: "hud-controls", text: t("realTimeHelp")}));
        const bar: HTMLElement = el("div", {style: {position: "fixed", left: "50%", bottom: "38px", transform: "translateX(-50%)", display: "flex", gap: "8px", pointerEvents: "auto"}});
        this.hotbar = this.abilities.map((key: AbilityKey, index: number) => {
            const def: AbilityDef = ABILITIES[key];
            const shade: HTMLElement = el("div", {style: {position: "absolute", left: "0", right: "0", bottom: "0", height: "0%", background: "rgba(10,8,16,0.72)", borderRadius: "8px"}});
            const label: HTMLElement = el("div", {style: {position: "absolute", left: "0", right: "0", top: "50%", transform: "translateY(-50%)", textAlign: "center", fontWeight: "800", fontSize: "16px", color: "#fff", textShadow: "0 1px 3px #000"}});
            const root: HTMLElement = el("div", {title: tr(def.name), style: {position: "relative", width: "52px", height: "52px", cursor: "pointer"}}, [
                abilityIconEl(key, 52), shade, label,
                el("div", {text: String(index + 1), style: {position: "absolute", left: "3px", top: "1px", fontWeight: "800", fontSize: "13px", color: "#ffe066", textShadow: "0 1px 2px #000"}}),
                el("div", {text: String(def.manaCost), style: {position: "absolute", right: "3px", bottom: "1px", fontWeight: "700", fontSize: "11px", color: "#74c0fc", textShadow: "0 1px 2px #000"}})
            ]);
            root.addEventListener("mousedown", (e: MouseEvent) => {
                e.stopPropagation();
                this.useAbility(index);
            });
            bar.append(root);
            return {root: root, shade: shade, label: label};
        });
        this.game.ui.hud.append(bar);
        this.refreshHud();''')
rep('''                bar("hp", this.enemy.hp, this.enemy.stats.hp, Math.ceil(this.enemy.hp) + "/" + this.enemy.stats.hp)
            ])
        );''', '''                bar("hp", this.enemy.hp, this.enemy.stats.hp, Math.ceil(this.enemy.hp) + "/" + this.enemy.stats.hp)
            ])
        );
        this.abilities.forEach((key: AbilityKey, index: number) => {
            const slot: HotbarSlot | undefined = this.hotbar[index];
            if (!slot) {
                return;
            }
            const cd: number = this.cooldowns[index];
            const total: number = abilityCooldown(ABILITIES[key]);
            const noMana: boolean = this.hero.mana < ABILITIES[key].manaCost;
            slot.shade.style.height = (cd > 0 ? Math.min(100, cd / total * 100) : noMana ? 100 : 0) + "%";
            slot.label.textContent = cd > 0 ? cd.toFixed(1) : "";
            slot.root.style.filter = noMana ? "grayscale(0.7)" : "";
        });''')

# ---- update
rep('''        this.updateHero(dt, this.game.input);
        if (this.state === DuelState.Intro) {''', '''        this.spells.update(dt);
        this.updateHero(dt, this.game.input);
        if (this.state === DuelState.Intro) {''')
rep('''        this.updateEnemy(dt);
        this.updateBolts(dt);
    }''', '''        this.updateAbilities(dt);
        if (this.state !== DuelState.Fighting) {
            return;
        }
        this.updateEnemy(dt);
        this.updateBolts(dt);
    }''')

# ---- controls
rep('''        this.meleeTimer -= dt;
        this.boltTimer -= dt;''', '''        this.meleeTimer -= dt;''')
rep('''        if ((input.wasPressed("KeyK") || input.mouseRightClicked) && this.boltTimer <= 0) {
            this.castBolt();
        }''', '''        const keys: string[] = ["Digit1", "Digit2", "Digit3", "Digit4"];
        keys.forEach((code: string, index: number) => {
            if (input.wasPressed(code, "Numpad" + (index + 1))) {
                this.useAbility(index);
            }
        });''')
i = s.index('    private castBolt(): void {')
j = s.index('    private hitEnemy(', i)
s = s[:i] + s[j:]

ABILITY_CODE = open('C:/Users/YERBAS~1/AppData/Local/Temp/claude/C--VScodeProjects/6f06cf94-b6c1-41c5-aa89-c85955300e78/scratchpad/duel_abilities.ts.txt', encoding='utf-8').read()
rep('''    private hitEnemy(roll: DamageRoll, nx: number, ny: number): void {''', ABILITY_CODE + '''    private hitEnemy(roll: DamageRoll, nx: number, ny: number): void {''')

ENEMY_HEAD = open('C:/Users/YERBAS~1/AppData/Local/Temp/claude/C--VScodeProjects/6f06cf94-b6c1-41c5-aa89-c85955300e78/scratchpad/duel_enemy_head.ts.txt', encoding='utf-8').read()
rep('''    private updateEnemy(dt: number): void {
        const b: RealTimeBehaviour = this.behaviour;
        this.enemyFlash = Math.max(0, this.enemyFlash - dt * 4);''', ENEMY_HEAD)
rep('''            case EnemyState.Approach: {
                const wanted: number = b.preferredRange > 0 ? b.preferredRange : reach * 0.8;''', '''            case EnemyState.Approach: {
                // Melee monsters press right into you: touching them hurts.
                const wanted: number = b.preferredRange > 0 ? b.preferredRange : reach * 0.45;''')
rep('''        this.enemyAttack = Math.max(0, this.enemyAttack - dt * 2.5);''', '''        this.enemyAttack = Math.max(0, this.enemyAttack - dt * 2.5);
        // Body contact.
        if (dist < reach * 0.8 && this.contactTimer <= 0 && this.state === DuelState.Fighting) {
            this.contactTimer = CONTACT_COOLDOWN;
            this.attackHero(rollDamage(this.enemy, this.hero, DamageType.Physical, Element.Neutral, b.meleePower * CONTACT_POWER).amount, true);
        }
        this.enemyMoving = Math.hypot(this.ex - prevX, this.ey - prevY) > 20 * dt;
        if (this.enemyMoving) {
            this.enemyWalk += dt * 10;
        }''')
rep('''    private attackHero(amount: number): void {
        if (this.dashTimer > 0 || this.iframes > 0) {
            if (this.dashTimer > 0) {
                this.perfectDodge();
            }
            return;
        }''', '''    private attackHero(amount: number, contact: boolean = false): void {
        if (this.dashTimer > 0 || this.iframes > 0) {
            if (this.dashTimer > 0 && !contact) {
                this.perfectDodge();
            }
            return;
        }''')

# ---- render
rep('''        for (const bolt of this.bolts) {
            glow(ctx, bolt.x, bolt.y, 22, bolt.color, 0.8);''', '''        this.spells.draw(ctx);
        if (this.enemyStun > 0) {
            drawText(ctx, this.stunLabel, this.ex, this.ey - 100 * this.monster.size + Math.sin(this.time * 6) * 4, 24, "#a5d8ff");
        }
        for (const dot of this.dots) {
            glow(ctx, this.ex, this.ey - 40, 30, dot.color, 0.25 + Math.sin(this.time * 10) * 0.1);
        }
        for (const bolt of this.bolts) {
            glow(ctx, bolt.x, bolt.y, 22, bolt.color, 0.8);''')
rep('''                attack: this.enemyState === EnemyState.Lunge ? 0.5 : this.enemyAttack > 0 ? 1 - this.enemyAttack : 0
            }));''', '''                attack: this.enemyState === EnemyState.Lunge ? 0.5 : this.enemyAttack > 0 ? 1 - this.enemyAttack : 0,
                moving: this.enemyMoving, walk: this.enemyWalk
            }));''')
rep('''export class DuelScene implements Scene {''', '''function abilityCooldown(def: AbilityDef): number {
    return ABILITY_BASE_COOLDOWN + def.manaCost * ABILITY_COOLDOWN_PER_MANA;
}

export class DuelScene implements Scene {''')
open(p, 'w', encoding='utf-8').write(s)
print("patched")
