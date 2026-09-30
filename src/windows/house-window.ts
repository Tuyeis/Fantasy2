import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t, tr} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, ToastKind, WindowHandle} from "../core/ui";
import {ALL_PERKS, PerkDef, PerkKey, PERKS} from "../data/perks";
import {perkRank} from "../logic/hero-stats";
import {canLearnPerk, learnPerk} from "../logic/progression";
import {npcLine, sectionTitle, tabBar, tag} from "./window-helpers";

enum HouseTab {
    Feats = "feats",
    Records = "records"
}

export function formatPlayTime(seconds: number): string {
    const total: number = Math.floor(seconds);
    const h: number = Math.floor(total / 3600);
    const m: number = Math.floor((total % 3600) / 60);
    const s: number = total % 60;
    return (h > 0 ? h + "h " : "") + m + "m " + s + "s";
}

export function openHouse(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("house"), cls: "window-wide"});
    let tab: HouseTab = HouseTab.Feats;

    const renderFeats: () => HTMLElement[] = () => {
        const rows: HTMLElement[] = ALL_PERKS.map((key: PerkKey) => {
            const def: PerkDef = PERKS[key];
            const rank: number = perkRank(save, key);
            const maxed: boolean = rank >= def.maxRank;
            return el("div", {cls: "row" + (rank > 0 ? " highlight" : "")}, [
                el("div", {cls: "row-main"}, [
                    el("div", {cls: "row-title"}, [tr(def.name), tag(t("rank", {r: rank, max: def.maxRank}), rank > 0 ? "good" : "")]),
                    el("div", {cls: "row-sub", text: tr(def.desc)})
                ]),
                el("div", {cls: "row-actions"}, [
                    maxed ? tag(t("maxLevel")) : button(t("learn", {cost: def.costPerRank}), () => {
                        if (learnPerk(save, key)) {
                            game.audio.play(Sfx.LevelUp);
                            game.ui.toast(t("perkLearned"), ToastKind.Special);
                            game.saveGame();
                            onChange();
                            render();
                        } else {
                            game.audio.play(Sfx.Error);
                            game.ui.toast(t("notEnoughPoints"), ToastKind.Bad);
                        }
                    }, {cls: "btn-small btn-primary", disabled: !canLearnPerk(save, key)})
                ])
            ]);
        });
        return [
            el("div", {cls: "hud-line", style: {marginBottom: "10px"}}, [el("span", {}, [t("featPoints") + ": ", el("b", {text: String(save.featPoints)})])]),
            sectionTitle(t("perks")),
            el("div", {cls: "list"}, rows)
        ];
    };

    const renderRecords: () => HTMLElement[] = () => {
        const entries: [string, string][] = [
            [t("deepestFloor"), String(save.deepestFloor)],
            [t("totalKills"), String(save.records.kills)],
            [t("bossKills"), String(save.records.bossKills)],
            [t("runsStarted"), String(save.records.runs)],
            [t("deaths"), String(save.records.deaths)],
            [t("victories"), String(save.records.victories)],
            [t("newGamePlus"), String(save.challenge)],
            [t("playTime"), formatPlayTime(save.records.playTime)]
        ];
        return [el("div", {cls: "stat-table", style: {maxWidth: "380px"}}, entries.flatMap((e: [string, string]) => [
            el("div", {cls: "label", text: e[0]}),
            el("div", {cls: "value", text: e[1]})
        ]))];
    };

    const render: () => void = () => {
        const tabs: HTMLElement = tabBar<HouseTab>([
            {key: HouseTab.Feats, label: t("feats")},
            {key: HouseTab.Records, label: t("records")}
        ], tab, (next: HouseTab) => {
            tab = next;
            render();
        });
        const scrollTop: number = win.body.scrollTop;
        win.body.replaceChildren(npcLine(t("houseGreeting")), tabs, ...(tab === HouseTab.Feats ? renderFeats() : renderRecords()));
        win.body.scrollTop = scrollTop;
        win.footer.replaceChildren(button(t("restAndSave"), () => {
            game.saveGame();
            game.audio.play(Sfx.Heal);
            game.ui.toast(t("saved"), ToastKind.Good);
        }));
    };
    render();
}
