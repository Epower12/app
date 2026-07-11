'use client';

// NOTE: This page renders identical content to `/`. The canonical URL is `/`.
// The `/landing` route is suppressed from indexing via app/landing/layout.tsx
// (server-component layout file that exports `metadata.robots = noindex`).
//
// Ported from the user-approved landing-3d prototype (Vite + Tailwind) into
// plain CSS (landing.css) + framer-motion. Sections: Hero, Marquee, Game,
// Scoring, Matchday, Footer.

import { MotionConfig } from 'framer-motion';
import Hero from './sections/Hero';
import Marquee from './sections/Marquee';
import Game from './sections/Game';
import Scoring from './sections/Scoring';
import Matchday from './sections/Matchday';
import Footer from './sections/Footer';
import './landing.css';

export default function LandingPage() {
    return (
        <MotionConfig reducedMotion="user">
            <main className="ld-page">
                <Hero />
                <Marquee />
                <Game />
                <Scoring />
                <Matchday />
                <Footer />
            </main>
        </MotionConfig>
    );
}
