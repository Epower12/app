/**
 * Tournament presets registry.
 * Add new tournaments by appending an entry to PRESETS.
 *
 * Each preset bundles the metadata shown to users with its match list,
 * so the UI can render a dropdown selector + a checklist without any per-tournament special-casing.
 */

import { IIHF_2026_MATCHES, IihfMatch } from './iihf2026';

export interface PresetMatch extends IihfMatch {}

export interface TournamentPreset {
    id: string;          // stable URL-safe key, e.g. 'iihf2026'
    name: string;        // display name
    sport: string;       // 'Ice Hockey' | 'Football' | ...
    icon: string;        // emoji shown in the dropdown
    venue: string;       // host city/country
    dateRange: string;   // human-readable date span
    description: string; // one-line summary
    notes?: string;      // optional caveat (e.g. "playoffs not included")
    matches: PresetMatch[];
}

export const PRESETS: TournamentPreset[] = [
    {
        id: 'iihf2026',
        name: 'IIHF World Championship 2026',
        sport: 'Ice Hockey',
        icon: '🏒',
        venue: 'Zürich & Fribourg, Switzerland',
        dateRange: 'May 15 – 26, 2026',
        description: 'All 56 group stage games (CEST timezone)',
        notes: 'Playoffs (QF/SF/Final) must be added manually once teams are known after May 26.',
        matches: IIHF_2026_MATCHES,
    },
    // Future presets go here, e.g.:
    // { id: 'fifa-wc-2026', name: 'FIFA World Cup 2026', sport: 'Football', ... },
    // { id: 'iihf2025', name: 'IIHF World Championship 2025', sport: 'Ice Hockey', ... },
];

/** Lightweight metadata-only view (no matches array) — used by the dropdown */
export interface PresetSummary {
    id: string;
    name: string;
    sport: string;
    icon: string;
    venue: string;
    dateRange: string;
    description: string;
    notes?: string;
    matchCount: number;
}

export function listPresets(): PresetSummary[] {
    return PRESETS.map(p => ({
        id: p.id,
        name: p.name,
        sport: p.sport,
        icon: p.icon,
        venue: p.venue,
        dateRange: p.dateRange,
        description: p.description,
        notes: p.notes,
        matchCount: p.matches.length,
    }));
}

export function getPreset(id: string): TournamentPreset | undefined {
    return PRESETS.find(p => p.id === id);
}
