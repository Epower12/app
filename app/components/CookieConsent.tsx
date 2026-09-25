'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * GDPR / ePrivacy cookie consent banner.
 *
 * Flow:
 *   1. On first visit, shows a slide-up banner at the bottom with three buttons:
 *      [Accept all] [Reject all] [Customize]
 *   2. User's choice is persisted to localStorage as `yfl_consent`.
 *   3. On `Accept`, calls `gtag('consent', 'update', { analytics_storage: 'granted', ... })`
 *      so GA4's Consent Mode v2 flips from "denied" → "granted" and full tracking starts.
 *   4. On `Reject`, leaves Consent Mode in its default "denied" state.
 *
 * Reopening later:
 *   - The "Cookie settings" link in the footer dispatches `cookie-consent:open`
 *     which this component listens for to re-show the banner.
 */

type Consent = 'granted' | 'denied' | null;
const STORAGE_KEY = 'yfl_consent_v1';
const STORAGE_TIMESTAMP_KEY = 'yfl_consent_ts_v1';
const OPEN_EVENT = 'cookie-consent:open';

declare global {
    interface Window {
        gtag?: (...args: any[]) => void;
    }
}

function readStoredConsent(): Consent {
    if (typeof window === 'undefined') return null;
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'granted' || v === 'denied' ? v : null;
    } catch {
        return null;
    }
}

function writeConsent(value: Exclude<Consent, null>) {
    try {
        localStorage.setItem(STORAGE_KEY, value);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, String(Date.now()));
    } catch { /* ignore */ }

    // Push to gtag via Consent Mode v2
    if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', {
            analytics_storage: value === 'granted' ? 'granted' : 'denied',
            // Ad cookies stay denied regardless — we don't run ads.
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
    }
}

