// Real-time duel bot for balancing. Load in a DEV tab (never saves):
//   const bot = await import('/tools/duel-bot.js'); await bot.setup(); bot.bench('label');
// A "skill" 0..1 bot dodges that share of telegraphed attacks and holds attack otherwise.

const TALENTS_MODULE = '/src/logic/talents.ts';
let m = null;
const fake = {axis: {x: 0, y: 0}, pressed: new Set(), attack: false};
let patched = false;

export async function setup() {
    const g = window.game;
    g.saveGame = () => {};
    m = {
        ss: await import('/src/core/save-store.ts'),
        rm: await import('/src/logic/run-manager.ts'),
        fl: await import('/src/data/floors.ts'),
        duel: await import('/src/scenes/duel-scene.ts'),
        ce: await import('/src/logic/combat-engine.ts'),
        hs: await import('/src/logic/hero-stats.ts'),
        mon: await import('/src/data/monsters.ts'),
        ab: await import('/src/data/abilities.ts'),
        hc: await import('/src/data/hero-classes.ts'),
        tl: await import(/* @vite-ignore */ TALENTS_MODULE).catch(() => null)
    };
    // Same module instances the bot uses (Vite may add ?t= to its imports), for instrumentation.
    window.__botModules = m;
}

function patchInput(on) {
    const input = window.game.input;
    if (on && !patched) {
        input.__orig = {moveAxis: input.moveAxis, wasPressed: input.wasPressed, isDown: input.isDown, endFrame: input.endFrame};
        input.moveAxis = () => fake.axis;
        input.wasPressed = (...codes) => codes.some((c) => fake.pressed.has(c));
        input.isDown = () => false;
        input.endFrame = () => fake.pressed.clear();
        Object.defineProperty(input, 'mouseLeftDown', {get: () => fake.attack, configurable: true});
        Object.defineProperty(input, 'mouseLeftClicked', {get: () => false, configurable: true});
        patched = true;
    } else if (!on && patched) {
        Object.assign(input, input.__orig);
        delete input.mouseLeftDown;
        delete input.mouseLeftClicked;
        patched = false;
    }
}

function makeSave(classKey, level, floor, learnAll) {
    const g = window.game;
    const s = m.ss.createNewSave();
    s.seenWelcome = true;
    s.hero.classKey = classKey;
    s.hero.level = level;
    s.deepestFloor = floor;
    if (learnAll && m.tl && m.tl.autoSpendTalents) {
        m.tl.autoSpendTalents(s);
    }
    g.save = s;
    m.rm.startRun(s, floor);
    return s;
}

export function runDuel(classKey, level, floor, monsterKey, skill) {
    const g = window.game;
    makeSave(classKey, level, floor, true);
    const d = new m.duel.DuelScene(g, {key: monsterKey, armored: false}, () => {});
    patchInput(true);
    g.setScene(d);
    const maxHp = d.hero.stats.hp;
    let t = 0;
    let dodgeRoll = Math.random();
    const dt = 1 / 60;
    try {
        while (t < 120 && d.state !== 'over') {
            fake.axis = {x: 0, y: 0};
            fake.attack = false;
            const dx = d.ex - d.x;
            const dy = d.ey - d.y;
            const dist = Math.hypot(dx, dy) || 1;
            const reach = 74 + 18 * d.monster.size;
            let dodging = false;
            if (d.enemyState === 'wind_up' && d.enemyTimer < 0.12) {
                if (dodgeRoll < skill && d.charges > 0 && d.dashTimer <= 0) {
                    fake.axis = {x: -dx / dist, y: -dy / dist};
                    fake.pressed.add('Space');
                    dodging = true;
                }
            } else if (d.enemyState !== 'wind_up') {
                dodgeRoll = Math.random();
            }
            for (const bolt of d.bolts) {
                if (!bolt.friendly && Math.hypot(bolt.x - d.x, bolt.y + 40 - d.y) < 50 && Math.random() < skill * 0.2 && d.charges > 0) {
                    fake.axis = {x: -bolt.vy / 230, y: bolt.vx / 230};
                    fake.pressed.add('Space');
                    dodging = true;
                }
            }
            if (!dodging) {
                if (d.bowWielder) {
                    // Archer: keep the monster at bow range, backing off when it closes in.
                    if (dist < 190) {
                        fake.axis = {x: -dx / dist, y: -dy / dist};
                    } else if (dist > 300) {
                        fake.axis = {x: dx / dist, y: dy / dist};
                    }
                } else if (dist > reach * 0.9) {
                    fake.axis = {x: dx / dist, y: dy / dist};
                }
                fake.attack = true;
                const bar = window.game.save.hero.actionBar || [];
                for (let i = 0; i < bar.length; i++) {
                    const k = bar[i] && bar[i].ability;
                    if (!k || (d.cooldowns.get(k) || 0) > 0) {
                        continue;
                    }
                    const def = m.tl && m.tl.effectiveAbility ? m.tl.effectiveAbility(window.game.save, k) : m.ab.ABILITIES[k];
                    if (d.hero.mana >= def.manaCost && (def.kind !== 'heal' || d.hero.hp < maxHp * 0.5)) {
                        fake.pressed.add('Digit' + (i + 1));
                        break;
                    }
                }
            }
            g.step(dt);
            t += dt;
        }
    } finally {
        patchInput(false);
    }
    return {t: t, won: d.enemy.hp <= 0, hpLost: (maxHp - Math.max(0, d.hero.hp)) / maxHp};
}

