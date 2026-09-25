/**
 * Logo resolver. Two-tier strategy:
 *  1. If the team name matches a known country (Finland, Germany, ...) → FlagCDN.
 *     This is instant, free, and avoids TheSportsDB fuzzy-matching countries to
 *     random clubs (which is how "Finland" returned an Arsenal badge).
 *  2. Otherwise fall back to TheSportsDB's club-badge search.
 *
 * Docs:
 *   FlagCDN:      https://flagcdn.com/
 *   TheSportsDB:  https://www.thesportsdb.com/api.php  (free key: 3)
 */

import { getCountryFlagUrl } from './countryFlags';

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json';

interface SportsDbTeam {
    idTeam: string;
    strTeam: string;
    strTeamBadge?: string | null;
    strBadge?: string | null;        // newer field name
    strTeamLogo?: string | null;
    strSport?: string | null;
    strLeague?: string | null;
}

interface SearchTeamsResponse {
    teams: SportsDbTeam[] | null;
}

const KEY = process.env.THESPORTSDB_KEY ?? '3'; // free public key

/**
 * Look up the best-matching team badge URL for a team name.
 * Returns null if nothing reasonable was found.
 *
 * Strategy: prefer an exact case-insensitive match on team name,
 * then fall back to the first result that has any badge URL.
 */
export async function fetchTeamLogo(teamName: string): Promise<string | null> {
    if (!teamName) return null;

    // Tier 1: national team → FlagCDN (no API call)
    const flag = getCountryFlagUrl(teamName);
    if (flag) return flag;

    // Tier 2: TheSportsDB club search
    const url = `${BASE_URL}/${KEY}/searchteams.php?t=${encodeURIComponent(teamName.trim())}`;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;

        const data = (await res.json()) as SearchTeamsResponse;
        if (!data.teams || data.teams.length === 0) return null;

        const want = teamName.trim().toLowerCase();
        const exact = data.teams.find(t => t.strTeam?.toLowerCase() === want);
        const candidates = exact ? [exact, ...data.teams] : data.teams;

        for (const t of candidates) {
            const badge = t.strTeamBadge ?? t.strBadge ?? t.strTeamLogo ?? null;
            if (badge && badge.startsWith('https://')) return badge;
        }
        return null;
    } catch (err) {
        console.error('[sportsdb] fetchTeamLogo failed:', err);
        return null;
    }
}
