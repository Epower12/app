'use client';

// Bright "matchday" design: purpose → why → how → sports → scoring → pricing → FAQ.
// All photos/videos are configured in ./media.ts; styles live in landing.css.

import { MotionConfig } from 'framer-motion';
import Nav from './sections/Nav';
import Hero from './sections/Hero';
import Ticker from './sections/Ticker';
import Why from './sections/Why';
import HowItWorks from './sections/HowItWorks';
import Sports from './sections/Sports';
import Scoring from './sections/Scoring';
import Pricing from './sections/Pricing';
import Faq from './sections/Faq';
import Footer from './sections/Footer';
import type { VisitorRegion } from './region';
import './landing.css';

interface LandingContentProps {
    region: VisitorRegion;
}

export default function LandingContent({ region }: LandingContentProps) {
    return (
        <MotionConfig reducedMotion="user">
            <div className="ld-page">
                <Nav />
                <main>
                    <Hero />
                    <Ticker region={region} />
                    <Why />
                    <HowItWorks />
                    <Sports region={region} />
                    <Scoring />
                    <Pricing />
                    <Faq region={region} />
                </main>
                <Footer />
            </div>
        </MotionConfig>
    );
}
