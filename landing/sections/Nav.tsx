'use client';

import Link from 'next/link';
import { FadeIn } from '../motion';

const NAV = [
    { label: 'The game', href: '#game' },
    { label: 'Scoring', href: '#scoring' },
    { label: 'Matchday', href: '#matchday' },
];

/**
 * Fixed top nav — stays reachable at every scroll position, over every section.
 * `position: fixed` lives directly on this animated element, not on a child of it:
 * Framer Motion's transform on an ancestor creates a new containing block for
 * fixed-positioned descendants, which would make a nested <nav> scroll away
 * with the page instead of staying put.
 */
export default function Nav() {
    return (
        <FadeIn delay={0} y={-20} className="ld-topnav" role="navigation" aria-label="Landing navigation">
            {NAV.map(link => (
                <a key={link.label} href={link.href}>{link.label}</a>
            ))}
            <Link href="/login">Sign in</Link>
        </FadeIn>
    );
}
