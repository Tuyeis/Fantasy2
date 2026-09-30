import {CompanionKey, COMPANIONS, CompanionDef} from "../data/companions";
import {MonsterBody, MonsterDef, MonsterKey} from "../data/monsters";
import {ellipsePath, fillStroke, glow, OUTLINE, polyPath, rectPath, shade, shadow} from "./draw-utils";
import {drawMonsterSprite, getMonsterSprite, MonsterSprite} from "./monster-art";
import {PUPPET_BODY_HEIGHT, puppetActor} from "./class-hero";
import {actionDuration} from "./puppet/puppet-actor";
import {getPuppet} from "./puppet/puppet-loader";
import {Puppet, PuppetAction, PuppetView} from "./puppet/puppet-types";

export interface MonsterPose {
    scale: number;
    facing: number;
    time: number;
    flash: number;
    armored: boolean;
    /** 0..1 attack lunge progress for a small squash. */
    attack: number;
    /** Walking (puppets step, sprites bob). */
    moving?: boolean;
    walk?: number;
}

export function defaultMonsterPose(partial: Partial<MonsterPose> = {}): MonsterPose {
    return {scale: 1, facing: -1, time: 0, flash: 0, armored: false, attack: 0, ...partial};
}

interface Palette {
    main: string;
    dark: string;
    accent: string;
}

function eyes(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, r: number, pupil: string = OUTLINE, white: string = "#fff"): void {
    for (const ex of [x1, x2]) {
        ellipsePath(ctx, ex, y, r, r * 1.15);
        fillStroke(ctx, white, 1);
        ellipsePath(ctx, ex + r * 0.3, y, r * 0.5, r * 0.6);
        ctx.fillStyle = pupil;
        ctx.fill();
    }
}

/** (x, y) are the feet. Monsters face left by default (towards the hero). */
export function drawMonster(ctx: CanvasRenderingContext2D, x: number, y: number, def: MonsterDef, pose: MonsterPose): void {
    const s: number = pose.scale * def.size;
    if (drawPaintedMonster(ctx, x, y, def, pose, s)) {
        return;
    }
    ctx.save();
    ctx.translate(x, y);
    shadow(ctx, 0, 0, 16 * s, 5 * s);
    ctx.scale(-pose.facing * s, s);
    if (pose.flash > 0) {
        ctx.filter = "brightness(" + (1 + pose.flash * 2.5) + ")";
    }
    const pal: Palette = def.colors;
    const t: number = pose.time;
    switch (def.body) {
        case MonsterBody.Blob:
            drawBlob(ctx, pal, t);
            break;
        case MonsterBody.Mushroom:
            drawMushroom(ctx, pal, t);
            break;
        case MonsterBody.Beast:
            drawBeast(ctx, pal, t, def.key === MonsterKey.Rat);
            break;
        case MonsterBody.Flyer:
            drawFlyer(ctx, pal, t, def.key);
            break;
        case MonsterBody.Humanoid:
            drawHumanoid(ctx, pal, t, def.key);
            break;
        case MonsterBody.Spider:
            drawSpider(ctx, pal, t);
            break;
        case MonsterBody.Wisp:
            drawWisp(ctx, pal, t, def.key === MonsterKey.Wraith);
            break;
        case MonsterBody.Golem:
            drawGolem(ctx, pal, t);
            break;
        case MonsterBody.Dragon:
            drawDragon(ctx, pal, t, def.key === MonsterKey.VoidSovereign);
            break;
        case MonsterBody.Hydra:
            drawHydra(ctx, pal, t);
            break;
    }
    if (pose.armored) {
        drawArmor(ctx, def.body);
    }
    ctx.restore();
}

// Local coordinate system: facing RIGHT (+x), feet at y = 0, ~40 units tall.

function drawBlob(ctx: CanvasRenderingContext2D, pal: Palette, t: number): void {
    const squash: number = Math.sin(t * 4) * 0.07;
    ctx.save();
    ctx.scale(1 + squash, 1 - squash);
    ctx.beginPath();
    ctx.moveTo(-17, 0);
    ctx.quadraticCurveTo(-19, -27, 0, -28);
    ctx.quadraticCurveTo(19, -27, 17, 0);
    ctx.closePath();
    fillStroke(ctx, pal.main, 2);
    ellipsePath(ctx, -6, -19, 5, 3, -0.5);
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    eyes(ctx, 1, 9, -14, 3.2);
    ctx.beginPath();
    ctx.arc(6, -8, 3, 0.1, Math.PI - 0.1);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
}

