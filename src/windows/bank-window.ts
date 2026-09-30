import {Sfx} from "../core/audio-engine";
import {Game} from "../core/game";
import {t} from "../core/i18n";
import {SaveData} from "../core/save-store";
import {button, el, WindowHandle} from "../core/ui";
import {BAG_SLOTS, BANK_SLOTS, BankDirection, bagUsed, bankUsed, transferGear, transferStack} from "../logic/bank";
import {StorageCell, storageCells, storageGrid} from "./storage-grid";
import {fail, npcLine, sectionTitle} from "./window-helpers";

/** Bank: bag on the left, vault on the right; clicking an item moves it to the other side. */
export function openBank(game: Game, onChange: () => void): void {
    const save: SaveData = game.save as SaveData;
    const win: WindowHandle = game.ui.openWindow({title: t("bank"), cls: "window-bank"});

    const transfer: (cell: StorageCell, direction: BankDirection) => boolean = (cell: StorageCell, direction: BankDirection) =>
        cell.gear ? transferGear(save, direction, cell.gear.uid) : transferStack(save, direction, cell.key, cell.count);

    const moved: (ok: boolean, fullKey: "bankFull" | "bagFull") => void = (ok: boolean, fullKey: "bankFull" | "bagFull") => {
        if (!ok) {
            fail(game, t(fullKey));
            return;
        }
        game.audio.play(Sfx.Pickup);
        game.saveGame();
        onChange();
        render();
    };

    const render: () => void = () => {
        const bagCells: StorageCell[] = storageCells(save, save.inventory, true);
        const bankCells: StorageCell[] = storageCells(save, save.bank, false);
        const bag: HTMLElement = el("div", {}, [
            sectionTitle(t("bag") + " · " + t("slotsUsed", {used: bagUsed(save), max: BAG_SLOTS})),
            storageGrid(bagCells, BAG_SLOTS, (cell: StorageCell) => moved(transfer(cell, BankDirection.Deposit), "bankFull")),
            el("div", {style: {marginTop: "8px"}}, [button(t("depositAll"), () => {
                let any: boolean = false;
                for (const cell of storageCells(save, save.inventory, true)) {
                    any = transfer(cell, BankDirection.Deposit) || any;
                }
                moved(any || bagUsed(save) === 0, "bankFull");
            }, {cls: "btn-small"})])
        ]);
        const vault: HTMLElement = el("div", {}, [
            sectionTitle(t("bank") + " · " + t("slotsUsed", {used: bankUsed(save), max: BANK_SLOTS})),
            storageGrid(bankCells, BANK_SLOTS, (cell: StorageCell) => moved(transfer(cell, BankDirection.Withdraw), "bagFull"))
        ]);
        win.body.replaceChildren(npcLine(t("bankGreeting")), el("div", {cls: "bank-columns"}, [bag, vault]));
    };
    render();
}
