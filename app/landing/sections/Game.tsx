'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';

const STEPS = [
    { n: '1', title: 'Pick the score', desc: 'Call the exact result before kickoff.' },
    { n: '2', title: 'Earn points', desc: 'Closer picks score higher — exact scores score highest.' },
    { n: '3', title: 'Climb the table', desc: 'Only your friends can see it.' },
];

/** "About" section — the game explained, scannable in 3 steps, over a quiet full-bleed stadium backdrop. */
export default function Game() {
    return (
        <section id="game" className="ld-game">
            {/* Atmosphere layer — fully behind the text, never beside it */}
            <div className="ld-game-bg" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/sport-floodlight.png" alt="" loading="lazy" />
                <div className="ld-game-vignette" />
            </div>

            <div className="ld-game-content">
                <FadeIn delay={0} y={40}>
                    <h2 className="hero-heading ld-h2">The game</h2>
                </FadeIn>

                <FadeIn delay={0.08} y={20}>
                    <p className="ld-game-kicker">
                        We used to track this in a spreadsheet every year. Now it&apos;s this.
                    </p>
                </FadeIn>

                <div className="ld-game-steps">
                    {STEPS.map((step, i) => (
                        <FadeIn key={step.n} delay={0.1 + i * 0.1} y={24}>
                            <div className="ld-step">
                                <span className="hero-heading ld-step-number">{step.n}</span>
                                <h3 className="ld-step-title">{step.title}</h3>
                                <p className="ld-step-desc">{step.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>

                <FadeIn delay={0.4} y={20}>
                    <p className="ld-game-copy">Free forever — bragging rights not included.</p>
                </FadeIn>

                <div className="ld-game-cta">
                    <FadeIn delay={0.5} y={20}>
                        <Link href="/signup" className="btn-pill">Create your league</Link>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}
