import {LoadedItem, LoadedPart, LoadedView, Point, Puppet, PuppetAction, PuppetPose, PuppetView, WeaponType} from "./puppet-types";

/**
 * One animated puppet on screen. Holds the per-instance state that the pose alone cannot give:
 * the weapon's spring (it lags and whips instead of looking glued to the hand) and the blade trail.
 * Ported from proto/puppet.html (approved look); poses are authored for side art facing RIGHT.
 */

interface LimbPose {
    a: number;
    lift: number;
    sy: number;
}

interface PoseFrame {
    rootX: number;
    rootY: number;
    torso: number;
    torsoSY: number;
    head: number;
    headY: number;
    armL: number;
    armR: number;
    armLSY: number;
    armRSY: number;
    legL: LimbPose;
    legR: LimbPose;
    /** Weapon angle relative to its arm. */
    weapon: number;
    farArm: number;
    farLeg: number;
    tail: number;
}

interface BladeSample {
    tip: Point;
    mid: Point;
    speed: number;
}

/** Weapon scale relative to the character art (weapons are painted a bit small). */
const WEAPON_SCALE: number = 1.2;

const ease: (k: number) => number = (k: number): number => 1 - Math.pow(1 - k, 3);
const clamp01: (k: number) => number = (k: number): number => Math.max(0, Math.min(1, k));

/** How long each action lasts, in seconds (scenes convert their 0..1 progress with this). */
export function actionDuration(puppet: Puppet, action: PuppetAction): number {
    if (action === PuppetAction.Attack) {
        const type: WeaponType | undefined = puppet.weapon?.type;
        if (type === WeaponType.Bow) {
            return 0.78;
        }
        if (type === WeaponType.Staff || type === WeaponType.Trident) {
            return 0.8;
        }
        if (type === WeaponType.Pole) {
            return 0.8;
        }
        return 0.6;
    }
    if (action === PuppetAction.Cast) {
        return 1.3;
    }
    if (action === PuppetAction.Dash) {
        return 0.2;
    }
    return 0;
}

export class PuppetActor {
    private wAng: number = 0;
    private wVel: number = 0;
    private lastTime: number = -1;
    private lastView: PuppetView | undefined = undefined;
    private bladeHist: BladeSample[] = [];
    private blade: {tip: Point; mid: Point} | undefined = undefined;
    /** Device-pixel position of the weapon's head (staff orb, blade tip) after the last draw, for scene effects
     *  (convert with the scene's ctx.getTransform().inverse()). */
    public weaponHead: Point | undefined = undefined;

    public constructor(private readonly puppet: Puppet) {
    }

    public get key(): string {
        return this.puppet.key;
    }

