/**
 * Cached team-logo lookups.
 *
 * Backed by a `team_logos` table keyed by lowercase team name.
 * - On first request for a name we kick off a TheSportsDB lookup in the background
 *   and store the result (URL or empty string for "tried but nothing found").
 * - Subsequent reads are instant from the DB.
 *
 * `ensureLogosForTeams` is fire-and-forget — never block the caller's response.
 */

import db from './db';
import { fetchTeamLogo } from './sportsdb';
import { listKnownCountryNames } from './countryFlags';

let migrated = false;
async function ensureTable() {
    if (migrated) return;
    await db.query(`
        CREATE TABLE IF NOT EXISTS team_logos (
            name_key TEXT PRIMARY KEY,           -- lower-case, trimmed team name
            display_name TEXT NOT NULL,           -- the original name we first saw
            logo_url TEXT,                        -- nullable; empty/null means "tried, none"
            fetched_at BIGINT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 1
        );
    `).catch(() => {});

    // One-time cleanup: clear any cached entries for known countries that don't
    // already point at a FlagCDN URL. These are the bad fuzzy-match logos
    // (e.g. "Finland" → Arsenal) from before the country-first lookup landed.
    const countryKeys = listKnownCountryNames();
    if (countryKeys.length) {
        const placeholders = countryKeys.map((_, i) => `$${i + 1}`).join(',');
        await db.query(
            `DELETE FROM team_logos
             WHERE name_key IN (${placeholders})
               AND (logo_url IS NULL OR logo_url NOT LIKE 'https://flagcdn.com/%')`,
            countryKeys
        ).catch(() => {});
    }

    migrated = true;
}

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ATTEMPTS = 3;

function nameKey(s: string) {
    return s.trim().toLowerCase();
}

/**
 * Fire-and-forget lookup for any team names that aren't already cached
 * (or are stale and worth retrying). Safe to call from POST handlers.
 */
export function ensureLogosForTeams(teamNames: string[]) {
    // Don't await — return immediately
    void (async () => {
        try {
            await ensureTable();
            const unique = Array.from(new Set(teamNames.map(t => t?.trim()).filter(Boolean)));
            if (!unique.length) return;

            for (const name of unique) {
                const key = nameKey(name);
                const { rows } = await db.query(
                    'SELECT logo_url, fetched_at, attempts FROM team_logos WHERE name_key = $1',
                    [key]
                );
                const existing = rows[0] as { logo_url: string | null; fetched_at: number; attempts: number } | undefined;

                // Skip if we already have a logo
                if (existing?.logo_url) continue;

                // Skip if we've already tried too many times recently
                if (existing && existing.attempts >= MAX_ATTEMPTS && Date.now() - existing.fetched_at < STALE_AFTER_MS) continue;

                const logo = await fetchTeamLogo(name);

                if (existing) {
                    await db.query(
                        'UPDATE team_logos SET logo_url = $1, fetched_at = $2, attempts = attempts + 1 WHERE name_key = $3',
                        [logo, Date.now(), key]
                    );
                } else {
                    await db.query(
                        `INSERT INTO team_logos (name_key, display_name, logo_url, fetched_at, attempts)
                         VALUES ($1, $2, $3, $4, 1)
                         ON CONFLICT (name_key) DO NOTHING`,
                        [key, name, logo, Date.now()]
                    );
                }
            }
        } catch (err) {
            console.error('[teamLogos] background fetch failed:', err);
        }
    })();
}

/**
 * Bulk-lookup logos for a set of team names. Returns a Map<lowercased name -> url|null>.
 * Only returns rows that exist in the cache — does NOT trigger a fetch.
 */
export async function getLogosForTeams(teamNames: string[]): Promise<Map<string, string | null>> {
    await ensureTable();
    const unique = Array.from(new Set(teamNames.map(t => t?.trim()).filter(Boolean)));
    if (!unique.length) return new Map();

    const keys = unique.map(nameKey);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await db.query(
        `SELECT name_key, logo_url FROM team_logos WHERE name_key IN (${placeholders})`,
        keys
    );

    const map = new Map<string, string | null>();
    for (const r of rows as { name_key: string; logo_url: string | null }[]) {
        map.set(r.name_key, r.logo_url);
    }
    return map;
}

export { nameKey };
