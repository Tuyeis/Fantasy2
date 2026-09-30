import {CompanionKey, COMPANIONS, CompanionDef} from "../data/companions";
import {MonsterDef, MonsterKey} from "../data/monsters";
import {drawTrainingDummy} from "./training-dummy";
import {ellipsePath, fillStroke, glow, OUTLINE, polyPath, shadow} from "./draw-utils";
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

function eyes(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, r: number, pupil: string, white: string): void {
    for (const ex of [x1, x2]) {
        ellipsePath(ctx, ex, y, r, r * 1.15);
        fillStroke(ctx, white, 1);
        ellipsePath(ctx, ex + r * 0.3, y, r * 0.5, r * 0.6);
        ctx.fillStyle = pupil;
        ctx.fill();
    }
}

/**
 * Draws a monster with its feet at (x, y), facing left by default (towards the hero): a cut-out puppet (humanoids)
 * or an animated painted sprite (creatures). `actorId` must differ for monsters on screen at the same time.
 */
export function drawMonster(ctx: CanvasRenderingContext2D, x: number, y: number, def: MonsterDef, pose: MonsterPose, actorId: string = "monster"): void {
    const s: number = pose.scale * def.size;
    if (def.key === MonsterKey.TrainingDummy) {
        // Drawn by code like the town dummies; it wobbles while it flashes from a hit.
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s * 0.95, s * 0.95);
        drawTrainingDummy(ctx, 0, 0, {lean: Math.sin(pose.time * 22) * pose.flash * 0.3, flash: pose.flash});
        ctx.restore();
        return;
    }
    const puppet: Puppet | undefined = getPuppet(def.key);
    let height: number;
    if (puppet) {
        const action: PuppetAction = pose.attack > 0 ? PuppetAction.Attack : PuppetAction.None;
        puppetActor(actorId, puppet).draw(ctx, x, y, {
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
            return;
        }
        height = 50 * s;
        drawMonsterSprite(ctx, sprite, x, y, height, pose.facing, pose.time, pose.attack, pose.flash, pose.moving ?? false);
    }
    if (pose.armored) {
        drawArmorBadge(ctx, x, y - height - 6 * s, s);
    }
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
