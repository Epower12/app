'use client';

import { FadeIn } from '../motion';

const FAQ = [
    {
        q: 'Is this betting or gambling?',
        a: 'No. YourFriendsLeague is a free-to-play skill game. No money is staked, there are no odds and there are no cash prizes. You play for points and bragging rights.',
    },
    {
        q: 'Is it really free?',
        a: 'Yes. Joining leagues, predicting every match and following the leaderboards is free, forever, with no credit card needed.',
    },
    {
        q: 'Who needs Premium?',
        a: 'Only the league organiser. Premium lets you create leagues, import fixtures, manage matches and see community stats. Everyone you invite plays free.',
    },
    {
        q: 'Does Premium give me more points?',
        a: 'Never. Scoring is identical for every player. Premium pays for organiser tools, not an advantage.',
    },
    {
        q: 'Which sports can we predict?',
        a: 'Football, ice hockey, basketball, Formula 1 (Top 10 plus bonus questions) and tennis, with more competitions added over time.',
    },
    {
        q: 'Can I cancel Premium?',
        a: "Yes, at any time from your profile. Manage or cancel your subscription through Stripe's secure billing portal.",
    },
];

export default function Faq() {
    return (
        <section id="faq" className="ld-section ld-faq">
            <div className="ld-wrap ld-faq-wrap">
                <FadeIn className="ld-section-head">
                    <span className="ld-kicker">FAQ</span>
                    <h2 className="ld-display ld-h2">Good questions</h2>
                </FadeIn>
                <div className="ld-faq-list">
                    {FAQ.map(item => (
                        <details key={item.q} className="ld-faq-item">
                            <summary>{item.q}</summary>
                            <p>{item.a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
