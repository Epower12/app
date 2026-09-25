import type { Metadata } from 'next';
import Link from 'next/link';
import ContentPageShell from '../components/ContentPageShell';
import { SPORTS, SportSource } from '@/lib/rssSources';
import { getRecentNewsBySport, getFeaturedNews, timeAgo, NewsItem } from '@/lib/news';

export const metadata: Metadata = {
    title: 'Sports News — live RSS feed across 7 sports',
    description:
        'The freshest headlines from football, ice hockey, tennis, basketball, F1, boxing/MMA, and esports — aggregated hourly from BBC, ESPN, NHL, HLTV and more.',
    alternates: { canonical: 'https://yourfriendleague.com/news' },
    openGraph: {
        title: 'Sports News · YourFriendsLeague',
        description: 'The freshest sports headlines, grouped by sport. Updated hourly.',
        url: 'https://yourfriendleague.com/news',
    },
};

// Refresh page cache every 60 seconds — keeps the page feeling near-live
// without hitting Postgres on every visitor request. Background ISR regen
// is triggered the moment a request lands on a stale cache.
export const revalidate = 60;

export default async function NewsPage() {
    const [bySport, featured] = await Promise.all([
        getRecentNewsBySport(8),
        getFeaturedNews(),
    ]);

    const totalCount = Object.values(bySport).reduce((sum, arr) => sum + arr.length, 0);
    const hasAnyNews = totalCount > 0;

    return (
        <ContentPageShell
            eyebrow="LIVE FEED"
            title="Sports News"
            subtitle="Aggregated hourly from BBC, ESPN, NHL, HLTV, Sky Sports and more. Grouped by sport so you can scan what matters."
            headerAction={
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                    padding: '.4rem .8rem', borderRadius: 999,
                    background: 'rgba(72,187,120,.08)', border: '1px solid rgba(72,187,120,.3)',
                    fontSize: '.78rem', fontWeight: 700, color: '#7eebac',
                }}>
                    <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: '#48bb78',
                        boxShadow: '0 0 8px #48bb78',
                    }} />
                    {hasAnyNews ? `${totalCount} stories tracked` : 'Refreshing…'}
                </div>
            }
        >
            <div className="ctn">

                {/* Sport filter pills (jump links) */}
                <SportPills sports={SPORTS} bySport={bySport} />

                {/* Featured hero */}
                {featured && <FeaturedCard item={featured} />}

                {/* Empty state if the table is empty (e.g. fresh deploy, first refresh hasn't run yet) */}
                {!hasAnyNews && <EmptyState />}

                {/* One section per sport */}
                {SPORTS.map(sport => {
                    const items = bySport[sport.id] ?? [];
                    if (!items.length) return null;
                    return <SportSection key={sport.id} sport={sport} items={items} />;
                })}

                {/* Attribution */}
                <p style={{
                    marginTop: '3rem', fontSize: '.75rem', color: '#475569',
                    textAlign: 'center', lineHeight: 1.6, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto',
                }}>
                    News articles are aggregated from publicly available RSS feeds.
                    All rights and attributions remain with their original publishers (BBC, ESPN, NHL, HLTV, Sky Sports, Dexerto and others).
                    Clicking an article takes you to the original source.
                </p>
            </div>
        </ContentPageShell>
    );
}

// ── Sport filter pills (anchor links) ─────────────────────────────────
function SportPills({ sports, bySport }: { sports: SportSource[]; bySport: Record<string, NewsItem[]> }) {
    return (
        <nav aria-label="Filter by sport" style={{
            display: 'flex', flexWrap: 'wrap', gap: '.5rem', marginBottom: '2.5rem',
        }}>
            {sports.map(sport => {
                const count = bySport[sport.id]?.length ?? 0;
                const disabled = count === 0;
                return (
                    <a
                        key={sport.id}
                        href={disabled ? undefined : `#sport-${sport.id}`}
                        aria-disabled={disabled}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                            padding: '.5rem .9rem', borderRadius: 999,
                            background: disabled ? 'rgba(255,255,255,.03)' : `rgba(${sport.accentRgba},.1)`,
                            border: `1px solid ${disabled ? 'rgba(255,255,255,.08)' : `rgba(${sport.accentRgba},.32)`}`,
                            color: disabled ? '#475569' : sport.accent,
                            fontSize: '.83rem', fontWeight: 600,
                            textDecoration: 'none',
                            opacity: disabled ? 0.55 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            transition: 'all .15s',
                        }}
                    >
                        <span style={{ fontSize: '1rem' }} aria-hidden="true">{sport.icon}</span>
                        <span>{sport.label}</span>
                        <span style={{
                            fontSize: '.7rem', fontWeight: 700, opacity: 0.7,
                            padding: '.1rem .4rem', borderRadius: 6,
                            background: disabled ? 'transparent' : `rgba(${sport.accentRgba},.15)`,
                        }}>{count}</span>
                    </a>
                );
            })}
        </nav>
    );
}

