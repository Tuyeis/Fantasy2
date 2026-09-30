import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {GearInstance} from "../data/dungeon-types";
import {canForge, forge, ForgeCost, forgeCost} from "../logic/economy";
import {gearFactor} from "../logic/hero-stats";
import {countItem, isEquipped, itemName} from "../logic/inventory";
import {diamondText, fail, gearDescription, goldText, itemDescription, itemRow, npcLine, rerender, tag, walletLine} from "./window-helpers";

export function openForge(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("forge"), cls: "window-wide"});

    const render: () => void = () => {
        const gear: GearInstance[] = [...save.inventory.gear].sort((a: GearInstance, b: GearInstance) => Number(isEquipped(save, b.uid)) - Number(isEquipped(save, a.uid)));
        const rows: HTMLElement[] = gear.map((g: GearInstance) => {
            const cost: ForgeCost | null = forgeCost(g);
            const tags: HTMLElement[] = isEquipped(save, g.uid) ? [tag(t("equippedTag"), "good")] : [];
            if (!cost) {
                return itemRow(g.key, itemName(g.key, g.plus), gearDescription(g), [tag(t("maxLevel"))], {tags: tags});
            }
            const materials: HTMLElement[] = cost.materials.map((m: ForgeCost.Material) => {
                const owned: number = countItem(save, m.item);
                return el("span", {cls: owned >= m.amount ? "good-text" : "bad-text", text: itemName(m.item) + " " + owned + "/" + m.amount});
            });
            const nextPreview: string = "→ +" + (g.plus + 1) + ": " + itemDescription(g.key, g.plus + 1);
            return itemRow(g.key, itemName(g.key, g.plus), gearDescription(g) + "  " + nextPreview, [
                el("span", {cls: "row-sub", style: {display: "flex", flexDirection: "column", alignItems: "flex-end"}}, materials),
                goldText(cost.gold),
                cost.diamonds > 0 ? diamondText(cost.diamonds) : null,
                button(t("upgrade"), () => {
                    if (forge(save, g.uid)) {
                        game.audio.play(Sfx.Unlock);
                        game.ui.toast(t("upgraded", {item: itemName(g.key), plus: g.plus}), ToastKind.Special);
                        game.saveGame();
                        onChange();
                        render();
                    } else {
                        fail(game, t("missingMaterials"));
                    }
                }, {cls: "btn-small btn-primary", disabled: !canForge(save, g)})
            ], {tags: tags});
        });
        const header: HTMLElement = walletLine(save, [el("span", {cls: "muted", text: "+1 = +" + Math.round((gearFactor(1) - 1) * 100) + "%"})]);
        rerender(win, npcLine(t("forgeGreeting")), header, rows.length > 0 ? el("div", {cls: "list"}, rows) : el("p", {cls: "muted", text: t("noGear")}));
    };
    render();
}
