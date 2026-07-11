'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { FadeIn } from '../motion';

const SPORTS = [
    {
        number: '01',
        name: 'Football',
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

function Card({
    sport,
    index,
    total,
    progress,
}: {
    sport: (typeof SPORTS)[number];
    index: number;
    total: number;
    progress: MotionValue<number>;
}) {
    const targetScale = 1 - (total - 1 - index) * 0.03;
    const scale = useTransform(progress, [index / total, 1], [1, targetScale]);

    return (
        <div className="ld-match-sticky" style={{ top: `calc(6rem + ${index * 28}px)` }}>
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

export default function Matchday() {
    const ref = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end end'],
    });

    return (
        <section id="matchday" ref={ref} className="ld-matchday">
            <FadeIn y={40}>
                <h2 className="hero-heading ld-matchday-title">Matchday</h2>
            </FadeIn>

            {SPORTS.map((sport, i) => (
                <Card key={sport.name} sport={sport} index={i} total={SPORTS.length} progress={scrollYProgress} />
            ))}
        </section>
    );
}
