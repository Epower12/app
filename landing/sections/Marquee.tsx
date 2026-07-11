'use client';

import { useEffect, useRef, useState } from 'react';

const ROW_ONE = [
    '/img/sport-football.png',
    '/img/sport-hockey-end.png',
    '/img/sport-basketball.png',
    '/img/sport-racing-end.png',
    '/img/hero-arena.png',
    '/img/sport-tennis.png',
    '/img/sport-scoreboard.png',
];

const ROW_TWO = [
    '/img/sport-racing.png',
    '/img/sport-basketball-end.png',
    '/img/sport-crowd.png',
    '/img/sport-hockey.png',
    '/img/sport-floodlight.png',
    '/img/sport-football-end.png',
    '/img/cta-celebration.png',
];

function Row({ images, direction, offset }: { images: string[]; direction: 1 | -1; offset: number }) {
    const tripled = [...images, ...images, ...images];
    return (
        <div
            className="ld-marquee-row"
            style={{ transform: `translateX(${direction * (offset - 200)}px)` }}
        >
            {tripled.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" loading="lazy" />
            ))}
        </div>
    );
}

/** Two counter-scrolling rows of match imagery, driven by page scroll. */
export default function Marquee() {
    const ref = useRef<HTMLElement>(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            const el = ref.current;
            if (!el) return;
            const top = el.getBoundingClientRect().top + window.scrollY;
            setOffset((window.scrollY - top + window.innerHeight) * 0.3);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <section ref={ref} className="ld-marquee" aria-hidden="true">
            <Row images={ROW_ONE} direction={1} offset={offset} />
            <Row images={ROW_TWO} direction={-1} offset={offset} />
        </section>
    );
}