export function runTurns(classKey, level, floor, monsterKey) {
    const s = makeSave(classKey, level, floor, true);
    const max = m.hs.computeHeroStats(s);
    const hero = m.ce.createHeroCombatant('h', max, max.hp, max.mana);
    const mdef = m.mon.MONSTERS[monsterKey];
    const enemy = m.ce.createEnemyCombatant(mdef, false, 0);
    const resolve = (k) => (m.tl && m.tl.effectiveAbility ? m.tl.effectiveAbility(s, k) : m.ab.ABILITIES[k]);
    const eng = new m.ce.CombatEngine(hero, enemy, mdef, [], {
        heroLevel: level, companionMultiplier: 1, potionMultiplier: 1, canFlee: false, consumeItem: () => false,
        abilityDef: resolve, basicAttackPower: 1
    });
    const abilities = m.tl && m.tl.abilitySlots ? m.tl.abilitySlots(s).filter((k) => k) : m.hc.CLASSES[classKey].abilities;
    let rounds = 0;
    while (eng.outcome === 'ongoing' && rounds < 60) {
        rounds++;
        const st = eng.startHeroTurn();
        let action = null;
        if (st.canAct) {
            let best = null;
            let bestV = 1;
            for (const k of abilities) {
                const a = resolve(k);
                if (hero.mana < a.manaCost) {
                    continue;
                }
                if (a.kind === 'heal' && hero.hp < max.hp * 0.4) {
                    best = k;
                    break;
                }
                if (a.kind === 'damage') {
                    const v = (a.power ?? 1) * (a.hits ?? 1);
                    if (v > bestV) {
                        bestV = v;
                        best = k;
                    }
                }
            }
            action = best ? {kind: 'ability', ability: best} : {kind: 'attack'};
        }
        if (eng.outcome === 'ongoing') {
            eng.resolveRound(action);
        }
    }
    return {rounds: rounds, won: eng.outcome === 'won', hpLost: (max.hp - Math.max(0, hero.hp)) / max.hp};
}

/** Averages over every monster of each floor, for two classes, at the intended level per floor. */
export function bench(label, skill = 0.6, reps = 3, classes = ['swordsman', 'mage']) {
    const rows = [label];
    const cfg = [[1, 3], [2, 7], [3, 11]];
    for (const cls of classes) {
        for (const [floor, level] of cfg) {
            const mons = [...new Set(m.fl.floorDef(floor).pool)];
            const rt = {t: 0, hp: 0, won: 0};
            const tb = {r: 0, hp: 0, won: 0};
            let n = 0;
            for (const mk of mons) {
                for (let k = 0; k < reps; k++) {
                    const a = runDuel(cls, level, floor, mk, skill);
                    rt.t += a.t;
                    rt.hp += a.hpLost;
                    rt.won += a.won ? 1 : 0;
                    const b = runTurns(cls, level, floor, mk);
                    tb.r += b.rounds;
                    tb.hp += b.hpLost;
                    tb.won += b.won ? 1 : 0;
                    n++;
                }
            }
            rows.push(`${cls} F${floor} L${level}: RT ${(rt.t / n).toFixed(1)}s hp-${(rt.hp / n * 100).toFixed(0)}% win ${rt.won}/${n} | TURNS ${(tb.r / n).toFixed(1)} rounds hp-${(tb.hp / n * 100).toFixed(0)}% win ${tb.won}/${n}`);
        }
    }
    return rows.join('\n');
}
