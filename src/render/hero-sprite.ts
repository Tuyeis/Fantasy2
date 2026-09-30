import {EarStyle, HatStyle, HeroLook, TailStyle, WeaponStyle} from "../data/hero-classes";
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
    /** Painted-puppet view (front / side / back); the procedural sprite always draws the side. */
    view?: PuppetView;
}

export function defaultPose(partial: Partial<HeroPose> = {}): HeroPose {
    return {scale: 1, facing: 1, walk: 0, moving: false, attack: 0, flash: 0, time: 0, ...partial};
}

/**
 * Draws a humanoid hero/NPC. (x, y) are the feet. About 46 px tall at scale 1.
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

    // Cape and tail behind the body.
    if (look.cape) {
        polyPath(ctx, [-8, -26 + breath, 8, -26 + breath, 12, -3, 0, -1, -13, -3]);
        fillStroke(ctx, look.cape);
    }
    if (look.tail === TailStyle.Cat) {
        ctx.beginPath();
        ctx.moveTo(-6, -12);
        ctx.quadraticCurveTo(-20, -12 + Math.sin(pose.time * 3) * 2, -17, -28);
        ctx.lineWidth = 5.5;
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = look.hair;
        ctx.stroke();
    } else if (look.tail === TailStyle.Monkey) {
        ctx.beginPath();
        ctx.moveTo(-6, -11);
        ctx.bezierCurveTo(-22, -8, -22, -30, -12, -30 + Math.sin(pose.time * 3) * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = OUTLINE;
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = shade(look.skin, -0.2);
        ctx.stroke();
    }

    // Shield on the back arm.
    if (look.shield) {
        rectPath(ctx, -17, -26 + breath, 11, 15, 3);
        fillStroke(ctx, look.outfit);
        rectPath(ctx, -14, -23 + breath, 5, 9, 2);
        ctx.fillStyle = look.accent;
        ctx.fill();
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

    // Head.
    const headY: number = -36 + breath;
    if (look.ears === EarStyle.Elf) {
        polyPath(ctx, [6, headY - 1, 16, headY - 6, 8, headY + 3]);
        fillStroke(ctx, look.skin, 1.3);
        polyPath(ctx, [-6, headY - 1, -16, headY - 6, -8, headY + 3]);
        fillStroke(ctx, look.skin, 1.3);
    }
    ellipsePath(ctx, 0, headY, 9.5, 9.5);
    fillStroke(ctx, look.skin);

    // Hair.
    if (look.hat !== HatStyle.Helmet && look.hat !== HatStyle.Hood) {
        ctx.beginPath();
        ctx.arc(0, headY, 9.5, Math.PI * 1.05, Math.PI * 1.95);
        ctx.quadraticCurveTo(4, headY - 3, -2, headY - 2);
        ctx.quadraticCurveTo(-7, headY - 1, -9.4, headY + 2);
        ctx.closePath();
        fillStroke(ctx, look.hair, 1.3);
        if (look.hat === HatStyle.Circlet) {
            polyPath(ctx, [-8, headY - 6, -5, headY - 14, -2, headY - 8, 1, headY - 15, 4, headY - 8, 7, headY - 13, 8, headY - 5]);
            fillStroke(ctx, look.hair, 1.2);
        }
    }
    if (look.ears === EarStyle.Cat) {
        polyPath(ctx, [-8, headY - 5, -7, headY - 16, -1, headY - 9]);
        fillStroke(ctx, look.hair, 1.3);
        polyPath(ctx, [8, headY - 5, 7, headY - 16, 1, headY - 9]);
        fillStroke(ctx, look.hair, 1.3);
        polyPath(ctx, [-6.5, headY - 7, -6.3, headY - 12.5, -3, headY - 9]);
        ctx.fillStyle = "#ffc9c9";
        ctx.fill();
    }

    // Eyes.
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(2.5, headY - 1, 2, 3);
    ctx.fillRect(6.5, headY - 1, 2, 3);
    if (look.ears === EarStyle.Cat) {
        ctx.fillStyle = "#ffc9c9";
        ctx.fillRect(4.5, headY + 3, 2, 1.5);
    }

    drawHat(ctx, look, headY);

    // Front arm + weapon.
    const swing: number = pose.attack > 0 ? Math.sin(pose.attack * Math.PI) : 0;
    ctx.save();
    ctx.translate(6, -25 + breath);
    ctx.rotate(-0.2 - swing * 1.4 + (pose.moving ? Math.sin(pose.walk) * 0.3 : 0));
    rectPath(ctx, -2.5, 0, 5, 11, 2);
    fillStroke(ctx, look.outfit, 1.3);
    ellipsePath(ctx, 0, 12, 3, 3);
    fillStroke(ctx, look.skin, 1.2);
    ctx.translate(0, 12);
    drawWeapon(ctx, look, swing);
    ctx.restore();

    ctx.restore();
}

function drawHat(ctx: CanvasRenderingContext2D, look: HeroLook, headY: number): void {
    switch (look.hat) {
        case HatStyle.Headband:
            rectPath(ctx, -9.5, headY - 6, 19, 3.5, 1);
            fillStroke(ctx, look.accent, 1.1);
            polyPath(ctx, [-9, headY - 5, -16, headY - 2, -15, headY + 2]);
            fillStroke(ctx, look.accent, 1.1);
            break;
        case HatStyle.WizardHat:
        case HatStyle.WitchHat: {
            const color: string = look.hat === HatStyle.WitchHat ? "#2b2233" : look.outfit;
            ellipsePath(ctx, 0, headY - 6, look.hat === HatStyle.WitchHat ? 15 : 13, 3.5);
            fillStroke(ctx, color);
            ctx.beginPath();
            ctx.moveTo(-8, headY - 7);
            ctx.lineTo(8, headY - 7);
            ctx.quadraticCurveTo(4, headY - 18, look.hat === HatStyle.WitchHat ? -12 : -4, headY - 27);
            ctx.quadraticCurveTo(-4, headY - 16, -8, headY - 7);
            ctx.closePath();
            fillStroke(ctx, color);
            rectPath(ctx, -7.5, headY - 10, 15, 3, 0);
            ctx.fillStyle = look.accent;
            ctx.fill();
            break;
        }
        case HatStyle.Helmet:
            ctx.beginPath();
            ctx.arc(0, headY, 10.5, Math.PI, 0);
            ctx.lineTo(10.5, headY + 4);
            ctx.lineTo(-10.5, headY + 4);
            ctx.closePath();
            fillStroke(ctx, look.outfit);
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(1, headY - 1, 9, 2.5);
            polyPath(ctx, [-2, headY - 10, 2, headY - 17, 5, headY - 10]);
            fillStroke(ctx, "#e03131", 1.1);
            break;
        case HatStyle.Circlet:
            rectPath(ctx, -9.5, headY - 6, 19, 2.5, 1);
            fillStroke(ctx, "#fcc419", 1);
            ellipsePath(ctx, 0, headY - 5, 1.8, 1.8);
            ctx.fillStyle = "#e03131";
            ctx.fill();
            break;
        case HatStyle.Hood:
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
            break;
        case HatStyle.None:
            break;
    }
}

function drawWeapon(ctx: CanvasRenderingContext2D, look: HeroLook, swing: number): void {
    switch (look.weapon) {
        case WeaponStyle.Sword:
            ctx.save();
            ctx.rotate(-2.4 + swing * 0.4);
            rectPath(ctx, -1.8, 2, 3.6, 20, 1);
            fillStroke(ctx, "#e9ecef", 1.2);
            rectPath(ctx, -4.5, 0, 9, 3, 1);
            fillStroke(ctx, look.accent, 1.1);
            rectPath(ctx, -1.3, -5, 2.6, 5, 1);
            fillStroke(ctx, "#6b4226", 1);
            ctx.restore();
            break;
        case WeaponStyle.Dagger:
            ctx.save();
            ctx.rotate(-2.2);
            rectPath(ctx, -1.5, 1, 3, 10, 1);
            fillStroke(ctx, "#dee2e6", 1.1);
            rectPath(ctx, -3.5, -1, 7, 2.5, 1);
            fillStroke(ctx, look.accent, 1);
            ctx.restore();
            break;
        case WeaponStyle.Staff:
            ctx.save();
            ctx.rotate(-0.15 - swing * 0.3);
            rectPath(ctx, -1.6, -30, 3.2, 40, 1.5);
            fillStroke(ctx, "#7a4e2a", 1.2);
            glow(ctx, 0, -33, 10, look.accent, 0.6);
            ellipsePath(ctx, 0, -33, 4.2, 4.2);
            fillStroke(ctx, look.accent, 1.2);
            ctx.restore();
            break;
        case WeaponStyle.Pole:
            ctx.save();
            ctx.rotate(-0.9 - swing * 0.8);
            rectPath(ctx, -1.8, -26, 3.6, 46, 1.5);
            fillStroke(ctx, "#c92a2a", 1.2);
            rectPath(ctx, -2.3, -26, 4.6, 5, 1);
            fillStroke(ctx, "#fcc419", 1);
            rectPath(ctx, -2.3, 15, 4.6, 5, 1);
            fillStroke(ctx, "#fcc419", 1);
            ctx.restore();
            break;
        case WeaponStyle.Bow:
            ctx.save();
            ctx.rotate(0.2 - swing * 0.5);
            ctx.beginPath();
            ctx.moveTo(1, -15);
            ctx.quadraticCurveTo(12, 0, 1, 15);
            ctx.lineWidth = 4.2;
            ctx.strokeStyle = OUTLINE;
            ctx.stroke();
            ctx.lineWidth = 2.4;
            ctx.strokeStyle = "#8d6e45";
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(1, -15);
            ctx.lineTo(1 - swing * 5, 0);
            ctx.lineTo(1, 15);
            ctx.lineWidth = 0.8;
            ctx.strokeStyle = "#f1f3f5";
            ctx.stroke();
            ctx.restore();
            break;
    }
}
