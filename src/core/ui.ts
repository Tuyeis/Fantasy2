import {t} from "./i18n";

export interface ElOptions {
    cls?: string;
    text?: string;
    title?: string;
    style?: Partial<CSSStyleDeclaration>;
    onClick?: (e: MouseEvent) => void;
    disabled?: boolean;
}

export type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, opts: ElOptions = {}, children: Child[] = []): HTMLElementTagNameMap[K] {
    const node: HTMLElementTagNameMap[K] = document.createElement(tag);
    if (opts.cls) {
        node.className = opts.cls;
    }
    if (opts.text !== undefined) {
        node.textContent = opts.text;
    }
    if (opts.title) {
        node.title = opts.title;
    }
    if (opts.style) {
        Object.assign(node.style, opts.style);
    }
    if (opts.onClick) {
        // Widened to HTMLElement so the typed "click" overload (MouseEvent) applies to the generic tag.
        const target: HTMLElement = node;
        target.addEventListener("click", opts.onClick);
    }
    if (opts.disabled && node instanceof HTMLButtonElement) {
        node.disabled = true;
    }
    node.append(...children.filter((child: Child): child is Node | string => child !== null && child !== undefined && child !== false));
    return node;
}

export function button(label: string, onClick: () => void, opts: {cls?: string; disabled?: boolean; title?: string} = {}): HTMLButtonElement {
    return el("button", {cls: "btn " + (opts.cls ?? ""), text: label, disabled: opts.disabled, title: opts.title, onClick: () => onClick()});
}

export interface WindowOptions {
    title: string;
    cls?: string;
    closable?: boolean;
    onClose?: () => void;
}

export interface WindowHandle {
    body: HTMLElement;
    footer: HTMLElement;
    setTitle: (title: string) => void;
    close: () => void;
}

export enum ToastKind {
    Info = "info",
    Good = "good",
    Bad = "bad",
    Special = "special"
}

/** DOM overlay: HUD layer, modal windows (stack) and toasts. */
export class UiLayer {
    public readonly hud: HTMLElement;
    private readonly windows: HTMLElement;
    private readonly toasts: HTMLElement;
    private readonly stack: {handle: WindowHandle; closable: boolean}[] = [];

    constructor(root: HTMLElement, onButtonClick: () => void) {
        this.hud = el("div", {cls: "hud-layer"});
        this.windows = el("div", {cls: "window-layer"});
        this.toasts = el("div", {cls: "toast-layer"});
        root.append(this.hud, this.windows, this.toasts);
        root.addEventListener("click", (e: MouseEvent) => {
            if (e.target instanceof HTMLElement && e.target.closest("button")) {
                onButtonClick();
            }
        });
    }

    public hasModal(): boolean {
        return this.stack.length > 0;
    }

    public openWindow(opts: WindowOptions): WindowHandle {
        const titleEl: HTMLElement = el("div", {cls: "window-title-text", text: opts.title});
        const closable: boolean = opts.closable ?? true;
        const header: HTMLElement = el("div", {cls: "window-title"}, [titleEl]);
        const body: HTMLElement = el("div", {cls: "window-body"});
        const footer: HTMLElement = el("div", {cls: "window-footer"});
        const panel: HTMLElement = el("div", {cls: "window " + (opts.cls ?? "")}, [header, body, footer]);
        const backdrop: HTMLElement = el("div", {cls: "window-backdrop"}, [panel]);
        let closed: boolean = false;
        const handle: WindowHandle = {
            body: body,
            footer: footer,
            setTitle: (title: string) => {
                titleEl.textContent = title;
            },
            close: () => {
                if (closed) {
                    return;
                }
                closed = true;
                backdrop.remove();
                const index: number = this.stack.findIndex((entry: {handle: WindowHandle}) => entry.handle === handle);
                if (index >= 0) {
                    this.stack.splice(index, 1);
                }
                if (opts.onClose) {
                    opts.onClose();
                }
            }
        };
        if (closable) {
            header.append(el("button", {cls: "window-close", text: "✕", title: t("close"), onClick: () => handle.close()}));
        }
        this.windows.append(backdrop);
        this.stack.push({handle: handle, closable: closable});
        return handle;
    }

    /** Closes the top-most closable window. Returns true if a window was closed. */
    public closeTop(): boolean {
        const top: {handle: WindowHandle; closable: boolean} | undefined = this.stack[this.stack.length - 1];
        if (!top) {
            return false;
        }
        if (top.closable) {
            top.handle.close();
        }
        return true;
    }

    public closeAll(): void {
        for (const entry of [...this.stack].reverse()) {
            entry.handle.close();
        }
    }

    public toast(text: string, kind: ToastKind = ToastKind.Info): void {
        const node: HTMLElement = el("div", {cls: "toast toast-" + kind, text: text});
        this.toasts.append(node);
        window.setTimeout(() => node.classList.add("toast-out"), 2600);
        window.setTimeout(() => node.remove(), 3100);
        while (this.toasts.children.length > 5) {
            this.toasts.firstElementChild?.remove();
        }
    }

    public confirm(text: string, onYes: () => void): void {
        const win: WindowHandle = this.openWindow({title: "", cls: "window-small", closable: false});
        win.body.append(el("p", {cls: "dialog-text", text: text}));
        win.footer.append(
            button(t("no"), () => win.close()),
            button(t("yes"), () => {
                win.close();
                onYes();
            }, {cls: "btn-primary"})
        );
    }

    public message(title: string, text: string, onOk?: () => void): void {
        const win: WindowHandle = this.openWindow({title: title, cls: "window-small", closable: false});
        win.body.append(el("p", {cls: "dialog-text", text: text}));
        win.footer.append(button(t("ok"), () => {
            win.close();
            if (onOk) {
                onOk();
            }
        }, {cls: "btn-primary"}));
    }

    public clearHud(): void {
        this.hud.replaceChildren();
    }
}
