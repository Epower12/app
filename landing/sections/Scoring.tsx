'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';

/** The numbers here aren't decoration — they're the actual points you earn. */
const TIERS = [
    {
        points: '+5',
        name: 'Exact score',
        desc: 'You called 3–1 and it ended 3–1. Maximum points, maximum bragging rights.',
    },
    {
        points: '+3',
        name: 'Correct margin',
        desc: 'Right winner, right goal difference. Close enough to sting your rivals.',
    },
    {
        points: '+2',
        name: 'Right winner',
        desc: 'You picked the side that won. The safest points on the board.',
    },
    {
        points: '0',
        name: 'Wrong call',
        desc: 'It happens to everyone. There is always the next fixture.',
    },
];

export default function Scoring() {
    return (
        <section id="scoring" className="ld-scoring">
            <FadeIn y={40}>
                <h2 className="ld-scoring-title">Scoring</h2>
            </FadeIn>

            <div className="ld-scoring-list">
                {TIERS.map((tier, i) => (
                    <FadeIn key={tier.name} delay={i * 0.1} className={i > 0 ? 'ld-tier-row-border' : undefined}>
                        <div className="ld-tier-row">
                            <span className="ld-tier-points">{tier.points}</span>
                            <div className="ld-tier-text">
                                <h3 className="ld-tier-name">{tier.name}</h3>
                                <p className="ld-tier-desc">{tier.desc}</p>
                            </div>
                        </div>
                    </FadeIn>
                ))}

                <FadeIn delay={0.2}>
                    <p className="ld-scoring-note">Racing scores by podium picks · Tennis &amp; esports by series</p>
                </FadeIn>

                {/* Premium — organizer tools, paid via Stripe. Never a scoring advantage. */}
                <FadeIn delay={0.1}>
                    <div className="ld-premium-card">
                        <div className="ld-premium-copy">
                            <h3 className="ld-premium-title">Premium</h3>
                            <p className="ld-premium-desc">
                                Unlocks league-organizer tools — bigger private leagues, community stats, and
                                more. Scoring stays exactly the same for everyone: premium buys convenience,
                                never an advantage.
                            </p>
                        </div>
                        <div className="ld-premium-pricing">
                            <div className="ld-premium-prices">
                                <span className="ld-premium-price">€4.99<span>/mo</span></span>
                                <span className="ld-premium-dot">·</span>
                                <span className="ld-premium-price">€49.99<span>/yr</span></span>
                            </div>
                            <span className="ld-premium-terms">
                                2 months free yearly · Secure checkout via Stripe · Cancel anytime
                            </span>
                            <Link href="/premium" className="btn-pill-ghost" style={{ marginTop: '0.25rem' }}>
                                Go premium
                            </Link>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </section>
    );
}