function drawMushroom(ctx: CanvasRenderingContext2D, pal: Palette, t: number): void {
    const bob: number = Math.sin(t * 3) * 1;
    rectPath(ctx, -8, -17, 16, 17, 5);
    fillStroke(ctx, "#fff0dc");
    eyes(ctx, 0, 6, -10, 2.2);
    ctx.save();
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.ellipse(0, -17, 20, 15, 0, Math.PI, 0);
    ctx.closePath();
    fillStroke(ctx, pal.main, 2);
    for (const [sx, sy, r] of [[-9, -24, 3], [2, -28, 3.5], [10, -21, 2.5], [-2, -20, 2]] as [number, number, number][]) {
        ellipsePath(ctx, sx, sy, r, r * 0.8);
        ctx.fillStyle = pal.accent;
        ctx.fill();
    }
    ctx.restore();
}

function drawBeast(ctx: CanvasRenderingContext2D, pal: Palette, t: number, thinTail: boolean): void {
    const step: number = Math.sin(t * 8) * 2;
    // Tail
    ctx.beginPath();
    ctx.moveTo(-15, -13);
    ctx.quadraticCurveTo(-27, -18 + Math.sin(t * 5) * 3, -26, -27);
    ctx.lineWidth = thinTail ? 3.5 : 8;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = thinTail ? 1.8 : 6;
    ctx.strokeStyle = thinTail ? pal.accent : pal.main;
    ctx.stroke();
    // Legs
    for (const [lx, phase] of [[-11, 1], [-5, -1], [6, -1], [12, 1]] as [number, number][]) {
        rectPath(ctx, lx - 2, -8 + (phase * step > 0 ? -1 : 0), 4.5, 8, 1.5);
        fillStroke(ctx, pal.dark, 1.2);
    }
    ellipsePath(ctx, 0, -13, 17, 8.5);
    fillStroke(ctx, pal.main, 2);
    // Head
    ellipsePath(ctx, 16, -19, 8, 7.5);
    fillStroke(ctx, pal.main, 1.8);
    ellipsePath(ctx, 23, -16, 5, 3.6);
    fillStroke(ctx, shade(pal.main, 0.2), 1.4);
    ellipsePath(ctx, 27.5, -16.5, 1.6, 1.4);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
    polyPath(ctx, [11, -24, 12, -32, 17, -26]);
    fillStroke(ctx, pal.main, 1.4);
    ellipsePath(ctx, 18, -21, 1.8, 2);
    ctx.fillStyle = thinTail ? "#e03131" : pal.accent;
    ctx.fill();
}

function drawFlyer(ctx: CanvasRenderingContext2D, pal: Palette, t: number, key: MonsterKey): void {
    const hover: number = Math.sin(t * 3) * 3 - 12;
    const flap: number = Math.sin(t * 12);
    ctx.save();
    ctx.translate(0, hover);
    const feathered: boolean = key === MonsterKey.Harpy;
    // Wings
    for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.rotate(flap * 0.4);
        ctx.beginPath();
        ctx.moveTo(3, -20);
        ctx.quadraticCurveTo(22, -40, 30, -22);
        if (feathered) {
            ctx.lineTo(24, -18);
            ctx.lineTo(26, -12);
            ctx.lineTo(18, -12);
        } else {
            ctx.quadraticCurveTo(22, -20, 20, -12);
            ctx.quadraticCurveTo(14, -18, 8, -12);
        }
        ctx.closePath();
        fillStroke(ctx, feathered ? pal.main : pal.dark, 1.6);
        ctx.restore();
    }
    ellipsePath(ctx, 0, -18, 10, 11);
    fillStroke(ctx, pal.main, 2);
    if (key === MonsterKey.FireImp) {
        polyPath(ctx, [-6, -27, -8, -35, -2, -28]);
        fillStroke(ctx, pal.accent, 1.2);
        polyPath(ctx, [6, -27, 8, -35, 2, -28]);
        fillStroke(ctx, pal.accent, 1.2);
        glow(ctx, 0, -18, 22, pal.main, 0.35);
    }
    if (feathered) {
        ellipsePath(ctx, 2, -28, 7, 7);
        fillStroke(ctx, pal.accent, 1.6);
        ctx.beginPath();
        ctx.arc(2, -29, 7, Math.PI, 0);
        ctx.fillStyle = pal.dark;
        ctx.fill();
        eyes(ctx, 3, 7, -28, 1.7);
    } else {
        eyes(ctx, 1, 7, -20, 2.6, key === MonsterKey.Bat ? "#e03131" : OUTLINE);
        if (key === MonsterKey.Bat) {
            polyPath(ctx, [-6, -26, -5, -34, -1, -28]);
            fillStroke(ctx, pal.main, 1.2);
            polyPath(ctx, [6, -26, 5, -34, 1, -28]);
            fillStroke(ctx, pal.main, 1.2);
            ctx.fillStyle = "#fff";
            ctx.fillRect(3, -14, 1.5, 3);
        }
    }
    ctx.restore();
}

