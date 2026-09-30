import shutil
base = 'C:/VScodeProjects/fantasy-rpg-web/src/'
BK = 'C:/Users/YERBAS~1/AppData/Local/Temp/claude/C--VScodeProjects/6f06cf94-b6c1-41c5-aa89-c85955300e78/scratchpad/backup_dungeon/'
import os
os.makedirs(BK, exist_ok=True)
for f in ['scenes/dungeon-scene.ts', 'scenes/combat-scene.ts', 'main.ts']:
    shutil.copy(base + f, BK + f.replace('/', '_'))


def patch(path, pairs):
    s = open(base + path, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:80])
        s = s.replace(a, b, 1)
    open(base + path, 'w', encoding='utf-8').write(s)


# ---------------------------------------------------------------- dungeon room
patch('scenes/dungeon-scene.ts', [
    ('''        const seed: number = room.x * 31 + room.y * 17 + this.run.floor * 101;
        for (let ty: number = 0; ty < ROOM_TILES_H; ty++) {''', '''        const seed: number = room.x * 31 + room.y * 17 + this.run.floor * 101;
        const painted: HTMLImageElement | undefined = roomFloor(this.run.floor, seed);
        for (let ty: number = 0; ty < ROOM_TILES_H && !painted; ty++) {'''),
    ('''        // Walls
        ctx.fillStyle = fd.wallColor;''', '''        if (painted) {
            // One painted floor for the whole room (cover-fit), a touch darker so characters stand out.
            const scale: number = Math.max(ROOM_W / painted.width, ROOM_H / painted.height);
            const dw: number = painted.width * scale;
            const dh: number = painted.height * scale;
            ctx.drawImage(painted, (ROOM_W - dw) / 2, (ROOM_H - dh) / 2, dw, dh);
            ctx.fillStyle = "rgba(10,6,14,0.18)";
            ctx.fillRect(0, 0, ROOM_W, ROOM_H);
        }
        // Walls
        ctx.fillStyle = fd.wallColor;'''),
    ('''        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.fillRect(T, 2 * T, ROOM_W - 2 * T, 6);''', '''        // Soft contact shadow along every wall so the floor sinks into the room.
        const shadowBand: (x: number, y: number, w: number, h: number, x1: number, y1: number) => void = (x: number, y: number, w: number, h: number, x1: number, y1: number): void => {
            const g: CanvasGradient = ctx.createLinearGradient(x, y, x1, y1);
            g.addColorStop(0, "rgba(0,0,0,0.5)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(x, y, w, h);
        };
        shadowBand(T, 2 * T, ROOM_W - 2 * T, 26, T, 2 * T + 26);
        shadowBand(T, 2 * T, 18, ROOM_H - 3 * T, T + 18, 2 * T);
        shadowBand(ROOM_W - T - 18, 2 * T, 18, ROOM_H - 3 * T, ROOM_W - T - 18, 2 * T);
        shadowBand(T, ROOM_H - T - 14, ROOM_W - 2 * T, 14, T, ROOM_H - T);'''),
    ('''        // Decorative debris
        for (let i: number = 0; i < 5; i++) {''', '''        // Painted clutter in the corners (away from the middle and the doors).
        const clutter: [number, number][] = [[1.9 * T, 3 * T], [ROOM_W - 1.9 * T, 3 * T], [1.9 * T, ROOM_H - 1.6 * T], [ROOM_W - 1.9 * T, ROOM_H - 1.6 * T]];
        clutter.forEach(([cx, cy]: [number, number], i: number) => {
            const r: number = hash(i, seed, 9);
            if (r < 0.45) {
                drawProp(ctx, r < 0.22 ? DungeonProp.Bones : DungeonProp.Barrels, cx, cy, r < 0.22 ? 26 : 40);
            }
        });
        // Decorative debris
        for (let i: number = 0; i < 5; i++) {'''),
    # torches
    ('''    private drawTorches(ctx: CanvasRenderingContext2D): void {
        for (const tx of [3.5 * T, ROOM_W - 3.5 * T]) {
            const flick: number = Math.sin(this.time * 10 + tx) * 2;''', '''    private drawTorches(ctx: CanvasRenderingContext2D): void {
        for (const tx of [3.5 * T, ROOM_W - 3.5 * T]) {
            const flick: number = Math.sin(this.time * 10 + tx) * 2;
            if (propArt(DungeonProp.Torch)) {
                glow(ctx, tx, 1.1 * T, 70 + flick * 2, "#ff922b", 0.4);
                drawProp(ctx, DungeonProp.Torch, tx, 1.75 * T, 40);
                glow(ctx, tx, 0.95 * T, 14 + flick, "#ffe8a3", 0.5);
                continue;
            }'''),
    # props
    ('''drawChest(ctx, CENTER_X, CENTER_Y, room.used, this.time)''', '''(drawProp(ctx, room.used ? DungeonProp.ChestOpen : DungeonProp.Chest, CENTER_X, CENTER_Y + 8, 44) || drawChest(ctx, CENTER_X, CENTER_Y, room.used, this.time))'''),
    ('''drawCampfire(ctx, CENTER_X, CENTER_Y, !room.used, this.time)''', '''this.drawCampfireArt(ctx, !room.used)'''),
    ('''drawStairs(ctx, CENTER_X, 4 * T, this.time)''', '''(this.drawStairsArt(ctx) || drawStairs(ctx, CENTER_X, 4 * T, this.time))'''),
    ('''                drawPedestal(ctx, x, y, this.time, "#74c0fc", !room.used);''', '''                if (!drawProp(ctx, DungeonProp.Pedestal, x, y + 6, 56)) {
                    drawPedestal(ctx, x, y, this.time, "#74c0fc", !room.used);
                } else if (!room.used) {
                    glow(ctx, x, y - 40, 30 + Math.sin(this.time * 3) * 4, "#74c0fc", 0.35);
                }'''),
    ('''                drawShrine(ctx, x, y, this.time, !room.used);''', '''                if (!drawProp(ctx, DungeonProp.Shrine, x, y + 6, 64)) {
                    drawShrine(ctx, x, y, this.time, !room.used);
                } else if (!room.used) {
                    glow(ctx, x, y - 48, 34 + Math.sin(this.time * 2.5) * 5, "#74c0fc", 0.4);
                }'''),
    ('''                drawSpikes(ctx, x, y + 10, room.used);''', '''                if (!drawProp(ctx, DungeonProp.Spikes, x, y + 22, room.used ? 30 : 38)) {
                    drawSpikes(ctx, x, y + 10, room.used);
                }'''),
    ('''    private drawTorches(ctx: CanvasRenderingContext2D): void {''', '''    private drawCampfireArt(ctx: CanvasRenderingContext2D, lit: boolean): void {
        if (!drawProp(ctx, lit ? DungeonProp.Campfire : DungeonProp.CampfireOut, CENTER_X, CENTER_Y + 8, 48)) {
            drawCampfire(ctx, CENTER_X, CENTER_Y, lit, this.time);
            return;
        }
        if (lit) {
            glow(ctx, CENTER_X, CENTER_Y - 14, 70 + Math.sin(this.time * 8) * 5, "#ff922b", 0.35);
            // Rising sparks.
            for (let i: number = 0; i < 5; i++) {
                const k: number = (this.time * 0.8 + i / 5) % 1;
                ctx.fillStyle = "rgba(255,200,120," + (1 - k) + ")";
                ctx.beginPath();
                ctx.arc(CENTER_X + Math.sin(this.time * 3 + i * 2) * 8, CENTER_Y - 20 - k * 40, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    private drawStairsArt(ctx: CanvasRenderingContext2D): boolean {
        if (!propArt(DungeonProp.Stairs)) {
            return false;
        }
        glow(ctx, CENTER_X, 4 * T - 16, 56 + Math.sin(this.time * 2) * 5, "#b197fc", 0.32);
        return drawProp(ctx, DungeonProp.Stairs, CENTER_X, 4 * T + 14, 64);
    }

    private drawTorches(ctx: CanvasRenderingContext2D): void {'''),
    ('''import {drawClassHero} from "../render/class-hero";''', '''import {drawClassHero} from "../render/class-hero";
import {DungeonProp, drawProp, propArt, roomFloor} from "../render/dungeon-art";'''),
])

