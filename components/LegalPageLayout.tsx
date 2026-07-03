'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

/**
 * Shared layout for /legal, /terms, /privacy pages.
 * Self-contained styles so it matches the landing page (dark + glassmorphism)
 * without depending on app-internal globals.css classes.
 */
export default function LegalPageLayout({
    title,
    subtitle,
    lastUpdated,
    children,
}: {
    title: string;
    subtitle?: string;
    lastUpdated: string; // e.g. "12 May 2026"
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
                .legal-content { font-size: 0.95rem; line-height: 1.75; color: #cbd5e1; }
                .legal-content h2 {
                    font-size: 1.35rem; font-weight: 800; color: #ffffff;
                    margin: 2.5rem 0 1rem; padding-top: 0.5rem;
                    letter-spacing: -0.5px;
                    scroll-margin-top: 6rem;
                }
                .legal-content h2:first-child { margin-top: 0; }
                .legal-content h3 {
                    font-size: 1.05rem; font-weight: 700; color: #e2e8f0;
                    margin: 1.5rem 0 0.5rem;
                }
                .legal-content p { margin-bottom: 1rem; }
                .legal-content ul, .legal-content ol { margin: 0.5rem 0 1rem 1.5rem; }
                .legal-content li { margin-bottom: 0.35rem; }
                .legal-content a { color: #38bdf8; text-decoration: underline; text-underline-offset: 3px; }
                .legal-content a:hover { color: #7dd3fc; }
                .legal-content strong { color: #ffffff; font-weight: 700; }
                .legal-content code {
                    background: rgba(255,255,255,0.08); padding: 0.1rem 0.4rem;
                    border-radius: 4px; font-size: 0.85em; font-family: ui-monospace, SFMono-Regular, monospace;
                }
                .legal-content .legal-table {
                    width: 100%; border-collapse: collapse; margin: 1rem 0;
                    background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 10px; overflow: hidden;
                }
                .legal-content .legal-table th,
                .legal-content .legal-table td {
                    padding: 0.6rem 0.85rem; text-align: left;
                    border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.88rem;
                }
                .legal-content .legal-table th { font-weight: 700; color: #ffffff; background: rgba(255,255,255,0.03); }
                .legal-content .legal-table tr:last-child td { border-bottom: none; }
                .legal-content .callout {
                    background: rgba(56,189,248,0.06); border-left: 3px solid #38bdf8;
                    padding: 0.85rem 1.1rem; border-radius: 6px; margin: 1.25rem 0;
                    font-size: 0.88rem;
                }
            `}</style>

            {/* Minimal nav */}
            <nav style={{
                position: 'sticky', top: 0, zIndex: 50,
                background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0.85rem 0',
            }}>
                <div style={{
                    maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <Link href="/" aria-label="Back to home" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src="/logo.png" alt="YourFriendsLeague" style={{ height: 40, width: 'auto' }} />
                    </Link>
                    <Link href="/" style={{
                        fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    }}>
                        ← Back to home
                    </Link>
                </div>
            </nav>

            {/* Header */}
            <header style={{
                padding: '3.5rem 1.5rem 2rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: 'linear-gradient(180deg, rgba(56,189,248,0.04), transparent)',
            }}>
                <div style={{ maxWidth: 760, margin: '0 auto' }}>
                    <div style={{
                        display: 'inline-block',
                        fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em',
                        color: '#38bdf8', textTransform: 'uppercase',
                        marginBottom: '0.85rem',
                        padding: '0.25rem 0.7rem', borderRadius: 999,
                        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)',
                    }}>Legal</div>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 900,
                        letterSpacing: '-1.5px', lineHeight: 1.15, marginBottom: '0.75rem',
                        color: '#ffffff',
                    }}>{title}</h1>
                    {subtitle && (
                        <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: 1.6, maxWidth: 580 }}>
                            {subtitle}
                        </p>
                    )}
                    <p style={{ color: '#475569', fontSize: '0.82rem', marginTop: '1.25rem' }}>
                        Last updated: {lastUpdated}
                    </p>
                </div>
            </header>

            {/* Body */}
            <main style={{ padding: '3rem 1.5rem 5rem' }}>
                <article className="legal-content" style={{ maxWidth: 760, margin: '0 auto' }}>
                    {children}
                </article>
            </main>

            {/* Footer */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '2rem 1.5rem', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{
                    maxWidth: 1200, margin: '0 auto',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '1rem',
                    fontSize: '0.8rem', color: '#64748b',
                }}>
                    <span>© 2026 SIA EGATRI — YourFriendsLeague</span>
                    <div style={{ display: 'flex', gap: '1.25rem' }}>
                        <Link href="/legal" style={{ color: '#94a3b8', textDecoration: 'none' }}>Legal</Link>
                        <Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms</Link>
                        <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
