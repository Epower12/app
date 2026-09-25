'use client';

import { FadeIn } from '../motion';

/** The numbers here aren't decoration: they are the actual points you earn. */
const TIERS = [
    { points: '+5', name: 'Exact score', example: 'You said 3–1', tone: 'lime' },
    { points: '+3', name: 'Right winner & margin', example: 'You said 2–0', tone: 'orange' },
    { points: '+2', name: 'Right winner', example: 'You said 2–1', tone: 'sky' },
    { points: '0', name: 'Wrong call', example: 'You said 1–1', tone: 'plain' },
];

export default function Scoring() {
    return (
        <section id="scoring" className="ld-section ld-scoring">
            <div className="ld-wrap">
                <FadeIn className="ld-section-head">
                    <span className="ld-kicker">Scoring</span>
                    <h2 className="ld-display ld-h2">Simple to learn. Hard to master.</h2>
                    <p className="ld-sub">
                        The match ends <strong>3–1</strong>. This is what everyone in your league scores:
                    </p>
                </FadeIn>

                <div className="ld-tiers">
                    {TIERS.map((t, i) => (
                        <FadeIn key={t.name} delay={i * 0.1} className={`ld-tier is-${t.tone}`}>
                            <span className="ld-tier-points">{t.points}</span>
                            <h3>{t.name}</h3>
                            <span className="ld-tier-example">{t.example}</span>
                        </FadeIn>
                    ))}
                </div>

                <FadeIn>
                    <p className="ld-scoring-note">
                        Formula 1 race weekends are scored on your Top 10 and bonus questions. Everyone scores the same
                        way, and Premium never gives a points advantage.
                    </p>
                </FadeIn>
            </div>
        </section>
    );
}
