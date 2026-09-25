/**
 * IIHF World Championship 2026 — Full Group Stage Schedule
 * Location: Zürich & Fribourg, Switzerland
 * Times stored as ISO strings in UTC (local CEST = UTC+2, so 16:20 local = 14:20 UTC)
 */

const TEAMS: Record<string, string> = {
    FIN: 'Finland', GER: 'Germany', CAN: 'Canada', SWE: 'Sweden',
    USA: 'United States', SUI: 'Switzerland', CZE: 'Czechia', DEN: 'Denmark',
    GBR: 'Great Britain', AUT: 'Austria', SVK: 'Slovakia', NOR: 'Norway',
    HUN: 'Hungary', ITA: 'Italy', LAT: 'Latvia', SLO: 'Slovenia',
};

// [homeCode, awayCode, 'YYYY-MM-DDTHH:MM:00Z'] — times in UTC
const RAW: [string, string, string][] = [
    // May 15
    ['FIN', 'GER', '2026-05-15T14:20:00Z'],
    ['CAN', 'SWE', '2026-05-15T14:20:00Z'],
    ['USA', 'SUI', '2026-05-15T18:20:00Z'],
    ['CZE', 'DEN', '2026-05-15T18:20:00Z'],
    // May 16
    ['GBR', 'AUT', '2026-05-16T10:20:00Z'],
    ['SVK', 'NOR', '2026-05-16T10:20:00Z'],
    ['HUN', 'FIN', '2026-05-16T14:20:00Z'],
    ['ITA', 'CAN', '2026-05-16T14:20:00Z'],
    ['SUI', 'LAT', '2026-05-16T18:20:00Z'],
    ['SLO', 'CZE', '2026-05-16T18:20:00Z'],
    // May 17
    ['GBR', 'USA', '2026-05-17T10:20:00Z'],
    ['ITA', 'SVK', '2026-05-17T10:20:00Z'],
    ['AUT', 'HUN', '2026-05-17T14:20:00Z'],
    ['DEN', 'SWE', '2026-05-17T14:20:00Z'],
    ['GER', 'LAT', '2026-05-17T18:20:00Z'],
    ['NOR', 'SLO', '2026-05-17T18:20:00Z'],
    // May 18
    ['FIN', 'USA', '2026-05-18T14:20:00Z'],
    ['CAN', 'DEN', '2026-05-18T14:20:00Z'],
    ['GER', 'SUI', '2026-05-18T18:20:00Z'],
    ['SWE', 'CZE', '2026-05-18T18:20:00Z'],
    // May 19
    ['LAT', 'AUT', '2026-05-19T14:20:00Z'],
    ['ITA', 'NOR', '2026-05-19T14:20:00Z'],
    ['HUN', 'GBR', '2026-05-19T18:20:00Z'],
    ['SLO', 'SVK', '2026-05-19T18:20:00Z'],
    // May 20
    ['AUT', 'SUI', '2026-05-20T14:20:00Z'],
    ['CZE', 'ITA', '2026-05-20T14:20:00Z'],
    ['USA', 'GER', '2026-05-20T18:20:00Z'],
    ['SWE', 'SLO', '2026-05-20T18:20:00Z'],
    // May 21
    ['LAT', 'FIN', '2026-05-21T14:20:00Z'],
    ['CAN', 'NOR', '2026-05-21T14:20:00Z'],
    ['SUI', 'GBR', '2026-05-21T18:20:00Z'],
    ['DEN', 'SVK', '2026-05-21T18:20:00Z'],
    // May 22
    ['GER', 'HUN', '2026-05-22T14:20:00Z'],
    ['CAN', 'SLO', '2026-05-22T14:20:00Z'],
    ['FIN', 'GBR', '2026-05-22T18:20:00Z'],
    ['SWE', 'ITA', '2026-05-22T18:20:00Z'],
    // May 23
    ['LAT', 'USA', '2026-05-23T10:20:00Z'],
    ['DEN', 'SLO', '2026-05-23T10:20:00Z'],
    ['SUI', 'HUN', '2026-05-23T14:20:00Z'],
    ['SVK', 'CZE', '2026-05-23T14:20:00Z'],
    ['AUT', 'GER', '2026-05-23T18:20:00Z'],
    ['NOR', 'SWE', '2026-05-23T18:20:00Z'],
    // May 24
    ['GBR', 'LAT', '2026-05-24T14:20:00Z'],
    ['DEN', 'ITA', '2026-05-24T14:20:00Z'],
    ['FIN', 'AUT', '2026-05-24T18:20:00Z'],
    ['SVK', 'CAN', '2026-05-24T18:20:00Z'],
    // May 25
    ['USA', 'HUN', '2026-05-25T14:20:00Z'],
    ['CZE', 'NOR', '2026-05-25T14:20:00Z'],
    ['GER', 'GBR', '2026-05-25T18:20:00Z'],
    ['SLO', 'ITA', '2026-05-25T18:20:00Z'],
    // May 26 (last group stage day)
    ['HUN', 'LAT', '2026-05-26T10:20:00Z'],
    ['NOR', 'DEN', '2026-05-26T10:20:00Z'],
    ['USA', 'AUT', '2026-05-26T14:20:00Z'],
    ['SWE', 'SVK', '2026-05-26T14:20:00Z'],
    ['SUI', 'FIN', '2026-05-26T18:20:00Z'],
    ['CZE', 'CAN', '2026-05-26T18:20:00Z'],
];

export interface IihfMatch {
    teamA: string;
    teamB: string;
    scheduledTime: number; // unix timestamp
    sport: string;
}

export const IIHF_2026_MATCHES: IihfMatch[] = RAW.map(([home, away, iso]) => ({
    teamA: TEAMS[home],
    teamB: TEAMS[away],
    scheduledTime: Math.floor(new Date(iso).getTime() / 1000),
    sport: 'Ice Hockey',
}));