function drawHumanoid(ctx: CanvasRenderingContext2D, pal: Palette, t: number, key: MonsterKey): void {
    const breath: number = Math.sin(t * 2.4) * 0.8;
    const floating: boolean = key === MonsterKey.Lich;
    ctx.save();
    if (floating) {
        ctx.translate(0, -4 + Math.sin(t * 2) * 2);
    }
    const skin: string = pal.main;
    const cloth: string = key === MonsterKey.Skeleton ? "#5c5f66" : pal.dark;

    // Wings / cape / tail behind.
    if (key === MonsterKey.Succubus) {
        for (const side of [-1, 1]) {
            ctx.save();
            ctx.scale(side, 1);
            ctx.rotate(Math.sin(t * 3) * 0.15);
            polyPath(ctx, [2, -28, 20, -44, 26, -26, 18, -30, 14, -20]);
            fillStroke(ctx, pal.accent, 1.4);
            ctx.restore();
        }
    }
    if (key === MonsterKey.GoblinKing) {
        polyPath(ctx, [-8, -27, 8, -27, 13, -2, -14, -2]);
        fillStroke(ctx, "#c92a2a");
    }

    // Legs / robe.
    if (floating) {
        polyPath(ctx, [-10, -26, 10, -26, 13, 0, 6, -4, 0, 1, -6, -4, -13, 0]);
        fillStroke(ctx, cloth);
    } else {
        const step: number = Math.sin(t * 5) * 1.2;
        rectPath(ctx, -7 + step, -12, 6, 12, 2);
        fillStroke(ctx, shade(cloth, -0.2));
        rectPath(ctx, 1 - step, -12, 6, 12, 2);
        fillStroke(ctx, shade(cloth, -0.2));
    }

    // Body.
    rectPath(ctx, -10, -29 + breath, 20, 19, 6);
    fillStroke(ctx, key === MonsterKey.Skeleton || key === MonsterKey.Zombie ? cloth : key === MonsterKey.DarkKnight ? pal.main : cloth);
    if (key === MonsterKey.Skeleton) {
        ctx.strokeStyle = "#f1f3f5";
        ctx.lineWidth = 1.6;
        for (let i: number = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-6, -25 + i * 4 + breath);
            ctx.lineTo(6, -25 + i * 4 + breath);
            ctx.stroke();
        }
    }
    if (key === MonsterKey.Orc || key === MonsterKey.Minotaur || key === MonsterKey.Goblin || key === MonsterKey.GoblinKing) {
        rectPath(ctx, -10, -16 + breath, 20, 3, 0);
        ctx.fillStyle = pal.accent;
        ctx.fill();
    }

    // Head.
    const hy: number = -37 + breath;
    if (key === MonsterKey.Goblin || key === MonsterKey.GoblinKing) {
        polyPath(ctx, [5, hy, 18, hy - 6, 8, hy + 4]);
        fillStroke(ctx, skin, 1.3);
        polyPath(ctx, [-5, hy, -18, hy - 6, -8, hy + 4]);
        fillStroke(ctx, skin, 1.3);
    }
    if (key === MonsterKey.Lich) {
        ctx.beginPath();
        ctx.arc(0, hy, 11, Math.PI * 0.8, Math.PI * 2.2);
        ctx.lineTo(10, hy + 9);
        ctx.lineTo(-10, hy + 9);
        ctx.closePath();
        fillStroke(ctx, cloth);
        ellipsePath(ctx, 2, hy + 1, 7, 7.5);
        fillStroke(ctx, "#e9ecef", 1.4);
        ellipsePath(ctx, 0, hy, 1.8, 2.2);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        ellipsePath(ctx, 5, hy, 1.8, 2.2);
        ctx.fill();
        glow(ctx, 3, hy, 10, pal.accent, 0.4);
    } else if (key === MonsterKey.DarkKnight) {
        ctx.beginPath();
        ctx.arc(0, hy, 10.5, Math.PI, 0);
        ctx.lineTo(10.5, hy + 8);
        ctx.lineTo(-10.5, hy + 8);
        ctx.closePath();
        fillStroke(ctx, pal.main);
        ctx.fillStyle = pal.accent;
        ctx.fillRect(1, hy - 1, 9, 2.5);
        glow(ctx, 6, hy, 9, pal.accent, 0.5);
        polyPath(ctx, [-6, hy - 9, -10, hy - 18, -2, hy - 10]);
        fillStroke(ctx, pal.main, 1.2);
    } else {
        ellipsePath(ctx, 0, hy, 9.5, 9.5);
        fillStroke(ctx, skin);
        const pupil: string = key === MonsterKey.Skeleton || key === MonsterKey.Zombie ? "#e03131" : OUTLINE;
        if (key === MonsterKey.Skeleton) {
            ellipsePath(ctx, 2.5, hy, 2.4, 2.8);
            ctx.fillStyle = OUTLINE;
            ctx.fill();
            ellipsePath(ctx, 7, hy, 2.4, 2.8);
            ctx.fill();
            ctx.fillStyle = pupil;
            ctx.fillRect(2, hy, 1.2, 1.2);
            ctx.fillRect(6.5, hy, 1.2, 1.2);
        } else {
            ctx.fillStyle = key === MonsterKey.Succubus ? "#ffd43b" : pupil;
            ctx.fillRect(2.5, hy - 1, 2, 3);
            ctx.fillRect(6.5, hy - 1, 2, 3);
        }
        if (key === MonsterKey.Orc) {
            polyPath(ctx, [4, hy + 5, 5, hy + 1, 6, hy + 5]);
            fillStroke(ctx, "#fff", 0.8);
            polyPath(ctx, [8, hy + 5, 9, hy + 1, 10, hy + 5]);
            fillStroke(ctx, "#fff", 0.8);
        }
        if (key === MonsterKey.Minotaur) {
            ellipsePath(ctx, 9, hy + 3, 4, 3);
            fillStroke(ctx, shade(skin, 0.25), 1.2);
            for (const side of [-1, 1]) {
                ctx.beginPath();
                ctx.moveTo(side * 6, hy - 6);
                ctx.quadraticCurveTo(side * 16, hy - 8, side * 14, hy - 18);
                ctx.lineWidth = 4.5;
                ctx.strokeStyle = OUTLINE;
                ctx.stroke();
                ctx.lineWidth = 2.8;
                ctx.strokeStyle = pal.accent;
                ctx.stroke();
            }
        }
        if (key === MonsterKey.Succubus) {
            ctx.beginPath();
            ctx.arc(0, hy, 9.5, Math.PI * 1.0, Math.PI * 1.9);
            ctx.lineTo(-10, hy + 10);
            ctx.closePath();
            fillStroke(ctx, pal.accent, 1.2);
            for (const side of [-1, 1]) {
                polyPath(ctx, [side * 4, hy - 8, side * 8, hy - 16, side * 7, hy - 7]);
                fillStroke(ctx, "#343a40", 1.1);
            }
        }
        if (key === MonsterKey.GoblinKing) {
            polyPath(ctx, [-8, hy - 7, -8, hy - 15, -4, hy - 11, 0, hy - 17, 4, hy - 11, 8, hy - 15, 8, hy - 7]);
            fillStroke(ctx, pal.accent, 1.3);
        }
        if (key === MonsterKey.Zombie) {
            ctx.fillStyle = shade(skin, -0.3);
            ctx.fillRect(-5, hy - 6, 4, 3);
        }
    }

    // Arm + weapon.
    ctx.save();
    const zombieArms: boolean = key === MonsterKey.Zombie;
    ctx.translate(7, -26 + breath);
    ctx.rotate(zombieArms ? -1.45 : -0.3 + Math.sin(t * 2) * 0.1);
    rectPath(ctx, -2.5, 0, 5, 12, 2);
    fillStroke(ctx, zombieArms ? skin : cloth, 1.3);
    ellipsePath(ctx, 0, 13, 3, 3);
    fillStroke(ctx, skin, 1.2);
    ctx.translate(0, 13);
    if (key === MonsterKey.Goblin || key === MonsterKey.GoblinKing) {
        ctx.rotate(-2.5);
        rectPath(ctx, -2.5, 0, 5, 16, 2.5);
        fillStroke(ctx, key === MonsterKey.GoblinKing ? pal.accent : "#8d5a3a", 1.3);
    } else if (key === MonsterKey.Orc || key === MonsterKey.Minotaur) {
        ctx.rotate(-2.6);
        rectPath(ctx, -1.5, 0, 3, 22, 1);
        fillStroke(ctx, "#6b4226", 1.2);
        ctx.beginPath();
        ctx.moveTo(1, 16);
        ctx.quadraticCurveTo(12, 19, 1, 26);
        ctx.closePath();
        fillStroke(ctx, "#ced4da", 1.3);
    } else if (key === MonsterKey.Skeleton || key === MonsterKey.DarkKnight) {
        ctx.rotate(-2.4);
        rectPath(ctx, -1.8, 2, 3.6, 22, 1);
        fillStroke(ctx, key === MonsterKey.DarkKnight ? "#343a40" : "#adb5bd", 1.2);
        rectPath(ctx, -4.5, 0, 9, 3, 1);
        fillStroke(ctx, pal.accent, 1.1);
    } else if (key === MonsterKey.Lich) {
        ctx.rotate(-0.1);
        rectPath(ctx, -1.6, -28, 3.2, 38, 1.5);
        fillStroke(ctx, "#343a40", 1.2);
        glow(ctx, 0, -31, 12, pal.accent, 0.6);
        ellipsePath(ctx, 0, -31, 4.5, 4.5);
        fillStroke(ctx, pal.accent, 1.2);
    } else if (key === MonsterKey.Succubus) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(14, 6 + Math.sin(t * 4) * 4, 22, -4);
        ctx.lineWidth = 2;
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
}

