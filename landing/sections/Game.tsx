'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';

const ABOUT_TEXT =
    'Every match starts the same way: someone swears they know the score. YourFriendsLeague settles it. Pick exact scorelines before kick-off, earn points for precision, and climb a table only your friends can see. Free forever — bragging rights not included.';

/** "About" section — the game explained over a quiet full-bleed stadium backdrop. */
export default function Game() {
    return (
        <section id="game" className="ld-game">
            {/* Atmosphere layer — fully behind the text, never beside it */}
            <div className="ld-game-bg" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/sport-floodlight.png" alt="" loading="lazy" />
                <div className="ld-game-vignette" />
            </div>

            <div className="ld-game-content">
                <FadeIn delay={0} y={40}>
                    <h2 className="hero-heading ld-h2">The game</h2>
                </FadeIn>

                <FadeIn delay={0.15} y={24}>
                    <p className="ld-game-copy">{ABOUT_TEXT}</p>
                </FadeIn>

                <div className="ld-game-cta">
                    <FadeIn delay={0.25} y={20}>
                        <Link href="/signup" className="btn-pill">Create your league</Link>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}
