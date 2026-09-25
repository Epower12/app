'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';

const STEPS = [
    {
        icon: '🤝',
        title: 'Join or create a league',
        text: 'Open a friend\'s invite link to join for free, or start your own league with Premium and choose the competitions.',
    },
    {
        icon: '🎯',
        title: 'Predict before kick-off',
        text: 'Enter the exact score for each match. You can change your mind until the match starts, and then every pick locks.',
    },
    {
        icon: '🏆',
        title: 'Score points, climb the table',
        text: 'When the results come in, points are added automatically and the leaderboard updates. Then the arguments start.',
    },
];

export default function HowItWorks() {
    return (
        <section id="how" className="ld-section ld-how">
            <div className="ld-wrap">
                <FadeIn className="ld-section-head">
                    <span className="ld-kicker">How it works</span>
                    <h2 className="ld-display ld-h2">Up and running in about a minute</h2>
                </FadeIn>

                <ol className="ld-steps">
                    {STEPS.map((s, i) => (
                        <FadeIn key={s.title} delay={i * 0.12} className="ld-step">
                            <span className="ld-step-num">{i + 1}</span>
                            <span className="ld-step-icon" aria-hidden="true">{s.icon}</span>
                            <h3>{s.title}</h3>
                            <p>{s.text}</p>
                        </FadeIn>
                    ))}
                </ol>

                <FadeIn className="ld-center">
                    <Link href="/signup" className="ld-btn">Create your free account</Link>
                </FadeIn>
            </div>
        </section>
    );
}
