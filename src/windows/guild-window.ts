import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {ALL_MISSIONS, MissionDef, MissionKey, MISSIONS} from "../data/missions";
import {claimMission, isMissionClaimed, isMissionComplete, missionProgress} from "../logic/progression";
import {diamondText, goldText, npcLine, progressBar, rerender, sectionTitle, tag} from "./window-helpers";

/** The Guild: missions and their rewards. Levels are gained instantly, so there is nothing to train here. */
export function openGuild(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("guild"), cls: "window-wide"});

    const render: () => void = () => {
        const rows: HTMLElement[] = ALL_MISSIONS.map((key: MissionKey) => {
            const def: MissionDef = MISSIONS[key];
            const progress: number = Math.min(def.target, missionProgress(save, key));
            const complete: boolean = isMissionComplete(save, key);
            const claimed: boolean = isMissionClaimed(save, key);
            const shownProgress: string = progress + "/" + def.target;
            return el("div", {cls: "row" + (complete && !claimed ? " highlight" : "") + (claimed ? " dim" : "")}, [
                el("div", {cls: "row-main"}, [
                    el("div", {cls: "row-title", text: tr(def.name)}),
                    el("div", {cls: "row-sub"}, [shownProgress]),
                    progressBar(progress, def.target)
                ]),
                el("div", {cls: "row-actions"}, [
                    def.rewardGold > 0 ? goldText(def.rewardGold) : null,
                    def.rewardDiamonds > 0 ? diamondText(def.rewardDiamonds) : null,
                    claimed ? tag(t("claimed"), "good") : button(complete ? t("claim") : t("inProgress"), () => {
                        if (claimMission(save, key)) {
                            game.audio.play(Sfx.Coin);
                            game.ui.toast(t("missionClaimed"), ToastKind.Special);
                            game.saveGame();
                            onChange();
                            render();
                        }
                    }, {cls: "btn-small btn-primary", disabled: !complete})
                ])
            ]);
        });
        rerender(win, npcLine(t("guildGreeting")), sectionTitle(t("missions")), el("div", {cls: "list"}, rows));
    };
    render();
}