# ---------------------------------------------------------------- combat backdrop
patch('scenes/combat-scene.ts', [
    ('''        // Back wall + floor
        const wall: CanvasGradient = ctx.createLinearGradient(0, 0, 0, h * 0.45);''', '''        const backdrop: HTMLImageElement | undefined = battleBackdrop(fd.floor, this.isBoss);
        if (backdrop) {
            this.drawBackdrop(ctx, backdrop, w, h);
        } else {
            this.drawProceduralBackdrop(ctx, fd, w, h);
        }
        if (this.isBoss) {
            glow(ctx, this.enemyPos().x, this.enemyPos().y - 80, 260, this.monster.colors.accent, 0.18 + Math.sin(this.time * 2) * 0.05);
        }
        this.drawCombatBody(ctx, w, h);
    }

    /** Painted battle background, cover-fit, with living light: flickering warm light, drifting motes, floor vignette. */
    private drawBackdrop(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
        const scale: number = Math.max((w + 40) / img.width, (h + 40) / img.height);
        const dw: number = img.width * scale;
        const dh: number = img.height * scale;
        // Slow parallax sway gives the room some air.
        const sway: number = Math.sin(this.time * 0.25) * 6;
        ctx.drawImage(img, (w - dw) / 2 + sway, (h - dh) / 2, dw, dh);
        ctx.fillStyle = "rgba(255,170,90," + (0.03 + Math.sin(this.time * 7) * 0.012) + ")";
        ctx.fillRect(-20, -20, w + 40, h + 40);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i: number = 0; i < 28; i++) {
            const k: number = (this.time * (0.03 + (i % 5) * 0.008) + i * 0.137) % 1;
            const x: number = ((i * 97.3) % w + Math.sin(this.time * 0.6 + i) * 20 + w) % w;
            const y: number = h * (1 - k);
            ctx.fillStyle = "rgba(255,230,190," + (0.25 * Math.sin(k * Math.PI)) + ")";
            ctx.beginPath();
            ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        const v: CanvasGradient = ctx.createRadialGradient(w / 2, h * 0.62, h * 0.25, w / 2, h * 0.62, Math.max(w, h) * 0.75);
        v.addColorStop(0, "rgba(0,0,0,0)");
        v.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = v;
        ctx.fillRect(-20, -20, w + 40, h + 40);
    }

    private drawProceduralBackdrop(ctx: CanvasRenderingContext2D, fd: FloorDef, w: number, h: number): void {
        // Back wall + floor
        const wall: CanvasGradient = ctx.createLinearGradient(0, 0, 0, h * 0.45);'''),
    ('''            ctx.fillStyle = "#6b4226";
            ctx.fillRect(tx - 3, h * 0.28, 6, 16);
        }
        if (this.isBoss) {
            glow(ctx, this.enemyPos().x, this.enemyPos().y - 80, 260, this.monster.colors.accent, 0.18 + Math.sin(this.time * 2) * 0.05);
        }
''', '''            ctx.fillStyle = "#6b4226";
            ctx.fillRect(tx - 3, h * 0.28, 6, 16);
        }
    }

    private drawCombatBody(ctx: CanvasRenderingContext2D, w: number, h: number): void {
'''),
    ('''import {drawClassHero} from "../render/class-hero";''', '''import {drawClassHero} from "../render/class-hero";
import {battleBackdrop} from "../render/dungeon-art";'''),
])

patch('main.ts', [
    ('''import {preloadArt} from "./render/art-assets";''', '''import {preloadArt} from "./render/art-assets";
import {preloadDungeonArt} from "./render/dungeon-art";'''),
    ('''Promise.all([preloadArt(), preloadAbilityIcons(),''', '''Promise.all([preloadArt(), preloadAbilityIcons(), preloadDungeonArt(),'''),
])
print("dungeon patched")
