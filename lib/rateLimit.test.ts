import { describe, it, expect } from 'vitest';
import { rateLimit, getClientIp } from './rateLimit';

describe('rateLimit', () => {
    it('allows requests under the limit', () => {
        const key = `test-${Math.random()}`;
        const r1 = rateLimit(key, 3, 60_000);
        const r2 = rateLimit(key, 3, 60_000);
        expect(r1.allowed).toBe(true);
        expect(r2.allowed).toBe(true);
        expect(r2.remaining).toBe(1);
    });

    it('blocks requests once the limit is hit', () => {
        const key = `test-${Math.random()}`;
        rateLimit(key, 2, 60_000);
        rateLimit(key, 2, 60_000);
        const third = rateLimit(key, 2, 60_000);
        expect(third.allowed).toBe(false);
        expect(third.remaining).toBe(0);
        expect(third.retryAfterMs).toBeGreaterThan(0);
    });

    it('tracks separate keys independently (per-IP isolation)', () => {
        const keyA = `test-a-${Math.random()}`;
        const keyB = `test-b-${Math.random()}`;
        rateLimit(keyA, 1, 60_000);
        const blockedA = rateLimit(keyA, 1, 60_000);
        const allowedB = rateLimit(keyB, 1, 60_000);
        expect(blockedA.allowed).toBe(false);
        expect(allowedB.allowed).toBe(true);
    });

    it('resets the window after it expires', async () => {
        const key = `test-${Math.random()}`;
        rateLimit(key, 1, 20);
        const blocked = rateLimit(key, 1, 20);
        expect(blocked.allowed).toBe(false);
        await new Promise(r => setTimeout(r, 30));
        const afterReset = rateLimit(key, 1, 20);
        expect(afterReset.allowed).toBe(true);
    });

    it('counts down remaining correctly across multiple allowed requests', () => {
        const key = `test-${Math.random()}`;
        const results = [rateLimit(key, 5, 60_000), rateLimit(key, 5, 60_000), rateLimit(key, 5, 60_000)];
        expect(results.map(r => r.remaining)).toEqual([4, 3, 2]);
    });
});

describe('getClientIp', () => {
    it('prefers x-forwarded-for, using only the first hop', () => {
        const req = new Request('https://x.test', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
        expect(getClientIp(req)).toBe('1.2.3.4');
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', () => {
        const req = new Request('https://x.test', { headers: { 'x-real-ip': '9.9.9.9' } });
        expect(getClientIp(req)).toBe('9.9.9.9');
    });

    it('falls back to "unknown" when neither header is present', () => {
        const req = new Request('https://x.test');
        expect(getClientIp(req)).toBe('unknown');
    });
});
