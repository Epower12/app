'use client';

import Link from 'next/link';
import { FadeIn, Float, MediaFill } from '../motion';
import { MEDIA } from '../media';

const TRUST = ['Free forever plan', 'No betting, no real money', 'Private friends-only leagues'];

export default function Hero() {
    return (
        <section className="ld-hero">
            <div className="ld-hero-blob ld-hero-blob-a" aria-hidden="true" />
            <div className="ld-hero-blob ld-hero-blob-b" aria-hidden="true" />

            <div className="ld-wrap ld-hero-grid">
                <div className="ld-hero-copy">
                    <FadeIn y={20}>
                        <span className="ld-eyebrow">⚽ 🏒 🏀 🏎️ 🎾 The score prediction game for friends</span>
                    </FadeIn>
                    <FadeIn delay={0.1} y={30}>
                        <h1 className="ld-display ld-hero-title">
                            Call the score.<br />
                            <span className="ld-hl">Beat your mates.</span>
                        </h1>
                    </FadeIn>
                    <FadeIn delay={0.2} y={20}>
                        <p className="ld-hero-lead">
                            Predict the result of real matches before they start, earn points for being right, and
                            find out who in your group really knows sport. It&apos;s all on one private leaderboard
                            that only your friends can see.
                        </p>
                    </FadeIn>
                    <FadeIn delay={0.3} y={20}>
                        <div className="ld-hero-ctas">
                            <Link href="/signup" className="ld-btn">Start free</Link>
                            <a href="#pricing" className="ld-btn ld-btn-ghost">See plans &amp; pricing</a>
                        </div>
                    </FadeIn>
                    <FadeIn delay={0.4} y={10}>
                        <ul className="ld-trust">
                            {TRUST.map(t => <li key={t}>{t}</li>)}
                        </ul>
                    </FadeIn>
                </div>

                <div className="ld-hero-stage">
                    <FadeIn delay={0.15} y={40} className="ld-hero-main">
                        <MediaFill media={MEDIA.hero} className="ld-cover" />
                        <span className="ld-live"><i /> Matchday</span>
                    </FadeIn>
                    <FadeIn delay={0.3} y={40} className="ld-hero-side">
                        <MediaFill media={MEDIA.heroSide} className="ld-cover" />
                    </FadeIn>

                    {/* Floating product moments — the purpose of the app at a glance */}
                    <Float delay={0.7} className="ld-chip-card ld-pick">
                        <span className="ld-chip-label">Your prediction · locked 🔒</span>
                        <div className="ld-pick-score">
                            <span>Home FC</span><strong>2 – 1</strong><span>Away Utd</span>
                        </div>
                    </Float>
                    <Float delay={1} className="ld-chip-card ld-points">
                        <strong>+5</strong>
                        <span>Exact score!</span>
                    </Float>
                    <Float delay={1.3} className="ld-chip-card ld-mini-table">
                        <span className="ld-chip-label">Friends league · week 12</span>
                        <ol>
                            <li><b>1</b> Alex <em>42</em></li>
                            <li className="is-you"><b>2</b> You <em>39</em></li>
                            <li><b>3</b> Sam <em>35</em></li>
                        </ol>
                    </Float>
                </div>
            </div>
        </section>
    );
}
