import {AudioEngine, MusicTrack, Sfx} from "./audio-engine";
import {setLang} from "./i18n";
import {Input} from "./input";
import {loadSettings, SaveData, SettingsData, writeSave, writeSettings} from "./save-store";
import {UiLayer} from "./ui";

export interface Scene {
    readonly music: MusicTrack;
    enter(): void;
    exit(): void;
    update(dt: number): void;
    render(ctx: CanvasRenderingContext2D): void;
    /** ESC pressed while no window is open. */
    onEscape(): void;
    /** Called after the language changes so DOM texts can be rebuilt. */
    refreshTexts(): void;
}

/** Owns the canvas, the main loop, the active scene and the loaded save. */
export class Game {
    public readonly canvas: HTMLCanvasElement;
    public readonly ctx: CanvasRenderingContext2D;
    public readonly input: Input;
    public readonly audio: AudioEngine = new AudioEngine();
    public readonly ui: UiLayer;
    public settings: SettingsData;
    public save: SaveData | null = null;
    public width: number = 0;
    public height: number = 0;
    private dpr: number = 1;
    private scene: Scene | null = null;
    private lastTimestamp: number = 0;

    constructor() {
        this.canvas = document.getElementById("game") as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
        this.input = new Input(this.canvas);
        this.ui = new UiLayer(document.getElementById("ui") as HTMLElement, () => this.audio.play(Sfx.Click));
        this.settings = loadSettings();
        setLang(this.settings.lang);
        this.audio.setVolumes(this.settings.master, this.settings.music, this.settings.sfx);
        window.addEventListener("resize", () => this.resize());
        const unlock: () => void = () => this.audio.unlock();
        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);
        this.resize();
    }

    private resize(): void {
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
    }

    public start(first: Scene): void {
        this.setScene(first);
        requestAnimationFrame((ts: number) => this.loop(ts));
    }

    public setScene(scene: Scene): void {
        if (this.scene) {
            this.scene.exit();
        }
        this.ui.closeAll();
        this.ui.clearHud();
        this.input.clearAll();
        this.scene = scene;
        this.audio.playMusic(scene.music);
        scene.enter();
    }

    public saveGame(): void {
        if (this.save) {
            writeSave(this.save);
        }
    }

    public applySettings(settings: SettingsData): void {
        const langChanged: boolean = settings.lang !== this.settings.lang;
        this.settings = settings;
        writeSettings(settings);
        this.audio.setVolumes(settings.master, settings.music, settings.sfx);
        if (langChanged) {
            setLang(settings.lang);
            if (this.scene) {
                this.scene.refreshTexts();
            }
        }
    }

    public toggleFullscreen(): void {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void document.documentElement.requestFullscreen().catch((error: unknown) => console.warn("Fullscreen refused", error));
        }
    }

    private loop(timestamp: number): void {
        requestAnimationFrame((ts: number) => this.loop(ts));
        this.step(Math.min(0.05, (timestamp - this.lastTimestamp) / 1000 || 0));
        this.lastTimestamp = timestamp;
    }

    /** Advances the game by one frame. Errors are logged instead of stopping the loop. */
    public step(dt: number): void {
        try {
            if (this.save) {
                this.save.records.playTime += dt;
            }
            if (this.input.wasPressed("Escape")) {
                if (!this.ui.closeTop() && this.scene) {
                    this.scene.onEscape();
                }
            }
            if (this.scene) {
                this.scene.update(dt);
                this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
                this.ctx.imageSmoothingEnabled = true;
                this.scene.render(this.ctx);
            }
        } catch (error: unknown) {
            console.error("Frame failed", error);
        }
        this.input.endFrame();
    }
}
