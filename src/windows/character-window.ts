import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, WindowHandle} from "../core/ui";
import {GearInstance} from "../data/dungeon-types";
import {CLASSES} from "../data/hero-classes";
import {EquipSlot} from "../data/items";
import {StatBlock} from "../data/stat-block";
import {BAG_SLOTS, bagUsed} from "../logic/bank";
import {computeHeroStats} from "../logic/hero-stats";
import {findGear, itemName, unequip} from "../logic/inventory";
import {availableTalentPoints} from "../logic/talents";
import {drawClassHero} from "../render/class-hero";
import {defaultPose} from "../render/hero-sprite";
import {iconImg} from "../render/item-icons";
import {PuppetView} from "../render/puppet/puppet-types";
import {clampRunToStats, SLOT_LABELS} from "./inventory-window";
import {openTalents} from "./talent-window";
import {fail, gearDescription, statTable} from "./window-helpers";

const LEFT_SLOTS: EquipSlot[] = [EquipSlot.Helmet, EquipSlot.Armor, EquipSlot.Accessory];
const RIGHT_SLOTS: EquipSlot[] = [EquipSlot.Weapon, EquipSlot.Shield, EquipSlot.Boots];

export interface CharacterOptions {
    onChange: () => void;
}

/** Character sheet, WoW style: the hero in the middle, equipment slots on both sides, stats below. */
export function openCharacter(game: Game, opts: CharacterOptions): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("character"), cls: "window-character"});

    // Animated portrait (idle, slowly turning between front and side).
    const portrait: HTMLCanvasElement = document.createElement("canvas");
    const dpr: number = Math.min(2, window.devicePixelRatio || 1);
    portrait.width = 220 * dpr;
    portrait.height = 280 * dpr;
    portrait.className = "char-portrait";
    let start: number = -1;
    const animate: (now: number) => void = (now: number): void => {
        if (!portrait.isConnected && start >= 0) {
            return;
        }
        if (start < 0) {
            start = now;
        }
        const time: number = (now - start) / 1000;
        const ctx: CanvasRenderingContext2D = portrait.getContext("2d") as CanvasRenderingContext2D;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, 220, 280);
        const glow: CanvasGradient = ctx.createRadialGradient(110, 190, 10, 110, 170, 150);
        glow.addColorStop(0, "rgba(245,197,66,0.22)");
        glow.addColorStop(1, "rgba(245,197,66,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 220, 280);
        const phase: number = Math.floor(time / 4) % 3;
        const view: PuppetView = phase === 1 ? PuppetView.Side : PuppetView.Front;
        drawClassHero(ctx, 110, 262, save.hero.classKey, defaultPose({scale: 3.4, time: time, view: view, facing: 1}), "character_sheet");
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    const slotEl: (slot: EquipSlot) => HTMLElement = (slot: EquipSlot) => {
        const gear: GearInstance | null = findGear(save, save.hero.equipment[slot]);
        const title: string = t(SLOT_LABELS[slot]) + (gear ? "\n" + itemName(gear.key, gear.plus) + "\n" + gearDescription(gear) : "\n" + t("empty"));
        const node: HTMLElement = el("div", {cls: "char-slot" + (gear ? "" : " empty"), title: title}, [
            gear ? iconImg(gear.key) : el("span", {cls: "char-slot-label", text: t(SLOT_LABELS[slot])}),
            gear && gear.plus > 0 ? el("span", {cls: "bag-plus", text: "+" + gear.plus}) : null
        ]);
        if (gear) {
            // Click: take it off (back into the bag, if it fits).
            node.addEventListener("click", () => {
                if (bagUsed(save) >= BAG_SLOTS) {
                    fail(game, t("unequipBagFull"));
                    return;
                }
                unequip(save, slot);
                clampRunToStats(save);
                game.audio.play(Sfx.Pickup);
                game.saveGame();
                opts.onChange();
                render();
            });
        }
        return node;
    };

    const render: () => void = () => {
        const stats: StatBlock = computeHeroStats(save);
        win.body.replaceChildren(
            el("div", {cls: "char-name", text: tr(CLASSES[save.hero.classKey].name) + " · " + t("level") + " " + save.hero.level}),
            el("div", {cls: "char-sheet"}, [
                el("div", {cls: "char-column"}, LEFT_SLOTS.map(slotEl)),
                portrait,
                el("div", {cls: "char-column"}, RIGHT_SLOTS.map(slotEl))
            ]),
            statTable(stats),
            el("div", {style: {marginTop: "10px", textAlign: "center"}}, [button(t("talents") + " (N) · " + t("talentPointsFree", {n: availableTalentPoints(save)}), () => {
                win.close();
                openTalents(game, {onChange: opts.onChange});
            }, {cls: "btn-small" + (availableTalentPoints(save) > 0 ? " btn-primary" : "")})])
        );
    };
    render();
}
