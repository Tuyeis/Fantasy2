base = 'C:/VScodeProjects/fantasy-rpg-web/src/'


def patch(path, pairs):
    s = open(base + path, encoding='utf-8').read()
    for a, b in pairs:
        assert a in s, (path, a[:70])
        s = s.replace(a, b, 1)
    open(base + path, 'w', encoding='utf-8').write(s)


# 1. Decor hugging each building: bushes and flowers at the front corners, a few flowers along the sides.
patch('scenes/town-map.ts', [(
    '''    // Lamps around the plaza.''',
    '''    // Planting around every building so it sits in the village instead of floating on the grass.
    for (const key of ALL_BUILDINGS) {
        const def: BuildingDef = BUILDINGS[key];
        const left: number = def.tx * TILE;
        const right: number = (def.tx + def.tw) * TILE;
        const bottom: number = (def.ty + def.th) * TILE;
        const spots: [number, number, DecorKind][] = [
            [left - 6, bottom - 4, DecorKind.Bush],
            [right + 6, bottom - 4, DecorKind.FlowerBush],
            [left - 10, bottom - def.th * TILE * 0.45, DecorKind.FlowerBush],
            [right + 10, bottom - def.th * TILE * 0.45, DecorKind.Bush]
        ];
        for (const [x, y, kind] of spots) {
            const tx: number = Math.floor(x / TILE);
            const ty: number = Math.floor(y / TILE);
            if (tx > 0 && ty > 0 && tx < TOWN_W && ty < TOWN_H && get(tx, ty) === TownTile.Grass) {
                decor.push({kind: kind, x: x, y: y, variant: 0});
            }
        }
    }
    // Lamps around the plaza.'''
)])

# 2. Ground: a soft trodden-earth footprint under each building.
patch('scenes/town-scene.ts', [(
    '''        for (let ty: number = 0; ty < TOWN_H; ty++) {
            for (let tx: number = 0; tx < TOWN_W; tx++) {
                if (this.map.tiles[ty * TOWN_W + tx] === TownTile.Water) {
                    rectPath(ctx, tx * TILE - 2, ty * TILE - 2, TILE + 4, TILE + 4, 10);''',
    '''        // Trodden earth under each building, feathered into the grass.
        for (const key of ALL_BUILDINGS) {
            const def: BuildingDef = BUILDINGS[key];
            const cx: number = (def.tx + def.tw / 2) * TILE;
            const cy: number = (def.ty + def.th * 0.78) * TILE;
            const rx: number = def.tw * TILE * 0.66;
            const ry: number = def.th * TILE * 0.5;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, ry / rx);
            const g: CanvasGradient = ctx.createRadialGradient(0, 0, rx * 0.35, 0, 0, rx);
            g.addColorStop(0, "rgba(120,98,66,0.75)");
            g.addColorStop(0.6, "rgba(110,92,60,0.45)");
            g.addColorStop(1, "rgba(92,110,52,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, rx, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        for (let ty: number = 0; ty < TOWN_H; ty++) {
            for (let tx: number = 0; tx < TOWN_W; tx++) {
                if (this.map.tiles[ty * TOWN_W + tx] === TownTile.Water) {
                    rectPath(ctx, tx * TILE - 2, ty * TILE - 2, TILE + 4, TILE + 4, 10);'''
), (
    '''        if (this.nearBuilding) {''',
    '''        this.drawAmbience(ctx);
        if (this.nearBuilding) {'''
), (
    '''    private drawWaterShimmer(ctx: CanvasRenderingContext2D): void {''',
    '''    /** Warm late-afternoon light over the whole village: one light source unifies grass, paintings and puppets. */
    private drawAmbience(ctx: CanvasRenderingContext2D): void {
        const w: number = TOWN_W * TILE;
        const h: number = TOWN_H * TILE;
        ctx.save();
        ctx.globalCompositeOperation = "soft-light";
        const sun: CanvasGradient = ctx.createLinearGradient(0, 0, w * 0.6, h);
        sun.addColorStop(0, "rgba(255,214,150,0.55)");
        sun.addColorStop(1, "rgba(80,90,140,0.35)");
        ctx.fillStyle = sun;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    private drawWaterShimmer(ctx: CanvasRenderingContext2D): void {'''
)])

# 3. Buildings: soft contact shadow and a slight grade so the paintings match the flat village colours.
patch('render/props.ts', [(
    '''    ctx.save();
    // The painted dioramas bring their own ground plate, no extra shadow needed.
    if (locked) {
        ctx.filter = "grayscale(0.85) brightness(0.62)";
    }
    ctx.drawImage(art, left, top, dw, dh);''',
    '''    ctx.save();
    // Soft contact shadow under the diorama plate.
    const sg: CanvasGradient = ctx.createRadialGradient(x + w / 2, y + h - 4, 4, x + w / 2, y + h - 4, w * 0.55);
    sg.addColorStop(0, "rgba(20,30,10,0.45)");
    sg.addColorStop(1, "rgba(20,30,10,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h - 4, w * 0.55, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = locked ? "grayscale(0.85) brightness(0.62)" : "saturate(0.9) brightness(0.98)";
    ctx.drawImage(art, left, top, dw, dh);'''
)])
print("town patched")
