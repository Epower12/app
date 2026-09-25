/**
 * RSS source registry for the /news page.
 *
 * Grouped by sport. Each sport has:
 *   - id           — URL-safe key used in filters
 *   - label        — display name
 *   - icon         — emoji rendered in sport badges
 *   - accent       — brand-aligned accent color
 *   - feeds        — list of RSS URLs to fetch
 *
 * Reliability notes:
 *   - BBC Sport sub-feeds are CDN-backed and rarely fail.
 *   - ESPN feeds were dropped in 2026 — their RSS now returns HTML / unparseable XML
 *     on every endpoint. Replaced with BBC, Sky, Goal, and sport-specific outlets.
 *   - Each sport has at least 2 fallback sources so a single feed failure doesn't
 *     leave the category empty.
 *   - Individual feed failures are caught + logged, never break the page.
 *   - Sky Sports' `/rss/12040` feed was removed from football (2026-07-12) after
 *     confirming live it's actually Sky's *general all-sports* feed — it was mixing
 *     tennis, cricket, golf, and darts into the football category. Don't re-add it
 *     without first verifying the feed content is actually football-only.
 *   - Dexerto and Dot Esports (see BROAD_SCOPE_SOURCES below) publish general
 *     gaming/entertainment/streamer content alongside real esports coverage — their
 *     items are checked against SPORT_KEYWORDS before being accepted.
 */

export interface RssFeed {
    url: string;
    source: string; // human-readable source label, e.g. "BBC Sport"
}

export interface SportSource {
    id: string;
    label: string;
    icon: string;
    accent: string;       // hex color for accents
    accentRgba: string;   // rgba string for subtle backgrounds (e.g. "56,189,248")
    feeds: RssFeed[];
}

