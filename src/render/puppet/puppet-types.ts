/**
 * Cut-out puppets: characters painted once per view (front / side / back) and cut into parts that are animated in code.
 * The art pipeline (tools/art) writes rig.json + part PNGs; this file types that data.
 */

export enum PuppetView {
    Front = "front",
    Side = "side",
    Back = "back"
}

export const ALL_VIEWS: PuppetView[] = [PuppetView.Front, PuppetView.Side, PuppetView.Back];

export enum PartName {
    Torso = "torso",
    Head = "head",
    ArmL = "arm_l",
    ArmR = "arm_r",
    LegL = "leg_l",
    LegR = "leg_r",
    Tail = "tail"
}

export enum WeaponType {
    None = "none",
    Sword = "sword",
    Dagger = "dagger",
    Axe = "axe",
    Club = "club",
    Bow = "bow",
    Staff = "staff",
    Trident = "trident",
    Pole = "pole",
    Shield = "shield"
}

export enum PuppetAction {
    None = "none",
    Attack = "attack",
    Cast = "cast",
    Dash = "dash"
}

export type Point = [number, number];

/** rig.json of one view. Coordinates are in the view's own pixel space; `bottom` is the feet line. */
export interface PuppetRig {
    parts: PuppetRig.Part[];
    joints: PuppetRig.Joints;
    top: number;
    bottom: number;
    /** Side view only: 1 = the art faces right, -1 = it faces left. */
    facing?: number;
    /** Small correction (radians) for heads that were painted slightly turned. */
    headTilt?: number;
}

export namespace PuppetRig {
    export interface Part {
        name: PartName | `${PartName}` | string;
        file: string;
        x: number;
        y: number;
        pivotX: number;
        pivotY: number;
        z?: number;
    }

    export interface Joints {
        neck: Point;
        hip: Point;
        shoulder_l?: Point;
        shoulder_r?: Point;
        hand_l?: Point;
        hand_r?: Point;
        hip_l?: Point;
        hip_r?: Point;
        tail?: Point;
    }
}

/** weapon.json / offhand.json */
export interface WeaponMeta {
    type?: WeaponType | `${WeaponType}` | string;
    /** Point of the image held in the fist. */
    grip: Point;
    w: number;
    h: number;
    /** Blades are painted tip down; staffs head up. */
    tipDown?: boolean;
    /** Bow only: ends of the string and on which side of the limbs it runs (-1 left, 1 right). */
    tipTop?: Point;
    tipBottom?: Point;
    stringSide?: number;
}

export interface LoadedPart extends PuppetRig.Part {
    img: HTMLImageElement;
    white: HTMLCanvasElement;
    dark: HTMLCanvasElement;
}

export interface LoadedView {
    rig: PuppetRig;
    parts: Map<string, LoadedPart>;
    /** Rest-angle correction of the arms (open A-pose art is brought back towards hanging straight). */
    rest: {l: number; r: number};
}

export interface LoadedItem {
    meta: WeaponMeta;
    type: WeaponType;
    img: HTMLImageElement;
    white: HTMLCanvasElement;
    dark: HTMLCanvasElement;
}

export interface Puppet {
    key: string;
    views: Record<PuppetView, LoadedView>;
    weapon: LoadedItem | undefined;
    offhand: LoadedItem | undefined;
    /** Direction the side art faces (1 right, -1 left). */
    sideFacing: number;
}

/** What the scene asks the puppet to do this frame. */
export interface PuppetPose {
    view: PuppetView;
    /** 1 = facing right, -1 = facing left (side view). */
    facing: number;
    /** Walk cycle phase in radians. */
    walk: number;
    moving: boolean;
    action: PuppetAction;
    /** Seconds since the action started. */
    actionTime: number;
    /** 0..1 white hit flash. */
    flash: number;
    /** Scene time in seconds (idle breathing, weapon physics). */
    time: number;
    /** On-screen height of the body from the neck to the feet, in pixels. */
    bodyHeight: number;
}
