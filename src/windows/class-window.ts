import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {AbilityDef, AbilityKey, ABILITIES, describeAbility} from "../data/abilities";
import {ClassDef, ClassKey, CLASSES} from "../data/hero-classes";
import {ItemKey} from "../data/items";
import {ALL_STATS, StatKey, statLabel} from "../data/stat-block";
import {bagHasRoomFor} from "../logic/bank";
import {buyPrice, buyWithDiamonds, buyWithGold} from "../logic/economy";
import {countItem, itemName} from "../logic/inventory";
import {describeItemSources} from "../logic/item-sources";
import {missingForClass, switchClass, transformClass} from "../logic/progression";
import {abilityIconEl} from "../render/ability-icons";
import {drawClassHero} from "../render/class-hero";
import {playClassTransformation} from "../render/class-transform-fx";
import {defaultPose} from "../render/hero-sprite";
import {iconImg} from "../render/item-icons";
import {diamondText, goldText, itemRow, npcLine, sectionTitle, tag} from "./window-helpers";

export function classPortrait(classKey: ClassKey, size: number = 72): HTMLCanvasElement {
    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    canvas.style.flex = "none";
    canvas.style.background = "radial-gradient(circle at 50% 60%, rgba(245,197,66,0.18), rgba(0,0,0,0.25))";
    canvas.style.borderRadius = "8px";
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.scale(2, 2);
    drawClassHero(ctx, size / 2, size - 8, classKey, defaultPose({scale: size / 62}));
    return canvas;
}

export function openClassLibrary(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("classLibrary"), cls: "window-wide"});

    const render: () => void = () => {
        const tomePrice: number = buyPrice(save, ItemKey.ClassTome);
        const tomeRow: HTMLElement = itemRow(ItemKey.ClassTome, itemName(ItemKey.ClassTome) + " ×" + countItem(save, ItemKey.ClassTome), t("buyTome"), [
            goldText(tomePrice),
            button(t("buy"), () => {
                if (!bagHasRoomFor(save, ItemKey.ClassTome)) {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("bagFull"), ToastKind.Bad);
                } else if (buyWithGold(save, ItemKey.ClassTome)) {
                    game.audio.play(Sfx.Buy);
                    changed();
                } else {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("notEnoughGold"), ToastKind.Bad);
                }
            }, {cls: "btn-small btn-primary", disabled: save.hero.gold < tomePrice}),
            diamondText(3),
            button(t("buy"), () => {
                if (!bagHasRoomFor(save, ItemKey.ClassTome)) {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("bagFull"), ToastKind.Bad);
                } else if (buyWithDiamonds(save, ItemKey.ClassTome)) {
                    game.audio.play(Sfx.Buy);
                    changed();
                } else {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("notEnoughDiamonds"), ToastKind.Bad);
                }
            }, {cls: "btn-small", disabled: save.hero.diamonds < 3})
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
            } else if (unlocked) {
                action = button(t("switchTo"), () => {
                    const from: ClassKey = save.hero.classKey;
                    if (switchClass(save, def.key)) {
                        game.audio.play(Sfx.Unlock);
                        changed();
                        playClassTransformation(from, def.key, t("classSwitchBanner"), tr(def.name), def.look.accent);
                    }
                }, {cls: "btn-small btn-primary"});
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
                        game.audio.play(Sfx.Error);
                        game.ui.toast(t("missingRecipe", {items: missing.map((k: ItemKey) => itemName(k)).join(", ")}), ToastKind.Bad);
                    }
                }, {cls: "btn-small btn-primary", disabled: missing.length > 0});
            }
            // Guidance for locked classes: the three steps and where each missing ingredient can be found.
            const guide: HTMLElement | null = unlocked || def.recipe.length === 0 ? null : el("div", {cls: "row-sub", style: {marginTop: "6px", padding: "6px 8px", borderRadius: "6px", background: "rgba(245,197,66,0.08)"}}, [
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
        const scrollTop: number = win.body.scrollTop;
        win.body.replaceChildren(npcLine(t("classGreeting")), el("div", {cls: "hud-line", style: {marginBottom: "8px"}}, [
            el("span", {}, [t("gold") + ": ", el("b", {text: String(save.hero.gold)})]),
            el("span", {}, [t("diamonds") + ": ", el("b", {text: String(save.hero.diamonds)})])
        ]), tomeRow, sectionTitle(t("classLabel")), el("div", {cls: "list"}, rows));
        win.body.scrollTop = scrollTop;
    };
    const changed: () => void = () => {
        game.saveGame();
        onChange();
        render();
    };
    render();
}
