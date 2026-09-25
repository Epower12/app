'use client';

import Link from 'next/link';
import { FadeIn, Magnet } from '../motion';

export default function Hero() {
    return (
        <section className="ld-hero">
            <div className="ld-hero-headline-wrap">
                <FadeIn delay={0.15} y={40}>
                    <h1 className="hero-heading ld-hero-headline">Call the score</h1>
                </FadeIn>
            </div>

            {/* Hero video — magnetic, in normal flow so nothing overlaps */}
            <div className="ld-hero-video-zone">
                <FadeIn delay={0.5} y={30} className="ld-hero-video-fill">
                    <Magnet padding={150} strength={12}>
                        <div className="ld-hero-video-card">
                            <video
                                src="/video/basketball.mp4"
                                poster="/img/sport-basketball.png"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        </div>
                    </Magnet>
                </FadeIn>
            </div>

            <div className="ld-hero-bottom">
                <FadeIn delay={0.35} y={20}>
                    <p className="ld-hero-tagline">Free score predictions with friends. No betting — just bragging rights.</p>
                </FadeIn>
                <FadeIn delay={0.5} y={20}>
                    <Link href="/signup" className="btn-pill">Start free</Link>
                </FadeIn>
            </div>
        </section>
    );
}