function drawSpider(ctx: CanvasRenderingContext2D, pal: Palette, t: number): void {
    ctx.strokeStyle = OUTLINE;
    for (let i: number = 0; i < 4; i++) {
        for (const side of [-1, 1]) {
            const wiggle: number = Math.sin(t * 10 + i * 1.3 + side) * 2;
            ctx.beginPath();
            ctx.moveTo(4, -12);
            ctx.lineTo(4 + side * 6 + (i - 1.5) * 7, -22 + wiggle);
            ctx.lineTo(4 + side * 3 + (i - 1.5) * 11, 0);
            ctx.lineWidth = 3.4;
            ctx.strokeStyle = OUTLINE;
            ctx.stroke();
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = pal.dark;
            ctx.stroke();
        }
    }
    ellipsePath(ctx, -9, -15, 13, 11);
    fillStroke(ctx, pal.main, 2);
    polyPath(ctx, [-12, -20, -9, -13, -6, -20, -9, -24]);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ellipsePath(ctx, 9, -13, 8, 7);
    fillStroke(ctx, pal.dark, 1.8);
    for (const [ex, ey] of [[11, -15], [14, -14], [12, -12], [15, -11.5]] as [number, number][]) {
        ellipsePath(ctx, ex, ey, 1.3, 1.3);
        ctx.fillStyle = pal.accent;
        ctx.fill();
    }
}

