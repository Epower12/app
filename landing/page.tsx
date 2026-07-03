'use client';

// NOTE: This page renders identical content to `/`. The canonical URL is `/`.
// The `/landing` route is suppressed from indexing via app/landing/layout.tsx
// (server-component layout file that exports `metadata.robots = noindex`).

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { CookieSettingsLink } from '../components/CookieConsent';

/* ─── tiny helpers ─────────────────────────────────────── */
const G = 'linear-gradient(135deg,#38bdf8,#818cf8)';
const TICK: { tag: string; color: string; text: string }[] = [
    { tag: 'EXACT', color: '#38bdf8', text: 'Finland 3–1 Sweden · +5 pts' },
    { tag: 'WIN', color: '#818cf8', text: 'Canada 2–0 Germany · +2 pts' },
    { tag: 'CLOSE', color: '#48bb78', text: 'USA 4–2 Czechia · +3 pts' },
    { tag: 'EXACT', color: '#38bdf8', text: 'Spain 2–1 France · +5 pts' },
    { tag: 'WIN', color: '#818cf8', text: 'Lakers 112–105 Celtics · +2 pts' },
    { tag: 'CLOSE', color: '#48bb78', text: 'Djokovic 3–1 Alcaraz · +3 pts' },
    { tag: 'EXACT', color: '#38bdf8', text: 'Brazil 1–0 Argentina · +5 pts' },
    { tag: 'WIN', color: '#818cf8', text: 'Sweden 3–2 Russia · +2 pts' },
];

