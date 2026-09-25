/**
 * NHL public API client — no key required.
 * Docs: https://github.com/Zmalski/NHL-API-Reference (unofficial but stable, widely used)
 */

const BASE_URL = 'https://api-web.nhle.com/v1';

export interface NhlGame {
    id: number;
    timestamp: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    status: 'scheduled' | 'live' | 'finished';
}

function mapGameState(state: string): 'scheduled' | 'live' | 'finished' {
    if (state === 'OFF' || state === 'FINAL') return 'finished';
    if (state === 'LIVE' || state === 'CRIT') return 'live';
    return 'scheduled';
}

function teamName(team: any): string {
    const place = team.placeName?.default ?? '';
    const common = team.commonName?.default ?? team.abbrev ?? 'Unknown';
    return place ? `${place} ${common}` : common;
}

/**
 * Fetch every game for an NHL season by walking the weekly schedule endpoint
 * from the regular season start through the playoff end date.
 * seasonStartYear: the year the season starts in (e.g. 2025 for the 2025-2026 season).
 */
export async function fetchNhlSeasonGames(seasonStartYear: number): Promise<NhlGame[]> {
    const games: NhlGame[] = [];
    const seen = new Set<number>();

    let cursor = `${seasonStartYear}-09-01`;
    const hardStopDate = new Date(`${seasonStartYear + 1}-07-15T00:00:00Z`).getTime();
    const maxWeeks = 50; // safety cap so a malformed response can't loop forever

    for (let i = 0; i < maxWeeks; i++) {
        const res = await fetch(`${BASE_URL}/schedule/${cursor}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`NHL API HTTP error: ${res.status}`);
        const data = await res.json();

        for (const day of data.gameWeek ?? []) {
            for (const g of day.games ?? []) {
                if (seen.has(g.id)) continue;
                seen.add(g.id);
                games.push({
                    id: g.id,
                    timestamp: Math.floor(new Date(g.startTimeUTC).getTime() / 1000),
                    homeTeam: teamName(g.homeTeam),
                    awayTeam: teamName(g.awayTeam),
                    homeScore: g.homeTeam?.score ?? null,
                    awayScore: g.awayTeam?.score ?? null,
                    status: mapGameState(g.gameState),
                });
            }
        }

        if (!data.nextStartDate) break;
        cursor = data.nextStartDate;
        if (new Date(cursor).getTime() > hardStopDate) break;
    }

    return games;
}
