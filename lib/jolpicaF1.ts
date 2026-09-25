/**
 * Jolpica-F1 client — a free, community-run drop-in replacement for the
 * discontinued Ergast API. No key required. Docs: https://github.com/jolpica/jolpica-f1
 */

import type { F1ResultRow } from './results';

interface JolpicaResult {
    number?: string; position: string; positionText?: string; grid?: string; laps?: string;
    Driver: { givenName: string; familyName: string };
    Time?: { time?: string }; FastestLap?: { rank?: string };
}

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

export interface F1Race {
    round: number;
    raceName: string;
    timestamp: number;
}

export type { F1ResultRow };

/** Fetch the full race calendar for a season. */
export async function fetchF1SeasonRaces(season: number): Promise<F1Race[]> {
    const res = await fetch(`${BASE_URL}/${season}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Jolpica-F1 HTTP error: ${res.status}`);
    const data = await res.json();
    const races = data.MRData?.RaceTable?.Races ?? [];

    return races.map((r: any) => {
        const dateTime = r.time ? `${r.date}T${r.time}` : `${r.date}T00:00:00Z`;
        return {
            round: Number(r.round),
            raceName: r.raceName,
            timestamp: Math.floor(new Date(dateTime).getTime() / 1000),
        };
    });
}

/** Fetch the full classification for a race. Returns [] if it hasn't been run yet. */
export async function fetchF1RaceResults(season: number, round: number): Promise<F1ResultRow[]> {
    const res = await fetch(`${BASE_URL}/${season}/${round}/results.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Jolpica-F1 HTTP error: ${res.status}`);
    const data = await res.json();
    const results = data.MRData?.RaceTable?.Races?.[0]?.Results ?? [];

    return results.map((r: JolpicaResult) => ({
        number: String(r.number ?? ''),
        driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
        position: Number(r.position),
        positionText: String(r.positionText ?? r.position),
        grid: Number(r.grid ?? 0),
        laps: Number(r.laps ?? 0),
        time: r.Time?.time ?? null,
        fastestLapRank: r.FastestLap?.rank ? Number(r.FastestLap.rank) : null,
    }));
}

/** Pole sitter (P1 in qualifying), or null if qualifying hasn't been published. */
export async function fetchF1Pole(season: number, round: number): Promise<{ driverName: string; number: string } | null> {
    const res = await fetch(`${BASE_URL}/${season}/${round}/qualifying.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Jolpica-F1 HTTP error: ${res.status}`);
    const data = await res.json();
    const q = (data.MRData?.RaceTable?.Races?.[0]?.QualifyingResults ?? []).find((r: JolpicaResult) => Number(r.position) === 1);
    return q ? { driverName: `${q.Driver.givenName} ${q.Driver.familyName}`, number: String(q.number ?? '') } : null;
}
