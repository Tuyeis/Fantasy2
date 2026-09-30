import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr, UiKey} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {ABILITIES, AbilityKey, DamageType, describeAbility} from "../data/abilities";
import {ELEMENTS} from "../data/element";
import {ClassKey, CLASSES} from "../data/hero-classes";
import {StatKey, statLabel} from "../data/stat-block";
import {StatusKey, STATUSES} from "../data/status-effect";
import {CLASS_TIER_COUNT, TALENT_TREES, TalentDef, TalentEffect, TalentEffectKind, TALENTS, TalentSlot, TalentTreeDef, tierStep} from "../data/talents";
import {
    abilitySlots, availableTalentPoints, canRespec, effectiveAbility, LearnBlock, learnBlock, learnTalent, pointsInTree, refundablePoints, respecCost, respecTalents, talentRank
} from "../logic/talents";
import {abilityIconEl} from "../render/ability-icons";
import {ActionBarSlot} from "../data/action-bar";
import {makeActionDraggable} from "../scenes/action-bar-hud";
import {fail, rerender} from "./window-helpers";

export interface TalentWindowOptions {
    onChange: () => void;
}

const STAT_TALENT_NAMES: Record<StatKey, UiKey> = {
    [StatKey.Hp]: "tnStatHp",
    [StatKey.Mana]: "tnStatMana",
    [StatKey.Atk]: "tnStatAtk",
    [StatKey.Def]: "tnStatDef",
    [StatKey.Matk]: "tnStatMatk",
    [StatKey.Mdef]: "tnStatMdef",
    [StatKey.Crit]: "tnStatCrit"
};

/** Name pattern of generated talent names, by the kind of their first effect. */
const EFFECT_NAME_KEYS: Partial<Record<TalentEffectKind, UiKey>> = {
    [TalentEffectKind.AbilityPower]: "tnPower",
    [TalentEffectKind.AbilityStatus]: "tnStatus",
    [TalentEffectKind.AbilityCost]: "tnCost",
    [TalentEffectKind.AbilityCrit]: "tnCrit",
    [TalentEffectKind.AbilityLifesteal]: "tnLeech",
    [TalentEffectKind.AbilityHits]: "tnHits",
    [TalentEffectKind.AbilityTurns]: "tnTurns"
};

/** Glyphs for talents without an ability icon. */
const STAT_GLYPHS: Record<StatKey, {glyph: string; color: string}> = {
    [StatKey.Hp]: {glyph: "❤", color: "#ff6b6b"},
    [StatKey.Mana]: {glyph: "✦", color: "#74c0fc"},
    [StatKey.Atk]: {glyph: "⚔", color: "#ffa94d"},
    [StatKey.Def]: {glyph: "⛨", color: "#adb5bd"},
    [StatKey.Matk]: {glyph: "✺", color: "#b197fc"},
    [StatKey.Mdef]: {glyph: "✧", color: "#63e6be"},
    [StatKey.Crit]: {glyph: "◎", color: "#ffd43b"}
};

function abilityName(key: AbilityKey | undefined): string {
    return key ? tr(ABILITIES[key].name) : "";
}

function pct(value: number): string {
    return Math.round(value * 100) + "%";
}

export function talentName(def: TalentDef): string {
    if (def.name) {
        return tr(def.name);
    }
    if (def.grants) {
        return abilityName(def.grants);
    }
    const first: TalentEffect | undefined = def.effects[0];
    if (!first) {
        return def.key;
    }
    if (first.kind === TalentEffectKind.StatPct && first.stat) {
        return t(STAT_TALENT_NAMES[first.stat]);
    }
    if (def.slot === TalentSlot.Mastery) {
        return t("tnMastery", {ability: abilityName(first.ability)});
    }
    const pattern: UiKey | undefined = EFFECT_NAME_KEYS[first.kind];
    return pattern ? t(pattern, {ability: abilityName(first.ability)}) : def.key;
}

