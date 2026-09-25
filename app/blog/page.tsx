import type { Metadata } from 'next';
import Link from 'next/link';
import ContentPageShell from '../components/ContentPageShell';
import { getAllPosts, getFeaturedPost, formatDate, BlogPostMeta } from '@/lib/blog';

export const metadata: Metadata = {
    title: 'Blog — predictions, scoring, and the craft of being right',
    description:
        'Stories, strategy guides, and product updates from the team at YourFriendsLeague. Learn how scoring works, build better prediction instincts, and follow the road to launch.',
    alternates: { canonical: 'https://yourfriendleague.com/blog' },
    openGraph: {
        title: 'Blog · YourFriendsLeague',
        description: 'Stories, strategy guides, and product updates from YourFriendsLeague.',
        url: 'https://yourfriendleague.com/blog',
    },
};

export default async function BlogIndexPage() {
    const [posts, featured] = await Promise.all([
        getAllPosts(),
        getFeaturedPost(),
    ]);
    const rest = featured ? posts.filter(p => p.slug !== featured.slug) : posts;

    return (
        <ContentPageShell
            eyebrow="BLOG"
            title="Notes from the league"
            subtitle="Strategy, scoring, product updates, and the occasional rant about why exact-score prediction is the most underrated skill in sport."
        >
            <div className="ctn">
                {posts.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        {featured && <FeaturedPost post={featured} />}
                        {rest.length > 0 && (
                            <>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '.85rem',
                                    margin: '2.5rem 0 1.5rem', paddingBottom: '.85rem',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                }}>
                                    <h2 style={{
                                        fontSize: '1.1rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '-.2px',
                                    }}>More posts</h2>
                                    <span style={{
                                        fontSize: '.75rem', fontWeight: 600, color: '#64748b',
                                        padding: '.18rem .55rem', borderRadius: 999,
                                        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
                                    }}>{rest.length}</span>
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                    gap: '1.25rem',
                                }}>
                                    {rest.map(post => <PostCard key={post.slug} post={post} />)}
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </ContentPageShell>
    );
}

function FeaturedPost({ post }: { post: BlogPostMeta }) {
    return (
        <Link
            href={`/blog/${post.slug}`}
            aria-label={`Read featured post: ${post.title}`}
            style={{
                display: 'block', position: 'relative', overflow: 'hidden',
                borderRadius: 24,
                background: 'linear-gradient(145deg, rgba(30,41,59,.95), rgba(15,23,42,.98))',
                border: '1px solid rgba(56,189,248,.32)',
                boxShadow: '0 30px 80px rgba(0,0,0,.5), 0 0 60px rgba(56,189,248,.15)',
                textDecoration: 'none', color: 'inherit',
            }}
        >
            <div style={{
                display: 'grid', gridTemplateColumns: post.image ? '1.2fr 1fr' : '1fr',
                minHeight: 320,
            }}>
                {post.image && (
                    <div style={{
                        position: 'relative',
                        backgroundImage: `linear-gradient(90deg, transparent 40%, rgba(15,23,42,.7) 100%), url("${post.image}")`,
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
                            fontSize: '.7rem', fontWeight: 800, letterSpacing: '.12em',
                            padding: '.25rem .65rem', borderRadius: 6,
                            background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#0a0e1a',
                        }}>FEATURED</span>
                        {post.category && (
                            <span style={{ fontSize: '.75rem', color: '#94a3b8', fontWeight: 600 }}>
                                {post.category}
                            </span>
                        )}
                        <span style={{ fontSize: '.75rem', color: '#64748b' }}>
                            {formatDate(post.date)} · {post.readMinutes} min read
                        </span>
                    </div>
                    <h2 style={{
                        fontSize: 'clamp(1.5rem, 2.5vw, 2.1rem)', fontWeight: 800,
                        lineHeight: 1.2, color: '#ffffff', letterSpacing: '-.5px',
                    }}>{post.title}</h2>
                    {post.description && (
                        <p style={{ fontSize: '.95rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                            {post.description}
                        </p>
                    )}
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '.35rem',
                        fontSize: '.85rem', fontWeight: 700, color: '#38bdf8', marginTop: '.5rem',
                    }}>
                        Read article <span aria-hidden="true">→</span>
                    </span>
                </div>
            </div>
        </Link>
    );
}

function PostCard({ post }: { post: BlogPostMeta }) {
    return (
        <Link
            href={`/blog/${post.slug}`}
            aria-label={`Read: ${post.title}`}
            className="news-card"
            style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,.025)',
                border: '1px solid rgba(255,255,255,.07)',
                borderRadius: 14, overflow: 'hidden',
                textDecoration: 'none', color: 'inherit',
                transition: 'all .15s',
            }}
        >
            {post.image && (
                <div style={{
                    aspectRatio: '16 / 9',
                    backgroundImage: `url("${post.image}")`,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    borderBottom: '1px solid rgba(255,255,255,.05)',
                }} aria-hidden="true" />
            )}
            <div style={{ padding: '1.1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '.55rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.7rem', color: '#64748b', flexWrap: 'wrap' }}>
                    {post.category && (
                        <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '.04em' }}>
                            {post.category}
                        </span>
                    )}
                    {post.category && <span aria-hidden="true">·</span>}
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{post.readMinutes} min read</span>
                </div>
                <h3 style={{
                    fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, color: '#e2e8f0',
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{post.title}</h3>
                {post.description && (
                    <p style={{
                        fontSize: '.83rem', color: '#94a3b8', lineHeight: 1.55, marginTop: 'auto',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{post.description}</p>
                )}
            </div>
        </Link>
    );
}

function EmptyState() {
    return (
        <div style={{
            textAlign: 'center', padding: '4rem 2rem',
            background: 'rgba(255,255,255,.02)',
            border: '1px dashed rgba(255,255,255,.1)', borderRadius: 16,
        }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: .5 }} aria-hidden="true">✍️</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '.4rem' }}>
                No posts yet
            </h3>
            <p style={{ color: '#64748b', fontSize: '.88rem', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
                Posts live as .mdx files in <code style={{ background: 'rgba(255,255,255,.05)', padding: '.05rem .35rem', borderRadius: 4 }}>/content/blog/</code> in the repo. Add one and redeploy — it&apos;ll appear here.
            </p>
        </div>
    );
}
