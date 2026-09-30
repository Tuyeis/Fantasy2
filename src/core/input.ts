export interface Vec2 {
    x: number;
    y: number;
}

const PREVENT_DEFAULT_CODES: string[] = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];

/** Keyboard + mouse state, polled once per frame. */
export class Input {
    public mouseX: number = 0;
    public mouseY: number = 0;
    public wheel: number = 0;
    private readonly down: Set<string> = new Set<string>();
    private readonly pressed: Set<string> = new Set<string>();
    private leftDown: boolean = false;
    private rightDown: boolean = false;
    private leftClicked: boolean = false;
    private rightClicked: boolean = false;

    constructor(private readonly canvas: HTMLCanvasElement) {
        window.addEventListener("keydown", (e: KeyboardEvent) => this.onKeyDown(e));
        window.addEventListener("keyup", (e: KeyboardEvent) => this.down.delete(e.code));
        window.addEventListener("blur", () => {
            this.down.clear();
            this.leftDown = false;
            this.rightDown = false;
        });
        canvas.addEventListener("wheel", (e: WheelEvent) => {
            e.preventDefault();
            this.wheel += Math.sign(e.deltaY);
        }, {passive: false});
        canvas.addEventListener("mousemove", (e: MouseEvent) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });
        canvas.addEventListener("mousedown", (e: MouseEvent) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            if (e.button === 0) {
                this.leftDown = true;
                this.leftClicked = true;
            } else if (e.button === 2) {
                this.rightDown = true;
                this.rightClicked = true;
            }
        });
        window.addEventListener("mouseup", (e: MouseEvent) => {
            if (e.button === 0) {
                this.leftDown = false;
            } else if (e.button === 2) {
                this.rightDown = false;
            }
        });
        canvas.addEventListener("contextmenu", (e: MouseEvent) => e.preventDefault());
    }

    private onKeyDown(e: KeyboardEvent): void {
        const target: EventTarget | null = e.target;
        const typing: boolean = target instanceof HTMLInputElement && target.type !== "range" && target.type !== "checkbox";
        if (typing) {
            return;
        }
        if (PREVENT_DEFAULT_CODES.includes(e.code) && !(target instanceof HTMLButtonElement && e.code === "Space")) {
            e.preventDefault();
        }
        if (!e.repeat) {
            this.pressed.add(e.code);
        }
        this.down.add(e.code);
    }

    public isDown(code: string): boolean {
        return this.down.has(code);
    }

    public wasPressed(...codes: string[]): boolean {
        return codes.some((code: string) => this.pressed.has(code));
    }

    public get mouseLeftDown(): boolean {
        return this.leftDown;
    }

    public get mouseRightDown(): boolean {
        return this.rightDown;
    }

    public get mouseLeftClicked(): boolean {
        return this.leftClicked;
    }

    public get mouseRightClicked(): boolean {
        return this.rightClicked;
    }

    /** Normalised 8-direction movement vector from WASD / arrow keys. */
    public moveAxis(): Vec2 {
        let x: number = 0;
        let y: number = 0;
        if (this.isDown("KeyA") || this.isDown("ArrowLeft")) {
            x -= 1;
        }
        if (this.isDown("KeyD") || this.isDown("ArrowRight")) {
            x += 1;
        }
        if (this.isDown("KeyW") || this.isDown("ArrowUp")) {
            y -= 1;
        }
        if (this.isDown("KeyS") || this.isDown("ArrowDown")) {
            y += 1;
        }
        if (x !== 0 && y !== 0) {
            x *= Math.SQRT1_2;
            y *= Math.SQRT1_2;
        }
        return {x: x, y: y};
    }

    public clearAll(): void {
        this.down.clear();
        this.pressed.clear();
        this.wheel = 0;
    }

    public endFrame(): void {
        this.pressed.clear();
        this.wheel = 0;
        this.leftClicked = false;
        this.rightClicked = false;
    }

    public get element(): HTMLCanvasElement {
        return this.canvas;
    }
}
