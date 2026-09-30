import {Game} from "../core/game";
import {t} from "../core/i18n";
import {button, el, WindowHandle} from "../core/ui";
import {openOptions} from "../windows/options-window";

/** The scene's own button under resume and options (flee, back to town...). */
export interface BattlePauseExtra {
    label: string;
    /** Runs after the pause window closed. */
    onClick: () => void;
}

/** Pause window of the fight scenes: resume, options and optionally one extra button. */
export function openBattlePause(game: Game, extra: BattlePauseExtra | null = null): void {
    const win: WindowHandle = game.ui.openWindow({title: t("paused"), cls: "window-small"});
    const buttons: HTMLElement[] = [
        button(t("resume"), () => win.close(), {cls: "btn-primary"}),
        button(t("options"), () => openOptions(game))
    ];
    if (extra) {
        buttons.push(button(extra.label, () => {
            win.close();
            extra.onClick();
        }));
    }
    win.body.append(el("div", {style: {display: "flex", flexDirection: "column", gap: "8px"}}, buttons));
}
