/**
 * Map team / national-team display names → ISO 3166-1 alpha-2 country codes.
 * Used to render flag images via https://flagcdn.com/<code>.png
 *
 * Includes common short names, full names, and well-known aliases
 * (e.g. "USA" → "us", "Czechia" → "cz", "Great Britain" → "gb").
 *
 * If a team name is in this map we render a flag — otherwise we fall back to
 * TheSportsDB club-badge lookup. This avoids the "Finland → Arsenal" problem
 * where TheSportsDB fuzzy-matches a country name to a random club.
 */

const COUNTRY_CODES: Record<string, string> = {
    // Hockey / IIHF
    'finland': 'fi',
    'sweden': 'se',
    'norway': 'no',
    'denmark': 'dk',
    'germany': 'de',
    'austria': 'at',
    'switzerland': 'ch',
    'czechia': 'cz',
    'czech republic': 'cz',
    'slovakia': 'sk',
    'slovenia': 'si',
    'hungary': 'hu',
    'italy': 'it',
    'latvia': 'lv',
    'lithuania': 'lt',
    'estonia': 'ee',
    'poland': 'pl',
    'ukraine': 'ua',
    'belarus': 'by',
    'russia': 'ru',
    'romania': 'ro',
    'great britain': 'gb',
    'united kingdom': 'gb',
    'uk': 'gb',
    'england': 'gb-eng',
    'scotland': 'gb-sct',
    'wales': 'gb-wls',
    'northern ireland': 'gb-nir',
    'ireland': 'ie',
    'iceland': 'is',
    'kazakhstan': 'kz',
    'france': 'fr',
    'spain': 'es',
    'portugal': 'pt',
    'netherlands': 'nl',
    'holland': 'nl',
    'belgium': 'be',
    'luxembourg': 'lu',
    'croatia': 'hr',
    'serbia': 'rs',
    'bosnia and herzegovina': 'ba',
    'bosnia': 'ba',
    'montenegro': 'me',
    'north macedonia': 'mk',
    'macedonia': 'mk',
    'albania': 'al',
    'kosovo': 'xk',
    'bulgaria': 'bg',
    'greece': 'gr',
    'cyprus': 'cy',
    'turkey': 'tr',
    'türkiye': 'tr',
    'malta': 'mt',
    'moldova': 'md',
    'georgia': 'ge',
    'armenia': 'am',
    'azerbaijan': 'az',
    'israel': 'il',

    // Americas
    'canada': 'ca',
    'united states': 'us',
    'usa': 'us',
    'us': 'us',
    'mexico': 'mx',
    'brazil': 'br',
    'argentina': 'ar',
    'uruguay': 'uy',
    'paraguay': 'py',
    'chile': 'cl',
    'colombia': 'co',
    'peru': 'pe',
    'ecuador': 'ec',
    'venezuela': 've',
    'bolivia': 'bo',
    'costa rica': 'cr',
    'panama': 'pa',
    'honduras': 'hn',
    'guatemala': 'gt',
    'el salvador': 'sv',
    'nicaragua': 'ni',
    'jamaica': 'jm',
    'cuba': 'cu',
    'haiti': 'ht',
    'dominican republic': 'do',
    'trinidad and tobago': 'tt',

    // Asia
    'japan': 'jp',
    'south korea': 'kr',
    'korea republic': 'kr',
    'korea': 'kr',
    'north korea': 'kp',
    'china': 'cn',
    'china pr': 'cn',
    'india': 'in',
    'indonesia': 'id',
    'malaysia': 'my',
    'singapore': 'sg',
    'thailand': 'th',
    'vietnam': 'vn',
    'philippines': 'ph',
    'taiwan': 'tw',
    'chinese taipei': 'tw',
    'hong kong': 'hk',
    'iran': 'ir',
    'iraq': 'iq',
    'saudi arabia': 'sa',
    'qatar': 'qa',
    'united arab emirates': 'ae',
    'uae': 'ae',
    'oman': 'om',
    'kuwait': 'kw',
    'bahrain': 'bh',
    'jordan': 'jo',
    'lebanon': 'lb',
    'syria': 'sy',
    'yemen': 'ye',
    'pakistan': 'pk',
    'bangladesh': 'bd',
    'sri lanka': 'lk',
    'nepal': 'np',
    'uzbekistan': 'uz',
    'turkmenistan': 'tm',
    'tajikistan': 'tj',
    'kyrgyzstan': 'kg',
    'mongolia': 'mn',

    // Africa
    'south africa': 'za',
    'egypt': 'eg',
    'morocco': 'ma',
    'algeria': 'dz',
    'tunisia': 'tn',
    'libya': 'ly',
    'nigeria': 'ng',
    'ghana': 'gh',
    'senegal': 'sn',
    'cameroon': 'cm',
    'ivory coast': 'ci',
    "côte d'ivoire": 'ci',
    "cote d'ivoire": 'ci',
    'kenya': 'ke',
    'ethiopia': 'et',
    'uganda': 'ug',
    'tanzania': 'tz',
    'zambia': 'zm',
    'zimbabwe': 'zw',
    'angola': 'ao',
    'mozambique': 'mz',
    'mali': 'ml',
    'burkina faso': 'bf',
    'togo': 'tg',
    'benin': 'bj',
    'guinea': 'gn',
    'cape verde': 'cv',
    'gabon': 'ga',
    'congo': 'cg',
    'dr congo': 'cd',
    'democratic republic of the congo': 'cd',

    // Oceania
    'australia': 'au',
    'new zealand': 'nz',
    'fiji': 'fj',
    'papua new guinea': 'pg',
    'samoa': 'ws',
    'tonga': 'to',
};

function normalize(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Returns the FlagCDN URL for a national team name, or null if not a known country */
export function getCountryFlagUrl(teamName: string, size: 'w160' | 'w320' | 'w640' = 'w320'): string | null {
    if (!teamName) return null;
    const code = COUNTRY_CODES[normalize(teamName)];
    if (!code) return null;
    // Subdivisions like gb-eng need a different path; fall back to default
    if (code.includes('-')) return `https://flagcdn.com/${code}.svg`;
    return `https://flagcdn.com/${size}/${code}.png`;
}

/** Returns true if the given name is a known country */
export function isCountry(teamName: string): boolean {
    return !!COUNTRY_CODES[normalize(teamName)];
}

/** All known country names — useful for one-off cache cleanup */
export function listKnownCountryNames(): string[] {
    return Object.keys(COUNTRY_CODES);
}
