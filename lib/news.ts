/**
 * News pipeline — fetches RSS feeds for all sports, dedupes, persists to Postgres.
 *
 * The /news page reads from the `news_items` table (instant load).
 * A separate POST /api/news/refresh endpoint pulls fresh items from RSS sources
 * — designed to be called on a schedule (Cloud Scheduler hourly cron).
 */

import Parser from 'rss-parser';
import crypto from 'crypto';
import db from './db';
import { SPORTS, SportSource, isOffTopic, BROAD_SCOPE_SOURCES, matchesSportKeywords } from './rssSources';

// ── Types ───────────────────────────────────────────────────────────────
export interface NewsItem {
    id: string;                // sha256 of (sport_id + canonical url)
    sport_id: string;          // e.g. 'football'
    title: string;
    link: string;
    description: string | null;
    source: string;            // e.g. 'BBC Sport'
    image_url: string | null;
    published_at: number;      // Unix seconds
    fetched_at: number;
}

// ── DB migration ────────────────────────────────────────────────────────
// Each statement is run separately. We only set `migrated = true` if the
// CREATE TABLE succeeds — indexes are best-effort. This guarantees we don't
// silently mark the migration "done" when the table still doesn't exist.
let migrated = false;
export async function ensureNewsTable() {
    if (migrated) return;

    await db.query(`
        CREATE TABLE IF NOT EXISTS news_items (
            id            TEXT PRIMARY KEY,
            sport_id      TEXT NOT NULL,
            title         TEXT NOT NULL,
            link          TEXT NOT NULL,
            description   TEXT,
            source        TEXT NOT NULL,
            image_url     TEXT,
            published_at  BIGINT NOT NULL,
            fetched_at    BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
        )
    `);

    // Indexes — best-effort, won't block if they already exist or fail
    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_news_sport_published
            ON news_items(sport_id, published_at DESC)
    `).catch(err => console.warn('news_items index #1 failed:', err.message));

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_news_published
            ON news_items(published_at DESC)
    `).catch(err => console.warn('news_items index #2 failed:', err.message));

    migrated = true;
}

// ── ID generation (stable, dedupe by sport + URL) ───────────────────────
function newsId(sportId: string, link: string): string {
    // Strip URL params and fragments so the same article from multiple
    // sources (with tracking params) dedupes to the same row.
    const clean = link.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return crypto.createHash('sha256').update(`${sportId}::${clean}`).digest('hex').slice(0, 24);
}

// ── Image extraction (best-effort from RSS item) ────────────────────────
function extractImageUrl(item: any): string | null {
    if (item.enclosure?.url && /\.(jpg|jpeg|png|webp|gif)/i.test(item.enclosure.url)) {
        return item.enclosure.url;
    }
    if (item['media:thumbnail']?.$.url) return item['media:thumbnail'].$.url;
    if (item['media:content']?.$.url) return item['media:content'].$.url;
    // Try to find first <img> in content
    const html = item['content:encoded'] || item.content || item.contentSnippet || '';
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m) return m[1];
    return null;
}

// ── Cross-source duplicate detection ────────────────────────────────────
// The dedup key above (sha256 of sport+URL) only catches the SAME url appearing
// twice. It can't catch the same real-world story covered by two different
// outlets at two different URLs — which is what actually reads as "duplicate
// news" to a user browsing the page. This does a lightweight title-similarity
// check within a time window to catch that case.

const TITLE_STOPWORDS = new Set([
    'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'and', 'is', 'are', 'with', 'at',
    'vs', 'v', 'after', 'as', 'from', 'his', 'her', 'its', 'it', 'be', 'will', 'has',
    'have', 'who', 'how', 'why', 'what', 'this', 'that', 'over', 'into', 'out', 'up',
]);

