// Procedural audio: every sound effect and music track is synthesised with Web Audio.

export enum Sfx {
    Click = "click",
    Hit = "hit",
    Crit = "crit",
    Magic = "magic",
    Heal = "heal",
    Coin = "coin",
    Pickup = "pickup",
    Door = "door",
    LevelUp = "level_up",
    Buy = "buy",
    Error = "error",
    Victory = "victory",
    Defeat = "defeat",
    Dash = "dash",
    Chest = "chest",
    Status = "status",
    Unlock = "unlock",
    Swing = "swing",
    Step = "step"
}

export enum MusicTrack {
    None = "none",
    Menu = "menu",
    Town = "town",
    Dungeon = "dungeon",
    Combat = "combat",
    Boss = "boss",
    Victory = "victory",
    Arena = "arena"
}

interface TrackDef {
    bpm: number;
    lead: number[];
    bass: number[];
    leadWave: OscillatorType;
    bassWave: OscillatorType;
    leadVolume: number;
    bassVolume: number;
    /** One char per step: k = kick, s = snare, h = hat, - = nothing. */
    drums: string;
}

function midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function rep(pattern: number[], times: number): number[] {
    const copies: number[][] = new Array<number[]>(times).fill(pattern);
    return copies.flat();
}

function transpose(notes: number[], semitones: number): number[] {
    return notes.map((n: number) => (n > 0 ? n + semitones : 0));
}

const COMBAT_LEAD: number[] = [
    76, 0, 79, 0, 83, 0, 81, 79, 76, 0, 72, 0, 76, 79, 76, 0, 74, 0, 78, 0, 81, 0, 79, 78, 78, 0, 75, 0, 71, 0, 0, 0,
    88, 0, 86, 0, 83, 0, 81, 0, 84, 0, 83, 0, 79, 0, 76, 0, 81, 0, 79, 78, 79, 0, 81, 0, 83, 0, 78, 0, 75, 0, 71, 0
];
const COMBAT_BASS: number[] = rep([
    40, 40, 52, 40, 40, 52, 40, 52, 36, 36, 48, 36, 36, 48, 36, 48, 38, 38, 50, 38, 38, 50, 38, 50, 35, 35, 47, 35, 35, 47, 35, 47
], 2);