/** One effect at the given total amount (rank × per-rank value). */
function describeEffect(effect: TalentEffect, amount: number): string {
    const ability: string = abilityName(effect.ability);
    switch (effect.kind) {
        case TalentEffectKind.StatPct:
            return effect.stat === StatKey.Crit ? "+" + amount + " " + statLabel(StatKey.Crit) : "+" + pct(amount) + " " + statLabel(effect.stat as StatKey);
        case TalentEffectKind.AbilityPower:
            return t("tfxPower", {v: pct(amount), ability: ability});
        case TalentEffectKind.AbilityStatus: {
            const inflicted: StatusKey | undefined = effect.ability ? ABILITIES[effect.ability].status : undefined;
            return t("tfxStatus", {v: pct(amount), status: inflicted ? tr(STATUSES[inflicted].name) : "", ability: ability});
        }
        case TalentEffectKind.AbilityCost:
            return t("tfxCost", {v: pct(amount), ability: ability});
        case TalentEffectKind.AbilityCrit:
            return t("tfxCrit", {v: amount + "%", ability: ability});
        case TalentEffectKind.AbilityLifesteal:
            return t("tfxLeech", {v: pct(amount), ability: ability});
        case TalentEffectKind.AbilityHits:
            return t("tfxHits", {v: amount, ability: ability});
        case TalentEffectKind.AbilityTurns:
            return t("tfxTurns", {v: amount, ability: ability});
        case TalentEffectKind.TypePower:
            return t(effect.damageType === DamageType.Physical ? "tfxTypePhysical" : "tfxTypeMagical", {v: pct(amount)});
        case TalentEffectKind.ElementPower:
            return t("tfxElement", {v: pct(amount), element: effect.element ? tr(ELEMENTS[effect.element].name) : ""});
        case TalentEffectKind.HealPower:
            return t("tfxHeal", {v: pct(amount)});
    }
}

function describeRank(def: TalentDef, rank: number): string {
    return def.effects.map((e: TalentEffect) => describeEffect(e, Math.round(e.amount * rank * 1000) / 1000)).join(" · ");
}

function talentTooltip(save: SaveData, def: TalentDef, tree: TalentTreeDef, block: LearnBlock): string {
    const rank: number = talentRank(save, def.key);
    const lines: string[] = [talentName(def), t("talentRank", {rank: rank, max: def.maxRank})];
    if (def.grants) {
        const ability: AbilityKey = def.grants;
        lines.push(t("talentGrants", {ability: abilityName(ability)}));
        lines.push(ABILITIES[ability].manaCost + " " + t("mana") + " · " + describeAbility(effectiveAbility(save, ability)));
    } else {
        if (rank > 0) {
            lines.push(describeRank(def, rank));
        }
        if (rank < def.maxRank) {
            lines.push((rank > 0 ? t("talentNext") + " " : "") + describeRank(def, rank + 1));
        }
    }
    const blocked: string | null = blockMessage(def, tree, block);
    if (blocked) {
        lines.push(blocked);
    } else if (block === LearnBlock.None) {
        lines.push(t("talentLearn"));
    }
    return lines.join("\n");
}

/** Explanation for a tier or prerequisite block; null for other reasons. */
function blockMessage(def: TalentDef, tree: TalentTreeDef, block: LearnBlock): string | null {
    if (block === LearnBlock.TierLocked) {
        return t("talentTierLocked", {n: def.tier * tierStep(def.classKey), tree: tr(tree.name)});
    }
    if (block === LearnBlock.Requires && def.requires) {
        return t("talentRequires", {name: talentName(TALENTS[def.requires])});
    }
    return null;
}

function talentIcon(def: TalentDef): HTMLElement {
    const first: TalentEffect | undefined = def.effects[0];
    const ability: AbilityKey | undefined = def.grants ?? first?.ability;
    if (ability) {
        return abilityIconEl(ability, 40);
    }
    let glyph: {glyph: string; color: string} = {glyph: "✚", color: "#69db7c"};
    if (first?.kind === TalentEffectKind.StatPct && first.stat) {
        glyph = STAT_GLYPHS[first.stat];
    } else if (first?.kind === TalentEffectKind.TypePower) {
        glyph = first.damageType === DamageType.Physical ? STAT_GLYPHS[StatKey.Atk] : STAT_GLYPHS[StatKey.Matk];
    } else if (first?.kind === TalentEffectKind.ElementPower && first.element) {
        glyph = {glyph: ELEMENTS[first.element].symbol, color: ELEMENTS[first.element].color};
    }
    return el("div", {cls: "talent-glyph", text: glyph.glyph, style: {color: glyph.color}});
}

