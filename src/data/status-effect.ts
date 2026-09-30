import {L, LocalizedText} from "../core/i18n";

export enum StatusKey {
    Poison = "poison",
    Burn = "burn",
    Freeze = "freeze",
    Sleep = "sleep",
    Charm = "charm"
}

export interface StatusDef {
    key: StatusKey;
    name: LocalizedText;
    color: string;
    /** Fraction of max HP lost per turn (0 = no damage over time). */
    tickPct: number;
    defaultTurns: number;
    /** The afflicted combatant skips its turn. */
    skipsTurn: boolean;
    /** Removed when the combatant receives damage. */
    breaksOnHit: boolean;
}

export const STATUSES: Record<StatusKey, StatusDef> = {
    [StatusKey.Poison]: {key: StatusKey.Poison, name: L("Veneno", "Poison", "Gift"), color: "#9be15d", tickPct: 0.06, defaultTurns: 4, skipsTurn: false, breaksOnHit: false},
    [StatusKey.Burn]: {key: StatusKey.Burn, name: L("Quemadura", "Burn", "Verbrennung"), color: "#ff8a3d", tickPct: 0.08, defaultTurns: 3, skipsTurn: false, breaksOnHit: false},
    [StatusKey.Freeze]: {key: StatusKey.Freeze, name: L("Congelación", "Freeze", "Frost"), color: "#8fe3ff", tickPct: 0, defaultTurns: 1, skipsTurn: true, breaksOnHit: false},
    [StatusKey.Sleep]: {key: StatusKey.Sleep, name: L("Sueño", "Sleep", "Schlaf"), color: "#b9a7ff", tickPct: 0, defaultTurns: 3, skipsTurn: true, breaksOnHit: true},
    [StatusKey.Charm]: {key: StatusKey.Charm, name: L("Hechizo", "Charm", "Betörung"), color: "#ff8fd0", tickPct: 0, defaultTurns: 2, skipsTurn: false, breaksOnHit: false}
};

/** Chance that a charmed combatant loses its action. */
export const CHARM_FAIL_CHANCE: number = 0.5;
