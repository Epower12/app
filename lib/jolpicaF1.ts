/**
 * Jolpica-F1 client — a free, community-run drop-in replacement for the
 * discontinued Ergast API. No key required. Docs: https://github.com/jolpica/jolpica-f1
 */

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

export interface F1Race {
    round: number;
    raceName: string;
    timestamp: number;
}

export interface F1RaceResult {
    position: number;
    driverName: string;
}

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

/** Fetch the finishing order (top 3) for a specific race. Returns [] if not yet run. */
export async function fetchF1RaceResults(season: number, round: number): Promise<F1RaceResult[]> {
    const res = await fetch(`${BASE_URL}/${season}/${round}/results.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Jolpica-F1 HTTP error: ${res.status}`);
    const data = await res.json();
    const results = data.MRData?.RaceTable?.Races?.[0]?.Results ?? [];

    return results
        .filter((r: any) => Number(r.position) <= 3)
        .map((r: any) => ({
            position: Number(r.position),
            driverName: `${r.Driver.givenName} ${r.Driver.familyName}`,
        }));
}
