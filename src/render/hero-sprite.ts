import {HeroLook} from "../data/hero-classes";
import {ellipsePath, fillStroke, glow, OUTLINE, polyPath, rectPath, shade, shadow} from "./draw-utils";
import {PuppetView} from "./puppet/puppet-types";

export interface HeroPose {
    scale: number;
    /** 1 = facing right, -1 = facing left. */
    facing: number;
    /** Walk cycle phase (radians). */
    walk: number;
    moving: boolean;
    /** 0..1 attack swing progress (0 = idle). */
    attack: number;
    /** 0..1 white hit flash. */
    flash: number;
    /** Global time for idle breathing. */
    time: number;
    /** Painted-puppet view (front / side / back) used by drawClassHero; drawHero ignores it and always draws the side. */
    view?: PuppetView;
}

export function defaultPose(partial: Partial<HeroPose> = {}): HeroPose {
    return {scale: 1, facing: 1, walk: 0, moving: false, attack: 0, flash: 0, time: 0, ...partial};
}

/**
 * Draws a hooded, staff-carrying humanoid (the dungeon NPCs; every class has a painted puppet instead).
 * Only the look's colours and cape are used. (x, y) are the feet. About 46 px tall at scale 1.
 */
export function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, look: HeroLook, pose: HeroPose): void {
    ctx.save();
    ctx.translate(x, y);
    shadow(ctx, 0, 0, 12 * pose.scale, 4 * pose.scale);
    ctx.scale(pose.facing * pose.scale, pose.scale);
    if (pose.flash > 0) {
        ctx.filter = "brightness(" + (1 + pose.flash * 2.5) + ")";
    }
    const breath: number = pose.moving ? Math.abs(Math.sin(pose.walk)) * -1.5 : Math.sin(pose.time * 2.2) * 0.6;
    const legSwing: number = pose.moving ? Math.sin(pose.walk) * 3 : 0;

    // Cape behind the body.
    if (look.cape) {
        polyPath(ctx, [-8, -26 + breath, 8, -26 + breath, 12, -3, 0, -1, -13, -3]);
        fillStroke(ctx, look.cape);
    }

    // Legs.
    rectPath(ctx, -6 + legSwing, -12, 5, 12, 2);
    fillStroke(ctx, look.outfitDark);
    rectPath(ctx, 1 - legSwing, -12, 5, 12, 2);
    fillStroke(ctx, look.outfitDark);
    rectPath(ctx, -7 + legSwing, -3, 7, 3, 1);
    fillStroke(ctx, shade(look.outfitDark, -0.35), 1.2);
    rectPath(ctx, 0 - legSwing, -3, 7, 3, 1);
    fillStroke(ctx, shade(look.outfitDark, -0.35), 1.2);

    // Body.
    rectPath(ctx, -9, -28 + breath, 18, 18, 5);
    fillStroke(ctx, look.outfit);
    rectPath(ctx, -9, -15 + breath, 18, 3, 0);
    ctx.fillStyle = look.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -27 + breath);
    ctx.lineTo(0, -16 + breath);
    ctx.strokeStyle = shade(look.outfit, -0.25);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Head, eyes and hood.
    const headY: number = -36 + breath;
    ellipsePath(ctx, 0, headY, 9.5, 9.5);
    fillStroke(ctx, look.skin);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(2.5, headY - 1, 2, 3);
    ctx.fillRect(6.5, headY - 1, 2, 3);
    ctx.beginPath();
    ctx.arc(0, headY, 11, Math.PI * 0.85, Math.PI * 2.15);
    ctx.lineTo(9, headY + 8);
    ctx.lineTo(4, headY - 5);
    ctx.lineTo(-4, headY - 5);
    ctx.lineTo(-10, headY + 8);
    ctx.closePath();
    fillStroke(ctx, look.outfitDark);
    ctx.fillStyle = look.hair;
    ctx.fillRect(-3, headY - 5, 7, 2.5);

    // Front arm + staff.
    const swing: number = pose.attack > 0 ? Math.sin(pose.attack * Math.PI) : 0;
    ctx.save();
    ctx.translate(6, -25 + breath);
    ctx.rotate(-0.2 - swing * 1.4 + (pose.moving ? Math.sin(pose.walk) * 0.3 : 0));
    rectPath(ctx, -2.5, 0, 5, 11, 2);
    fillStroke(ctx, look.outfit, 1.3);
    ellipsePath(ctx, 0, 12, 3, 3);
    fillStroke(ctx, look.skin, 1.2);
    ctx.translate(0, 12);
    ctx.rotate(-0.15 - swing * 0.3);
    rectPath(ctx, -1.6, -30, 3.2, 40, 1.5);
    fillStroke(ctx, "#7a4e2a", 1.2);
    glow(ctx, 0, -33, 10, look.accent, 0.6);
    ellipsePath(ctx, 0, -33, 4.2, 4.2);
    fillStroke(ctx, look.accent, 1.2);
    ctx.restore();

    ctx.restore();
}