function drawWisp(ctx: CanvasRenderingContext2D, pal: Palette, t: number, ghost: boolean): void {
    const hover: number = Math.sin(t * 2.5) * 3 - 8;
    ctx.save();
    ctx.translate(0, hover);
    glow(ctx, 0, -18, 30, pal.accent, 0.35);
    if (ghost) {
        ctx.beginPath();
        ctx.moveTo(-13, -4);
        ctx.quadraticCurveTo(-15, -36, 0, -38);
        ctx.quadraticCurveTo(15, -36, 13, -4);
        for (let i: number = 0; i < 4; i++) {
            ctx.lineTo(13 - (i + 0.5) * 6.5, 2 + Math.sin(t * 6 + i) * 3);
            ctx.lineTo(13 - (i + 1) * 6.5, -4);
        }
        ctx.closePath();
        fillStroke(ctx, pal.main, 1.8);
        ctx.beginPath();
        ctx.arc(2, -24, 9, 0, Math.PI * 2);
        ctx.fillStyle = pal.dark;
        ctx.fill();
        ellipsePath(ctx, 0, -25, 1.6, 2);
        ctx.fillStyle = pal.accent;
        ctx.fill();
        ellipsePath(ctx, 5, -25, 1.6, 2);
        ctx.fill();
    } else {
        const flick: number = Math.sin(t * 9) * 3;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.bezierCurveTo(-16, -6, -12, -26, -2 + flick, -40);
        ctx.bezierCurveTo(2, -30, 16, -24, 12, -10);
        ctx.quadraticCurveTo(10, -2, 0, -2);
        ctx.closePath();
        fillStroke(ctx, pal.main, 1.8);
        ellipsePath(ctx, 0, -12, 7, 7);
        ctx.fillStyle = pal.accent;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1;
        eyes(ctx, -1, 5, -15, 2, pal.dark);
    }
    ctx.restore();
}

