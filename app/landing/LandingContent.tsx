'use client';

import { MotionConfig } from 'framer-motion';
import Nav from './sections/Nav';
import Hero from './sections/Hero';
import Game from './sections/Game';
import Scoring from './sections/Scoring';
import Matchday from './sections/Matchday';
import Footer from './sections/Footer';
import type { VisitorRegion } from './region';
import './landing.css';

interface LandingContentProps {
    region: VisitorRegion;
}

export default function LandingContent({ region }: LandingContentProps) {
    return (
        <MotionConfig reducedMotion="user">
            <Nav />
            <main className="ld-page">
                <Hero />
                <Game />
                <Scoring />
                <Matchday region={region} />
                <Footer />
            </main>
        </MotionConfig>
    );
}
