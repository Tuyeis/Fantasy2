import {ClassKey, CLASSES, HeroLook} from "../data/hero-classes";
import {drawHero, HeroPose} from "./hero-sprite";
import {actionDuration, PuppetActor} from "./puppet/puppet-actor";
import {getPuppet} from "./puppet/puppet-loader";
import {Puppet, PuppetAction, PuppetView} from "./puppet/puppet-types";

/** Neck-to-feet height of a puppet at pose.scale 1 (the whole figure with its big chibi head is about 1.8x this). */
export const PUPPET_BODY_HEIGHT: number = 32;

const actors: Map<string, PuppetActor> = new Map<string, PuppetActor>();

/** One actor per on-screen character so every weapon keeps its own spring. */
export function puppetActor(actorId: string, puppet: Puppet): PuppetActor {
    const id: string = actorId + ":" + puppet.key;
    let actor: PuppetActor | undefined = actors.get(id);
    if (!actor) {
        actor = new PuppetActor(puppet);
        actors.set(id, actor);
    }
    return actor;
}

/**
 * Draws a character of a class: its painted puppet when loaded, the procedural sprite otherwise.
 * (x, y) are the feet, like drawHero.
 */
export function drawClassHero(ctx: CanvasRenderingContext2D, x: number, y: number, classKey: ClassKey, pose: HeroPose, actorId: string = "hero", fallbackLook: HeroLook = CLASSES[classKey].look): void {
    const puppet: Puppet | undefined = getPuppet(classKey);
    if (!puppet) {
        drawHero(ctx, x, y, fallbackLook, pose);
        return;
    }
    const action: PuppetAction = pose.attack > 0 ? PuppetAction.Attack : PuppetAction.None;
    puppetActor(actorId, puppet).draw(ctx, x, y, {
        view: pose.view ?? PuppetView.Side,
        facing: pose.facing,
        walk: pose.walk,
        moving: pose.moving,
        action: action,
        actionTime: pose.attack * actionDuration(puppet, action),
        flash: pose.flash,
        time: pose.time,
        bodyHeight: PUPPET_BODY_HEIGHT * pose.scale
    });
}
