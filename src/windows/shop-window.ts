import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {GearInstance} from "../data/dungeon-types";
import {ItemCategory, ItemDef, ITEMS, sellPrice} from "../data/items";
import {bagHasRoomFor} from "../logic/bank";
import {buyPrice, buyWithDiamonds, buyWithGold, sellGear, sellStack} from "../logic/economy";
import {countItem, isEquipped, itemName, ownedStacks, stackCount} from "../logic/inventory";
import {diamondText, gearDescription, goldText, itemDescription, itemRow, npcLine, sectionTitle, tabBar} from "./window-helpers";

enum ShopTab {
    Buy = "buy",
    Sell = "sell"
}

const CATEGORY_ORDER: ItemCategory[] = [ItemCategory.Potion, ItemCategory.Weapon, ItemCategory.Armor, ItemCategory.Shield, ItemCategory.Helmet, ItemCategory.Boots, ItemCategory.Accessory, ItemCategory.Material, ItemCategory.Special];

export function openShop(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("shop"), cls: "window-wide"});
    let tab: ShopTab = ShopTab.Buy;

    const afterTrade: () => void = () => {
        game.saveGame();
        onChange();
        render();
    };

    const renderBuy: () => HTMLElement[] = () => {
        const nodes: HTMLElement[] = [];
        const stock: ItemDef[] = (Object.values(ITEMS) as ItemDef[])
            .filter((def: ItemDef) => def.inShop)
            .sort((a: ItemDef, b: ItemDef) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.price - b.price);
        nodes.push(el("div", {cls: "list"}, stock.map((def: ItemDef) => {
            const price: number = buyPrice(save, def.key);
            return itemRow(def.key, itemName(def.key), itemDescription(def.key) + " · " + t("owned", {n: countItem(save, def.key)}), [
                goldText(price),
                button(t("buy"), () => {
                    if (!bagHasRoomFor(save, def.key)) {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("bagFull"), ToastKind.Bad);
                } else if (buyWithGold(save, def.key)) {
                        game.audio.play(Sfx.Buy);
                        game.ui.toast(t("bought", {item: itemName(def.key)}), ToastKind.Good);
                        afterTrade();
                    } else {
                        game.audio.play(Sfx.Error);
                        game.ui.toast(t("notEnoughGold"), ToastKind.Bad);
                    }
                }, {cls: "btn-small btn-primary", disabled: save.hero.gold < price})
            ]);
        })));
        const premium: ItemDef[] = (Object.values(ITEMS) as ItemDef[]).filter((def: ItemDef) => def.diamondPrice !== undefined);
        nodes.push(sectionTitle(t("premium")));
        nodes.push(el("div", {cls: "list"}, premium.map((def: ItemDef) => {
            const price: number = def.diamondPrice as number;
            return itemRow(def.key, itemName(def.key), itemDescription(def.key) + " · " + t("owned", {n: countItem(save, def.key)}), [
                diamondText(price),
                button(t("buy"), () => {
                    if (!bagHasRoomFor(save, def.key)) {
                    game.audio.play(Sfx.Error);
                    game.ui.toast(t("bagFull"), ToastKind.Bad);
                } else if (buyWithDiamonds(save, def.key)) {
                        game.audio.play(Sfx.Buy);
                        game.ui.toast(t("bought", {item: itemName(def.key)}), ToastKind.Good);
                        afterTrade();
                    } else {
                        game.audio.play(Sfx.Error);
                        game.ui.toast(t("notEnoughDiamonds"), ToastKind.Bad);
                    }
                }, {cls: "btn-small", disabled: save.hero.diamonds < price})
            ]);
        })));
        return nodes;
    };

    const renderSell: () => HTMLElement[] = () => {
        const rows: HTMLElement[] = [];
        for (const key of ownedStacks(save)) {
            rows.push(itemRow(key, itemName(key) + " ×" + stackCount(save, key), itemDescription(key), [
                goldText(sellPrice(key)),
                button(t("sell"), () => {
                    const gold: number = sellStack(save, key);
                    game.audio.play(Sfx.Coin);
                    game.ui.toast(t("sold", {item: itemName(key), gold: gold}));
                    afterTrade();
                }, {cls: "btn-small"})
            ]));
        }
        for (const gear of save.inventory.gear.filter((g: GearInstance) => !isEquipped(save, g.uid))) {
            const price: number = Math.round(sellPrice(gear.key) * (1 + 0.25 * gear.plus));
            rows.push(itemRow(gear.key, itemName(gear.key, gear.plus), gearDescription(gear), [
                goldText(price),
                button(t("sell"), () => {
                    const gold: number = sellGear(save, gear.uid);
                    game.audio.play(Sfx.Coin);
                    game.ui.toast(t("sold", {item: itemName(gear.key, gear.plus), gold: gold}));
                    afterTrade();
                }, {cls: "btn-small"})
            ]));
        }
        if (rows.length === 0) {
            return [el("p", {cls: "muted", text: t("nothingToSell")})];
        }
        return [el("div", {cls: "list"}, rows)];
    };

    const render: () => void = () => {
        const header: HTMLElement = el("div", {cls: "hud-line", style: {marginBottom: "8px"}}, [
            el("span", {}, [t("gold") + ": ", el("b", {text: String(save.hero.gold)})]),
            el("span", {}, [t("diamonds") + ": ", el("b", {text: String(save.hero.diamonds)})])
        ]);
        const tabs: HTMLElement = tabBar<ShopTab>([
            {key: ShopTab.Buy, label: t("buy")},
            {key: ShopTab.Sell, label: t("sell")}
        ], tab, (next: ShopTab) => {
            tab = next;
            render();
        });
        const scrollTop: number = win.body.scrollTop;
        win.body.replaceChildren(npcLine(t("shopGreeting")), header, tabs, ...(tab === ShopTab.Buy ? renderBuy() : renderSell()));
        win.body.scrollTop = scrollTop;
    };
    render();
}