    /** Draws the puppet with its feet at (x, y). */
    public draw(ctx: CanvasRenderingContext2D, x: number, y: number, pose: PuppetPose): void {
        const view: LoadedView = this.puppet.views[pose.view];
        const P: PoseFrame = this.poseFrame(pose);
        this.stepWeapon(pose, P);

        const rig: LoadedView["rig"] = view.rig;
        const k: number = pose.bodyHeight / (rig.bottom - rig.joints.neck[1]);
        const side: boolean = pose.view === PuppetView.Side;
        const artFacing: number = this.puppet.sideFacing;
        const flip: number = side ? pose.facing * artFacing : 1;
        const part: (name: string) => LoadedPart | undefined = (name: string): LoadedPart | undefined => view.parts.get(name);
        const torso: LoadedPart | undefined = part("torso");
        if (!torso) {
            return;
        }

        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(x, y + 1, pose.bodyHeight * 0.3, pose.bodyHeight * 0.075, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const striking: boolean = this.isStriking(pose);
        if (pose.view === PuppetView.Back) {
            this.drawSwoosh(ctx);
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(flip * k, k);
        ctx.translate(-rig.joints.hip[0] + P.rootX, -rig.bottom + P.rootY);
        const torsoXf: () => void = (): void => {
            ctx.translate(torso.pivotX, torso.pivotY);
            ctx.rotate(P.torso);
            ctx.scale(1, P.torsoSY);
            ctx.translate(-torso.pivotX, -torso.pivotY);
        };
        const img: (p: LoadedPart, dark: boolean) => void = (p: LoadedPart, dark: boolean): void => {
            ctx.drawImage(dark ? p.dark : p.img, p.x, p.y);
            if (pose.flash > 0) {
                ctx.globalAlpha = pose.flash;
                ctx.drawImage(p.white, p.x, p.y);
                ctx.globalAlpha = 1;
            }
        };
        const rot: (p: LoadedPart, angle: number, sy: number, fn: () => void) => void = (p: LoadedPart, angle: number, sy: number, fn: () => void): void => {
            ctx.save();
            ctx.translate(p.pivotX, p.pivotY);
            ctx.rotate(angle);
            ctx.scale(1, sy);
            ctx.translate(-p.pivotX, -p.pivotY);
            fn();
            ctx.restore();
        };
        const leg: (p: LoadedPart | undefined, L: LimbPose, dark: boolean) => void = (p: LoadedPart | undefined, L: LimbPose, dark: boolean): void => {
            if (!p) {
                return;
            }
            ctx.save();
            ctx.translate(0, -L.lift);
            rot(p, L.a, L.sy, () => img(p, dark));
            ctx.restore();
        };
        const tailPart: LoadedPart | undefined = part("tail");
        const tail: () => void = (): void => {
            if (!tailPart) {
                return;
            }
            ctx.save();
            torsoXf();
            rot(tailPart, P.tail * (pose.view === PuppetView.Back ? -1 : 1), 1, () => img(tailPart, false));
            ctx.restore();
        };
        const head: LoadedPart | undefined = part("head");
        const drawHead: (tilt: number) => void = (tilt: number): void => {
            if (!head) {
                return;
            }
            ctx.save();
            torsoXf();
            ctx.translate(0, P.headY);
            rot(head, P.head + tilt, 1, () => img(head, false));
            ctx.restore();
        };

        if (pose.view !== PuppetView.Back) {
            tail();
        }
        if (side) {
            const arm: LoadedPart | undefined = part("arm_l");
            const legPart: LoadedPart | undefined = part("leg_l");
            // Far limbs: darker copies of the near ones, a little behind.
            if (arm) {
                ctx.save();
                torsoXf();
                rot(arm, P.farArm, 1, () => {
                    ctx.translate(-7 * artFacing, -3);
                    img(arm, true);
                });
                ctx.restore();
            }
            if (legPart) {
                ctx.save();
                ctx.translate(-5 * artFacing, 0);
                rot(legPart, P.farLeg, 1, () => img(legPart, true));
                ctx.restore();
            }
            leg(legPart, P.legL, false);
            ctx.save();
            torsoXf();
            img(torso, false);
            ctx.restore();
            drawHead(0);
            if (arm) {
                if (this.puppet.offhand) {
                    ctx.save();
                    torsoXf();
                    ctx.translate(7 * artFacing, -3);
                    this.drawOffhand(ctx, view, "hand_l", arm, P.farArm, 1, 0.55, false, pose.flash);
                    ctx.restore();
                }
                ctx.save();
                torsoXf();
                this.drawWeapon(ctx, view, "hand_l", arm, P.armL, 1, pose);
                rot(arm, P.armL, 1, () => img(arm, false));
                ctx.restore();
            }
        } else {
            const back: boolean = pose.view === PuppetView.Back;
            const weaponArm: string = back ? "arm_r" : "arm_l";
            const acting: boolean = pose.action === PuppetAction.Attack || pose.action === PuppetAction.Cast;
            const arms: () => void = (): void => {
                for (const [name, angle, sy] of [["arm_l", P.armL, P.armLSY], ["arm_r", P.armR, P.armRSY]] as [string, number, number][]) {
                    const armPart: LoadedPart | undefined = part(name);
                    if (!armPart) {
                        continue;
                    }
                    const hand: "hand_l" | "hand_r" = name === "arm_l" ? "hand_l" : "hand_r";
                    // The fist wraps the handle in every view: the weapon is drawn under the arm.
                    if (name === weaponArm) {
                        this.drawWeapon(ctx, view, hand, armPart, angle, sy, pose);
                    } else if (back) {
                        this.drawOffhand(ctx, view, hand, armPart, angle, sy, 1, true, pose.flash);
                    }
                    rot(armPart, angle, sy, () => img(armPart, false));
                    if (name !== weaponArm && !back) {
                        this.drawOffhand(ctx, view, hand, armPart, angle, sy, 1, false, pose.flash);
                    }
                }
            };
            // Seen from behind, a strike goes away from the camera: arms and weapon pass behind the whole body.
            const armsBehindAll: boolean = back && acting;
            const armsInFront: boolean = !back && acting;
            if (armsBehindAll) {
                ctx.save();
                torsoXf();
                arms();
                ctx.restore();
            }
            leg(part("leg_l"), P.legL, false);
            leg(part("leg_r"), P.legR, false);
            if (!armsInFront && !armsBehindAll) {
                ctx.save();
                torsoXf();
                arms();
                ctx.restore();
            }
            ctx.save();
            torsoXf();
            img(torso, false);
            ctx.restore();
            drawHead(rig.headTilt ?? 0);
            if (back) {
                tail();
            }
            if (armsInFront) {
                ctx.save();
                torsoXf();
                arms();
                ctx.restore();
            }
        }
        ctx.restore();

        if (this.blade) {
            this.bladeHist.unshift({tip: this.blade.tip, mid: this.blade.mid, speed: striking ? Math.abs(this.wVel) : 0});
            if (this.bladeHist.length > 7) {
                this.bladeHist.length = 7;
            }
        }
        if (pose.view !== PuppetView.Back) {
            this.drawSwoosh(ctx);
        }
    }

    // ------------------------------------------------------------ weapon

    private isStriking(pose: PuppetPose): boolean {
        const type: WeaponType | undefined = this.puppet.weapon?.type;
        if (pose.action !== PuppetAction.Attack || type === undefined || type === WeaponType.Bow || type === WeaponType.Staff || type === WeaponType.Trident) {
            return false;
        }
        if (type === WeaponType.Pole && pose.view === PuppetView.Side) {
            return false;
        }
        return pose.actionTime > 0.13 && pose.actionTime < 0.31;
    }

    private weaponTarget(pose: PuppetPose, P: PoseFrame): number {
        const arm: number = pose.view === PuppetView.Back ? P.armR : P.armL;
        const sway: number = pose.moving ? Math.sin(pose.walk * 2 + 0.6) * 0.035 : Math.sin(pose.time * 2.4) * 0.012;
        return arm + P.weapon + (pose.view === PuppetView.Side && this.puppet.sideFacing === -1 ? -sway : sway);
    }

    /** Stiff, well damped spring with a hard lag limit: rigid weapon, firm wrist (a soft spring looked rubbery). */
    private stepWeapon(pose: PuppetPose, P: PoseFrame): void {
        const target: number = this.weaponTarget(pose, P);
        const dt: number = this.lastTime < 0 ? 0 : Math.max(0, Math.min(0.05, pose.time - this.lastTime));
        this.lastTime = pose.time;
        if (dt === 0 || pose.view !== this.lastView) {
            this.lastView = pose.view;
            this.wAng = target;
            this.wVel = 0;
            this.bladeHist = [];
            return;
        }
        while (this.wAng - target > Math.PI) {
            this.wAng -= 2 * Math.PI;
        }
        while (target - this.wAng > Math.PI) {
            this.wAng += 2 * Math.PI;
        }
        const attacking: boolean = pose.action === PuppetAction.Attack;
        const stiff: number = attacking ? 900 : 420;
        const damp: number = attacking ? 52 : 36;
        const maxLag: number = attacking ? 0.35 : 0.14;
        this.wVel += (stiff * (target - this.wAng) - damp * this.wVel) * dt;
        this.wAng += this.wVel * dt;
        if (this.wAng - target > maxLag) {
            this.wAng = target + maxLag;
            this.wVel = Math.min(this.wVel, 0);
        }
        if (target - this.wAng > maxLag) {
            this.wAng = target - maxLag;
            this.wVel = Math.max(this.wVel, 0);
        }
    }

    private drawWeapon(ctx: CanvasRenderingContext2D, view: LoadedView, handJoint: "hand_l" | "hand_r", arm: LoadedPart, armAngle: number, armSY: number, pose: PuppetPose): void {
        const weapon: LoadedItem | undefined = this.puppet.weapon;
        const hand: Point | undefined = view.rig.joints[handJoint];
        if (!weapon || !hand) {
            return;
        }
        const meta: LoadedItem["meta"] = weapon.meta;
        ctx.save();
        // Follow the arm exactly (rotation AND fore-shortening) so the fist never slides on the handle.
        ctx.translate(arm.pivotX, arm.pivotY);
        ctx.rotate(armAngle);
        ctx.scale(1, armSY);
        ctx.translate(hand[0] - arm.pivotX, hand[1] - arm.pivotY);
        ctx.scale(1, 1 / armSY);
        ctx.rotate(this.wAng - armAngle);
        ctx.scale(WEAPON_SCALE, WEAPON_SCALE);
        ctx.translate(-meta.grip[0], -meta.grip[1]);
        if (weapon.type === WeaponType.Bow) {
            // The string faces the archer: the back of the body in side view, the body centre in front/back views.
            const desired: number = pose.view === PuppetView.Side ? -this.puppet.sideFacing : (pose.view === PuppetView.Front ? 1 : -1);
            if ((meta.stringSide ?? -1) !== desired) {
                ctx.translate(meta.grip[0], 0);
                ctx.scale(-1, 1);
                ctx.translate(-meta.grip[0], 0);
            }
        }
        ctx.drawImage(weapon.img, 0, 0);
        if (pose.flash > 0) {
            ctx.globalAlpha = pose.flash;
            ctx.drawImage(weapon.white, 0, 0);
            ctx.globalAlpha = 1;
        }
        if (weapon.type === WeaponType.Bow && meta.tipTop && meta.tipBottom) {
            this.drawBowString(ctx, meta.tipTop, meta.tipBottom, meta.stringSide ?? -1, meta.grip[1], meta.h, pose);
        }
        const m: DOMMatrix = ctx.getTransform();
        const tip: DOMPoint = m.transformPoint(new DOMPoint(meta.grip[0], meta.h * 0.97));
        const mid: DOMPoint = m.transformPoint(new DOMPoint(meta.grip[0], meta.h * 0.42));
        this.blade = {tip: [tip.x, tip.y], mid: [mid.x, mid.y]};
        const headPoint: DOMPoint = m.transformPoint(new DOMPoint(meta.grip[0], meta.tipDown ? meta.h * 0.97 : 4));
        this.weaponHead = [headPoint.x, headPoint.y];
        ctx.restore();
    }

    private drawBowString(ctx: CanvasRenderingContext2D, top: Point, bottom: Point, side: number, gripY: number, h: number, pose: PuppetPose): void {
        const t: number = pose.actionTime;
        const draw: number = pose.action !== PuppetAction.Attack ? 0 : t < 0.16 ? 0 : t < 0.42 ? ease((t - 0.16) / 0.26) : Math.max(0, 1 - (t - 0.42) / 0.05);
        const px: number = (top[0] + bottom[0]) / 2 + side * draw * h * 0.3;
        ctx.beginPath();
        ctx.moveTo(top[0], top[1]);
        ctx.lineTo(px, gripY);
        ctx.lineTo(bottom[0], bottom[1]);
        ctx.strokeStyle = "rgba(240,240,255,0.95)";
        ctx.lineWidth = 1.1;
        ctx.stroke();
    }

    private drawOffhand(ctx: CanvasRenderingContext2D, view: LoadedView, handJoint: "hand_l" | "hand_r", arm: LoadedPart, armAngle: number, armSY: number, squashX: number, dark: boolean, flash: number): void {
        const item: LoadedItem | undefined = this.puppet.offhand;
        const hand: Point | undefined = view.rig.joints[handJoint];
        if (!item || !hand) {
            return;
        }
        ctx.save();
        ctx.translate(arm.pivotX, arm.pivotY);
        ctx.rotate(armAngle);
        ctx.scale(1, armSY);
        ctx.translate(hand[0] - arm.pivotX, hand[1] - arm.pivotY);
        ctx.scale(1, 1 / armSY);
        // Kept roughly upright: it counters most of the arm swing.
        ctx.rotate(-armAngle * 0.8);
        ctx.scale(squashX * 1.15, 1.15);
        ctx.translate(-item.meta.grip[0], -item.meta.grip[1]);
        ctx.drawImage(dark ? item.dark : item.img, 0, 0);
        if (flash > 0) {
            ctx.globalAlpha = flash;
            ctx.drawImage(item.white, 0, 0);
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    /** Ribbon of light from the blade tip, only while the blade is actually striking. Points are in device pixels. */
    private drawSwoosh(ctx: CanvasRenderingContext2D): void {
        const h: BladeSample[] = this.bladeHist;
        if (h.length < 3) {
            return;
        }
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = "lighter";
        for (let i: number = 0; i < h.length - 1; i++) {
            const a: BladeSample = h[i];
            const b: BladeSample = h[i + 1];
            const fade: number = (1 - i / (h.length - 1)) * Math.min(1, a.speed / 14);
            if (fade <= 0.02) {
                continue;
            }
            ctx.beginPath();
            ctx.moveTo(a.tip[0], a.tip[1]);
            ctx.lineTo(b.tip[0], b.tip[1]);
            ctx.lineTo(b.mid[0], b.mid[1]);
            ctx.lineTo(a.mid[0], a.mid[1]);
            ctx.closePath();
            const g: CanvasGradient = ctx.createLinearGradient(a.mid[0], a.mid[1], a.tip[0], a.tip[1]);
            g.addColorStop(0, "rgba(255,220,140,0)");
            g.addColorStop(0.7, "rgba(255,236,170," + 0.45 * fade + ")");
            g.addColorStop(1, "rgba(255,255,255," + 0.9 * fade + ")");
            ctx.fillStyle = g;
            ctx.fill();
        }
        ctx.restore();
    }

    // ------------------------------------------------------------ poses (radians, + = clockwise on screen)

    private poseFrame(pose: PuppetPose): PoseFrame {
        const v: PuppetView = pose.view;
        const type: WeaponType | undefined = this.puppet.weapon?.type;
        const bow: boolean = type === WeaponType.Bow;
        const staff: boolean = type === WeaponType.Staff || type === WeaponType.Trident;
        const pole: boolean = type === WeaponType.Pole;
        const P: PoseFrame = {rootX: 0, rootY: 0, torso: 0, torsoSY: 1, head: 0, headY: 0, armL: 0, armR: 0, armLSY: 1, armRSY: 1,
            legL: {a: 0, lift: 0, sy: 1}, legR: {a: 0, lift: 0, sy: 1}, weapon: 0, farArm: 0, farLeg: 0, tail: 0};
        const s: number = Math.sin(pose.walk);
        const c: number = Math.cos(pose.walk);
        const time: number = pose.time;
        if (v === PuppetView.Side) {
            P.weapon = bow ? 0.08 : staff ? 0.1 : pole ? 0.95 : -0.95;
            if (pose.moving) {
                P.rootY = -Math.abs(c) * 7;
                P.torso = 0.06;
                P.head = -0.03 + s * 0.02;
                P.legL = {a: -s * 0.5, lift: Math.max(0, -s) * 5, sy: 1};
                P.farLeg = s * 0.5;
                // The weapon arm swings less than the free arm, as when carrying a weapon.
                P.armL = s * 0.36;
                P.farArm = -s * 0.55;
            } else {
                const b: number = Math.sin(time * 2.4);
                P.torsoSY = 1 + b * 0.015;
                P.headY = -b * 1.5;
                P.armL = 0.04 + b * 0.03;
                P.farArm = -0.04;
            }
        } else {
            const front: boolean = v === PuppetView.Front;
            // Seen from behind a bow hanging straight down would reach the floor: it is carried tilted.
            P.weapon = bow ? (front ? 0.12 : -1.15) : staff ? (front ? 0.06 : -0.06) : pole ? (front ? 0.55 : -0.55) : (front ? 0.85 : -0.85);
            if (pose.moving) {
                // Short steps with the moving leg fore-shortening, weight over the supporting foot.
                const stepL: number = Math.max(0, s);
                const stepR: number = Math.max(0, -s);
                P.rootY = -Math.abs(c) * 3.5 - 1;
                P.rootX = s * 4;
                P.legL = {a: s * 0.04, lift: stepL * 5, sy: 1 - stepL * 0.16};
                P.legR = {a: s * 0.04, lift: stepR * 5, sy: 1 - stepR * 0.16};
                P.armL = 0.05 + s * 0.08;
                P.armR = -0.05 + s * 0.08;
                P.armLSY = 1 - stepR * 0.14;
                P.armRSY = 1 - stepL * 0.14;
                P.torso = -s * 0.03;
                P.head = s * 0.02;
                P.headY = Math.abs(c);
            } else {
                const b: number = Math.sin(time * 2.4);
                P.torsoSY = 1 + b * 0.015;
                P.headY = -b * 1.5;
                P.armL = 0.04 + b * 0.03;
                P.armR = -0.04 - b * 0.03;
                P.head = Math.sin(time * 1.1) * 0.025;
            }
        }
        if (pose.action === PuppetAction.Attack) {
            if (staff) {
                this.poseStaff(P, v, pose.actionTime);
            } else if (pole && v === PuppetView.Side) {
                this.posePoleSpin(P, pose.actionTime);
            } else if (bow) {
                this.poseBow(P, v, pose.actionTime);
            } else {
                this.poseSlash(P, v, pose.actionTime);
            }
        } else if (pose.action === PuppetAction.Cast) {
            const t: number = pose.actionTime;
            const k: number = ease(Math.min(1, t / 0.3));
            const rel: number = t > 0.9 ? Math.min(1, (t - 0.9) / 0.15) : 0;
            if (v === PuppetView.Side) {
                P.armL = -2.2 * k + 1.6 * rel;
                P.farArm = -2.0 * k + 1.4 * rel;
                P.head = -0.08;
            } else {
                P.armL = 2.3 * k - 1.5 * rel;
                P.armR = -2.3 * k + 1.5 * rel;
            }
            P.rootY = -10 * k + Math.sin(time * 8) * 1.5;
        } else if (pose.action === PuppetAction.Dash) {
            P.torso = v === PuppetView.Side ? 0.3 : 0;
            P.rootY = -6;
            if (v === PuppetView.Side) {
                P.armL = 0.9;
                P.farArm = 1.0;
                P.legL = {a: 0.5, lift: 4, sy: 1};
                P.farLeg = -0.4;
            } else {
                P.armL = 0.5;
                P.armR = -0.5;
                P.legL = {a: 0.1, lift: 10, sy: 0.9};
                P.legR = {a: -0.1, lift: 4, sy: 0.95};
            }
        }
        // Poses are authored for side art facing right; mirror the signs when the art faces left.
        if (v === PuppetView.Side && this.puppet.sideFacing === -1) {
            P.torso = -P.torso;
            P.head = -P.head;
            P.armL = -P.armL;
            P.farArm = -P.farArm;
            P.farLeg = -P.farLeg;
            P.weapon = -P.weapon;
            P.rootX = -P.rootX;
            P.legL = {a: -P.legL.a, lift: P.legL.lift, sy: P.legL.sy};
        }
        // Open-armed art hangs straighter; weapon angles stay absolute.
        const rest: {l: number; r: number} = this.puppet.views[v].rest;
        if (v === PuppetView.Side) {
            P.armL += rest.l;
            P.farArm += rest.l;
            P.weapon -= rest.l;
        } else {
            P.armL += rest.l;
            P.armR += rest.r;
            P.weapon -= v === PuppetView.Back ? rest.r : rest.l;
        }
        // Tail (or scarf): lazy sway, livelier when walking, a flick on attacks.
        P.tail = Math.sin(time * 2.2) * 0.1 + (pose.moving ? Math.sin(pose.walk + 1.2) * 0.22 : 0)
            + (pose.action === PuppetAction.Attack ? Math.sin(Math.min(1, pose.actionTime / 0.5) * Math.PI) * 0.35 : 0);
        return P;
    }

    private poseSlash(P: PoseFrame, v: PuppetView, t: number): void {
        let a: number;
        if (v === PuppetView.Side) {
            // Overhead chop: back-up -> over the head -> forward-down -> back to hanging.
            if (t < 0.14) {
                a = ease(t / 0.14) * 2.5;
            } else if (t < 0.24) {
                a = 2.5 + ease((t - 0.14) / 0.1) * 2.7;
            } else {
                a = 5.2 + ease(Math.min(1, (t - 0.24) / 0.32)) * (2 * Math.PI - 5.2);
            }
        } else if (t < 0.14) {
            a = ease(t / 0.14) * 2.5;
        } else if (t < 0.24) {
            a = 2.5 - ease((t - 0.14) / 0.1) * 3.6;
        } else {
            a = -1.1 + ease(Math.min(1, (t - 0.24) / 0.32)) * 1.1;
        }
        // Wrist whip: during the strike the blade leads the hand, then settles back to guard.
        const whip: number = t > 0.14 && t < 0.3 ? Math.sin((t - 0.14) / 0.16 * Math.PI) * 0.75 : 0;
        const recover: number = t > 0.24 ? ease(Math.min(1, (t - 0.24) / 0.32)) : 0;
        if (v === PuppetView.Side) {
            P.armL = a;
            P.weapon = (t < 0.14 ? 0.3 : 0.5 * (1 - recover) - 0.95 * recover) + whip;
            P.torso = t < 0.14 ? -0.1 : t < 0.32 ? 0.16 : 0.16 * (1 - Math.min(1, (t - 0.32) / 0.25));
            P.rootX = t < 0.14 ? -10 : t < 0.32 ? 34 : 34 * (1 - Math.min(1, (t - 0.32) / 0.25));
            P.legL = {a: -0.35, lift: 0, sy: 1};
            P.farLeg = 0.3;
        } else if (v === PuppetView.Back) {
            // Enemy is up the screen: rising slash that passes behind the body and ends above the head.
            let b: number;
            if (t < 0.14) {
                b = -0.55 * ease(t / 0.14);
            } else if (t < 0.26) {
                b = -0.55 + ease((t - 0.14) / 0.12) * 3.25;
            } else {
                b = 2.7 * (1 - ease(Math.min(1, (t - 0.3) / 0.2)) * (t > 0.3 ? 1 : 0));
            }
            P.armR = b;
            P.weapon = t < 0.14 ? -0.6 : (t < 0.26 ? whip : -0.85 * recover);
            P.torso = t < 0.14 ? 0.05 : -0.08 * (1 - recover);
            P.rootY = t < 0.14 ? 3 : -6 * (1 - recover);
        } else {
            P.armL = a;
            P.weapon = (t < 0.14 ? 0.1 : 0.7) - whip;
            P.torso = t < 0.14 ? -0.05 : 0.08;
            P.rootY = t < 0.14 ? -4 : 6 * (1 - Math.min(1, (t - 0.24) / 0.3));
        }
    }

    private poseStaff(P: PoseFrame, v: PuppetView, t: number): void {
        // Raise the staff and point its head at the enemy (the scene fires the bolt from weaponHead).
        const k2: number = ease(Math.min(1, t / 0.22)) * (1 - (t > 0.42 ? ease(Math.min(1, (t - 0.42) / 0.3)) : 0));
        if (v === PuppetView.Side) {
            P.armL = -1.35 * k2 + P.armL * (1 - k2);
            P.weapon = (1.25 - P.armL) * k2 + 0.1 * (1 - k2);
            P.torso = -0.05 * k2;
        } else if (v === PuppetView.Back) {
            P.armR = -2.5 * k2 + P.armR * (1 - k2);
            P.weapon = (0.15 - P.armR) * k2 - 0.06 * (1 - k2);
        } else {
            P.armL = 2.5 * k2 + P.armL * (1 - k2);
            P.weapon = (-0.15 - P.armL) * k2 + 0.06 * (1 - k2);
        }
    }

    private posePoleSpin(P: PoseFrame, t: number): void {
        const k2: number = ease(Math.min(1, t / 0.1)) * (1 - (t > 0.55 ? ease(Math.min(1, (t - 0.55) / 0.2)) : 0));
        P.armL = -1.2 * k2 + P.armL * (1 - k2);
        P.weapon = 0.95 + clamp01((t - 0.08) / 0.45) * Math.PI * 4 - P.armL * k2;
        P.rootX = 12 * k2;
        P.torso = 0.06 * k2;
    }

    private poseBow(P: PoseFrame, v: PuppetView, t: number): void {
        const raise: number = ease(Math.min(1, t / 0.16));
        const rec: number = t > 0.45 ? ease(Math.min(1, (t - 0.45) / 0.3)) : 0;
        const k2: number = raise * (1 - rec);
        const draw: number = t < 0.16 ? 0 : t < 0.42 ? ease((t - 0.16) / 0.26) : Math.max(0, 1 - (t - 0.42) / 0.05);
        if (v === PuppetView.Side) {
            P.armL = -1.45 * k2;
            const pull: number = t < 0.16 ? -1.3 * raise : t < 0.42 ? -1.3 + 0.75 * ease((t - 0.16) / 0.26) : -0.55 + 0.4 * Math.min(1, (t - 0.42) / 0.08);
            P.farArm = pull * (1 - rec);
            P.weapon = -P.armL + 0.05;
            P.torso = -0.04 * k2;
        } else if (v === PuppetView.Back) {
            // From behind: bow upright next to the head, the drawing hand behind the head.
            P.armR = -2.15 * k2 + P.armR * (1 - k2);
            P.armRSY = 1 - 0.22 * k2;
            P.armL = -2.8 * k2 + P.armL * (1 - k2);
            P.armLSY = 1 - (0.45 + 0.12 * draw) * k2;
            P.weapon = (-0.18 - P.armR) * k2 - 1.15 * (1 - k2);
        } else {
            // Towards the camera (Zelda style): bow horizontal in front of the chest.
            P.armL = -0.55 * k2 + P.armL * (1 - k2);
            P.armLSY = 1 - 0.5 * k2;
            P.armR = 0.5 * k2 + P.armR * (1 - k2);
            P.armRSY = 1 - (0.58 + 0.12 * draw) * k2;
            P.weapon = (-Math.PI / 2 - P.armL) * k2 + 0.12 * (1 - k2);
        }
    }
}