const TRACKS: Record<Exclude<MusicTrack, MusicTrack.None>, TrackDef> = {
    [MusicTrack.Menu]: {
        bpm: 72, leadWave: "triangle", bassWave: "sine", leadVolume: 0.16, bassVolume: 0.2,
        lead: [
            62, 0, 0, 69, 0, 0, 67, 0, 65, 0, 0, 64, 0, 0, 62, 0, 60, 0, 0, 67, 0, 0, 65, 0, 64, 0, 0, 0, 0, 0, 0, 0,
            69, 0, 0, 72, 0, 0, 74, 0, 72, 0, 0, 69, 0, 0, 67, 0, 65, 0, 67, 0, 69, 0, 65, 0, 62, 0, 0, 0, 0, 0, 0, 0
        ],
        bass: rep([38, 0, 0, 0, 45, 0, 0, 0, 34, 0, 0, 0, 41, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0, 33, 0, 0, 0, 40, 0, 0, 0], 2),
        drums: "----------------------------------------------------------------"
    },
    [MusicTrack.Town]: {
        bpm: 104, leadWave: "triangle", bassWave: "triangle", leadVolume: 0.15, bassVolume: 0.17,
        lead: [
            72, 0, 76, 79, 76, 0, 72, 74, 76, 0, 72, 69, 72, 0, 0, 0, 69, 0, 72, 77, 76, 74, 72, 0, 74, 0, 71, 67, 71, 74, 0, 0,
            79, 0, 77, 76, 74, 0, 72, 0, 77, 0, 76, 74, 72, 0, 69, 0, 71, 0, 74, 79, 77, 76, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0
        ],
        bass: [
            48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0, 41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 50, 0,
            48, 0, 55, 0, 48, 0, 55, 0, 41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 50, 0, 48, 0, 55, 0, 48, 0, 0, 0
        ],
        drums: "--h---h---h---h---h---h---h---h---h---h---h---h---h---h---h---h-"
    },
    [MusicTrack.Dungeon]: {
        bpm: 76, leadWave: "sine", bassWave: "triangle", leadVolume: 0.17, bassVolume: 0.2,
        lead: [
            69, 0, 72, 0, 76, 0, 72, 0, 65, 0, 69, 0, 72, 0, 69, 0, 62, 0, 65, 0, 69, 0, 65, 0, 64, 0, 68, 0, 71, 0, 68, 0,
            81, 0, 0, 79, 76, 0, 0, 0, 77, 0, 0, 76, 72, 0, 0, 0, 74, 0, 0, 72, 69, 0, 0, 0, 71, 0, 68, 0, 64, 0, 0, 0
        ],
        bass: rep([45, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 41, 0, 0, 0, 38, 0, 0, 0, 38, 0, 0, 0, 40, 0, 0, 0, 40, 0, 0, 0], 2),
        drums: "k-------------------k-------------------k-------------------k---"
    },
    [MusicTrack.Combat]: {
        bpm: 144, leadWave: "square", bassWave: "sawtooth", leadVolume: 0.07, bassVolume: 0.08,
        lead: COMBAT_LEAD,
        bass: COMBAT_BASS,
        drums: "k-h-s-h-k-h-s-hhk-h-s-h-k-h-s-hhk-h-s-h-k-h-s-hhk-h-s-h-k-hks-hh"
    },
    [MusicTrack.Boss]: {
        bpm: 156, leadWave: "sawtooth", bassWave: "square", leadVolume: 0.06, bassVolume: 0.08,
        lead: [
            74, 0, 77, 0, 81, 80, 81, 0, 82, 0, 81, 0, 77, 0, 74, 0, 79, 0, 76, 0, 72, 0, 76, 79, 81, 0, 76, 0, 73, 0, 69, 0,
            86, 0, 84, 0, 82, 0, 81, 0, 82, 81, 79, 77, 79, 0, 74, 0, 84, 0, 79, 0, 76, 0, 79, 0, 81, 0, 85, 0, 88, 0, 0, 0
        ],
        bass: rep([
            38, 38, 50, 38, 38, 50, 38, 50, 34, 34, 46, 34, 34, 46, 34, 46, 36, 36, 48, 36, 36, 48, 36, 48, 33, 33, 45, 33, 33, 45, 33, 45
        ], 2),
        drums: "k-hks-h-k-hks-hhk-hks-h-k-hks-hhk-hks-h-k-hks-hhk-hks-h-kkhksshh"
    },
    [MusicTrack.Victory]: {
        bpm: 112, leadWave: "square", bassWave: "triangle", leadVolume: 0.08, bassVolume: 0.18,
        lead: [
            67, 67, 67, 72, 0, 0, 76, 0, 79, 0, 76, 0, 79, 0, 0, 0, 77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 76, 0, 72, 0, 0, 0,
            72, 0, 76, 0, 79, 0, 84, 0, 83, 0, 79, 0, 76, 0, 79, 0, 81, 0, 79, 77, 76, 0, 74, 0, 72, 0, 0, 0, 0, 0, 0, 0
        ],
        bass: rep([48, 0, 55, 0, 48, 0, 55, 0, 43, 0, 50, 0, 43, 0, 50, 0, 41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 48, 0, 0, 0], 2),
        drums: "k---s---k---s---k---s---k-k-s---k---s---k---s---k---s---k-k-s-s-"
    },
    [MusicTrack.Arena]: {
        bpm: 150, leadWave: "square", bassWave: "sawtooth", leadVolume: 0.07, bassVolume: 0.08,
        lead: transpose(COMBAT_LEAD, 2),
        bass: transpose(COMBAT_BASS, 2),
        drums: "k-hkshh-k-hksh-hk-hkshh-k-hkshhhk-hkshh-k-hksh-hk-hkshh-kkhkshhh"
    }
};

