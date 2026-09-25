/** Friendly date/time wording shared by the in-app pages. Times are Unix seconds. */

/** "Sat 27 Sep, 17:46" in the viewer's own time zone. */
export function formatKickoff(ts: number): string {
    return new Date(ts * 1000).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
    });
}

/** "27 Sep 2026" */
export function formatDate(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Time left until `ts`: "12m", "5h 12m", "2 days". Returns null once it has passed. */
export function timeUntil(ts: number, now: number = Date.now() / 1000): string | null {
    const s = Math.floor(ts - now);
    if (s <= 0) return null;
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d >= 2) return `${d} days`;
    if (d === 1) return `1 day ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${Math.max(m, 1)}m`;
}

/** "1 match" / "3 matches" */
export function plural(n: number, one: string, many: string): string {
    return `${n} ${n === 1 ? one : many}`;
}
