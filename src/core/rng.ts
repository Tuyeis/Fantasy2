export function randFloat(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number): number {
    return Math.floor(randFloat(min, max + 1));
}

export function chance(probability: number): boolean {
    return Math.random() < probability;
}

export function pick<T>(list: T[]): T {
    return list[Math.floor(Math.random() * list.length)];
}

export function shuffle<T>(list: T[]): T[] {
    const copy: T[] = [...list];
    for (let i: number = copy.length - 1; i > 0; i--) {
        const j: number = Math.floor(Math.random() * (i + 1));
        const temp: T = copy[i];
        copy[i] = copy[j];
        copy[j] = temp;
    }
    return copy;
}

export function weightedPick<T>(entries: T[], weightOf: (entry: T) => number): T {
    const total: number = entries.reduce((sum: number, entry: T) => sum + Math.max(0, weightOf(entry)), 0);
    let roll: number = Math.random() * total;
    for (const entry of entries) {
        roll -= Math.max(0, weightOf(entry));
        if (roll <= 0) {
            return entry;
        }
    }
    return entries[entries.length - 1];
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
