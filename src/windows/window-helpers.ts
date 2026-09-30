import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, Child, el, ToastKind, WindowHandle} from "../core/ui";
import {GearInstance} from "../data/dungeon-types";
import {ItemDef, ItemKey, ITEMS} from "../data/items";
import {ALL_STATS, describeStats, StatBlock, StatKey, statLabel} from "../data/stat-block";
import {bagHasRoomFor} from "../logic/bank";
import {buy, Currency, priceIn} from "../logic/economy";
import {gearFactor} from "../logic/hero-stats";
import {iconImg} from "../render/item-icons";

export function goldText(amount: number): HTMLElement {
    return el("span", {cls: "price", text: "● " + amount});
}

export function diamondText(amount: number): HTMLElement {
    return el("span", {cls: "price diamond", text: "◆ " + amount});
}

/** Error sound + red toast. */
export function fail(game: Game, text: string): void {
    game.audio.play(Sfx.Error);
    game.ui.toast(text, ToastKind.Bad);
}

/** Buy button for one unit: checks bag room and the wallet, then calls `onBought`; otherwise fails with the reason. */
export function buyButton(game: Game, key: ItemKey, currency: Currency, onBought: () => void): HTMLButtonElement {
    const save: SaveData = game.save as SaveData;
    const price: number = priceIn(save, key, currency) ?? 0;
    return button(t("buy"), () => {
        if (!bagHasRoomFor(save, key)) {
            fail(game, t("bagFull"));
        } else if (buy(save, key, currency)) {
            game.audio.play(Sfx.Buy);
            onBought();
        } else {
            fail(game, t(currency === Currency.Gold ? "notEnoughGold" : "notEnoughDiamonds"));
        }
    }, {cls: currency === Currency.Gold ? "btn-small btn-primary" : "btn-small", disabled: save.hero[currency] < price});
}

/** Replaces the window body keeping its scroll position. */
export function rerender(win: WindowHandle, ...children: (Node | string)[]): void {
    const scrollTop: number = win.body.scrollTop;
    win.body.replaceChildren(...children);
    win.body.scrollTop = scrollTop;
}

/** Gold and diamonds header line, plus optional extra entries. */
export function walletLine(save: SaveData, extra: Child[] = []): HTMLElement {
    return el("div", {cls: "hud-line", style: {marginBottom: "8px"}}, [
        el("span", {}, [t("gold") + ": ", el("b", {text: String(save.hero.gold)})]),
        el("span", {}, [t("diamonds") + ": ", el("b", {text: String(save.hero.diamonds)})]),
        ...extra
    ]);
}

export function itemDescription(key: ItemKey, plus: number = 0): string {
    const def: ItemDef = ITEMS[key];
    if (def.stats) {
        return describeStats(def.stats, gearFactor(plus));
    }
    return tr(def.desc);
}

export function gearDescription(gear: GearInstance): string {
    return itemDescription(gear.key, gear.plus);
}

export interface RowOptions {
    tags?: HTMLElement[];
}

export function itemRow(key: ItemKey, title: string, sub: string, actions: Child[], opts: RowOptions = {}): HTMLElement {
    return el("div", {cls: "row"}, [
        iconImg(key),
        el("div", {cls: "row-main"}, [
            el("div", {cls: "row-title"}, [title, ...(opts.tags ?? [])]),
            sub ? el("div", {cls: "row-sub", text: sub}) : null
        ]),
        el("div", {cls: "row-actions"}, actions)
    ]);
}

export function tag(text: string, kind: string = ""): HTMLElement {
    return el("span", {cls: "tag " + kind, text: text});
}

export function statTable(stats: StatBlock): HTMLElement {
    return el("div", {cls: "stat-table"}, ALL_STATS.flatMap((key: StatKey) => [
        el("div", {cls: "label", text: statLabel(key)}),
        el("div", {cls: "value", text: String(Math.round(stats[key] * 10) / 10)})
    ]));
}

export interface TabDef<T extends string> {
    key: T;
    label: string;
}

export function tabBar<T extends string>(tabs: TabDef<T>[], active: T, onSelect: (key: T) => void): HTMLElement {
    return el("div", {cls: "tabs"}, tabs.map((tabDef: TabDef<T>) => el("button", {
        cls: "tab" + (tabDef.key === active ? " active" : ""),
        text: tabDef.label,
        onClick: () => onSelect(tabDef.key)
    })));
}

export function progressBar(value: number, max: number): HTMLElement {
    const pct: number = max <= 0 ? 100 : Math.max(0, Math.min(100, (value / max) * 100));
    return el("div", {cls: "progress"}, [el("div", {style: {width: pct + "%"}})]);
}

export function npcLine(text: string): HTMLElement {
    return el("p", {cls: "npc-line", text: text});
}

export function sectionTitle(text: string): HTMLElement {
    return el("div", {cls: "section-title", text: text});
}