function drawGolem(ctx: CanvasRenderingContext2D, pal: Palette, t: number): void {
    const sway: number = Math.sin(t * 1.5) * 1;
    rectPath(ctx, -10, -12, 8, 12, 2);
    fillStroke(ctx, pal.dark, 2);
    rectPath(ctx, 3, -12, 8, 12, 2);
    fillStroke(ctx, pal.dark, 2);
    rectPath(ctx, -14, -34 + sway, 28, 24, 5);
    fillStroke(ctx, pal.main, 2);
    rectPath(ctx, -8, -45 + sway, 16, 12, 3);
    fillStroke(ctx, pal.main, 2);
    glow(ctx, 3, -40 + sway, 10, pal.accent, 0.6);
    ctx.fillStyle = pal.accent;
    ctx.fillRect(0, -42 + sway, 3, 3);
    ctx.fillRect(5, -42 + sway, 3, 3);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, -28 + sway);
    ctx.lineTo(0, -22 + sway);
    ctx.lineTo(-4, -16 + sway);
    ctx.stroke();
    rectPath(ctx, 12, -32 + sway, 9, 22, 4);
    fillStroke(ctx, shade(pal.main, 0.1), 2);
    rectPath(ctx, -21, -32 + sway, 9, 22, 4);
    fillStroke(ctx, shade(pal.main, -0.1), 2);
}

function drawDragon(ctx: CanvasRenderingContext2D, pal: Palette, t: number, sovereign: boolean): void {
    const flap: number = Math.sin(t * 4);
    if (sovereign) {
        glow(ctx, 0, -25, 50, pal.accent, 0.25);
    }
    // Tail
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.quadraticCurveTo(-32, -6 + Math.sin(t * 2) * 3, -38, -20);
    ctx.lineWidth = 9;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = pal.main;
    ctx.stroke();
    polyPath(ctx, [-38, -20, -44, -28, -34, -24]);
    fillStroke(ctx, pal.accent, 1.2);
    // Back wing
    ctx.save();
    ctx.translate(-2, -26);
    ctx.rotate(-0.2 + flap * 0.25);
    polyPath(ctx, [0, 0, -14, -30, 4, -24, 10, -34, 16, -20, 12, -4]);
    fillStroke(ctx, pal.dark, 1.6);
    ctx.restore();
    // Legs
    rectPath(ctx, -9, -10, 7, 10, 2);
    fillStroke(ctx, pal.dark, 1.6);
    rectPath(ctx, 6, -10, 7, 10, 2);
    fillStroke(ctx, pal.dark, 1.6);
    // Body
    ellipsePath(ctx, 0, -17, 16, 11);
    fillStroke(ctx, pal.main, 2);
    ellipsePath(ctx, 3, -13, 10, 6);
    ctx.fillStyle = shade(pal.accent, 0.3);
    ctx.globalAlpha = sovereign ? 0.4 : 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Neck + head
    ctx.beginPath();
    ctx.moveTo(8, -24);
    ctx.quadraticCurveTo(16, -34, 20, -40 + Math.sin(t * 2) * 1.5);
    ctx.lineWidth = 11;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 8;
    ctx.strokeStyle = pal.main;
    ctx.stroke();
    const hy: number = -42 + Math.sin(t * 2) * 1.5;
    ellipsePath(ctx, 23, hy, 9, 6.5, 0.15);
    fillStroke(ctx, pal.main, 1.8);
    polyPath(ctx, [28, hy - 1, 36, hy + 2, 28, hy + 5]);
    fillStroke(ctx, pal.main, 1.4);
    for (const hx of [18, 23]) {
        polyPath(ctx, [hx, hy - 5, hx - 5, hy - 14, hx + 2, hy - 6]);
        fillStroke(ctx, pal.accent, 1.2);
    }
    ellipsePath(ctx, 25, hy - 1.5, 1.8, 1.5);
    ctx.fillStyle = sovereign ? pal.accent : "#ffd43b";
    ctx.fill();
    // Front wing
    ctx.save();
    ctx.translate(2, -26);
    ctx.rotate(0.1 - flap * 0.3);
    polyPath(ctx, [0, 0, -8, -34, 8, -26, 16, -38, 22, -20, 14, -4]);
    fillStroke(ctx, shade(pal.dark, 0.15), 1.6);
    ctx.restore();
    if (sovereign) {
        for (let i: number = 0; i < 4; i++) {
            polyPath(ctx, [-8 + i * 5, -27, -6 + i * 5, -33, -4 + i * 5, -27]);
            fillStroke(ctx, pal.accent, 1);
        }
    }
}

