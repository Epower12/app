import Link from 'next/link';
import { ReactNode } from 'react';
import { CookieSettingsLink } from './CookieConsent';

/**
 * Shared shell for /blog, /news, and similar marketing-domain content pages.
 * Provides the dark nav + footer that match the landing aesthetic but with
 * more room to breathe for long content lists.
 *
 * Server-component: emits the markup only, no client-side state.
 */
export default function ContentPageShell({
    eyebrow,
    title,
    subtitle,
    children,
    headerAction,
}: {
    eyebrow: string;          // e.g. "BLOG" / "NEWS"
    title: string;            // page H1
    subtitle?: string;        // tagline under the H1
    headerAction?: ReactNode; // optional right-side header element (e.g. RSS link, filter pills)
    children: ReactNode;
}) {
    return (
        <div style={{
            background: '#050a14', color: '#e2e8f0',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            minHeight: '100vh',
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                .ctn { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
                .ctn-narrow { max-width: 760px; margin: 0 auto; padding: 0 1.5rem; }
            `}</style>

            {/* Sticky nav */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0.85rem 0',
            }}>
                <div className="ctn" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                }}>
                    <Link href="/" aria-label="Home" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <img src="/logo.png" alt="YourFriendsLeague" style={{ height: 40, width: 'auto' }} />
                    </Link>
                    <div style={{ display: 'flex', gap: '1.25rem', fontSize: '.88rem', alignItems: 'center' }}>
                        <Link href="/blog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Blog</Link>
                        <Link href="/news" style={{ color: '#94a3b8', textDecoration: 'none' }}>News</Link>
                        <Link href="https://app.yourfriendleague.com/login" style={{
                            color: '#e2e8f0',
                            background: 'linear-gradient(135deg,#38bdf8,#818cf8)',
                            padding: '.5rem 1rem', borderRadius: 10, fontWeight: 700,
                            textDecoration: 'none',
                            boxShadow: '0 0 20px rgba(56,189,248,.25)',
                        }}>Open app →</Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <header style={{
                padding: '4rem 1.5rem 2.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'linear-gradient(180deg, rgba(56,189,248,0.04), transparent)',
            }}>
                <div className="ctn">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div>
                            <div style={{
                                display: 'inline-block',
                                fontSize: '.7rem', fontWeight: 700, letterSpacing: '.14em',
                                color: '#38bdf8', textTransform: 'uppercase',
                                padding: '.25rem .7rem', borderRadius: 999,
                                background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
                                marginBottom: '1rem',
                            }}>{eyebrow}</div>
                            <h1 style={{
                                fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 900,
                                letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '.6rem', color: '#ffffff',
                            }}>{title}</h1>
                            {subtitle && (
                                <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 640 }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {headerAction && <div style={{ flexShrink: 0 }}>{headerAction}</div>}
                    </div>
                </div>
            </header>

            <main style={{ padding: '3rem 0 5rem' }}>{children}</main>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem 1.5rem', background: 'rgba(255,255,255,0.015)' }}>
                <div className="ctn" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '1rem',
                    fontSize: '.78rem', color: '#64748b',
                }}>
                    <span>© 2026 SIA EGATRI — YourFriendsLeague</span>
                    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                        <Link href="/blog" style={{ color: '#94a3b8', textDecoration: 'none' }}>Blog</Link>
                        <Link href="/news" style={{ color: '#94a3b8', textDecoration: 'none' }}>News</Link>
                        <Link href="/legal" style={{ color: '#94a3b8', textDecoration: 'none' }}>Legal</Link>
                        <Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms</Link>
                        <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy</Link>
                        <CookieSettingsLink style={{ color: '#94a3b8' }}>Cookie settings</CookieSettingsLink>
                    </div>
                </div>
            </footer>
        </div>
    );
}
