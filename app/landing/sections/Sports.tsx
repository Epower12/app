'use client';

import { FadeIn, MediaFill } from '../motion';
import { MEDIA, type Media } from '../media';
import type { VisitorRegion } from '../region';

const buildSports = (region: VisitorRegion): { name: string; format: string; media: Media; wide?: boolean }[] => [
    // Regional copy: US visitors see "Soccer", everyone else "Football".
    { name: region === 'us' ? 'Soccer' : 'Football', format: 'Exact scoreline', media: MEDIA.football, wide: true },
    { name: 'Ice hockey', format: 'Exact scoreline', media: MEDIA.hockey },
    { name: 'Basketball', format: 'Exact scoreline', media: MEDIA.basketball },
    { name: 'Formula 1', format: 'Top 10 + bonus questions', media: MEDIA.racing, wide: true },
    { name: 'Tennis', format: 'Match result by sets', media: MEDIA.tennis },
];

export default function Sports({ region }: { region: VisitorRegion }) {
    const sports = buildSports(region);
    return (
        <section id="sports" className="ld-section ld-sports">
            <div className="ld-wrap">
                <FadeIn className="ld-section-head">
                    <span className="ld-kicker">Sports</span>
                    <h2 className="ld-display ld-h2">One app for every sport you follow</h2>
                    <p className="ld-sub">
                        World Cups, club seasons, the NHL, a Formula 1 race weekend: fixtures are imported for you,
                        so your league just has to predict.
                    </p>
                </FadeIn>

                <div className="ld-sports-grid">
                    {sports.map((s, i) => (
                        <FadeIn key={s.name} delay={i * 0.08} className={`ld-sport${s.wide ? ' is-wide' : ''}`}>
                            <MediaFill media={s.media} className="ld-cover" />
                            <div className="ld-sport-label">
                                <h3>{s.name}</h3>
                                <span>{s.format}</span>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}