export default function CookieConsent() {
    const [visible, setVisible] = useState(false);
    const [customizing, setCustomizing] = useState(false);
    const [analyticsToggle, setAnalyticsToggle] = useState(false);

    // Show on first visit, hide otherwise
    useEffect(() => {
        const stored = readStoredConsent();
        if (stored === null) {
            // Slight delay so it doesn't fight with the page paint
            const t = setTimeout(() => setVisible(true), 600);
            return () => clearTimeout(t);
        }
    }, []);

    // Listen for "open settings" trigger from footer link
    useEffect(() => {
        const onOpen = () => {
            setAnalyticsToggle(readStoredConsent() === 'granted');
            setCustomizing(true);
            setVisible(true);
        };
        window.addEventListener(OPEN_EVENT, onOpen);
        return () => window.removeEventListener(OPEN_EVENT, onOpen);
    }, []);

    const acceptAll = () => {
        writeConsent('granted');
        setVisible(false);
        setCustomizing(false);
    };
    const rejectAll = () => {
        writeConsent('denied');
        setVisible(false);
        setCustomizing(false);
    };
    const saveCustom = () => {
        writeConsent(analyticsToggle ? 'granted' : 'denied');
        setVisible(false);
        setCustomizing(false);
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-labelledby="cookie-consent-heading"
            aria-describedby="cookie-consent-body"
            style={{
                position: 'fixed', left: 16, right: 16, bottom: 16,
                zIndex: 9999, maxWidth: 720, margin: '0 auto',
                background: 'linear-gradient(145deg, rgba(15,23,42,0.97), rgba(8,15,30,0.97))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(56,189,248,0.25)',
                borderRadius: 16,
                padding: '1.25rem 1.4rem',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 60px rgba(56,189,248,0.08)',
                color: '#e2e8f0',
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                animation: 'cc-slide-up 0.4s cubic-bezier(.16,1,.3,1) both',
            }}
        >
            <style>{`
                @keyframes cc-slide-up {
                    from { transform: translateY(120%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .cc-anim { animation: none !important; }
                }
                .cc-btn-primary {
                    background: linear-gradient(135deg, #38bdf8, #818cf8);
                    color: #ffffff; font-weight: 700;
                    padding: 0.55rem 1.1rem; border-radius: 10px;
                    border: none; cursor: pointer;
                    font-size: 0.85rem;
                    box-shadow: 0 0 20px rgba(56,189,248,0.25);
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .cc-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 30px rgba(56,189,248,0.4); }
                .cc-btn-secondary {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #cbd5e1; font-weight: 600;
                    padding: 0.55rem 1.1rem; border-radius: 10px;
                    cursor: pointer; font-size: 0.85rem;
                    transition: background 0.15s, color 0.15s;
                }
                .cc-btn-secondary:hover { background: rgba(255,255,255,0.1); color: #ffffff; }
                .cc-btn-ghost {
                    background: transparent; border: none;
                    color: #94a3b8; font-weight: 600;
                    padding: 0.55rem 0.6rem; border-radius: 8px;
                    cursor: pointer; font-size: 0.82rem;
                    transition: color 0.15s;
                }
                .cc-btn-ghost:hover { color: #e2e8f0; }
            `}</style>

            {!customizing ? (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                        <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>🍪</span>
                        <h2 id="cookie-consent-heading" style={{
                            fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0,
                        }}>
                            We use cookies
                        </h2>
                    </div>
                    <p id="cookie-consent-body" style={{
                        fontSize: '0.83rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 1rem',
                    }}>
                        Essential cookies keep you signed in. With your consent we also use{' '}
                        <strong style={{ color: '#cbd5e1' }}>Google Analytics</strong> to count
                        page views and understand which content helps people — IPs are anonymised, no
                        ad tracking. See our{' '}
                        <Link href="/privacy" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                            privacy policy
                        </Link>.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={acceptAll} className="cc-btn-primary">
                            Accept all
                        </button>
                        <button type="button" onClick={rejectAll} className="cc-btn-secondary">
                            Reject all
                        </button>
                        <button type="button" onClick={() => setCustomizing(true)} className="cc-btn-ghost">
                            Customize →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <span aria-hidden="true" style={{ fontSize: '1.2rem' }}>⚙️</span>
                        <h2 id="cookie-consent-heading" style={{
                            fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', margin: 0,
                        }}>
                            Cookie preferences
                        </h2>
                    </div>
                    <p id="cookie-consent-body" style={{
                        fontSize: '0.8rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 1rem',
                    }}>
                        Choose which cookies we set. You can change this anytime via the
                        &ldquo;Cookie settings&rdquo; link in the footer.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.1rem' }}>
                        {/* Essential — always on, disabled toggle */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem', padding: '0.75rem 0.9rem',
                            background: 'rgba(72,187,120,0.07)',
                            border: '1px solid rgba(72,187,120,0.25)',
                            borderRadius: 10,
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
                                    Essential
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                                    Required for sign-in and security. Always on.
                                </div>
                            </div>
                            <span style={{
                                fontSize: '0.7rem', fontWeight: 800, letterSpacing: '.08em',
                                padding: '.25rem .55rem', borderRadius: 6,
                                background: 'rgba(72,187,120,0.18)',
                                color: '#7eebac', border: '1px solid rgba(72,187,120,0.35)',
                            }}>ALWAYS ON</span>
                        </div>

                        {/* Analytics — togglable */}
                        <label style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: '1rem', padding: '0.75rem 0.9rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10, cursor: 'pointer',
                        }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cbd5e1' }}>
                                    Analytics (Google Analytics 4)
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                                    Anonymous page views, geography, devices. No ad tracking.
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={analyticsToggle}
                                onChange={(e) => setAnalyticsToggle(e.target.checked)}
                                aria-label="Enable Google Analytics"
                                style={{
                                    width: 38, height: 22, cursor: 'pointer', accentColor: '#38bdf8',
                                }}
                            />
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setCustomizing(false)} className="cc-btn-ghost">
                            ← Back
                        </button>
                        <button type="button" onClick={saveCustom} className="cc-btn-primary">
                            Save preferences
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Tiny helper button — drops into any footer to let the user re-open the banner.
 * Renders as a plain inline link with no styling beyond cursor.
 */
export function CookieSettingsLink({
    className,
    style,
    children = 'Cookie settings',
}: {
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={() => {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event(OPEN_EVENT));
                }
            }}
            className={className}
            style={{
                background: 'none', border: 'none', cursor: 'pointer',
                font: 'inherit', padding: 0, color: 'inherit',
                ...style,
            }}
        >
            {children}
        </button>
    );
}
