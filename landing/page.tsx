'use client';

// NOTE: This page renders identical content to `/`. The canonical URL is `/`.
// The `/landing` route is suppressed from indexing via app/landing/layout.tsx
// (server-component layout file that exports `metadata.robots = noindex`).
//
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
import './landing.css';

export default function LandingPage() {
    return (
        <MotionConfig reducedMotion="user">
            <div className="ld-page">
                <Nav />
                <main>
                    <Hero />
                    <Ticker />
                    <Why />
                    <HowItWorks />
                    <Sports />
                    <Scoring />
                    <Pricing />
                    <Faq />
                </main>
                <Footer />
            </div>
        </MotionConfig>
    );
}