function drawHydra(ctx: CanvasRenderingContext2D, pal: Palette, t: number): void {
    const necks: [number, number, number][] = [[-8, -42, 0], [4, -48, 1.3], [14, -38, 2.6]];
    for (const [nx, ny, phase] of necks) {
        const sway: number = Math.sin(t * 2 + phase) * 3;
        ctx.beginPath();
        ctx.moveTo(nx * 0.5, -18);
        ctx.quadraticCurveTo(nx - 6, (ny - 18) / 2, nx + sway, ny);
        ctx.lineWidth = 9;
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
        ctx.lineWidth = 6.5;
        ctx.strokeStyle = pal.main;
        ctx.stroke();
        ellipsePath(ctx, nx + sway + 3, ny, 7, 5, 0.2);
        fillStroke(ctx, pal.main, 1.6);
        polyPath(ctx, [nx + sway + 7, ny - 1, nx + sway + 13, ny + 1, nx + sway + 7, ny + 3]);
        fillStroke(ctx, pal.dark, 1.2);
        ellipsePath(ctx, nx + sway + 5, ny - 1.5, 1.5, 1.3);
        ctx.fillStyle = "#e03131";
        ctx.fill();
        polyPath(ctx, [nx + sway, ny - 4, nx + sway - 4, ny - 10, nx + sway + 2, ny - 5]);
        fillStroke(ctx, pal.accent, 1);
    }
    ellipsePath(ctx, 0, -13, 20, 13);
    fillStroke(ctx, pal.main, 2);
    ellipsePath(ctx, 2, -9, 12, 6);
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.quadraticCurveTo(-32, -4, -34, -14);
    ctx.lineWidth = 7;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = pal.main;
    ctx.stroke();
}

/** Painted art first: a cut-out puppet (humanoids) or an animated sprite (creatures). False = draw procedurally. */
function drawPaintedMonster(ctx: CanvasRenderingContext2D, x: number, y: number, def: MonsterDef, pose: MonsterPose, s: number): boolean {
    const puppet: Puppet | undefined = getPuppet(def.key);
    let height: number;
    if (puppet) {
        const action: PuppetAction = pose.attack > 0 ? PuppetAction.Attack : PuppetAction.None;
        puppetActor("monster", puppet).draw(ctx, x, y, {
            view: PuppetView.Side,
            facing: pose.facing,
            walk: pose.walk ?? 0,
            moving: pose.moving ?? false,
            action: action,
            actionTime: pose.attack * actionDuration(puppet, action),
            flash: pose.flash,
            time: pose.time,
            bodyHeight: PUPPET_BODY_HEIGHT * s
        });
        height = PUPPET_BODY_HEIGHT * s * 1.8;
    } else {
        const sprite: MonsterSprite | undefined = getMonsterSprite(def.key);
        if (!sprite) {
            return false;
        }
        height = 50 * s;
        drawMonsterSprite(ctx, sprite, x, y, height, pose.facing, pose.time, pose.attack, pose.flash, pose.moving ?? false);
    }
    if (pose.armored) {
        drawArmorBadge(ctx, x, y - height - 6 * s, s);
    }
    return true;
}

/** Small steel shield above painted monsters of an armored variant. */
function drawArmorBadge(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    const r: number = 6 * s;
    polyPath(ctx, [x - r, y - r, x + r, y - r, x + r, y, x, y + r * 1.3, x - r, y]);
    fillStroke(ctx, "#adb5bd", 1.4);
    polyPath(ctx, [x - r * 0.5, y - r * 0.55, x + r * 0.5, y - r * 0.55, x + r * 0.5, y - r * 0.1, x, y + r * 0.6, x - r * 0.5, y - r * 0.1]);
    ctx.fillStyle = "#e9ecef";
    ctx.fill();
}

