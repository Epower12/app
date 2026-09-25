'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { FadeIn } from '../motion';
import type { VisitorRegion } from '../region';

function buildSports(region: VisitorRegion) {
    return [
    {
        number: '01',
        // US visitors mean "American football" by default when they read "football" —
        // regional SEO/UX fix: US sees "Soccer", everyone else sees "Football".
        name: region === 'us' ? 'Soccer' : 'Football',
        format: 'Exact score',
        video: '/video/football.mp4',
        poster: '/img/sport-football.png',
    },
    {
        number: '02',
        name: 'Ice hockey',
        format: 'Exact score',
        video: '/video/hockey.mp4',
        poster: '/img/sport-hockey.png',
    },
    {
        number: '03',
        name: 'Basketball',
        format: 'Exact score',
        video: '/video/basketball.mp4',
        poster: '/img/sport-basketball.png',
    },
    {
        number: '04',
        name: 'Racing',
        format: 'Podium picks · P1 P2 P3',
        video: '/video/racing.mp4',
        poster: '/img/sport-racing.png',
    },
    ];
}

type Sport = ReturnType<typeof buildSports>[number];

function Card({
    sport,
    index,
    total,
    progress,
}: {
    sport: Sport;
    index: number;
    total: number;
    progress: MotionValue<number>;
}) {
    const targetScale = 1 - (total - 1 - index) * 0.03;
    const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

    return (
        <div className="ld-match-sticky" style={{ top: `calc(var(--matchday-sticky-top) + ${index * 28}px)` }}>
            <motion.div style={{ scale }} className="ld-match-card">
                <div className="ld-match-head">
                    <div className="ld-match-id">
                        <span className="hero-heading ld-match-number">{sport.number}</span>
                        <div className="ld-match-titles">
                            <h3 className="ld-match-name">{sport.name}</h3>
                            <span className="ld-match-format">{sport.format}</span>
                        </div>
                    </div>
                    <Link href="/signup" className="btn-pill-ghost">Predict now</Link>
                </div>

                <video
                    src={sport.video}
                    poster={sport.poster}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    className="ld-match-video"
                />
            </motion.div>
        </div>
    );
}

export default function Matchday({ region }: { region: VisitorRegion }) {
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });
    const sports = buildSports(region);

    return (
        <section id="matchday" ref={ref} className="ld-matchday">
            <FadeIn y={40}>
                <h2 className="hero-heading ld-matchday-title">Matchday</h2>
            </FadeIn>

            {sports.map((sport, i) => (
                <Card key={sport.number} sport={sport} index={i} total={sports.length} progress={scrollYProgress} />
            ))}
        </section>
    );
}