/* ─── animated number counter ──────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (!e.isIntersecting) return;
            obs.disconnect();
            let start = 0;
            const step = to / 60;
            const t = setInterval(() => {
                start = Math.min(start + step, to);
                setVal(Math.round(start));
                if (start >= to) clearInterval(t);
            }, 16);
        });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [to]);
    return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [tickerX, setTickerX] = useState(0);
    const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
    const tickerRef = useRef<number>(0);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Smooth ticker animation
    useEffect(() => {
        let x = 0;
        const speed = 0.4;
        const animate = () => {
            x -= speed;
            if (x < -1200) x = 0;
            setTickerX(x);
            tickerRef.current = requestAnimationFrame(animate);
        };
        tickerRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(tickerRef.current);
    }, []);

    const navStyle: React.CSSProperties = {
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(5,10,20,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        padding: '0.75rem 0',
    };

    return (
        <div style={{ background: '#050a14', color: '#e2e8f0', fontFamily: "'Inter', system-ui, sans-serif", overflowX: 'hidden' }}>

            {/* ── Global style overrides ── */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Russo+One&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }
                @media(prefers-reduced-motion:reduce){*{animation:none!important;transition-duration:.01ms!important}}
                a { text-decoration: none; color: inherit; }
                @keyframes float1 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-18px) rotate(8deg)} }
                @keyframes float2 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-22px) rotate(-6deg)} }
                @keyframes float3 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(10deg)} }
                @keyframes float4 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(-9deg)} }
                @keyframes pulse-glow { 0%,100%{opacity:.5} 50%{opacity:1} }
                @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
                @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                .lp-btn-primary {
                    display:inline-flex; align-items:center; gap:.5rem;
                    background:linear-gradient(135deg,#38bdf8,#818cf8);
                    color:#fff; font-weight:700; padding:.85rem 2rem; border-radius:12px;
                    border:none; cursor:pointer; font-size:1rem; transition:all .2s;
                    box-shadow:0 0 30px rgba(56,189,248,.35);
                }
                .lp-btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 50px rgba(56,189,248,.5); }
                .lp-btn-ghost {
                    display:inline-flex; align-items:center; gap:.5rem;
                    background:rgba(255,255,255,.06); color:#94a3b8;
                    font-weight:600; padding:.85rem 1.75rem; border-radius:12px;
                    border:1px solid rgba(255,255,255,.1); cursor:pointer; font-size:1rem; transition:all .2s;
                }
                .lp-btn-ghost:hover { background:rgba(255,255,255,.1); color:#e2e8f0; }
                .bento-card {
                    background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
                    border-radius:20px; padding:2rem; transition:all .3s;
                    position:relative; overflow:hidden; cursor:pointer;
                }
                .bento-card:hover { border-color:rgba(56,189,248,.3); transform:translateY(-4px); background:rgba(56,189,248,.04); }
                .bento-card::before {
                    content:''; position:absolute; inset:0; border-radius:20px;
                    background:radial-gradient(600px circle at var(--mx,50%) var(--my,50%), rgba(56,189,248,.06), transparent 40%);
                    opacity:0; transition:opacity .4s;
                }
                .bento-card:hover::before { opacity:1; }
                .step-pill {
                    display:flex; align-items:center; gap:1.25rem;
                    background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.08);
                    border-radius:16px; padding:1.5rem 2rem; transition:all .3s; cursor:pointer;
                }
                .step-pill:hover { border-color:rgba(56,189,248,.3); background:rgba(56,189,248,.04); }
                .sport-tile {
                    position:relative; border-radius:18px; overflow:hidden;
                    border:1px solid rgba(255,255,255,.08); cursor:pointer;
                    aspect-ratio:3/4; transition:border-color .3s, box-shadow .3s;
                }
                .sport-tile img { object-fit:cover; transition:transform .6s cubic-bezier(.2,.6,.2,1); }
                .sport-tile:hover { border-color:rgba(56,189,248,.35); box-shadow:0 20px 50px -20px rgba(56,189,248,.35); }
                .sport-tile:hover img { transform:scale(1.06); }
                .sport-tile .tile-label { transition:transform .3s, opacity .3s; }
                .sport-tile:hover .tile-label { transform:translateY(-2px); }
                @media(max-width:1024px){
                    .bento-main{grid-template-columns:repeat(2,1fr)!important}
                }
                @media(max-width:768px){
                    .lp-desktop{display:none!important}
                    .lp-mobile-show{display:flex!important}
                    .hero-grid-lp{grid-template-columns:1fr!important}
                    .bento-main{grid-template-columns:1fr!important}
                    .pricing-row{grid-template-columns:1fr!important}
                    .steps-col{flex-direction:column!important}
                }
            `}</style>

            {/* ═══════════════════════════════════════
                NAV
            ═══════════════════════════════════════ */}
            <nav style={navStyle}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Link href="/">
                        <Image
                            src="/logo.png"
                            alt="YourFriendsLeague"
                            width={140}
                            height={44}
                            priority
                            style={{ height: 44, width: 'auto' }}
                        />
                    </Link>

                    <div className="lp-desktop" style={{ display: 'flex', gap: '2rem' }}>
                        {[
                            { href: '#features', label: 'Features' },
                            { href: '#scoring', label: 'Scoring' },
                            { href: '#pricing', label: 'Pricing' },
                            { href: '/news', label: 'News' },
                            { href: '/blog', label: 'Blog' },
                        ].map(({ href, label }) => (
                            <a key={href} href={href} style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500, transition: 'color .2s' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>
                                {label}
                            </a>
                        ))}
                    </div>

                    <div className="lp-desktop" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <Link href="/login" className="lp-btn-ghost" style={{ padding: '.6rem 1.25rem', fontSize: '.9rem' }}>Sign In</Link>
                        <Link href="/signup" className="lp-btn-primary" style={{ padding: '.6rem 1.25rem', fontSize: '.9rem' }}>Get Started Free</Link>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="lp-mobile-show"
                        style={{ display: 'none', flexDirection: 'column', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                        onClick={() => setMobileOpen(true)}
                    >
                        {[0, 1, 2].map(i => <span key={i} style={{ width: 24, height: 2, background: '#94a3b8', borderRadius: 2 }} />)}
                    </button>
                </div>
            </nav>

            {/* Mobile menu */}
            {mobileOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5,10,20,0.97)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                    {[['#features', 'Features'], ['#scoring', 'Scoring'], ['#pricing', 'Pricing'], ['/news', 'News'], ['/blog', 'Blog']].map(([h, l]) => (
                        <a key={h} href={h} onClick={() => setMobileOpen(false)} style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>{l}</a>
                    ))}
                    <Link href="/signup" className="lp-btn-primary" onClick={() => setMobileOpen(false)} style={{ marginTop: '1rem' }}>Get Started Free</Link>
                    <Link href="/login" className="lp-btn-ghost" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </div>
            )}

            {/* ═══════════════════════════════════════
                HERO
            ═══════════════════════════════════════ */}
            <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: '7rem', paddingBottom: '4rem', overflow: 'hidden' }}>
                {/* Hero background — custom brand arena artwork */}
                <Image
                    src="/img/hero-arena.png"
                    alt=""
                    fill
                    priority
                    sizes="100vw"
                    style={{ objectFit: 'cover', objectPosition: 'center 35%', opacity: 0.45, zIndex: 0 }}
                />
                {/* Legibility scrim over the artwork */}
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(5,10,20,.55) 0%, rgba(5,10,20,.72) 55%, #050a14 100%), radial-gradient(ellipse 70% 60% at 25% 45%, rgba(5,10,20,.55), transparent)' }} />
                {/* Background orbs */}
                <div style={{ position: 'absolute', top: '10%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,.12) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'pulse-glow 6s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', bottom: '5%', right: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(129,140,248,.1) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'pulse-glow 8s ease-in-out infinite reverse' }} />
                <div style={{ position: 'absolute', top: '40%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,.05) 0%, transparent 70%)', filter: 'blur(30px)' }} />

                {/* Grid pattern */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 0%, black 40%, transparent 100%)' }} />

                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 1, width: '100%' }}>
                    <div className="hero-grid-lp" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>

                        {/* LEFT */}
                        <div style={{ animation: 'fadeUp .8s ease both' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.25)', borderRadius: '999px', padding: '.35rem 1rem', fontSize: '.82rem', fontWeight: 600, color: '#38bdf8', marginBottom: '1.75rem' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', animation: 'pulse-glow 1.5s ease-in-out infinite' }} />
                                Score Prediction Platform
                            </div>

                            <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-3px', marginBottom: '1.5rem', fontFamily: "'Russo One', sans-serif" }}>
                                Predict.<br />
                                Compete.<br />
                                <span style={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                    Dominate.
                                </span>
                            </h1>

                            <p style={{ fontSize: '1.15rem', color: '#94a3b8', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 480 }}>
                                Pick the exact scoreline before kick-off. Earn points for accuracy, challenge friends in private leagues — and see who really knows their sport.
                            </p>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
                                <Link href="/signup" className="lp-btn-primary">
                                    Start Predicting Free <span>→</span>
                                </Link>
                                <Link href="/login" className="lp-btn-ghost">Sign In</Link>
                            </div>

                            {/* Quick facts */}
                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                {([
                                    { key: 'ms', label: 'Multi-sport', color: '#38bdf8', svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>) },
                                    { key: 'pl', label: 'Private leagues', color: '#818cf8', svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>) },
                                    { key: 'fp', label: 'Free to play', color: '#48bb78', svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>) },
                                    { key: 'lr', label: 'Live rankings', color: '#f97316', svg: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>) },
                                ] as const).map(({ key, label, color, svg }) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                        <span style={{ color, display: 'flex', alignItems: 'center' }}>{svg}</span>
                                        <span style={{ fontSize: '.82rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT — Prediction card */}
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeUp 1s ease .2s both' }}>
                            {/* Ice rink artwork — glows behind the card */}
                            <div style={{ position: 'absolute', inset: '-10%', borderRadius: 32, overflow: 'hidden', zIndex: 0 }}>
                                <Image
                                    src="/img/sport-hockey.png"
                                    alt=""
                                    fill
                                    sizes="50vw"
                                    style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.28, maskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 75% 75% at 50% 50%, black 30%, transparent 75%)' }}
                                />
                            </div>
                            {/* Floating sport icons — SVG, no emoji */}
                            {([
                                {
                                    key: 'soccer', color: '#38bdf8', size: 38,
                                    s: { top: '5%', left: '5%', animation: 'float1 5s ease-in-out infinite' },
                                    svg: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
                                            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
                                            <polygon points="12,7 14,11 18,11 15,14 16,18 12,16 8,18 9,14 6,11 10,11" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="0.8"/>
                                        </svg>
                                    ),
                                },
                                {
                                    key: 'hockey', color: '#818cf8', size: 30,
                                    s: { top: '8%', right: '8%', animation: 'float2 6s ease-in-out infinite' },
                                    svg: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M6 4l10 8" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M16 12c1.5 1 2 2.5 1 3.5S14 17 12 17" stroke="currentColor" strokeWidth="1.8"/>
                                            <path d="M12 17c-2 0-3-.5-3-1.5" stroke="currentColor" strokeWidth="1.8"/>
                                            <circle cx="10" cy="18.5" r="1.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1"/>
                                        </svg>
                                    ),
                                },
                                {
                                    key: 'tennis', color: '#48bb78', size: 26,
                                    s: { bottom: '15%', left: '2%', animation: 'float3 7s ease-in-out infinite' },
                                    svg: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
                                            <path d="M4 8c2 1 3 3 3 4s-1 3-3 4" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M20 8c-2 1-3 3-3 4s1 3 3 4" stroke="currentColor" strokeWidth="1.2"/>
                                        </svg>
                                    ),
                                },
                                {
                                    key: 'basketball', color: '#f97316', size: 34,
                                    s: { bottom: '5%', right: '5%', animation: 'float4 5.5s ease-in-out infinite' },
                                    svg: (
                                        <svg viewBox="0 0 24 24" fill="none" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4"/>
                                            <path d="M3 12h18M12 3v18" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M5.5 6.5c2 2 2.5 3.5 2.5 5.5s-.5 3.5-2.5 5.5" stroke="currentColor" strokeWidth="1"/>
                                            <path d="M18.5 6.5c-2 2-2.5 3.5-2.5 5.5s.5 3.5 2.5 5.5" stroke="currentColor" strokeWidth="1"/>
                                        </svg>
                                    ),
                                },
                            ] as const).map(({ key, color, size, s, svg }) => (
                                <div key={key} style={{
                                    position: 'absolute', zIndex: 0, opacity: 0.65, color,
                                    width: size, height: size,
                                    filter: `drop-shadow(0 0 12px ${color}66)`,
                                    ...s,
                                }}>{svg}</div>
                            ))}

                            {/* Glow behind card */}
                            <div style={{ position: 'absolute', inset: '10%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,.2) 0%, transparent 70%)', filter: 'blur(50px)', animation: 'pulse-glow 4s ease-in-out infinite' }} />

                            {/* Main card */}
                            <div style={{
                                position: 'relative', zIndex: 2, width: '100%', maxWidth: 380,
                                background: 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
                                border: '1px solid rgba(56,189,248,.25)', borderRadius: 24,
                                boxShadow: '0 40px 80px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)',
                                overflow: 'hidden',
                            }}>
                                {/* Card header gradient strip */}
                                <div style={{ height: 3, background: G }} />

                                <div style={{ padding: '1.5rem' }}>
                                    {/* League + time */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.78rem', fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,.1)', padding: '.25rem .65rem', borderRadius: '999px', border: '1px solid rgba(56,189,248,.2)' }}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l10 8"/><path d="M16 12c1.5 1 2 2.5 1 3.5S14 17 12 17"/><circle cx="10" cy="18.5" r="1.5" fill="currentColor" fillOpacity="0.3"/></svg>
                                            IIHF World Championship
                                        </span>
                                        <span style={{ fontSize: '.75rem', color: '#475569' }}>Today · 20:20</span>
                                    </div>

                                    {/* Teams */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                        <div style={{ textAlign: 'center', flex: 1 }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src="https://flagcdn.com/w80/fi.png" alt="Finland flag" width={48} height={36} style={{ borderRadius: 6, marginBottom: '.5rem', boxShadow: '0 4px 16px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.12)' }} />
                                            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Finland</div>
                                        </div>
                                        <div style={{ padding: '.4rem .85rem', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, fontWeight: 800, fontSize: '.85rem', color: '#475569', letterSpacing: 1 }}>VS</div>
                                        <div style={{ textAlign: 'center', flex: 1 }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src="https://flagcdn.com/w80/se.png" alt="Sweden flag" width={48} height={36} style={{ borderRadius: 6, marginBottom: '.5rem', boxShadow: '0 4px 16px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.12)' }} />
                                            <div style={{ fontWeight: 700, fontSize: '.95rem' }}>Sweden</div>
                                        </div>
                                    </div>

                                    {/* Prediction */}
                                    <div style={{ background: 'rgba(0,0,0,.25)', borderRadius: 14, padding: '1.1rem', marginBottom: '1rem', textAlign: 'center', border: '1px solid rgba(255,255,255,.06)' }}>
                                        <div style={{ fontSize: '.72rem', color: '#475569', fontWeight: 600, letterSpacing: '.08em', marginBottom: '.6rem' }}>YOUR PREDICTION</div>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: 56, height: 56, background: 'linear-gradient(145deg,rgba(56,189,248,.2),rgba(56,189,248,.05))', border: '2px solid rgba(56,189,248,.4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: '#38bdf8' }}>3</div>
                                            <span style={{ fontSize: '1.4rem', color: '#334155', fontWeight: 300 }}>—</span>
                                            <div style={{ width: 56, height: 56, background: 'linear-gradient(145deg,rgba(129,140,248,.2),rgba(129,140,248,.05))', border: '2px solid rgba(129,140,248,.4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900, color: '#818cf8' }}>1</div>
                                        </div>
                                    </div>

                                    {/* Result badge */}
                                    <div style={{ background: 'linear-gradient(135deg,rgba(56,189,248,.15),rgba(129,140,248,.15))', border: '1px solid rgba(56,189,248,.3)', borderRadius: 12, padding: '.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="#38bdf8"/></svg>
                                            <span style={{ fontWeight: 800, fontSize: '.9rem', background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>EXACT SCORE!</span>
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#38bdf8' }}>+5 pts</div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating badges */}
                            <div style={{ position: 'absolute', top: '12%', left: '-8%', background: 'rgba(15,23,42,.9)', border: '1px solid rgba(72,187,120,.3)', borderRadius: 12, padding: '.5rem .85rem', fontSize: '.78rem', fontWeight: 700, color: '#48bb78', backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', zIndex: 3, display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
                                #1 Leaderboard
                            </div>
                            <div style={{ position: 'absolute', bottom: '18%', right: '-6%', background: 'rgba(15,23,42,.9)', border: '1px solid rgba(249,115,22,.3)', borderRadius: 12, padding: '.5rem .85rem', fontSize: '.78rem', fontWeight: 700, color: '#f97316', backdropFilter: 'blur(10px)', whiteSpace: 'nowrap', zIndex: 3, display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                Private · 8 friends
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem', opacity: .4 }}>
                    <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, #38bdf8)' }} />
                    <div style={{ fontSize: '.7rem', color: '#38bdf8', letterSpacing: '.1em', fontWeight: 600 }}>SCROLL</div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                LIVE TICKER
            ═══════════════════════════════════════ */}
            <div style={{ background: 'rgba(56,189,248,.05)', borderTop: '1px solid rgba(56,189,248,.1)', borderBottom: '1px solid rgba(56,189,248,.1)', padding: '.75rem 0', overflow: 'hidden', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '3rem', transform: `translateX(${tickerX}px)`, whiteSpace: 'nowrap', willChange: 'transform' }}>
                    {[...TICK, ...TICK, ...TICK, ...TICK].map((t, i) => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '.55rem', fontSize: '.82rem', fontWeight: 600, color: '#64748b', flexShrink: 0 }}>
                            <span style={{ fontSize: '.6rem', fontWeight: 800, letterSpacing: '.08em', color: t.color, background: `${t.color}14`, border: `1px solid ${t.color}33`, borderRadius: 5, padding: '.12rem .4rem' }}>{t.tag}</span>
                            {t.text}
                            <span style={{ color: '#1e293b', marginLeft: '2.5rem' }}>|</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════
                STATS ROW
            ═══════════════════════════════════════ */}
            <section style={{ padding: '5rem 0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 0, textAlign: 'center', border: '1px solid rgba(255,255,255,.06)', borderRadius: 20, background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent)', overflow: 'hidden' }}>
                        {[
                            { val: 5, suffix: ' pts', label: 'Max per prediction', color: '#38bdf8', desc: 'Exact score' },
                            { val: 4, suffix: ' sports', label: 'Supported', color: '#818cf8', desc: 'Football · Hockey · Tennis · Basketball' },
                            { val: 100, suffix: '%', label: 'Free to play', color: '#48bb78', desc: 'No credit card needed' },
                            { val: 60, suffix: 's', label: 'To sign up', color: '#f97316', desc: 'And make your first pick' },
                        ].map(({ val, suffix, label, color, desc }, i, arr) => (
                            <div key={label} style={{
                                padding: '2.5rem 1.5rem',
                                borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
                            }}>
                                <div style={{ fontSize: 'clamp(2.5rem,5vw,3.5rem)', fontWeight: 900, color, marginBottom: '.4rem', letterSpacing: '-2px', lineHeight: 1 }}>
                                    <Counter to={val} suffix={suffix} />
                                </div>
                                <div style={{ fontWeight: 700, fontSize: '.95rem', marginBottom: '.4rem', color: '#cbd5e1' }}>{label}</div>
                                <div style={{ fontSize: '.78rem', color: '#475569', lineHeight: 1.5 }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                SPORTS SHOWCASE — editorial image strip
            ═══════════════════════════════════════ */}
            <section aria-label="Supported sports" style={{ padding: '6rem 0 2rem' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 900, letterSpacing: '-1.5px', fontFamily: "'Russo One', sans-serif", marginBottom: '.5rem' }}>Every sport. One arena.</h2>
                            <p style={{ color: '#64748b', fontSize: '1rem' }}>From the pitch to the podium — predict them all.</p>
                        </div>
                        <span style={{ fontSize: '.78rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '.08em' }}>MORE ADDED EVERY SEASON</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                        {[
                            { img: '/img/sport-football.png', label: 'Football' },
                            { img: '/img/sport-hockey.png', label: 'Ice Hockey' },
                            { img: '/img/sport-tennis.png', label: 'Tennis' },
                            { img: '/img/sport-basketball.png', label: 'Basketball' },
                            { img: '/img/sport-racing.png', label: 'Racing' },
                        ].map(({ img, label }) => (
                            <div key={label} className="sport-tile">
                                <Image src={img} alt={`${label} — moody stadium artwork`} fill sizes="(max-width:768px) 50vw, 20vw" />
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(5,10,20,.9) 100%)' }} />
                                <div className="tile-label" style={{ position: 'absolute', left: '1rem', bottom: '.9rem', right: '1rem' }}>
                                    <div style={{ fontWeight: 800, fontSize: '.95rem', color: '#e2e8f0', letterSpacing: '-0.3px' }}>{label}</div>
                                    <div style={{ width: 24, height: 2, background: G, borderRadius: 2, marginTop: '.35rem' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                SCORING — id="scoring"
            ═══════════════════════════════════════ */}
            <section id="scoring" aria-labelledby="scoring-heading" style={{ padding: '6rem 0', position: 'relative' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.25)', borderRadius: '999px', padding: '.3rem .9rem', fontSize: '.78rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '.06em', marginBottom: '1rem' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/><path d="M4 22h16"/></svg> SCORING SYSTEM</div>
                        <h2 id="scoring-heading" style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '1rem', fontFamily: "'Russo One', sans-serif" }}>Precision is rewarded</h2>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>The closer your prediction, the more points you earn</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.25rem' }}>
                        {[
                            { pts: '+5', label: 'Exact Score', ex: 'You said 3–1, it\'s 3–1', color: '#38bdf8', glow: 'rgba(56,189,248,.2)', icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>) },
                            { pts: '+3', label: 'Winner & Gap', ex: 'You said 2–0, it\'s 3–1 (same margin)', color: '#48bb78', glow: 'rgba(72,187,120,.2)', icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 12h14M15 8l4 4-4 4M9 8l-4 4 4 4"/></svg>) },
                            { pts: '+2', label: 'Correct Winner', ex: 'Right team wins, wrong margin', color: '#818cf8', glow: 'rgba(129,140,248,.2)', icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>) },
                            { pts: '+0', label: 'Wrong Guess', ex: 'Wrong winner — no points', color: '#334155', glow: 'rgba(51,65,85,.1)', icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>) },
                        ].map(s => (
                            <div key={s.pts} className="bento-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', boxShadow: `0 0 40px ${s.glow}` }}>
                                <div style={{ color: s.color, display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>{s.icon}</div>
                                <div style={{ fontSize: '3rem', fontWeight: 900, color: s.color, letterSpacing: '-2px', lineHeight: 1, marginBottom: '.5rem' }}>{s.pts}</div>
                                <div style={{ fontWeight: 700, marginBottom: '.5rem', fontSize: '1rem' }}>{s.label}</div>
                                <div style={{ fontSize: '.78rem', color: '#475569', lineHeight: 1.6 }}>{s.ex}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                FEATURES BENTO — id="features"
            ═══════════════════════════════════════ */}
            <section id="features" aria-labelledby="features-heading" style={{ padding: '6rem 0', background: 'rgba(255,255,255,.015)', borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(129,140,248,.1)', border: '1px solid rgba(129,140,248,.25)', borderRadius: '999px', padding: '.3rem .9rem', fontSize: '.78rem', fontWeight: 700, color: '#818cf8', letterSpacing: '.06em', marginBottom: '1rem' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> FEATURES</div>
                        <h2 id="features-heading" style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '1rem', fontFamily: "'Russo One', sans-serif" }}>Built for real sports fans</h2>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>Everything you need to predict, compete, and track your form</p>
                    </div>

                    {/* Bento grid — 6 balanced cards, 3 cols × 2 rows.
                        Each card has identical structure (icon-block · title · desc · footer-strip)
                        so rows stretch evenly and the whole grid feels intentional. */}
                    <div className="bento-main" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                        {[
                            {
                                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M5.5 6.5c2 2 2.5 3.5 2.5 5.5s-.5 3.5-2.5 5.5"/><path d="M18.5 6.5c-2 2-2.5 3.5-2.5 5.5s.5 3.5 2.5 5.5"/></svg>),
                                accent: '#38bdf8', glow: 'rgba(56,189,248,.18)',
                                photo: '/img/sport-football.png',
                                title: 'Multi-Sport Support',
                                desc: 'Football, Ice Hockey, Tennis, Basketball and more. Predict any sport your league organiser adds.',
                                footer: (
                                    <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                                        {['Football', 'Hockey', 'Tennis', 'Basketball'].map(t => (
                                            <span key={t} style={{ fontSize: '.7rem', fontWeight: 600, padding: '.22rem .55rem', borderRadius: '999px', background: 'rgba(56,189,248,.08)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,.18)' }}>{t}</span>
                                        ))}
                                    </div>
                                ),
                            },
                            {
                                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>),
                                accent: '#f97316', glow: 'rgba(249,115,22,.16)',
                                photo: '/img/sport-hockey.png',
                                title: 'Tournament Presets',
                                badge: 'NEW',
                                desc: 'One-click import for official schedules — IIHF 2026, FIFA World Cup, and more added regularly.',
                                footer: (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', padding: '.45rem .75rem', borderRadius: 10, background: 'rgba(249,115,22,.08)', border: '1px solid rgba(249,115,22,.2)' }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fdba74" strokeWidth="2" strokeLinecap="round"><path d="M6 4l10 8"/><path d="M16 12c1.5 1 2 2.5 1 3.5S14 17 12 17"/><circle cx="10" cy="18.5" r="1.5" fill="#fdba74" fillOpacity="0.3" stroke="#fdba74"/></svg>
                                        <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#fdba74' }}>IIHF 2026 · 56 matches</span>
                                    </div>
                                ),
                            },
                            {
                                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>),
                                accent: '#818cf8', glow: 'rgba(129,140,248,.16)',
                                photo: '/img/sport-crowd.png',
                                title: 'Private Leagues',
                                desc: 'Create a league, share an invite link, and compete in your own private group. No strangers unless you want them.',
                                footer: (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <div key={i} style={{
                                                width: 26, height: 26, borderRadius: '50%',
                                                background: ['#38bdf8', '#818cf8', '#f97316', '#48bb78', '#a78bfa'][i],
                                                border: '2px solid #0a1020', marginLeft: i ? -8 : 0,
                                                fontSize: '.62rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800, color: '#fff',
                                            }}>{['Y', 'A', 'M', 'L', 'K'][i]}</div>
                                        ))}
                                        <span style={{ marginLeft: 8, fontSize: '.75rem', color: '#64748b', fontWeight: 600 }}>You + 5 friends</span>
                                    </div>
                                ),
                            },
                            {
                                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>),
                                accent: '#48bb78', glow: 'rgba(72,187,120,.16)',
                                photo: '/img/sport-scoreboard.png',
                                title: 'Live Leaderboards',
                                desc: 'Rankings update the instant a result is entered. Watch your position climb in real time.',
                                footer: (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        {[
                                            { rank: 1, name: 'Anna', pts: 47, you: false },
                                            { rank: 2, name: 'You', pts: 44, you: true },
                                            { rank: 3, name: 'Mike', pts: 41, you: false },
                                        ].map(r => (
                                            <div key={r.rank} style={{
                                                display: 'flex', alignItems: 'center', gap: '.6rem',
                                                padding: '.3rem .55rem', borderRadius: 8,
                                                background: r.you ? 'rgba(72,187,120,.08)' : 'transparent',
                                                border: r.you ? '1px solid rgba(72,187,120,.25)' : '1px solid transparent',
                                                fontSize: '.74rem',
                                            }}>
                                                <span style={{ width: 16, fontWeight: 800, color: r.rank === 1 ? '#fbbf24' : '#475569' }}>{r.rank}</span>
                                                <span style={{ flex: 1, fontWeight: r.you ? 700 : 500, color: r.you ? '#7eebac' : '#94a3b8' }}>{r.name}</span>
                                                <span style={{ fontWeight: 800, color: r.you ? '#48bb78' : '#64748b' }}>{r.pts}</span>
                                            </div>
                                        ))}
                                    </div>
                                ),
                            },
                            {
                                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6M22 6l-3-3"/></svg>),
                                accent: '#f5576c', glow: 'rgba(245,87,108,.16)',
                                photo: '/img/sport-floodlight.png',
                                title: 'Deadline Countdown',
                                desc: 'Live countdowns turn yellow, then red as time runs out. Predictions auto-lock at kick-off.',
                                footer: (
                                    <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}>
                                        {[
                                            { label: '24h out', color: '#fbbf24' },
                                            { label: '3h left', color: '#f97316' },
                                            { label: '30min', color: '#f5576c', pulse: true },
                                        ].map(({ label, color, pulse }) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.72rem', fontWeight: 700, color }}>
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, animation: pulse ? 'pulse-glow 1s ease-in-out infinite' : 'none' }} />
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                ),
                            },
                            {
                                icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>),
                                accent: '#a78bfa', glow: 'rgba(167,139,250,.16)',
                                photo: '/img/sport-basketball.png',
                                title: 'Smart Notifications',
                                desc: 'Notified the instant results are entered. Each notification shows the score, your pick, and the points you earned.',
                                footer: (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '.65rem',
                                        padding: '.6rem .75rem', borderRadius: 10,
                                        background: 'rgba(167,139,250,.06)', border: '1px solid rgba(167,139,250,.2)',
                                    }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#cbd5e1' }}>Finland 3 – 1 Sweden</div>
                                            <div style={{ fontSize: '.65rem', color: '#64748b' }}>You predicted 3–1 · exact score</div>
                                        </div>
                                        <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#a78bfa' }}>+5</span>
                                    </div>
                                ),
                            },
                        ].map((card, i) => (
                            <div key={i} className="bento-card" style={{
                                display: 'flex', flexDirection: 'column', gap: '1rem',
                                padding: '1.75rem', position: 'relative', overflow: 'hidden',
                                boxShadow: `0 0 50px -25px ${card.glow}`,
                            }}>
                                {/* Sport artwork — visible, fading down into the card so text stays crisp */}
                                {'photo' in card && (card as { photo: string }).photo && (
                                    <Image
                                        src={(card as { photo: string }).photo}
                                        alt=""
                                        fill
                                        sizes="(max-width:768px) 100vw, 33vw"
                                        style={{
                                            objectFit: 'cover', objectPosition: 'center', opacity: 0.22, zIndex: 0,
                                            maskImage: 'linear-gradient(180deg, black 0%, rgba(0,0,0,.5) 45%, transparent 80%)',
                                            WebkitMaskImage: 'linear-gradient(180deg, black 0%, rgba(0,0,0,.5) 45%, transparent 80%)',
                                        }}
                                    />
                                )}
                                {/* Layered above the photo */}
                                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                {card.badge && (
                                    <span style={{
                                        position: 'absolute', top: -4, right: 0,
                                        fontSize: '.6rem', fontWeight: 800, letterSpacing: '.12em',
                                        padding: '.2rem .5rem', borderRadius: 6,
                                        background: card.accent, color: '#0a0e1a',
                                    }}>{card.badge}</span>
                                )}
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    background: `linear-gradient(135deg, ${card.accent}24, ${card.accent}08)`,
                                    border: `1px solid ${card.accent}40`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0, color: card.accent,
                                }}>{card.icon}</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '.5rem', color: '#e2e8f0' }}>{card.title}</div>
                                    <p style={{ color: '#64748b', lineHeight: 1.65, fontSize: '.85rem' }}>{card.desc}</p>
                                </div>
                                <div style={{ marginTop: 'auto', paddingTop: '.5rem' }}>{card.footer}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                HOW IT WORKS — id="how-it-works"
            ═══════════════════════════════════════ */}
            <section id="how-it-works" aria-labelledby="how-it-works-heading" style={{ padding: '6rem 0' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(72,187,120,.1)', border: '1px solid rgba(72,187,120,.25)', borderRadius: '999px', padding: '.3rem .9rem', fontSize: '.78rem', fontWeight: 700, color: '#48bb78', letterSpacing: '.06em', marginBottom: '1rem' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> HOW IT WORKS</div>
                        <h2 id="how-it-works-heading" style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '1rem', fontFamily: "'Russo One', sans-serif" }}>Up and running in 60 seconds</h2>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto' }}>No tutorials needed. Start predicting today.</p>
                    </div>

                    <div className="steps-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 700, margin: '0 auto' }}>
                        {[
                            { n: '01', title: 'Create your account', desc: 'Sign up free in 30 seconds. Pick your username — no credit card, no commitment.', color: '#38bdf8' },
                            { n: '02', title: 'Join a league', desc: 'Enter a friend\'s invite code to join a private league, or browse open leagues anyone can join.', color: '#818cf8' },
                            { n: '03', title: 'Predict the score', desc: 'Pick the exact scoreline for each match before kick-off. Once the clock hits zero, predictions lock.', color: '#48bb78' },
                            { n: '04', title: 'Earn points & climb', desc: '+5 exact · +3 winner & gap · +2 correct winner. Watch your name rise on the live leaderboard.', color: '#f97316' },
                        ].map(({ n, title, desc, color }) => (
                            <div key={n} className="step-pill">
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${color}22, ${color}11)`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', color, flexShrink: 0 }}>{n}</div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '.3rem' }}>{title}</div>
                                    <div style={{ color: '#64748b', fontSize: '.88rem', lineHeight: 1.6 }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                PRICING — id="pricing"
            ═══════════════════════════════════════ */}
            <section id="pricing" aria-labelledby="pricing-heading" style={{ padding: '6rem 0', background: 'rgba(255,255,255,.015)', borderTop: '1px solid rgba(255,255,255,.05)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.25)', borderRadius: '999px', padding: '.3rem .9rem', fontSize: '.78rem', fontWeight: 700, color: '#f97316', letterSpacing: '.06em', marginBottom: '1rem' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20M12 22L8 9l4-6 4 6-4 13"/></svg> PLANS</div>
                        <h2 id="pricing-heading" style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 900, letterSpacing: '-1.5px', marginBottom: '1rem', fontFamily: "'Russo One', sans-serif" }}>Free vs Premium</h2>
                        <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: 520, margin: '0 auto' }}>Everyone earns points the same way — Premium is about organising leagues, not gaining a scoring advantage.</p>
                    </div>

                    {/* Billing toggle */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
                        <div role="tablist" aria-label="Billing period" style={{
                            display: 'inline-flex', padding: 4, borderRadius: 999,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            position: 'relative',
                        }}>
                            {([
                                { key: 'monthly', label: 'Monthly' },
                                { key: 'yearly', label: 'Yearly' },
                            ] as const).map(opt => {
                                const active = billing === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => setBilling(opt.key)}
                                        style={{
                                            position: 'relative',
                                            padding: '.55rem 1.4rem', borderRadius: 999, border: 'none',
                                            background: active ? G : 'transparent',
                                            color: active ? '#ffffff' : '#94a3b8',
                                            fontWeight: 700, fontSize: '.88rem',
                                            cursor: 'pointer', transition: 'all .2s',
                                            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                                            boxShadow: active ? '0 4px 20px rgba(56,189,248,.3)' : 'none',
                                        }}
                                    >
                                        {opt.label}
                                        {opt.key === 'yearly' && (
                                            <span style={{
                                                fontSize: '.62rem', fontWeight: 800, letterSpacing: '.08em',
                                                padding: '.1rem .45rem', borderRadius: 6,
                                                background: active ? 'rgba(255,255,255,0.22)' : 'rgba(72,187,120,.18)',
                                                color: active ? '#ffffff' : '#48bb78',
                                                border: active ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(72,187,120,.35)',
                                            }}>2 MONTHS FREE</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pricing-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: 860, margin: '0 auto' }}>
                        {/* Free */}
                        <div className="bento-card" style={{ padding: '2.5rem' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(148,163,184,.08)', border: '1px solid rgba(148,163,184,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', marginBottom: '.9rem' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '.25rem' }}>Free</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-2px' }}>€0</div>
                                </div>
                                <div style={{ fontSize: '.82rem', color: '#94a3b8' }}>forever · no credit card</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginBottom: '2rem' }}>
                                {['Access all sports & matches', 'Join unlimited leagues', 'Make predictions before kick-off', 'Live leaderboard access', 'Full prediction history', 'Result notifications', 'Custom profile & avatar'].map(f => (
                                    <div key={f} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', fontSize: '.88rem' }}>
                                        <span style={{ color: '#48bb78', fontWeight: 700, marginTop: '.05rem' }}>✓</span>
                                        <span style={{ color: '#cbd5e1' }}>{f}</span>
                                    </div>
                                ))}
                                {['Create & manage leagues', 'Add / import matches', 'Enter final scores', 'Community prediction stats'].map(f => (
                                    <div key={f} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', fontSize: '.88rem', opacity: .5 }}>
                                        <span style={{ color: '#475569', fontWeight: 700, marginTop: '.05rem' }}>✗</span>
                                        <span style={{ color: '#64748b' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <Link href="/signup" className="lp-btn-ghost" style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>Get Started Free</Link>
                        </div>

                        {/* Premium */}
                        <div style={{
                            position: 'relative', borderRadius: 20, padding: '2.5rem',
                            background: 'linear-gradient(145deg,rgba(30,41,59,.95),rgba(15,23,42,.98))',
                            border: '1px solid rgba(56,189,248,.35)',
                            boxShadow: '0 0 60px rgba(56,189,248,.12), inset 0 1px 0 rgba(255,255,255,.06)',
                        }}>
                            <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: G, color: '#fff', fontSize: '.72rem', fontWeight: 800, padding: '.3rem 1.1rem', borderRadius: '0 0 10px 10px', letterSpacing: '.06em' }}>FOR ORGANISERS</div>
                            <div style={{ height: 2, background: G, borderRadius: 2, marginBottom: '2rem', marginTop: '.75rem' }} />
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(56,189,248,.18), rgba(129,140,248,.08))', border: '1px solid rgba(56,189,248,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '.9rem', boxShadow: '0 0 30px rgba(56,189,248,.2)' }}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20M12 22L8 9l4-6 4 6-4 13"/></svg>
                                </div>
                                <div style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '.5rem' }}>Premium</div>

                                {/* Animated price */}
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem', marginBottom: '.25rem', flexWrap: 'wrap' }}>
                                    <div style={{
                                        fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1,
                                        background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                                    }}>
                                        €{billing === 'yearly' ? '4.17' : '4.99'}
                                    </div>
                                    <span style={{ fontSize: '.95rem', color: '#94a3b8', fontWeight: 600 }}>/month</span>
                                </div>

                                <div style={{ fontSize: '.82rem', color: '#94a3b8' }}>
                                    {billing === 'yearly' ? (
                                        <>billed <strong style={{ color: '#cbd5e1' }}>€49.99 / year</strong> · 2 months free</>
                                    ) : (
                                        <>billed monthly · cancel anytime</>
                                    )}
                                </div>
                                {billing === 'yearly' && (
                                    <div style={{
                                        display: 'inline-block', marginTop: '.6rem',
                                        background: 'rgba(72,187,120,.12)', border: '1px solid rgba(72,187,120,.35)',
                                        color: '#7eebac', fontWeight: 700, fontSize: '.72rem',
                                        padding: '.2rem .55rem', borderRadius: 6, letterSpacing: '.04em',
                                    }}>
                                        Save €9.89 vs monthly
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem', marginBottom: '1.25rem' }}>
                                {[
                                    ['Everything in Free', false],
                                    ['Create private & public leagues', true],
                                    ['Add matches manually or import', true],
                                    ['Enter final scores', true],
                                    ['Share leagues with invite link', true],
                                    ['Community prediction % breakdown', true],
                                    ['Premium badge on profile', true],
                                ].map(([f, gold]) => (
                                    <div key={f as string} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start', fontSize: '.88rem' }}>
                                        <span style={{ color: gold ? '#f59e0b' : '#48bb78', fontWeight: 700, marginTop: '.05rem' }}>✓</span>
                                        <span style={{ color: '#cbd5e1' }}>{f as string}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '.55rem', alignItems: 'flex-start', background: 'rgba(56,189,248,.07)', border: '1px solid rgba(56,189,248,.15)', borderRadius: 10, padding: '.65rem .85rem', marginBottom: '1.5rem', fontSize: '.76rem', color: '#94a3b8', lineHeight: 1.6 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                <span><strong style={{ color: '#cbd5e1' }}>Fair play:</strong> Premium gives no scoring advantage. Everyone earns the same +5/+3/+2/+0.</span>
                            </div>
                            <Link
                                href={`/signup?intent=premium&plan=${billing}`}
                                className="lp-btn-primary"
                                style={{ width: '100%', justifyContent: 'center', display: 'flex' }}
                            >
                                Get Premium {billing === 'yearly' ? 'Yearly' : 'Monthly'} →
                            </Link>
                        </div>
                    </div>

                    {/* Trust + legal subnote under pricing */}
                    <p style={{ textAlign: 'center', fontSize: '.78rem', color: '#64748b', marginTop: '1.5rem', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
                        Prices in EUR. Subscriptions auto-renew until cancelled. By subscribing you agree to our{' '}
                        <Link href="/terms" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Terms</Link>{' '}
                        and{' '}
                        <Link href="/privacy" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Privacy Policy</Link>.
                    </p>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                CTA
            ═══════════════════════════════════════ */}
            <section style={{ padding: '8rem 0', position: 'relative', overflow: 'hidden' }}>
                {/* CTA background — custom celebration artwork */}
                <Image
                    src="/img/cta-celebration.png"
                    alt=""
                    fill
                    sizes="100vw"
                    style={{ objectFit: 'cover', objectPosition: 'center 40%', opacity: 0.35, zIndex: 0 }}
                />
                <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, #050a14 0%, rgba(5,10,20,.45) 35%, rgba(5,10,20,.45) 65%, #050a14 100%)' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 800, height: 400, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(56,189,248,.1) 0%, transparent 70%)', filter: 'blur(60px)' }} />
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    {/* Trophy icon block — replaces bare emoji */}
                    <div style={{
                        width: 72, height: 72, borderRadius: 18,
                        background: 'linear-gradient(135deg, rgba(56,189,248,.18), rgba(129,140,248,.08))',
                        border: '1px solid rgba(56,189,248,.35)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1.75rem', color: '#38bdf8',
                        boxShadow: '0 0 50px rgba(56,189,248,.25), inset 0 1px 0 rgba(255,255,255,.06)',
                    }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></div>

                    <h2 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '1.25rem', fontFamily: "'Russo One', sans-serif" }}>
                        Ready to prove<br />
                        <span style={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>you know sport?</span>
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '1.08rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
                        Sign up free, join a league, and make your first prediction today.<br />No credit card. No catch.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2rem' }}>
                        <Link href="/signup" className="lp-btn-primary" style={{ fontSize: '1.05rem', padding: '1rem 2.5rem' }}>
                            Create Free Account →
                        </Link>
                        <Link href="/login" className="lp-btn-ghost" style={{ fontSize: '1.05rem', padding: '1rem 2rem' }}>Sign In</Link>
                    </div>
                    {/* Trust strip */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '.78rem', color: '#475569' }}>
                        {([
                            { key: 'free', label: '100% Free', color: '#48bb78', svg: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>) },
                            { key: 'nocc', label: 'No credit card', color: '#818cf8', svg: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>) },
                            { key: 'fast', label: '60s setup', color: '#f97316', svg: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>) },
                            { key: 'fair', label: 'Fair play', color: '#38bdf8', svg: (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>) },
                        ] as const).map(({ key, label, color, svg }) => (
                            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontWeight: 600 }}>
                                <span style={{ color, display: 'flex', alignItems: 'center' }}>{svg}</span>
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════
                FOOTER
            ═══════════════════════════════════════ */}
            <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '3rem 0 2rem' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2.5rem' }}>
                        <div style={{ maxWidth: 320 }}>
                            <Image
                                src="/logo.png"
                                alt="YourFriendsLeague"
                                width={150}
                                height={48}
                                style={{ height: 48, width: 'auto', marginBottom: '0.75rem' }}
                            />
                            <p style={{ color: '#94a3b8', fontSize: '.85rem', marginBottom: '.5rem' }}>The smarter way to follow sport.</p>
                            <p style={{ color: '#64748b', fontSize: '.75rem', lineHeight: 1.55 }}>
                                Operated by <strong style={{ color: '#94a3b8' }}>SIA EGATRI</strong><br />
                                Reg. nr. 50203368661 · Latvia
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                                <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', marginBottom: '.25rem' }}>APP</div>
                                {[['Sign In', '/login'], ['Sign Up', '/signup'], ['Leagues', '/tournaments']].map(([l, h]) => (
                                    <Link key={l} href={h} style={{ fontSize: '.85rem', color: '#94a3b8', transition: 'color .2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>{l}</Link>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                                <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', marginBottom: '.25rem' }}>RESOURCES</div>
                                {[['Blog', '/blog'], ['News', '/news']].map(([l, h]) => (
                                    <Link key={l} href={h} style={{ fontSize: '.85rem', color: '#94a3b8', transition: 'color .2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>{l}</Link>
                                ))}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                                <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', marginBottom: '.25rem' }}>LEGAL</div>
                                {[['Legal & Imprint', '/legal'], ['Terms of Service', '/terms'], ['Privacy Policy', '/privacy']].map(([l, h]) => (
                                    <Link key={l} href={h} style={{ fontSize: '.85rem', color: '#94a3b8', transition: 'color .2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
                                        onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}>{l}</Link>
                                ))}
                                <CookieSettingsLink
                                    style={{ fontSize: '.85rem', color: '#94a3b8', transition: 'color .2s', textAlign: 'left' }}
                                >Cookie settings</CookieSettingsLink>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                                <div style={{ fontSize: '.75rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '.08em', marginBottom: '.25rem' }}>CONTACT</div>
                                <a href="mailto:contact@yourfriendleague.com" style={{ fontSize: '.85rem', color: '#94a3b8' }}>contact@yourfriendleague.com</a>
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <p style={{ fontSize: '.78rem', color: '#64748b' }}>© 2026 SIA EGATRI — YourFriendsLeague. All rights reserved.</p>
                        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', opacity: 0.35 }} aria-hidden="true">
                            {[
                                <svg key="s" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>,
                                <svg key="h" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round"><path d="M6 4l10 8"/><path d="M16 12c1.5 1 2 2.5 1 3.5S14 17 12 17"/><circle cx="10" cy="18.5" r="1.5" fill="#818cf8" fillOpacity="0.3" stroke="#818cf8"/></svg>,
                                <svg key="t" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#48bb78" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M4 8c2 1 3 3 3 4s-1 3-3 4"/><path d="M20 8c-2 1-3 3-3 4s1 3 3 4"/></svg>,
                                <svg key="b" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/></svg>,
                            ]}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
