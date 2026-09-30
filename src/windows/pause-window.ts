import {Game} from "../core/game";
import {t} from "../core/i18n";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {openOptions} from "./options-window";

export interface PauseOptions {
    inDungeon: boolean;
    onInventory: () => void;
    onCharacter: () => void;
    onAbandon: () => void;
    onQuitToMenu: () => void;
}

export function openPause(game: Game, opts: PauseOptions): void {
    const win: WindowHandle = game.ui.openWindow({title: t("paused"), cls: "window-small"});
    const buttons: HTMLElement[] = [
        button(t("resume"), () => win.close(), {cls: "btn-primary"}),
        button(t("bag"), () => {
            win.close();
            opts.onInventory();
        }),
        button(t("character"), () => {
            win.close();
            opts.onCharacter();
        }),
        button(t("options"), () => openOptions(game))
    ];
    if (!opts.inDungeon) {
        buttons.push(button(t("saveGame"), () => {
            game.saveGame();
            game.ui.toast(t("saved"), ToastKind.Good);
        }));
    } else {
        buttons.push(button(t("abandonRun"), () => {
            game.ui.confirm(t("confirmAbandon"), () => {
                win.close();
                opts.onAbandon();
            });
        }, {cls: "btn-danger"}));
    }
    buttons.push(button(t("toMainMenu"), () => {
        game.saveGame();
        win.close();
        opts.onQuitToMenu();
    }));
    win.body.append(el("div", {style: {display: "flex", flexDirection: "column", gap: "8px"}}, buttons));
}
