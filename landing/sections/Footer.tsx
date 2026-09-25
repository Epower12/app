'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';
import { MEDIA } from '../media';
import { CookieSettingsLink } from '../../components/CookieConsent';

export default function Footer() {
    return (
        <>
            <section className="ld-finale">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={MEDIA.finale.img} alt="" loading="lazy" className="ld-finale-bg" />
                <div className="ld-wrap ld-finale-inner">
                    <FadeIn y={30}>
                        <h2 className="ld-display ld-finale-title">Think you know sport?<br />Prove it.</h2>
                    </FadeIn>
                    <FadeIn delay={0.15} y={20}>
                        <p>It&apos;s free, you&apos;re set up in about a minute, and your friends are already arguing about the weekend.</p>
                    </FadeIn>
                    <FadeIn delay={0.25} y={20}>
                        <Link href="/signup" className="ld-btn ld-btn-light">Start free</Link>
                    </FadeIn>
                </div>
            </section>

            <footer className="ld-footer">
                <div className="ld-wrap ld-footer-inner">
                    <span>© SIA EGATRI · yourfriendleague.com</span>
                    <nav className="ld-footer-links" aria-label="Footer">
                        <Link href="/news">News</Link>
                        <Link href="/blog">Blog</Link>
                        <Link href="/terms">Terms</Link>
                        <Link href="/privacy">Privacy</Link>
                        <Link href="/legal">Legal</Link>
                        <CookieSettingsLink />
                    </nav>
                </div>
            </footer>
        </>
    );
}
