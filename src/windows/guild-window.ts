import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {ClassDef, CLASSES} from "../data/hero-classes";
import {ALL_MISSIONS, MissionDef, MissionKey, MISSIONS} from "../data/missions";
import {ALL_STATS, StatKey, statLabel} from "../data/stat-block";
import {MAX_LEVEL, xpToNext} from "../logic/hero-stats";
import {canLevelUp, claimMission, isMissionClaimed, isMissionComplete, levelUp, missionProgress} from "../logic/progression";
import {diamondText, goldText, npcLine, progressBar, sectionTitle, tabBar, tag} from "./window-helpers";

enum GuildTab {
    Level = "level",
    Missions = "missions"
}

export function openGuild(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("guild"), cls: "window-wide"});
    let tab: GuildTab = GuildTab.Level;

    const doLevelUp: (all: boolean) => void = (all: boolean) => {
        let gained: number = 0;
        while (levelUp(save)) {
            gained++;
            if (!all) {
                break;
            }
        }
        if (gained > 0) {
            game.audio.play(Sfx.LevelUp);
            game.ui.toast(t("levelUpDone", {level: save.hero.level}), ToastKind.Special);
            game.saveGame();
            onChange();
        } else {
            game.audio.play(Sfx.Error);
            game.ui.toast(t("notEnoughXp"), ToastKind.Bad);
        }
        render();
    };

    const renderLevel: () => HTMLElement[] = () => {
        const cls: ClassDef = CLASSES[save.hero.classKey];
        const need: number = xpToNext(save.hero.level);
        const atCap: boolean = save.hero.level >= MAX_LEVEL;
        const growth: HTMLElement = el("div", {cls: "stat-table"}, ALL_STATS.flatMap((key: StatKey) => [
            el("div", {cls: "label", text: statLabel(key)}),
            el("div", {cls: "value good-text", text: "+" + cls.growth[key]})
        ]));
        return [
            sectionTitle(t("level") + " " + save.hero.level + " · " + tr(cls.name)),
            el("div", {}, [
                el("div", {cls: "hud-line"}, [
                    el("span", {}, [t("xpPending") + ": ", el("b", {text: String(save.hero.xp)})]),
                    atCap ? tag(t("levelCap")) : el("span", {cls: "muted", text: t("xpNeeded", {xp: need, level: save.hero.level + 1})})
                ]),
                progressBar(save.hero.xp, atCap ? 1 : need)
            ]),
            el("div", {style: {display: "flex", gap: "8px", margin: "12px 0"}}, [
                button(t("levelUp"), () => doLevelUp(false), {cls: "btn-primary", disabled: !canLevelUp(save)}),
                button(t("levelUpAll"), () => doLevelUp(true), {disabled: !canLevelUp(save)})
            ]),
            sectionTitle(t("growthPreview", {cls: tr(cls.name)})),
            growth
        ];
    };

    const renderMissions: () => HTMLElement[] = () => {
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
        return [el("div", {cls: "list"}, rows)];
    };

    const render: () => void = () => {
        const tabs: HTMLElement = tabBar<GuildTab>([
            {key: GuildTab.Level, label: t("levelUp")},
            {key: GuildTab.Missions, label: t("missions")}
        ], tab, (next: GuildTab) => {
            tab = next;
            render();
        });
        const scrollTop: number = win.body.scrollTop;
        win.body.replaceChildren(npcLine(t("guildGreeting")), tabs, ...(tab === GuildTab.Level ? renderLevel() : renderMissions()));
        win.body.scrollTop = scrollTop;
    };
    render();
}
