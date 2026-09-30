import {Game} from "../core/game";
import {Lang, t, UiKey} from "../core/i18n";
import {SettingsData} from "../core/save-store";
import {button, el, WindowHandle} from "../core/ui";

const LANG_NAMES: Record<Lang, string> = {
    [Lang.Es]: "Español",
    [Lang.En]: "English",
    [Lang.De]: "Deutsch"
};

type VolumeKey = "master" | "music" | "sfx";

export function openOptions(game: Game): void {
    const win: WindowHandle = game.ui.openWindow({title: t("options"), cls: "window-small"});
    const render: () => void = () => {
        win.setTitle(t("options"));
        const langRow: HTMLElement = el("div", {cls: "option-row"}, [
            el("label", {text: t("language")}),
            el("div", {cls: "lang-buttons"}, (Object.values(Lang) as Lang[]).map((lang: Lang) => {
                const b: HTMLButtonElement = button(LANG_NAMES[lang], () => {
                    const next: SettingsData = {...game.settings, lang: lang};
                    game.applySettings(next);
                    render();
                }, {cls: "btn-small" + (game.settings.lang === lang ? " active" : "")});
                return b;
            }))
        ]);
        const slider: (key: VolumeKey, label: UiKey) => HTMLElement = (key: VolumeKey, label: UiKey) => {
            const input: HTMLInputElement = el("input");
            input.type = "range";
            input.min = "0";
            input.max = "100";
            input.value = String(Math.round(game.settings[key] * 100));
            const valueLabel: HTMLElement = el("span", {cls: "muted", text: input.value + "%", style: {width: "44px", textAlign: "right"}});
            input.addEventListener("input", () => {
                valueLabel.textContent = input.value + "%";
                const next: SettingsData = {...game.settings};
                next[key] = Number(input.value) / 100;
                game.applySettings(next);
            });
            return el("div", {cls: "option-row"}, [el("label", {text: t(label)}), input, valueLabel]);
        };
        const fullscreenRow: HTMLElement = el("div", {cls: "option-row"}, [
            el("label", {text: t("fullscreen")}),
            button(document.fullscreenElement ? t("on") : t("off"), () => {
                game.toggleFullscreen();
                window.setTimeout(render, 250);
            }, {cls: "btn-small"})
        ]);
        win.body.replaceChildren(
            langRow,
            slider("master", "masterVolume"),
            slider("music", "musicVolume"),
            slider("sfx", "sfxVolume"),
            fullscreenRow
        );
        win.footer.replaceChildren(button(t("close"), () => win.close(), {cls: "btn-primary"}));
    };
    render();
}
