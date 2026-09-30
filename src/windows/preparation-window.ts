import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {CLASSES} from "../data/hero-classes";
import {ItemCategory, ItemDef, ITEMS} from "../data/items";
import {PerkKey} from "../data/perks";
import {bagHasRoomFor} from "../logic/bank";
import {buyPrice, buyWithGold} from "../logic/economy";
import {computeHeroStats, perkRank} from "../logic/hero-stats";
import {countItem, itemName} from "../logic/inventory";
import {classPortrait} from "./class-window";
import {goldText, itemDescription, itemRow, sectionTitle, statTable} from "./window-helpers";

export function openPreparation(game: Game, onStart: (floor: number) => void, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const bonusRank: number = perkRank(save, PerkKey.StartingGold);
    if (save.expeditionBonusReady && bonusRank > 0) {
        const bonus: number = 60 * bonusRank;
        save.hero.gold += bonus;
        save.expeditionBonusReady = false;
        game.audio.play(Sfx.Coin);
        game.ui.toast(t("expeditionBonus", {gold: bonus}), ToastKind.Special);
        game.saveGame();
        onChange();
    }
    const win: WindowHandle = game.ui.openWindow({title: t("preparation"), cls: "window-wide"});
    let floor: number = save.deepestFloor;

    const render: () => void = () => {
        const potions: ItemDef[] = (Object.values(ITEMS) as ItemDef[]).filter((def: ItemDef) => def.inShop && def.category === ItemCategory.Potion);
        const shopRows: HTMLElement[] = potions.map((def: ItemDef) => {
            const price: number = buyPrice(save, def.key);
            return itemRow(def.key, itemName(def.key) + " ×" + countItem(save, def.key), itemDescription(def.key), [
                goldText(price),
                button(t("buy"), () => {
                    if (!bagHasRoomFor(save, def.key)) {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("bagFull"), ToastKind.Bad);
                } else if (buyWithGold(save, def.key)) {
                        game.audio.play(Sfx.Buy);
                        game.saveGame();
                        onChange();
                        render();
                    } else {
                        game.audio.play(Sfx.Error);
                        game.ui.toast(t("notEnoughGold"), ToastKind.Bad);
                    }
                }, {cls: "btn-small btn-primary", disabled: save.hero.gold < price})
            ]);
        });
        const floorButtons: HTMLElement = el("div", {style: {display: "flex", gap: "6px", flexWrap: "wrap"}});
        for (let f: number = 1; f <= save.deepestFloor; f++) {
            const selected: number = f;
            floorButtons.append(button(t("enteringFloor", {n: f}), () => {
                floor = selected;
                render();
            }, {cls: "btn-small" + (floor === f ? " btn-primary" : "")}));
        }
        const left: HTMLElement = el("div", {}, [
            sectionTitle(t("classLabel")),
            el("div", {cls: "row"}, [
                classPortrait(save.hero.classKey, 64),
                el("div", {cls: "row-main"}, [
                    el("div", {cls: "row-title", text: tr(CLASSES[save.hero.classKey].name) + " · " + t("level") + " " + save.hero.level}),
                    el("div", {cls: "row-sub", text: "🔒 " + t("classLockedForRun")})
                ])
            ]),
            el("div", {style: {marginTop: "10px"}}, [statTable(computeHeroStats(save))]),
            sectionTitle(t("startingFloor")),
            floorButtons,
            el("p", {cls: "muted", text: t("prepHint"), style: {fontSize: "13px", lineHeight: "1.45"}})
        ]);
        const right: HTMLElement = el("div", {}, [
            sectionTitle(t("quickShop")),
            el("div", {cls: "hud-line", style: {marginBottom: "6px"}}, [el("span", {}, [t("gold") + ": ", el("b", {text: String(save.hero.gold)})])]),
            el("div", {cls: "list"}, shopRows)
        ]);
        const scrollTop: number = win.body.scrollTop;
        win.body.replaceChildren(el("div", {cls: "grid-2"}, [left, right]));
        win.body.scrollTop = scrollTop;
        win.footer.replaceChildren(
            button(t("cancel"), () => win.close()),
            button(t("enterDungeon") + " (" + t("enteringFloor", {n: floor}) + ")", () => {
                win.close();
                onStart(floor);
            }, {cls: "btn-primary"})
        );
    };
    render();
}