export const SPORTS: SportSource[] = [
    {
        id: 'football',
        label: 'Football',
        icon: '⚽',
        accent: '#38bdf8',
        accentRgba: '56,189,248',
        feeds: [
            { url: 'https://feeds.bbci.co.uk/sport/football/rss.xml', source: 'BBC Sport' },
            { url: 'https://www.goal.com/feeds/en/news', source: 'Goal.com' },
        ],
    },
    {
        id: 'hockey',
        label: 'Ice Hockey',
        icon: '🏒',
        accent: '#818cf8',
        accentRgba: '129,140,248',
        feeds: [
            { url: 'https://thehockeynews.com/.rss/full', source: 'The Hockey News' },
            { url: 'https://thehockeywriters.com/feed/', source: 'The Hockey Writers' },
            { url: 'https://www.iihf.com/en/rss/news', source: 'IIHF' },
        ],
    },
    {
        id: 'tennis',
        label: 'Tennis',
        icon: '🎾',
        accent: '#48bb78',
        accentRgba: '72,187,120',
        feeds: [
            { url: 'https://feeds.bbci.co.uk/sport/tennis/rss.xml', source: 'BBC Sport' },
            { url: 'https://www.tennis.com/feeds/news.rss', source: 'Tennis.com' },
            { url: 'https://www.tennisworldusa.org/rss/news.php', source: 'Tennis World USA' },
        ],
    },
    {
        id: 'basketball',
        label: 'Basketball',
        icon: '🏀',
        accent: '#f97316',
        accentRgba: '249,115,22',
        feeds: [
            { url: 'https://feeds.bbci.co.uk/sport/basketball/rss.xml', source: 'BBC Sport' },
            { url: 'https://www.basketnews.com/rss/news.rss', source: 'BasketNews' },
            { url: 'https://www.nba.com/rss/nba_rss.xml', source: 'NBA.com' },
        ],
    },
    {
        id: 'f1',
        label: 'Formula 1',
        icon: '🏎️',
        accent: '#ef4444',
        accentRgba: '239,68,68',
        feeds: [
            { url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml', source: 'BBC Sport' },
            { url: 'https://www.autosport.com/rss/feed/f1', source: 'Autosport' },
            { url: 'https://www.motorsport.com/rss/f1/news/', source: 'Motorsport.com' },
        ],
    },
    {
        id: 'combat',
        label: 'Boxing & MMA',
        icon: '🥊',
        accent: '#f5576c',
        accentRgba: '245,87,108',
        feeds: [
            { url: 'https://feeds.bbci.co.uk/sport/boxing/rss.xml', source: 'BBC Boxing' },
            { url: 'https://www.sherdog.com/rss/news.xml', source: 'Sherdog' },
            { url: 'https://www.mmafighting.com/rss/index.xml', source: 'MMA Fighting' },
        ],
    },
    {
        id: 'esports',
        label: 'Esports',
        icon: '🎮',
        accent: '#a78bfa',
        accentRgba: '167,139,250',
        feeds: [
            { url: 'https://www.hltv.org/rss/news', source: 'HLTV' },
            { url: 'https://www.dexerto.com/esports/feed/', source: 'Dexerto' },
            { url: 'https://dotesports.com/feed', source: 'Dot Esports' },
            { url: 'https://esportsinsider.com/feed', source: 'Esports Insider' },
        ],
    },
];

export function getSport(id: string): SportSource | undefined {
    return SPORTS.find(s => s.id === id);
}

/**
 * Off-topic keyword filters.
 * If a feed item's title or URL contains any of these phrases, drop it.
 * Conservative — only blocks very obvious non-sport items.
 */
export const OFFTOPIC_KEYWORDS = [
    // Food / fast-food (Dexerto's main offenders)
    'pizza hut', 'krispy kreme', 'mcdonald', 'burger king', 'wendys', "wendy's",
    'buffalo wild', 'chick-fil-a', 'taco bell', 'starbucks', 'kfc', 'subway',
    'recipe', 'menu reveal', 'doughnut', 'donut', 'restaurant chain',
    // Pure viral / off-topic
    'banana water', 'clown puppet', 'tiktok challenge', 'viral video shows',
    // Crypto noise
    'memecoin', 'shiba inu price', 'dogecoin price',
];

const REGEX_KEYWORDS = [
    // Roblox/Fortnite "codes (Month Year)" articles — low value vs actual esports
    /\bcodes?\s+\(\w+\s+\d{4}\)/i,
    // "Get free X" promo content
    /\bget\s+free\s+\w+\b/i,
];

export function isOffTopic(title: string, link: string): boolean {
    const haystack = `${title}  ${link}`.toLowerCase();
    if (OFFTOPIC_KEYWORDS.some(kw => haystack.includes(kw.toLowerCase()))) return true;
    if (REGEX_KEYWORDS.some(re => re.test(`${title}  ${link}`))) return true;
    return false;
}

/**
 * Sources confirmed (2026-07-12, by pulling live feed content) to publish general
 * gaming/entertainment/streamer content alongside genuine esports coverage — roughly
 * 30-53% of their items in a live sample were unrelated to competitive play (streamer
 * drama, game guides, personality news). Items from these sources are checked against
 * SPORT_KEYWORDS before being accepted; dedicated outlets (HLTV, Esports Insider) are not.
 */
export const BROAD_SCOPE_SOURCES = new Set(['Dexerto', 'Dot Esports']);

/**
 * Positive keyword match used only for BROAD_SCOPE_SOURCES — the opposite of
 * OFFTOPIC_KEYWORDS' blocklist approach. An item must mention at least one of these
 * to be accepted, which catches "no esports vocabulary at all" content that a blocklist
 * can't anticipate. It won't catch every case (headlines that only name a player/team
 * without the game title slip through), but it meaningfully improves precision over
 * no content check at all.
 */
export const SPORT_KEYWORDS: Partial<Record<string, string[]>> = {
    esports: [
        'valorant', 'league of legends', 'lol esports', 'worlds 20', 'msi 20',
        'counter-strike', 'cs2', 'csgo', 'cs:go',
        'dota 2', 'the international',
        'overwatch league', 'owl',
        'rocket league', 'rlcs',
        'call of duty league', 'cdl',
        'apex legends', 'algs',
        'street fighter', 'tekken', 'guilty gear', 'mortal kombat', 'fighterz', 'evo japan', 'evo 20',
        'smash bros', 'super smash',
        'esports world cup', 'ewc 20',
        'lck', 'lec', 'lcs', 'lpl', 'lta',
        'hltv', 'riot games', 'esl ', 'blast premier', 'iem ',
        'rainbow six', 'r6 siege', 'pubg', 'honor of kings', 'mobile legends', 'free fire',
        'marvel rivals', 'pro player', 'grand finals', 'lan finals', 'world championship',
    ],
};

/** True if a broad-scope source's item mentions at least one sport-relevant keyword. */
export function matchesSportKeywords(sportId: string, title: string, description?: string | null): boolean {
    const keywords = SPORT_KEYWORDS[sportId];
    if (!keywords) return true; // no keyword list defined for this sport — trust the feed
    const haystack = `${title} ${description ?? ''}`.toLowerCase();
    return keywords.some(kw => haystack.includes(kw));
}
