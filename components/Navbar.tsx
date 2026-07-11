'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationBell from './NotificationBell';

function NavLogo() {
    const [err, setErr] = useState(false);
    return err ? (
        <>
            <span>⚡</span>
            <span className="app-nav-logo-text">YourFriendsLeague</span>
        </>
    ) : (
        <img
            src="/logo.png"
            alt="YourFriendsLeague"
            style={{ height: '48px', width: 'auto', display: 'block' }}
            onError={() => setErr(true)}
        />
    );
}

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const user = session?.user as any;
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = [
        { href: '/', label: 'Home' },
        { href: '/tournaments', label: 'Leagues' },
        { href: '/profile', label: 'Profile' },
    ];

    if (user?.role === 'premium' || user?.role === 'admin') {
        links.splice(1, 0, { href: '/premium', label: 'Dashboard' });
    }

    const roleLabel =
        user?.role === 'admin' ? 'Admin' :
            user?.role === 'premium' ? 'Premium' : null;

    const closeMobile = () => setMobileOpen(false);

    return (
        <>
            <nav className="app-nav">
                <div className="container app-nav-inner">
                    {/* Logo */}
                    <Link href="/" className="app-nav-logo" onClick={closeMobile}>
                        <NavLogo />
                    </Link>

                    {/* Desktop links */}
                    <div className="app-nav-links">
                        {links.map(l => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={`app-nav-link ${pathname?.startsWith(l.href) ? 'app-nav-link-active' : ''}`}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>

                    {/* Desktop user area */}
                    <div className="app-nav-user">
                        {roleLabel && (
                            <span className={`app-nav-role-badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-premium'}`}>
                                {roleLabel}
                            </span>
                        )}
                        <NotificationBell />
                        <span className="app-nav-username">{user?.name || user?.username}</span>
                        <button
                            className="app-nav-signout btn btn-secondary btn-sm"
                            onClick={() => signOut({ callbackUrl: '/' })}
                        >
                            Sign Out
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        className="hamburger-btn"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open menu"
                    >
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                        <span className="hamburger-line" />
                    </button>
                </div>
            </nav>

            {/* Mobile overlay menu */}
            {mobileOpen && (
                <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
                    <button className="mobile-menu-close" onClick={closeMobile} aria-label="Close menu">
                        ✕
                    </button>

                    {links.map(l => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className={`mobile-menu-link ${pathname?.startsWith(l.href) ? 'active' : ''}`}
                            onClick={closeMobile}
                        >
                            {l.label}
                        </Link>
                    ))}

                    <div style={{ width: '100%', maxWidth: 280, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                        {roleLabel && (
                            <span className={`app-nav-role-badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-premium'}`}
                                style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                                {roleLabel}
                            </span>
                        )}
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {user?.name || user?.username}
                        </span>
                        <div style={{ transform: 'scale(1.3)' }}><NotificationBell /></div>
                        <button
                            className="btn btn-danger btn-sm"
                            style={{ width: '100%' }}
                            onClick={() => { closeMobile(); signOut({ callbackUrl: '/' }); }}
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
