'use client';

import { FadeIn, MediaFill } from '../motion';
import { MEDIA } from '../media';

const REASONS = [
    {
        media: MEDIA.whyDebate,
        tag: 'The problem',
        title: 'Settle the group-chat debate',
        text: 'Everyone "knew it all along" after the final whistle. Here your prediction is locked before kick-off, so nobody can rewrite history.',
    },
    {
        media: MEDIA.whyMatter,
        tag: 'The fun',
        title: 'Make every match matter',
        text: 'A dull midweek 0–0 is suddenly worth 5 points if you called it. You have a reason to watch and a rival to beat.',
    },
    {
        media: MEDIA.whyFriends,
        tag: 'The rules',
        title: 'Friends only. Zero betting.',
        text: 'It is a skill game, not gambling. There is no real money, no odds and no ads pushing bets. The only prize is bragging rights.',
    },
];

const FOR_WHO = ['Friend groups', 'Families', 'Office leagues', 'Sports clubs', 'Pub quiz crews', 'Fan communities'];

export default function Why() {
    return (
        <section id="why" className="ld-section ld-why">
            <div className="ld-wrap">
                <FadeIn className="ld-section-head">
                    <span className="ld-kicker">Why YourFriendsLeague</span>
                    <h2 className="ld-display ld-h2">Watching sport is better<br />when something&apos;s on the line</h2>
                    <p className="ld-sub">
                        Sweepstakes on paper get lost and spreadsheets break. YourFriendsLeague handles the fixtures,
                        locks every pick before the match starts, and scores everything automatically.
                    </p>
                </FadeIn>

                <div className="ld-why-grid">
                    {REASONS.map((r, i) => (
                        <FadeIn key={r.title} delay={i * 0.12} className="ld-card ld-why-card">
                            <div className="ld-why-media"><MediaFill media={r.media} className="ld-cover" /></div>
                            <div className="ld-why-body">
                                <span className="ld-tag">{r.tag}</span>
                                <h3>{r.title}</h3>
                                <p>{r.text}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>

                <FadeIn className="ld-for-who">
                    <span>Perfect for</span>
                    <ul>{FOR_WHO.map(w => <li key={w}>{w}</li>)}</ul>
                </FadeIn>
            </div>
        </section>
    );
}