/** Classic-WoW style talent window: one column per tree, rows unlock with points spent in that tree. */
export function openTalents(game: Game, opts: TalentWindowOptions): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("talents"), cls: "window-talents"});

    const treeColumn: (tree: TalentTreeDef) => HTMLElement = (tree: TalentTreeDef) => {
        const spent: number = pointsInTree(save, tree);
        const rows: HTMLElement[] = [];
        for (let tier: number = 0; tier < CLASS_TIER_COUNT; tier++) {
            const open: boolean = spent >= tier * tierStep(tree.classKey);
            const cells: HTMLElement[] = [0, 1].map((column: number) => {
                const def: TalentDef | undefined = tree.talents.find((d: TalentDef) => d.tier === tier && d.column === column);
                if (!def) {
                    return el("div", {cls: "talent-cell"});
                }
                const rank: number = talentRank(save, def.key);
                const block: LearnBlock = learnBlock(save, def);
                const state: string = rank >= def.maxRank ? "maxed" : rank > 0 ? "learned" : block === LearnBlock.None ? "available" : open ? "open" : "locked";
                const node: HTMLElement = el("div", {cls: "talent-node " + state + (def.grants ? " grants" : "") + (def.slot === TalentSlot.Capstone ? " capstone" : ""), title: talentTooltip(save, def, tree, block)}, [
                    talentIcon(def),
                    el("span", {cls: "talent-rank", text: rank + "/" + def.maxRank})
                ]);
                if (def.grants && rank > 0) {
                    makeActionDraggable(node, {kind: ActionBarSlot.Kind.Ability, ability: def.grants});
                }
                node.addEventListener("click", () => {
                    if (learnTalent(save, def.key)) {
                        game.audio.play(def.grants ? Sfx.LevelUp : Sfx.Unlock);
                        game.saveGame();
                        opts.onChange();
                        render();
                        return;
                    }
                    game.audio.play(Sfx.Error);
                    const reason: LearnBlock = learnBlock(save, def);
                    const message: string | null = reason === LearnBlock.NoPoints ? t("talentNoPoints") : blockMessage(def, tree, reason);
                    if (message) {
                        game.ui.toast(message, ToastKind.Bad);
                    }
                });
                return el("div", {cls: "talent-cell"}, [node, el("div", {cls: "talent-name", text: talentName(def)})]);
            });
            rows.push(el("div", {cls: "talent-row" + (open ? "" : " closed")}, cells));
        }
        return el("div", {cls: "talent-tree"}, [
            el("div", {cls: "talent-tree-title"}, [tr(tree.name), el("span", {cls: "muted", text: " (" + spent + ")"})]),
            ...rows
        ]);
    };

    const render: () => void = () => {
        const classKey: ClassKey = save.hero.classKey;
        const points: number = availableTalentPoints(save);
        const header: HTMLElement = el("div", {cls: "talent-header"}, [
            el("div", {}, [
                el("b", {text: tr(CLASSES[classKey].name) + " · " + t("level") + " " + save.hero.level}),
                el("div", {cls: points > 0 ? "good-text" : "muted", text: t("talentPointsFree", {n: points})})
            ]),
            button(t("talentRespec") + " (" + respecCost(save) + " " + t("gold") + ")", () => {
                if (save.run) {
                    fail(game, t("talentRespecTown"));
                    return;
                }
                if (!canRespec(save)) {
                    fail(game, t("notEnoughGold"));
                    return;
                }
                game.ui.confirm(t("talentRespecConfirm", {cls: tr(CLASSES[classKey].name), gold: respecCost(save)}), () => {
                    if (respecTalents(save)) {
                        game.audio.play(Sfx.Coin);
                        game.ui.toast(t("talentRespecDone"), ToastKind.Good);
                        game.saveGame();
                        opts.onChange();
                        render();
                    }
                });
            }, {cls: "btn-small", disabled: refundablePoints(save) === 0})
        ]);
        // Spellbook: every known spell (the class's first one is not in the trees), ready to drag to the bar.
        const known: AbilityKey[] = abilitySlots(save).filter((k: AbilityKey | null): k is AbilityKey => k !== null);
        const spellbook: HTMLElement = el("div", {cls: "spellbook"}, [
            el("span", {cls: "muted", text: t("spellbookHint")}),
            ...known.map((key: AbilityKey) => {
                const spell: HTMLElement = el("div", {cls: "spellbook-spell", title: tr(ABILITIES[key].name)}, [abilityIconEl(key, 40)]);
                makeActionDraggable(spell, {kind: ActionBarSlot.Kind.Ability, ability: key});
                return spell;
            })
        ]);
        const trees: HTMLElement = el("div", {cls: "talent-trees"}, TALENT_TREES[classKey].map(treeColumn));
        const children: HTMLElement[] = [header, spellbook, trees];
        if (classKey !== ClassKey.Novice) {
            // The Novice tree still applies (its passives), but it can no longer change.
            const kept: string[] = TALENT_TREES[ClassKey.Novice][0].talents
                .filter((d: TalentDef) => !d.grants && talentRank(save, d.key) > 0)
                .map((d: TalentDef) => talentName(d) + " " + talentRank(save, d.key) + "/" + d.maxRank);
            children.push(el("div", {cls: "row-sub talent-novice", text: t("talentNoviceKept") + " " + (kept.length > 0 ? kept.join(" · ") : "—")}));
        }
        rerender(win, ...children);
    };
    render();
}
