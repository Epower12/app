import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import ContentPageShell from '../../components/ContentPageShell';
import BreadcrumbJsonLd from '../../components/BreadcrumbJsonLd';
import { getAllPosts, getPost, formatDate } from '@/lib/blog';

interface Props { params: Promise<{ slug: string }> }

// Pre-generate every post at build time → instant page loads, perfect SEO
export async function generateStaticParams() {
    const posts = await getAllPosts();
    return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) return { title: 'Post not found' };

    const url = `https://yourfriendleague.com/blog/${post.slug}`;
    return {
        title: post.title,
        description: post.description || `Read "${post.title}" on the YourFriendsLeague blog.`,
        alternates: { canonical: url },
        openGraph: {
            type: 'article',
            title: post.title,
            description: post.description,
            url,
            publishedTime: post.date,
            authors: [post.author],
            images: post.image ? [{ url: post.image, alt: post.title }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.description,
            images: post.image ? [post.image] : undefined,
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) notFound();

    const articleJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.date,
        author: {
            '@type': 'Organization',
            name: post.author,
            url: 'https://yourfriendleague.com',
        },
        publisher: {
            '@type': 'Organization',
            name: 'YourFriendsLeague',
            logo: { '@type': 'ImageObject', url: 'https://yourfriendleague.com/logo.png' },
        },
        image: post.image ? `https://yourfriendleague.com${post.image}` : 'https://yourfriendleague.com/og.png',
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://yourfriendleague.com/blog/${post.slug}`,
        },
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
            />
            <BreadcrumbJsonLd items={[
                { name: 'Home', url: 'https://yourfriendleague.com/' },
                { name: 'Blog', url: 'https://yourfriendleague.com/blog' },
                { name: post.title, url: `https://yourfriendleague.com/blog/${post.slug}` },
            ]} />

            <ContentPageShell eyebrow="BLOG" title={post.title}>
                <div className="ctn-narrow">
                    {/* Meta strip */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap',
                        marginBottom: '2rem', fontSize: '.85rem', color: '#94a3b8',
                    }}>
                        {post.category && (
                            <>
                                <span style={{ fontWeight: 700, color: '#38bdf8', letterSpacing: '.04em' }}>
                                    {post.category}
                                </span>
                                <span aria-hidden="true">·</span>
                            </>
                        )}
                        <time dateTime={post.date}>{formatDate(post.date)}</time>
                        <span aria-hidden="true">·</span>
                        <span>{post.readMinutes} min read</span>
                        <span aria-hidden="true">·</span>
                        <span>By <strong style={{ color: '#cbd5e1' }}>{post.author}</strong></span>
                    </div>

                    {post.image && (
                        <div style={{
                            position: 'relative', width: '100%', aspectRatio: '16 / 9',
                            backgroundImage: `url("${post.image}")`,
                            backgroundSize: 'cover', backgroundPosition: 'center',
                            borderRadius: 16, overflow: 'hidden',
                            marginBottom: '2.5rem',
                            border: '1px solid rgba(255,255,255,.07)',
                            boxShadow: '0 30px 80px rgba(0,0,0,.4)',
                        }} aria-hidden="true" />
                    )}

                    {/* MDX body */}
                    <article className="blog-prose">
                        <MDXRemote source={post.content} />
                    </article>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div style={{ marginTop: '3rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                            {post.tags.map(tag => (
                                <span key={tag} style={{
                                    fontSize: '.72rem', fontWeight: 600,
                                    padding: '.25rem .65rem', borderRadius: 999,
                                    background: 'rgba(255,255,255,.05)',
                                    border: '1px solid rgba(255,255,255,.1)',
                                    color: '#94a3b8',
                                }}>#{tag}</span>
                            ))}
                        </div>
                    )}

                    {/* Footer CTAs */}
                    <div style={{
                        marginTop: '4rem', paddingTop: '2rem',
                        borderTop: '1px solid rgba(255,255,255,.07)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        flexWrap: 'wrap', gap: '1rem',
                    }}>
                        <Link href="/blog" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                            color: '#94a3b8', fontSize: '.88rem', fontWeight: 600,
                            textDecoration: 'none',
                        }}>
                            <span aria-hidden="true">←</span> All posts
                        </Link>
                        <Link href="https://app.yourfriendleague.com/signup" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                            background: 'linear-gradient(135deg,#38bdf8,#818cf8)', color: '#fff',
                            padding: '.7rem 1.4rem', borderRadius: 10, fontWeight: 700, fontSize: '.9rem',
                            textDecoration: 'none', boxShadow: '0 0 25px rgba(56,189,248,.3)',
                        }}>
                            Start predicting free <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>

                {/* Prose styles — scoped to .blog-prose so they don't leak into other pages */}
                <style>{`
                    .blog-prose { font-size: 1.05rem; line-height: 1.75; color: #cbd5e1; }
                    .blog-prose h2 {
                        font-size: 1.55rem; font-weight: 800; color: #ffffff;
                        margin: 2.75rem 0 1rem; letter-spacing: -.4px;
                    }
                    .blog-prose h3 {
                        font-size: 1.2rem; font-weight: 700; color: #e2e8f0;
                        margin: 2rem 0 .75rem;
                    }
                    .blog-prose p { margin-bottom: 1.25rem; }
                    .blog-prose ul, .blog-prose ol { margin: 1rem 0 1.5rem 1.5rem; }
                    .blog-prose li { margin-bottom: .4rem; }
                    .blog-prose a {
                        color: #38bdf8; text-decoration: underline; text-underline-offset: 3px;
                    }
                    .blog-prose a:hover { color: #7dd3fc; }
                    .blog-prose strong { color: #ffffff; font-weight: 700; }
                    .blog-prose code {
                        background: rgba(255,255,255,.07); padding: .1rem .4rem;
                        border-radius: 4px; font-size: .9em;
                        font-family: ui-monospace, SFMono-Regular, monospace;
                    }
                    .blog-prose pre {
                        background: #0a0e1a; border: 1px solid rgba(255,255,255,.08);
                        border-radius: 10px; padding: 1rem; overflow-x: auto;
                        margin: 1.5rem 0; font-size: .88rem; line-height: 1.6;
                    }
                    .blog-prose pre code { background: transparent; padding: 0; }
                    .blog-prose blockquote {
                        border-left: 3px solid #38bdf8;
                        padding: .5rem 0 .5rem 1.25rem;
                        margin: 1.5rem 0;
                        font-style: italic; color: #94a3b8;
                    }
                    .blog-prose hr {
                        border: none; border-top: 1px solid rgba(255,255,255,.08);
                        margin: 2.5rem 0;
                    }
                    .blog-prose img {
                        max-width: 100%; height: auto; border-radius: 8px; margin: 1.5rem 0;
                    }
                    .blog-prose table {
                        width: 100%; border-collapse: collapse; margin: 1.5rem 0;
                        font-size: .92rem;
                    }
                    .blog-prose th, .blog-prose td {
                        padding: .55rem .85rem; text-align: left;
                        border-bottom: 1px solid rgba(255,255,255,.06);
                    }
                    .blog-prose th { font-weight: 700; color: #ffffff; }
                `}</style>
            </ContentPageShell>
        </>
    );
}