export function titleTokens(title: string): Set<string> {
    return new Set(
        title
            .toLowerCase()
            .replace(/['’]/g, '')
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !TITLE_STOPWORDS.has(w))
    );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0;
    let shared = 0;
    for (const w of a) if (b.has(w)) shared++;
    const union = a.size + b.size - shared;
    return union === 0 ? 0 : shared / union;
}

export const DUPLICATE_SIMILARITY_THRESHOLD = 0.5;
export const DUPLICATE_WINDOW_SECONDS = 48 * 3600;

export interface TitleFingerprint {
    id: string;
    tokens: Set<string>;
    publishedAt: number;
    imageUrl: string | null;
}

/** Finds the closest near-duplicate in `pool` within the time window, or null. */
export function findDuplicate(tokens: Set<string>, publishedAt: number, pool: TitleFingerprint[]): TitleFingerprint | null {
    let best: TitleFingerprint | null = null;
    let bestScore = 0;
    for (const p of pool) {
        if (Math.abs(publishedAt - p.publishedAt) > DUPLICATE_WINDOW_SECONDS) continue;
        const score = jaccardSimilarity(tokens, p.tokens);
        if (score > bestScore) { bestScore = score; best = p; }
    }
    return bestScore >= DUPLICATE_SIMILARITY_THRESHOLD ? best : null;
}

function cleanDescription(raw: string | undefined | null, maxLen = 200): string | null {
    if (!raw) return null;
    // Strip HTML tags, decode common entities, collapse whitespace
    const clean = raw
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    if (clean.length <= maxLen) return clean;
    return clean.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
}

// ── Per-sport fetcher ───────────────────────────────────────────────────
async function fetchSportNews(sport: SportSource): Promise<NewsItem[]> {
    const parser = new Parser({
        timeout: 15_000,
        headers: {
            'User-Agent': 'YourFriendsLeague/1.0 (+https://yourfriendleague.com)',
        },
    });
    const now = Math.floor(Date.now() / 1000);
    const items: NewsItem[] = [];
    const seenIds = new Set<string>();

    for (const feed of sport.feeds) {
        try {
            const parsed = await parser.parseURL(feed.url);
            for (const item of parsed.items) {
                const link = item.link?.trim();
                const title = item.title?.trim();
                if (!link || !title) continue;

                // Safety net: drop obvious off-topic items (food/lifestyle/viral)
                // that slip through aggregator feeds
                if (isOffTopic(title, link)) continue;

                // Broad-scope sources (general gaming/entertainment sites) must also
                // mention at least one sport-relevant keyword to be accepted.
                if (BROAD_SCOPE_SOURCES.has(feed.source) && !matchesSportKeywords(sport.id, title, item.contentSnippet)) continue;

                const id = newsId(sport.id, link);
                if (seenIds.has(id)) continue;
                seenIds.add(id);

                // Try isoDate first, then pubDate, then now — but reject any
                // result that's NaN (some feeds have invalid date strings).
                const tryDate = (s: string | undefined): number | null => {
                    if (!s) return null;
                    const t = new Date(s).getTime();
                    return Number.isFinite(t) ? Math.floor(t / 1000) : null;
                };
                const published = tryDate(item.isoDate) ?? tryDate(item.pubDate) ?? now;

                items.push({
                    id,
                    sport_id: sport.id,
                    title,
                    link,
                    description: cleanDescription(item.contentSnippet || item.content || item.summary),
                    source: feed.source,
                    image_url: extractImageUrl(item),
                    published_at: published,
                    fetched_at: now,
                });
            }
        } catch (err: any) {
            console.error(`[news] feed failed: ${feed.url} -`, err.message || err);
            // Continue with other feeds
        }
    }
    return items;
}

// ── Refresh all sports + upsert into DB ─────────────────────────────────
export async function refreshAllNews(): Promise<{
    fetched: number;
    inserted: number;
    bySport: Record<string, number>;
}> {
    await ensureNewsTable();

    const bySport: Record<string, number> = {};
    let fetched = 0;
    let inserted = 0;

    for (const sport of SPORTS) {
        const items = await fetchSportNews(sport);
        fetched += items.length;
        bySport[sport.id] = items.length;

        // Load recent existing rows for this sport so we can catch the same
        // real-world story arriving from a different source at a different URL.
        const { rows: existingRows } = await db.query(
            `SELECT id, title, published_at, image_url FROM news_items
             WHERE sport_id = $1 AND published_at > $2`,
            [sport.id, Math.floor(Date.now() / 1000) - DUPLICATE_WINDOW_SECONDS]
        );
        const pool: TitleFingerprint[] = existingRows.map((r: any) => ({
            id: r.id, tokens: titleTokens(r.title), publishedAt: Number(r.published_at), imageUrl: r.image_url,
        }));

        for (const item of items) {
            const alreadyExists = pool.some(p => p.id === item.id);

            if (!alreadyExists) {
                const dup = findDuplicate(titleTokens(item.title), item.published_at, pool);
                if (dup) {
                    // Same story from a different outlet — don't add a second card.
                    // Backfill an image onto the kept row if it didn't have one.
                    if (!dup.imageUrl && item.image_url) {
                        await db.query(`UPDATE news_items SET image_url = $1 WHERE id = $2`, [item.image_url, dup.id]).catch(() => {});
                        dup.imageUrl = item.image_url;
                    }
                    continue;
                }
            }

            const res = await db.query(
                `INSERT INTO news_items
                    (id, sport_id, title, link, description, source, image_url, published_at, fetched_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO UPDATE SET
                    title        = EXCLUDED.title,
                    description  = EXCLUDED.description,
                    image_url    = COALESCE(EXCLUDED.image_url, news_items.image_url),
                    fetched_at   = EXCLUDED.fetched_at
                 WHERE news_items.published_at = EXCLUDED.published_at`,
                [
                    item.id, item.sport_id, item.title, item.link, item.description,
                    item.source, item.image_url, item.published_at, item.fetched_at,
                ]
            );
            if ((res as any).rowCount === 1 && (res as any).command === 'INSERT') inserted++;

            if (!alreadyExists) {
                pool.push({ id: item.id, tokens: titleTokens(item.title), publishedAt: item.published_at, imageUrl: item.image_url });
            }
        }
    }

    // Prune anything older than 30 days to keep the table lean
    await db.query(
        `DELETE FROM news_items WHERE published_at < $1`,
        [Math.floor(Date.now() / 1000) - 30 * 24 * 3600]
    ).catch(() => {});

    return { fetched, inserted, bySport };
}

/**
 * Clean up: delete already-stored items that match current off-topic keywords.
 * Useful one-shot after tightening the filter or replacing a noisy feed.
 */
export async function purgeOffTopic(): Promise<number> {
    await ensureNewsTable();
    const { rows } = await db.query(`SELECT id, title, link FROM news_items`);
    const toDelete: string[] = [];
    for (const r of rows as { id: string; title: string; link: string }[]) {
        if (isOffTopic(r.title, r.link)) toDelete.push(r.id);
    }
    if (toDelete.length) {
        await db.query(`DELETE FROM news_items WHERE id = ANY($1::text[])`, [toDelete]);
    }
    return toDelete.length;
}

/**
 * One-shot cleanup for already-stored bad data, matching the purgeOffTopic()
 * pattern above:
 *   1. Removes existing rows sourced from the Sky Sports football feed — that
 *      feed was confirmed to actually be Sky's general all-sports feed, so any
 *      row it produced may be tennis/cricket/golf/darts mislabeled as football.
 *   2. Runs the same cross-source title-similarity dedup used at refresh time
 *      across everything already stored, removing later near-duplicate rows
 *      (keeping the earliest) and backfilling a missing image onto the kept row.
 */
export async function purgeMiscategorizedAndDuplicates(): Promise<{
    removedMiscategorized: number;
    removedDuplicates: number;
}> {
    await ensureNewsTable();

    const misRes = await db.query(
        `DELETE FROM news_items WHERE sport_id = 'football' AND source = 'Sky Sports'`
    );
    const removedMiscategorized = (misRes as any).rowCount ?? 0;

    let removedDuplicates = 0;
    for (const sport of SPORTS) {
        const { rows } = await db.query(
            `SELECT id, title, published_at, image_url FROM news_items WHERE sport_id = $1 ORDER BY published_at ASC`,
            [sport.id]
        );
        const kept: TitleFingerprint[] = [];
        const toDelete: string[] = [];

        for (const r of rows as any[]) {
            const tokens = titleTokens(r.title);
            const publishedAt = Number(r.published_at);
            const dup = findDuplicate(tokens, publishedAt, kept);
            if (dup) {
                if (!dup.imageUrl && r.image_url) dup.imageUrl = r.image_url;
                toDelete.push(r.id);
            } else {
                kept.push({ id: r.id, tokens, publishedAt, imageUrl: r.image_url });
            }
        }

        if (toDelete.length) {
            await db.query(`DELETE FROM news_items WHERE id = ANY($1::text[])`, [toDelete]);
            removedDuplicates += toDelete.length;
        }
        for (const k of kept) {
            if (k.imageUrl) await db.query(`UPDATE news_items SET image_url = $1 WHERE id = $2 AND image_url IS NULL`, [k.imageUrl, k.id]).catch(() => {});
        }
    }

    return { removedMiscategorized, removedDuplicates };
}

// ── Read helpers used by the news page ──────────────────────────────────
// Both read helpers swallow DB connection errors and return empty/null.
// This keeps the build pipeline healthy (when Postgres isn't reachable at build
// time) AND degrades gracefully at runtime if the DB momentarily goes away.

export async function getRecentNewsBySport(limitPerSport = 8): Promise<Record<string, NewsItem[]>> {
    const grouped: Record<string, NewsItem[]> = {};
    for (const sport of SPORTS) grouped[sport.id] = [];

    try {
        await ensureNewsTable();
        const { rows } = await db.query(`
            SELECT id, sport_id, title, link, description, source, image_url,
                   published_at, fetched_at
            FROM (
                SELECT *,
                       ROW_NUMBER() OVER (PARTITION BY sport_id ORDER BY published_at DESC) AS rn
                FROM news_items
            ) ranked
            WHERE rn <= $1
            ORDER BY sport_id, published_at DESC
        `, [limitPerSport]);

        for (const r of rows as any[]) {
            const item: NewsItem = {
                id: r.id,
                sport_id: r.sport_id,
                title: r.title,
                link: r.link,
                description: r.description,
                source: r.source,
                image_url: r.image_url,
                published_at: Number(r.published_at),
                fetched_at: Number(r.fetched_at),
            };
            (grouped[item.sport_id] ??= []).push(item);
        }
    } catch (err) {
        console.warn('[news] getRecentNewsBySport failed (returning empty):', (err as any)?.message ?? err);
    }
    return grouped;
}

export async function getFeaturedNews(): Promise<NewsItem | null> {
    try {
        await ensureNewsTable();
        const { rows } = await db.query(`
            SELECT * FROM news_items
            WHERE image_url IS NOT NULL AND image_url <> ''
            ORDER BY published_at DESC
            LIMIT 1
        `);
        const winnerRow = rows[0]
            ?? (await db.query(`SELECT * FROM news_items ORDER BY published_at DESC LIMIT 1`)).rows[0];
        if (!winnerRow) return null;
        const r = winnerRow as any;
        return {
            id: r.id, sport_id: r.sport_id, title: r.title, link: r.link,
            description: r.description, source: r.source, image_url: r.image_url,
            published_at: Number(r.published_at), fetched_at: Number(r.fetched_at),
        };
    } catch (err) {
        console.warn('[news] getFeaturedNews failed (returning null):', (err as any)?.message ?? err);
        return null;
    }
}

/** Human-readable "5h ago" / "2d ago" timestamp */
export function timeAgo(unixSeconds: number): string {
    const diff = Math.floor(Date.now() / 1000) - unixSeconds;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(unixSeconds * 1000).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}
