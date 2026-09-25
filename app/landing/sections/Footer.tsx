'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';
import { CookieSettingsLink } from '../../components/CookieConsent';

export default function Footer() {
    return (
        <footer className="ld-footer">
            {/* Confetti atmosphere behind the closing line */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/cta-celebration.png" alt="" loading="lazy" className="ld-footer-bg" />
            <div className="ld-footer-content">
                <FadeIn y={40}>
                    <h2 className="hero-heading ld-footer-title">Your move</h2>
                </FadeIn>
                <FadeIn delay={0.15} y={20}>
                    <Link href="/signup" className="btn-pill">Start free — takes a minute</Link>
                </FadeIn>

                <div className="ld-footer-legal">
                    <span>© SIA EGATRI · yourfriendleague.com</span>
                    <div className="ld-footer-links">
                        <Link href="/news">News</Link>
                        <Link href="/blog">Blog</Link>
                        <Link href="/terms">Terms</Link>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/legal">Legal</Link>
                        <CookieSettingsLink />
                    </div>
                </div>
            </div>
        </footer>
    );
}
