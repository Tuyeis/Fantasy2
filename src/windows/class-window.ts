import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {AbilityDef, AbilityKey, ABILITIES, describeAbility} from "../data/abilities";
import {ClassDef, ClassKey, CLASSES} from "../data/hero-classes";
import {ItemKey, ITEMS} from "../data/items";
import {ALL_STATS, StatKey, statLabel} from "../data/stat-block";
import {buyPrice, Currency} from "../logic/economy";
import {countItem, itemName} from "../logic/inventory";
import {describeItemSources} from "../logic/item-sources";
import {canTransform, missingForClass, transformClass} from "../logic/progression";
import {abilityIconEl} from "../render/ability-icons";
import {drawClassHero} from "../render/class-hero";
import {playClassTransformation} from "../render/class-transform-fx";
import {defaultPose} from "../render/hero-sprite";
import {iconImg} from "../render/item-icons";
import {buyButton, diamondText, fail, goldText, itemRow, npcLine, rerender, sectionTitle, tag, walletLine} from "./window-helpers";

export function classPortrait(classKey: ClassKey, size: number = 72): HTMLCanvasElement {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.className = "class-portrait";
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.scale(2, 2);
    drawClassHero(ctx, size / 2, size - 8, classKey, defaultPose({scale: size / 62}));
    return canvas;
}

export function openClassLibrary(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("classLibrary"), cls: "window-wide"});

    const render: () => void = () => {
        const tomeRow: HTMLElement = itemRow(ItemKey.ClassTome, itemName(ItemKey.ClassTome) + " ×" + countItem(save, ItemKey.ClassTome), t("buyTome"), [
            goldText(buyPrice(save, ItemKey.ClassTome)),
            buyButton(game, ItemKey.ClassTome, Currency.Gold, changed),
            diamondText(ITEMS[ItemKey.ClassTome].diamondPrice ?? 0),
            buyButton(game, ItemKey.ClassTome, Currency.Diamonds, changed)
        ]);

        const rows: HTMLElement[] = (Object.values(CLASSES) as ClassDef[]).map((def: ClassDef) => {
            const unlocked: boolean = save.hero.unlockedClasses.includes(def.key);
            const current: boolean = save.hero.classKey === def.key;
            const missing: ItemKey[] = unlocked ? [] : missingForClass(save, def.key);
            const recipe: HTMLElement | null = def.recipe.length > 0 ? el("div", {style: {display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "4px"}}, [
                el("span", {cls: "muted", text: t("recipe") + ":"}),
                ...[ItemKey.ClassTome, ...def.recipe].map((item: ItemKey) => {
                    const has: boolean = countItem(save, item) > 0;
                    const icon: HTMLImageElement = iconImg(item);
                    icon.style.width = "24px";
                    icon.style.height = "24px";
                    return el("span", {cls: has ? "good-text" : "bad-text", style: {display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "13px"}}, [icon, itemName(item)]);
                })
            ]) : null;
            const abilities: HTMLElement = el("div", {style: {marginTop: "4px"}}, def.abilities.map((key: AbilityKey) => {
                const ability: AbilityDef = ABILITIES[key];
                return el("div", {cls: "row-sub", style: {display: "flex", alignItems: "center", gap: "6px", marginTop: "3px"}}, [
                    abilityIconEl(key, 24),
                    el("span", {}, [el("b", {text: tr(ability.name)}), " (" + ability.manaCost + " " + t("mana") + ") — " + describeAbility(ability)])
                ]);
            }));
            const statsLine: string = ALL_STATS.map((key: StatKey) => statLabel(key) + " " + def.base[key] + " (+" + def.growth[key] + ")").join(" · ");
            let action: HTMLElement;
            if (current) {
                action = tag(t("currentClass"), "good");
            } else if (!canTransform(save)) {
                // One class per game: after leaving the Novice behind there is no switching.
                action = el("span", {cls: "muted", style: {fontSize: "12px", maxWidth: "120px", display: "inline-block"}, text: save.hero.classKey === ClassKey.Novice ? t("classLockedForRun") : t("classForLife")});
            } else {
                action = button(t("transform"), () => {
                    const from: ClassKey = save.hero.classKey;
                    if (transformClass(save, def.key)) {
                        game.audio.play(Sfx.LevelUp);
                        changed();
                        playClassTransformation(from, def.key, t("transformBanner"), tr(def.name), def.look.accent).then(() => {
                            game.ui.toast(t("classChanged", {cls: tr(def.name)}), ToastKind.Special);
                        });
                    } else {
                        fail(game, t("missingRecipe", {items: missing.map((k: ItemKey) => itemName(k)).join(", ")}));
                    }
                }, {cls: "btn-small btn-primary", disabled: missing.length > 0});
            }
            // Guidance for locked classes: the three steps and where each missing ingredient can be found.
            const guide: HTMLElement | null = unlocked || def.recipe.length === 0 || !canTransform(save) ? null : el("div", {cls: "row-sub", style: {marginTop: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(245,197,66,0.08)"}}, [
                el("b", {text: t("howToBecome")}),
                el("div", {text: t("howToSteps")}),
                ...missing.map((item: ItemKey) => el("div", {}, ["• " + itemName(item) + " — " + t("whereToFind") + ": ", el("i", {text: describeItemSources(item)})]))
            ]);
            return el("div", {cls: "row" + (current ? " highlight" : "")}, [
                classPortrait(def.key),
                el("div", {cls: "row-main"}, [
                    el("div", {cls: "row-title"}, [tr(def.name), unlocked ? tag(t("unlocked"), "good") : null]),
                    el("div", {cls: "row-sub", text: tr(def.desc)}),
                    el("div", {cls: "row-sub", text: statsLine}),
                    recipe,
                    guide,
                    abilities
                ]),
                el("div", {cls: "row-actions"}, [action])
            ]);
        });
        rerender(win, npcLine(t("classGreeting")), walletLine(save), ...(canTransform(save) ? [tomeRow] : []), sectionTitle(t("classLabel")), el("div", {cls: "list"}, rows));
    };
    const changed: () => void = () => {
        game.saveGame();
        onChange();
        render();
    };
    render();
}