export class AudioEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private musicGain: GainNode | null = null;
    private sfxGain: GainNode | null = null;
    private noiseBuffer: AudioBuffer | null = null;
    private volumes: {master: number; music: number; sfx: number} = {master: 0.8, music: 0.6, sfx: 0.8};

    private track: MusicTrack = MusicTrack.None;
    private step: number = 0;
    private nextStepTime: number = 0;

    /** Must be called from a user gesture before audio can play. */
    public unlock(): void {
        if (!this.ctx) {
            const ctor: typeof AudioContext | undefined = window.AudioContext;
            if (!ctor) {
                return;
            }
            this.ctx = new ctor();
            this.master = this.ctx.createGain();
            this.master.connect(this.ctx.destination);
            this.musicGain = this.ctx.createGain();
            this.musicGain.connect(this.master);
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.connect(this.master);
            this.noiseBuffer = this.createNoise();
            this.applyVolumes();
            window.setInterval(() => this.schedule(), 25);
        }
        if (this.ctx.state === "suspended") {
            void this.ctx.resume();
        }
    }

    public setVolumes(master: number, music: number, sfx: number): void {
        this.volumes = {master: master, music: music, sfx: sfx};
        this.applyVolumes();
    }

    private applyVolumes(): void {
        if (!this.ctx || !this.master || !this.musicGain || !this.sfxGain) {
            return;
        }
        this.master.gain.setTargetAtTime(this.volumes.master, this.ctx.currentTime, 0.02);
        this.musicGain.gain.setTargetAtTime(this.volumes.music, this.ctx.currentTime, 0.02);
        this.sfxGain.gain.setTargetAtTime(this.volumes.sfx, this.ctx.currentTime, 0.02);
    }

    private createNoise(): AudioBuffer {
        const ctx: AudioContext = this.ctx as AudioContext;
        const buffer: AudioBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data: Float32Array = buffer.getChannelData(0);
        for (let i: number = 0; i < data.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    // ------------------------------------------------------------ music

    public playMusic(track: MusicTrack): void {
        if (this.track === track) {
            return;
        }
        this.track = track;
        this.step = 0;
        if (this.ctx) {
            this.nextStepTime = this.ctx.currentTime + 0.1;
        }
    }

    private schedule(): void {
        if (!this.ctx || this.track === MusicTrack.None || !this.musicGain) {
            return;
        }
        const def: TrackDef = TRACKS[this.track];
        const stepDuration: number = 60 / def.bpm / 2;
        if (this.nextStepTime < this.ctx.currentTime - 0.5) {
            this.nextStepTime = this.ctx.currentTime + 0.05;
        }
        while (this.nextStepTime < this.ctx.currentTime + 0.12) {
            const i: number = this.step % def.lead.length;
            const lead: number = def.lead[i];
            if (lead > 0) {
                const nextRest: boolean = def.lead[(i + 1) % def.lead.length] === 0;
                this.tone(this.musicGain, midiToFreq(lead), this.nextStepTime, stepDuration * (nextRest ? 1.8 : 0.95), def.leadWave, def.leadVolume);
            }
            const bassIndex: number = this.step % def.bass.length;
            const bass: number = def.bass[bassIndex];
            if (bass > 0) {
                const nextRest: boolean = def.bass[(bassIndex + 1) % def.bass.length] === 0;
                this.tone(this.musicGain, midiToFreq(bass), this.nextStepTime, stepDuration * (nextRest ? 1.8 : 0.9), def.bassWave, def.bassVolume);
            }
            const drum: string = def.drums.charAt(this.step % def.drums.length);
            if (drum === "k") {
                this.kick(this.nextStepTime);
            } else if (drum === "s") {
                this.noiseHit(this.musicGain, this.nextStepTime, 0.12, 1800, 0.12);
            } else if (drum === "h") {
                this.noiseHit(this.musicGain, this.nextStepTime, 0.04, 7000, 0.05);
            }
            this.nextStepTime += stepDuration;
            this.step++;
        }
    }

    // ------------------------------------------------------------ primitives

    private tone(dest: AudioNode, freq: number, time: number, duration: number, wave: OscillatorType, volume: number, slideTo?: number): void {
        const ctx: AudioContext = this.ctx as AudioContext;
        const osc: OscillatorNode = ctx.createOscillator();
        const gain: GainNode = ctx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, time);
        if (slideTo !== undefined) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), time + duration);
        }
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(volume, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        osc.connect(gain);
        gain.connect(dest);
        osc.start(time);
        osc.stop(time + duration + 0.05);
    }

    private noiseHit(dest: AudioNode, time: number, duration: number, filterFreq: number, volume: number, filterType: BiquadFilterType = "highpass"): void {
        const ctx: AudioContext = this.ctx as AudioContext;
        const src: AudioBufferSourceNode = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter: BiquadFilterNode = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = filterFreq;
        const gain: GainNode = ctx.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        src.start(time);
        src.stop(time + duration + 0.05);
    }

    private kick(time: number): void {
        this.tone(this.musicGain as GainNode, 140, time, 0.18, "sine", 0.35, 45);
    }

    // ------------------------------------------------------------ effects

    public play(sfx: Sfx): void {
        if (!this.ctx || !this.sfxGain) {
            return;
        }
        const now: number = this.ctx.currentTime;
        const out: GainNode = this.sfxGain;
        switch (sfx) {
            case Sfx.Click:
                this.tone(out, 880, now, 0.05, "square", 0.08);
                break;
            case Sfx.Hit:
                this.noiseHit(out, now, 0.12, 900, 0.35, "lowpass");
                this.tone(out, 180, now, 0.1, "square", 0.12, 80);
                break;
            case Sfx.Crit:
                this.noiseHit(out, now, 0.2, 1200, 0.45, "lowpass");
                this.tone(out, 320, now, 0.18, "sawtooth", 0.15, 90);
                this.tone(out, 1200, now + 0.03, 0.12, "square", 0.06, 600);
                break;
            case Sfx.Magic:
                this.tone(out, 400, now, 0.3, "sine", 0.14, 1400);
                this.tone(out, 600, now + 0.05, 0.25, "triangle", 0.1, 1800);
                break;
            case Sfx.Heal:
                [0, 0.08, 0.16].forEach((d: number, i: number) => this.tone(out, [523, 659, 784][i], now + d, 0.25, "sine", 0.14));
                break;
            case Sfx.Coin:
                this.tone(out, 988, now, 0.06, "square", 0.08);
                this.tone(out, 1319, now + 0.06, 0.12, "square", 0.08);
                break;
            case Sfx.Pickup:
                this.tone(out, 660, now, 0.08, "triangle", 0.12, 990);
                break;
            case Sfx.Door:
                this.noiseHit(out, now, 0.25, 400, 0.2, "lowpass");
                this.tone(out, 110, now, 0.2, "triangle", 0.12, 70);
                break;
            case Sfx.LevelUp:
                [523, 659, 784, 1047].forEach((f: number, i: number) => this.tone(out, f, now + i * 0.09, 0.3, "square", 0.08));
                break;
            case Sfx.Buy:
                this.tone(out, 784, now, 0.07, "square", 0.08);
                this.tone(out, 1047, now + 0.07, 0.14, "square", 0.08);
                break;
            case Sfx.Error:
                this.tone(out, 200, now, 0.12, "square", 0.1);
                this.tone(out, 150, now + 0.12, 0.18, "square", 0.1);
                break;
            case Sfx.Victory:
                [523, 659, 784, 1047, 784, 1047].forEach((f: number, i: number) => this.tone(out, f, now + i * 0.1, 0.25, "square", 0.08));
                break;
            case Sfx.Defeat:
                [392, 349, 311, 262].forEach((f: number, i: number) => this.tone(out, f, now + i * 0.22, 0.4, "triangle", 0.14));
                break;
            case Sfx.Dash:
                this.noiseHit(out, now, 0.18, 2500, 0.2, "bandpass");
                break;
            case Sfx.Chest:
                [392, 523, 659, 784].forEach((f: number, i: number) => this.tone(out, f, now + i * 0.06, 0.2, "triangle", 0.12));
                break;
            case Sfx.Status:
                this.tone(out, 300, now, 0.3, "sawtooth", 0.06, 150);
                break;
            case Sfx.Unlock:
                [523, 784, 1047, 1568].forEach((f: number, i: number) => this.tone(out, f, now + i * 0.12, 0.4, "sine", 0.14));
                break;
            case Sfx.Swing:
                this.noiseHit(out, now, 0.1, 3000, 0.15, "bandpass");
                break;
            case Sfx.Step:
                this.noiseHit(out, now, 0.03, 600, 0.04, "lowpass");
                break;
        }
    }
}