/** Metal plates and rivets over the body for "armored" variants. */
function drawArmor(ctx: CanvasRenderingContext2D, body: MonsterBody): void {
    const y: number = body === MonsterBody.Flyer || body === MonsterBody.Wisp ? -26 : body === MonsterBody.Blob || body === MonsterBody.Beast || body === MonsterBody.Spider ? -16 : -22;
    rectPath(ctx, -11, y - 6, 22, 11, 4);
    const gradient: CanvasGradient = ctx.createLinearGradient(0, y - 6, 0, y + 5);
    gradient.addColorStop(0, "#e9ecef");
    gradient.addColorStop(1, "#868e96");
    fillStroke(ctx, gradient, 1.6);
    ctx.fillStyle = "#495057";
    for (const rx of [-8, -3, 3, 8]) {
        ctx.beginPath();
        ctx.arc(rx, y - 2, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-9, y + 1);
    ctx.lineTo(9, y + 1);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// ---------------------------------------------------------------- companions

export function drawCompanion(ctx: CanvasRenderingContext2D, x: number, y: number, key: CompanionKey, time: number, scale: number, facing: number = 1): void {
    const def: CompanionDef = COMPANIONS[key];
    ctx.save();
    ctx.translate(x, y);
    shadow(ctx, 0, 0, 7 * scale, 2.5 * scale);
    ctx.scale(facing * scale, scale);
    const hover: number = Math.sin(time * 4 + x) * 2;
    switch (key) {
        case CompanionKey.Fairy:
            glow(ctx, 0, -18 + hover, 16, def.accent, 0.6);
            for (const side of [-1, 1]) {
                ellipsePath(ctx, side * 6, -20 + hover, 6, 3.5, side * (0.5 + Math.sin(time * 20) * 0.3));
                ctx.fillStyle = "rgba(255,255,255,0.7)";
                ctx.fill();
            }
            ellipsePath(ctx, 0, -18 + hover, 3.5, 5);
            fillStroke(ctx, def.color, 1.2);
            ellipsePath(ctx, 0, -25 + hover, 3.5, 3.5);
            fillStroke(ctx, "#ffe3c4", 1.2);
            break;
        case CompanionKey.BabyDragon:
            ellipsePath(ctx, 0, -8, 8, 6);
            fillStroke(ctx, def.color, 1.4);
            ellipsePath(ctx, 7, -15, 5.5, 5);
            fillStroke(ctx, def.color, 1.4);
            polyPath(ctx, [-2, -12, -7, -20, 2, -14]);
            fillStroke(ctx, def.accent, 1.1);
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(8, -16, 1.8, 1.8);
            break;
        case CompanionKey.Mossling:
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.quadraticCurveTo(-9, -14, 0, -14 + hover * 0.3);
            ctx.quadraticCurveTo(9, -14, 8, 0);
            ctx.closePath();
            fillStroke(ctx, def.color, 1.4);
            polyPath(ctx, [0, -14, 5, -21, 2, -14]);
            fillStroke(ctx, def.accent, 1);
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(1, -8, 1.8, 2);
            ctx.fillRect(4.5, -8, 1.8, 2);
            break;
        case CompanionKey.Owlet:
            ellipsePath(ctx, 0, -10 + hover, 7, 8);
            fillStroke(ctx, def.color, 1.4);
            polyPath(ctx, [-5, -16 + hover, -6, -21 + hover, -2, -17 + hover]);
            fillStroke(ctx, def.color, 1);
            polyPath(ctx, [5, -16 + hover, 6, -21 + hover, 2, -17 + hover]);
            fillStroke(ctx, def.color, 1);
            eyes(ctx, -2.5, 2.5, -12 + hover, 2.3, OUTLINE, def.accent);
            polyPath(ctx, [0, -9 + hover, 1.5, -7 + hover, -1.5, -7 + hover]);
            ctx.fillStyle = "#f59f00";
            ctx.fill();
            break;
        case CompanionKey.FrostFox:
            ctx.beginPath();
            ctx.moveTo(-6, -6);
            ctx.quadraticCurveTo(-15, -6, -14, -14 + Math.sin(time * 5) * 2);
            ctx.lineWidth = 6;
            ctx.strokeStyle = OUTLINE;
            ctx.stroke();
            ctx.lineWidth = 4.5;
            ctx.strokeStyle = def.color;
            ctx.stroke();
            ellipsePath(ctx, 0, -6, 7, 4.5);
            fillStroke(ctx, def.color, 1.3);
            ellipsePath(ctx, 7, -10, 4.5, 4);
            fillStroke(ctx, def.color, 1.3);
            polyPath(ctx, [5, -13, 5, -18, 8, -14]);
            fillStroke(ctx, def.accent, 1);
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(8.5, -11, 1.5, 1.5);
            break;
        case CompanionKey.Glowbug:
            glow(ctx, -4, -14 + hover, 12, def.color, 0.7);
            ellipsePath(ctx, -4, -14 + hover, 4, 3.5);
            fillStroke(ctx, def.color, 1.1);
            ellipsePath(ctx, 2, -15 + hover, 3.5, 3);
            fillStroke(ctx, def.accent, 1.1);
            ellipsePath(ctx, 0, -19 + hover, 4, 2, 0.3 + Math.sin(time * 25) * 0.4);
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.fill();
            break;
    }
    ctx.restore();
}
