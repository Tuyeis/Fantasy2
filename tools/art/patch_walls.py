p = 'C:/VScodeProjects/fantasy-rpg-web/src/scenes/dungeon-scene.ts'
s = open(p, encoding='utf-8').read()
a = '''        // Soft contact shadow along every wall so the floor sinks into the room.'''
assert a in s
s = s.replace(a, '''        if (painted) {
            this.paintWalls(ctx, painted, fd);
        }
        // Soft contact shadow along every wall so the floor sinks into the room.''', 1)
a = '''    private drawCampfireArt(ctx: CanvasRenderingContext2D, lit: boolean): void {'''
assert a in s
s = s.replace(a, '''    /** Stone walls made from the floor painting of the same floor (darker, smaller blocks), so walls and floor match. */
    private paintWalls(ctx: CanvasRenderingContext2D, painted: HTMLImageElement, fd: FloorDef): void {
        const tex: CanvasPattern | null = ctx.createPattern(painted, "repeat");
        if (!tex) {
            return;
        }
        tex.setTransform(new DOMMatrix().scaleSelf(0.28, 0.28));
        const regions: [number, number, number, number][] = [[0, 0, ROOM_W, 2 * T], [0, 0, T, ROOM_H], [ROOM_W - T, 0, T, ROOM_H], [0, ROOM_H - T, ROOM_W, T]];
        ctx.save();
        ctx.fillStyle = tex;
        for (const [x, y, w, h] of regions) {
            ctx.fillRect(x, y, w, h);
        }
        // Wall tops (seen from above) are dark; the north wall face catches the torch light.
        ctx.fillStyle = "rgba(8,5,12,0.62)";
        for (const [x, y, w, h] of regions) {
            ctx.fillRect(x, y, w, h);
        }
        const face: CanvasGradient = ctx.createLinearGradient(0, 0.9 * T, 0, 2 * T);
        face.addColorStop(0, "rgba(0,0,0,0.1)");
        face.addColorStop(1, "rgba(0,0,0,0.45)");
        ctx.fillStyle = tex;
        ctx.fillRect(T, 0.9 * T, ROOM_W - 2 * T, 1.1 * T);
        ctx.fillStyle = face;
        ctx.fillRect(T, 0.9 * T, ROOM_W - 2 * T, 1.1 * T);
        ctx.fillStyle = shade(fd.wallTop, -0.2);
        ctx.globalAlpha = 0.25;
        ctx.fillRect(T, 0.9 * T, ROOM_W - 2 * T, 1.1 * T);
        ctx.globalAlpha = 1;
        // Rim light along the inner edge of the walls.
        ctx.strokeStyle = "rgba(255,220,170,0.18)";
        ctx.lineWidth = 2;
        ctx.strokeRect(T + 1, 0.9 * T + 1, ROOM_W - 2 * T - 2, ROOM_H - 1.9 * T - 2);
        ctx.restore();
    }

    private drawCampfireArt(ctx: CanvasRenderingContext2D, lit: boolean): void {''', 1)
open(p, 'w', encoding='utf-8').write(s)
print('walls patched')
