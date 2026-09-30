import {tr} from "../core/i18n";
import {Child, el} from "../core/ui";
import {GearInstance} from "../data/dungeon-types";
import {ItemDef, ItemKey, ITEMS} from "../data/items";
import {ALL_STATS, describeStats, StatBlock, StatKey, statLabel} from "../data/stat-block";
import {gearFactor} from "../logic/hero-stats";
import {iconImg} from "../render/item-icons";

export function goldText(amount: number): HTMLElement {
    return el("span", {cls: "price", text: "● " + amount});
}

export function diamondText(amount: number): HTMLElement {
    return el("span", {cls: "price diamond", text: "◆ " + amount});
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
    highlight?: boolean;
    dim?: boolean;
    tags?: HTMLElement[];
}

export function itemRow(key: ItemKey, title: string, sub: string, actions: Child[], opts: RowOptions = {}): HTMLElement {
    return el("div", {cls: "row" + (opts.highlight ? " highlight" : "") + (opts.dim ? " dim" : "")}, [
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

export function statTable(stats: StatBlock, keys: StatKey[] = ALL_STATS): HTMLElement {
    const children: HTMLElement[] = [];
    for (const key of keys) {
        children.push(el("div", {cls: "label", text: statLabel(key)}));
        children.push(el("div", {cls: "value", text: String(Math.round(stats[key] * 10) / 10)}));
    }
    return el("div", {cls: "stat-table"}, children);
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
