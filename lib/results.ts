/**
 * Pure helpers that turn raw results from the sports APIs into the values a
 * league match stores. No database or network access here, so it's unit-tested
 * in results.test.ts.
 */

/**
 * Final score used for predictions: the score after extra time. When a game
 * was level and then decided by a penalty shoot-out, the shoot-out winner gets
 * +1 so every knockout has a winner (e.g. 1–1, 4–3 on penalties → 2–1).
 * Returns null when a level shoot-out game has no usable shoot-out score.
 */
export function finalScoreWithShootout(
    home: number | null, away: number | null,
    decidedByShootout: boolean,
    shootoutHome: number | null, shootoutAway: number | null,
): { home: number; away: number } | null {
    if (home === null || away === null) return null;
    if (!decidedByShootout || home !== away) return { home, away };
    if (shootoutHome === null || shootoutAway === null || shootoutHome === shootoutAway) return null;
    return shootoutHome > shootoutAway ? { home: home + 1, away } : { home, away: away + 1 };
}

/** "3-2" → [3, 2]; anything else → [null, null]. Used for API-Sports hockey period strings. */
export function parsePeriodScore(s: string | null | undefined): [number | null, number | null] {
    const m = /^\s*(\d+)\s*-\s*(\d+)\s*$/.exec(s ?? '');
    return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

// ── Formula 1 ────────────────────────────────────────────────────────────────

export interface F1ResultRow {
    number: string;
    driverName: string;
    position: number;
    /** "1".."20" when classified; "R" retired, "D" disqualified, "W" withdrawn/did not start, "N" not classified, … */
    positionText: string;
    grid: number;
    laps: number;
    /** Gap to the winner for P2 onwards, e.g. "+0.895" or "+1:02.345". Missing when lapped or out. */
    time: string | null;
    fastestLapRank: number | null;
}

export interface F1RaceSummary {
    top10: string[];
    fastestLap: string | null;
    firstRetirement: string | null;
    positionsGained: string | null;
    positionsLost: string | null;
    winningMargin: 'lt5' | '5to15' | 'gt15' | null;
    retirements: '0' | '1-2' | '3+' | null;
}

const isClassified = (r: F1ResultRow) => /^\d+$/.test(r.positionText);

/** "+0.895" → 0.895, "+1:02.345" → 62.345, otherwise null. */
export function parseGapSeconds(gap: string | null): number | null {
    const m = /^\+?(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec((gap ?? '').trim());
    if (!m) return null;
    return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
}

/** The single row with the highest value, or null when nobody qualifies or it's a tie. */
function uniqueMax(rows: F1ResultRow[], value: (r: F1ResultRow) => number): string | null {
    let best: F1ResultRow | null = null, bestV = 0, tied = false;
    for (const r of rows) {
        const v = value(r);
        if (v > bestV) { best = r; bestV = v; tied = false; }
        else if (v === bestV && best) tied = true;
    }
    return best && !tied ? best.driverName : null;
}

/**
 * Work out the Top 10 and the bonus-question answers from a race's full
 * classification. Anything that can't be decided cleanly (a tie, missing data)
 * is left null for the organiser to fill in. Safety car isn't in the data.
 */
export function summariseF1Race(rows: F1ResultRow[]): F1RaceSummary {
    const sorted = [...rows].sort((a, b) => a.position - b.position);
    const starters = sorted.filter(r => r.positionText !== 'W' && r.positionText !== 'F');
    const gridOf = (r: F1ResultRow) => (r.grid > 0 ? r.grid : starters.length); // grid 0 = pit-lane start
    const classified = starters.filter(isClassified);

    const fastest = sorted.filter(r => r.fastestLapRank === 1);

    // First retirement: the non-classified starter who covered the fewest laps.
    const out = starters.filter(r => !isClassified(r));
    let firstRetirement: string | null = null;
    if (out.length) {
        const fewest = Math.min(...out.map(r => r.laps));
        const first = out.filter(r => r.laps === fewest);
        firstRetirement = first.length === 1 ? first[0].driverName : null;
    }

    let winningMargin: F1RaceSummary['winningMargin'] = null;
    const second = classified.find(r => r.position === 2);
    if (second) {
        const gap = parseGapSeconds(second.time);
        winningMargin = gap === null ? 'gt15' : gap < 5 ? 'lt5' : gap <= 15 ? '5to15' : 'gt15';
    }

    const dnf = out.length;
    return {
        top10: sorted.filter(isClassified).slice(0, 10).map(r => r.driverName),
        fastestLap: fastest.length === 1 ? fastest[0].driverName : null,
        firstRetirement,
        positionsGained: uniqueMax(classified, r => gridOf(r) - r.position),
        positionsLost: uniqueMax(classified, r => r.position - gridOf(r)),
        winningMargin,
        retirements: starters.length ? (dnf === 0 ? '0' : dnf <= 2 ? '1-2' : '3+') : null,
    };
}

const normalise = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Map an API driver name onto the spelling the organiser used in the league's
 * driver list (players pick from that list, so points need the same string).
 * Tries full name, then a unique surname. Car numbers aren't used: organisers
 * often type their own, and a wrong match would hand out points for the wrong
 * driver. Falls back to the API spelling when the driver isn't in the list.
 */
export function makeDriverMatcher(roster: { driver_name: string }[]) {
    const byFull = new Map<string, string>();
    const bySurname = new Map<string, string | null>();
    for (const d of roster) {
        const full = normalise(d.driver_name);
        byFull.set(full, d.driver_name);
        const surname = full.split(' ').pop() ?? full;
        bySurname.set(surname, bySurname.has(surname) ? null : d.driver_name);
    }
    return (apiName: string | null): string | null => {
        if (!apiName) return null;
        const full = normalise(apiName);
        if (byFull.has(full)) return byFull.get(full)!;
        const surname = bySurname.get(full.split(' ').pop() ?? full);
        return surname ?? apiName;
    };
}