// ── Featured hero card ────────────────────────────────────────────────
function FeaturedCard({ item }: { item: NewsItem }) {
    const sport = SPORTS.find(s => s.id === item.sport_id);
    if (!sport) return null;

    return (
        <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Featured: ${item.title} (opens in new tab)`}
            style={{
                display: 'block', position: 'relative', overflow: 'hidden',
                borderRadius: 24, marginBottom: '3rem',
                border: `1px solid rgba(${sport.accentRgba},.35)`,
                background: 'linear-gradient(145deg, rgba(30,41,59,.95), rgba(15,23,42,.98))',
                boxShadow: `0 30px 80px rgba(0,0,0,.5), 0 0 60px rgba(${sport.accentRgba},.18)`,
                textDecoration: 'none', color: 'inherit',
                transition: 'transform .2s, box-shadow .2s',
            }}
        >
            <div style={{
                display: 'grid', gridTemplateColumns: item.image_url ? '1.2fr 1fr' : '1fr',
                minHeight: 320,
            }}>
                {item.image_url && (
                    <div style={{
                        position: 'relative',
                        backgroundImage: `linear-gradient(90deg, transparent 40%, rgba(15,23,42,.7) 100%), url("${item.image_url}")`,
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        minHeight: 240,
                    }} aria-hidden="true" />
                )}
                <div style={{
                    padding: 'clamp(1.5rem, 3vw, 2.5rem)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                            fontSize: '.7rem', fontWeight: 800, letterSpacing: '.12em',
                            padding: '.25rem .65rem', borderRadius: 6,
                            background: sport.accent, color: '#0a0e1a',
                        }}>
                            <span aria-hidden="true">{sport.icon}</span>
                            <span>FEATURED · {sport.label.toUpperCase()}</span>
                        </span>
                        <span style={{ fontSize: '.75rem', color: '#94a3b8' }}>
                            {item.source} · {timeAgo(item.published_at)}
                        </span>
                    </div>
                    <h2 style={{
                        fontSize: 'clamp(1.4rem, 2.3vw, 2rem)', fontWeight: 800,
                        lineHeight: 1.2, color: '#ffffff', letterSpacing: '-.5px',
                    }}>{item.title}</h2>
                    {item.description && (
                        <p style={{
                            fontSize: '.95rem', color: '#cbd5e1', lineHeight: 1.6,
                            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>{item.description}</p>
                    )}
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                        fontSize: '.85rem', fontWeight: 700, color: sport.accent, marginTop: '.5rem',
                    }}>
                        Read at {item.source} <span aria-hidden="true">→</span>
                    </span>
                </div>
            </div>
        </a>
    );
}

// ── Per-sport section with card grid ──────────────────────────────────
function SportSection({ sport, items }: { sport: SportSource; items: NewsItem[] }) {
    return (
        <section
            id={`sport-${sport.id}`}
            aria-labelledby={`sport-${sport.id}-h`}
            style={{
                marginBottom: '3.5rem',
                scrollMarginTop: '5rem', // accounts for sticky nav when anchor-jumping
            }}
        >
            {/* Section header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '.85rem',
                marginBottom: '1.5rem', paddingBottom: '.85rem',
                borderBottom: `1px solid rgba(${sport.accentRgba},.25)`,
            }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `linear-gradient(135deg, rgba(${sport.accentRgba},.18), rgba(${sport.accentRgba},.05))`,
                    border: `1px solid rgba(${sport.accentRgba},.35)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.35rem', flexShrink: 0,
                }} aria-hidden="true">{sport.icon}</div>
                <h2 id={`sport-${sport.id}-h`} style={{
                    fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-.3px',
                }}>{sport.label}</h2>
                <span style={{
                    fontSize: '.78rem', fontWeight: 600, color: '#64748b',
                    padding: '.2rem .55rem', borderRadius: 999,
                    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                }}>{items.length} stories</span>
            </div>

            {/* Card grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.1rem',
            }}>
                {items.map(item => <NewsCard key={item.id} item={item} sport={sport} />)}
            </div>
        </section>
    );
}

// ── Individual news card ──────────────────────────────────────────────
function NewsCard({ item, sport }: { item: NewsItem; sport: SportSource }) {
    return (
        <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.title} — opens in new tab on ${item.source}`}
            style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,.025)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 14, overflow: 'hidden',
                textDecoration: 'none', color: 'inherit',
                transition: 'border-color .15s, transform .15s, background .15s',
                cursor: 'pointer',
            }}
            className="news-card"
        >
            {item.image_url && (
                <div style={{
                    aspectRatio: '16 / 9',
                    backgroundImage: `url("${item.image_url}")`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                }} aria-hidden="true" />
            )}
            <div style={{
                padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.5rem', flex: 1,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.7rem', color: '#64748b' }}>
                    <span style={{
                        fontWeight: 700, color: sport.accent, letterSpacing: '.04em',
                    }}>{item.source}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={new Date(item.published_at * 1000).toISOString()}>
                        {timeAgo(item.published_at)}
                    </time>
                </div>
                <h3 style={{
                    fontSize: '.95rem', fontWeight: 700, lineHeight: 1.35, color: '#e2e8f0',
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{item.title}</h3>
                {item.description && (
                    <p style={{
                        fontSize: '.8rem', color: '#94a3b8', lineHeight: 1.5, marginTop: 'auto',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{item.description}</p>
                )}
            </div>
        </a>
    );
}

// ── Empty state ──────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'rgba(255,255,255,.02)',
            border: '1px dashed rgba(255,255,255,.1)', borderRadius: 16,
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: .5 }} aria-hidden="true">📡</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '.4rem' }}>
                No stories yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '.88rem', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
                The first news refresh hasn&apos;t completed yet. Check back in a few minutes — RSS aggregator is fetching the latest from 7 sports.
            </p>
        </div>
    );
}
