import { describe, it, expect } from 'vitest';
import { titleTokens, jaccardSimilarity, findDuplicate, DUPLICATE_WINDOW_SECONDS, type TitleFingerprint } from './news';
import { matchesSportKeywords, isOffTopic } from './rssSources';

describe('titleTokens', () => {
    it('lowercases and strips punctuation', () => {
        expect(titleTokens("Verstappen's Silverstone Win!")).toEqual(new Set(['verstappens', 'silverstone', 'win']));
    });
    it('drops stopwords and short words', () => {
        const tokens = titleTokens('The win is a big win for the team');
        expect(tokens.has('the')).toBe(false);
        expect(tokens.has('is')).toBe(false);
        expect(tokens.has('big')).toBe(true);
        expect(tokens.has('team')).toBe(true);
    });
});

describe('jaccardSimilarity', () => {
    it('is 1 for identical token sets', () => {
        const a = new Set(['verstappen', 'wins', 'silverstone']);
        expect(jaccardSimilarity(a, a)).toBe(1);
    });
    it('is 0 for disjoint sets', () => {
        expect(jaccardSimilarity(new Set(['a', 'b']), new Set(['c', 'd']))).toBe(0);
    });
    it('is 0 when either set is empty', () => {
        expect(jaccardSimilarity(new Set(), new Set(['a']))).toBe(0);
    });
    it('computes the correct ratio for partial overlap', () => {
        // shared={b,c}=2, union={a,b,c,d}=4 -> 0.5
        expect(jaccardSimilarity(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBe(0.5);
    });
});

describe('findDuplicate (cross-source dedup)', () => {
    const now = 1_700_000_000;
    const pool: TitleFingerprint[] = [
        { id: 'bbc-1', tokens: titleTokens('Verstappen wins dramatic British Grand Prix'), publishedAt: now, imageUrl: null },
        { id: 'sky-1', tokens: titleTokens('Golf: McIlroy fixes his swing ahead of The Open'), publishedAt: now, imageUrl: 'https://x/img.png' },
    ];

    it('matches the same story reported with a differently-worded headline', () => {
        const tokens = titleTokens('Max Verstappen wins the British Grand Prix in dramatic fashion');
        const dup = findDuplicate(tokens, now + 60, pool);
        expect(dup?.id).toBe('bbc-1');
    });

    it('does not match an unrelated story', () => {
        const tokens = titleTokens('Djokovic advances to Wimbledon final');
        expect(findDuplicate(tokens, now, pool)).toBeNull();
    });

    it('does not match outside the time window even with identical titles', () => {
        const tokens = titleTokens('Verstappen wins dramatic British Grand Prix');
        const farAway = now + DUPLICATE_WINDOW_SECONDS + 3600;
        expect(findDuplicate(tokens, farAway, pool)).toBeNull();
    });
});

describe('matchesSportKeywords (esports allowlist, verified against live Dexerto/Dot Esports samples)', () => {
    it('accepts genuine esports headlines', () => {
        expect(matchesSportKeywords('esports', 'How to watch Valorant at EWC 2026')).toBe(true);
        expect(matchesSportKeywords('esports', 'League of Legends pro Bin fined $22K')).toBe(true);
        expect(matchesSportKeywords('esports', 'Esports World Cup relocates from Saudi Arabia to Paris')).toBe(true);
        expect(matchesSportKeywords('esports', 'Team Canada implodes at $300k Marvel Rivals World Cup')).toBe(true);
    });

    it('rejects general gaming/entertainment content with no esports vocabulary', () => {
        expect(matchesSportKeywords('esports', 'How to complete the Trial in Forza Horizon 6 Series 2 Week 4')).toBe(false);
        expect(matchesSportKeywords('esports', 'Why are loot systems so addictive?')).toBe(false);
        expect(matchesSportKeywords('esports', "Esports host covers herself in black paint")).toBe(false);
    });

    it('trusts the feed (returns true) for sports with no keyword list defined', () => {
        expect(matchesSportKeywords('football', 'Some football headline with no esports terms')).toBe(true);
    });
});

describe('isOffTopic (existing blocklist, unaffected by this change)', () => {
    it('still blocks known off-topic patterns', () => {
        expect(isOffTopic('Dexerto reviews the new McDonald\'s menu', 'https://dexerto.com/x')).toBe(true);
    });
    it('still allows normal sport content', () => {
        expect(isOffTopic('Verstappen wins the British Grand Prix', 'https://bbc.co.uk/x')).toBe(false);
    });
});
