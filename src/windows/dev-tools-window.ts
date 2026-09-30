import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {ClassDef, CLASSES} from "../data/hero-classes";
import {devResetTalents, devSetLevel, devSwitchClass} from "../logic/dev-tools";
import {MAX_LEVEL} from "../logic/hero-stats";
import {availableTalentPoints} from "../logic/talents";
import {classPortrait} from "./class-window";
import {npcLine, rerender, sectionTitle} from "./window-helpers";

/** Level buttons: label and the change they apply (null = set to that level). */
interface LevelStep {
    label: string;
    delta: number;
    absolute: number | null;
}

const LEVEL_STEPS: LevelStep[] = [
    {label: "1", delta: 0, absolute: 1},
    {label: "−5", delta: -5, absolute: null},
    {label: "−1", delta: -1, absolute: null},
    {label: "+1", delta: 1, absolute: null},
    {label: "+5", delta: 5, absolute: null},
    {label: String(MAX_LEVEL), delta: 0, absolute: MAX_LEVEL}
];

/** Testing trainer ("god mode"): any class, any level, free talent reset. Dev server only. */
export function openDevTools(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("devTitle"), cls: "window-wide"});

    const changed: () => void = () => {
        game.saveGame();
        onChange();
        render();
    };

    const render: () => void = () => {
        const levelRow: HTMLElement = el("div", {cls: "dev-level"}, [
            el("b", {text: t("level") + " " + save.hero.level}),
            ...LEVEL_STEPS.map((step: LevelStep) => button(step.label, () => {
                devSetLevel(save, step.absolute ?? save.hero.level + step.delta);
                game.audio.play(Sfx.LevelUp);
                changed();
            }, {cls: "btn-small"})),
            el("span", {cls: "muted", text: t("talentPointsFree", {n: availableTalentPoints(save)})}),
            button(t("devResetTalents"), () => {
                devResetTalents(save);
                game.audio.play(Sfx.Coin);
                changed();
            }, {cls: "btn-small"})
        ]);
        const classes: HTMLElement = el("div", {cls: "dev-classes"}, (Object.values(CLASSES) as ClassDef[]).map((def: ClassDef) => {
            const current: boolean = save.hero.classKey === def.key;
            const card: HTMLElement = el("div", {cls: "dev-class" + (current ? " current" : ""), title: tr(def.desc)}, [
                classPortrait(def.key, 64),
                el("div", {text: tr(def.name)})
            ]);
            card.addEventListener("click", () => {
                if (current) {
                    return;
                }
                if (devSwitchClass(save, def.key)) {
                    game.audio.play(Sfx.Unlock);
                    game.ui.toast(t("classChanged", {cls: tr(def.name)}), ToastKind.Special);
                    changed();
                }
            });
            return card;
        }));
        rerender(win, npcLine(t("devGreeting")), sectionTitle(t("level")), levelRow, sectionTitle(t("devClasses")), classes);
    };
    render();
}
