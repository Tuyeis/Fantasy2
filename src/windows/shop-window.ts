import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {GearInstance} from "../data/dungeon-types";
import {ItemCategory, ItemDef, ItemKey, ITEMS, sellPrice} from "../data/items";
import {buyPrice, Currency, gearSellPrice, sellGear, sellStack} from "../logic/economy";
import {countItem, isEquipped, itemName, ownedStacks, stackCount} from "../logic/inventory";
import {buyButton, diamondText, gearDescription, goldText, itemDescription, itemRow, npcLine, rerender, sectionTitle, tabBar, walletLine} from "./window-helpers";

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

    const bought: (key: ItemKey) => () => void = (key: ItemKey) => () => {
        game.ui.toast(t("bought", {item: itemName(key)}), ToastKind.Good);
        afterTrade();
    };

    const renderBuy: () => HTMLElement[] = () => {
        const nodes: HTMLElement[] = [];
        const stock: ItemDef[] = (Object.values(ITEMS) as ItemDef[])
            .filter((def: ItemDef) => def.inShop)
            .sort((a: ItemDef, b: ItemDef) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) || a.price - b.price);
        nodes.push(el("div", {cls: "list"}, stock.map((def: ItemDef) => itemRow(def.key, itemName(def.key), itemDescription(def.key) + " · " + t("owned", {n: countItem(save, def.key)}), [
            goldText(buyPrice(save, def.key)),
            buyButton(game, def.key, Currency.Gold, bought(def.key))
        ]))));
        const premium: ItemDef[] = (Object.values(ITEMS) as ItemDef[]).filter((def: ItemDef) => def.diamondPrice !== undefined);
        nodes.push(sectionTitle(t("premium")));
        nodes.push(el("div", {cls: "list"}, premium.map((def: ItemDef) => itemRow(def.key, itemName(def.key), itemDescription(def.key) + " · " + t("owned", {n: countItem(save, def.key)}), [
            diamondText(def.diamondPrice as number),
            buyButton(game, def.key, Currency.Diamonds, bought(def.key))
        ]))));
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
            rows.push(itemRow(gear.key, itemName(gear.key, gear.plus), gearDescription(gear), [
                goldText(gearSellPrice(gear)),
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
        const tabs: HTMLElement = tabBar<ShopTab>([
            {key: ShopTab.Buy, label: t("buy")},
            {key: ShopTab.Sell, label: t("sell")}
        ], tab, (next: ShopTab) => {
            tab = next;
            render();
        });
        rerender(win, npcLine(t("shopGreeting")), walletLine(save), tabs, ...(tab === ShopTab.Buy ? renderBuy() : renderSell()));
    };
    render();
}
