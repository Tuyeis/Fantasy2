p = 'C:/VScodeProjects/fantasy-rpg-web/src/scenes/town-scene.ts'
s = open(p, encoding='utf-8').read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b, 1)


rep('''                if ((tile === TownTile.Grass || tile === TownTile.Water) && !grassTex) {
                    ctx.fillStyle = shade("#5c9e3e", (n - 0.5) * 0.12);
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = "rgba(30,70,20,0.35)";''', '''                if ((tile === TownTile.Grass || tile === TownTile.Water) && !grassTex) {
                    // Olive grass like the ground plates of the painted buildings; large-scale variation comes later.
                    ctx.fillStyle = "#7aa446";
                    ctx.fillRect(x, y, TILE, TILE);
                    ctx.strokeStyle = "rgba(52,78,24,0.3)";''')
rep('''        // Paths & plaza drawn with soft edges on top of grass.''', '''        // Painterly light and shade patches instead of a per-tile checkerboard.
        if (!grassTex) {
            for (let i: number = 0; i < 140; i++) {
                const px: number = hash(i, 17) * TOWN_W * TILE;
                const py: number = hash(i, 29) * TOWN_H * TILE;
                const r: number = (2 + hash(i, 41) * 5) * TILE;
                const light: boolean = hash(i, 53) > 0.5;
                const g: CanvasGradient = ctx.createRadialGradient(px, py, 0, px, py, r);
                g.addColorStop(0, light ? "rgba(196,214,110,0.22)" : "rgba(46,86,34,0.2)");
                g.addColorStop(1, light ? "rgba(196,214,110,0)" : "rgba(46,86,34,0)");
                ctx.fillStyle = g;
                ctx.fillRect(px - r, py - r, r * 2, r * 2);
            }
        }
        // Paths & plaza drawn with soft edges on top of grass.''')
rep('''            g.addColorStop(0, "rgba(120,98,66,0.75)");
            g.addColorStop(0.6, "rgba(110,92,60,0.45)");''', '''            g.addColorStop(0, "rgba(128,104,68,0.9)");
            g.addColorStop(0.55, "rgba(118,98,62,0.6)");''')
open(p, 'w', encoding='utf-8').write(s)
print('grass patched')
