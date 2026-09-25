'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LINKS = [
    { label: 'Why', href: '#why' },
    { label: 'How it works', href: '#how' },
    { label: 'Sports', href: '#sports' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
];

export default function Nav() {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={`ld-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
            <div className="ld-wrap ld-nav-inner">
                <Link href="/" className="ld-brand" aria-label="YourFriendsLeague home">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.png" alt="" />
                    <span>YourFriends<b>League</b></span>
                </Link>

                <nav className="ld-nav-links" aria-label="Landing navigation">
                    {LINKS.map(l => (
                        <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
                    ))}
                </nav>

                <div className="ld-nav-actions">
                    <Link href="/login" className="ld-nav-signin">Sign in</Link>
                    <Link href="/signup" className="ld-btn ld-btn-sm">Start free</Link>
                    <button
                        type="button"
                        className="ld-nav-toggle"
                        aria-label={open ? 'Close menu' : 'Open menu'}
                        aria-expanded={open}
                        onClick={() => setOpen(o => !o)}
                    >
                        <span /><span />
                    </button>
                </div>
            </div>
        </header>
    );
}
