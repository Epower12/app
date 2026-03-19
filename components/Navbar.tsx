'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const user = session?.user as any;
    const isOwner = user?.email && user.email === process.env.NEXT_PUBLIC_OWNER_EMAIL;

    const links = [
        { href: '/tournaments', label: '🏆 Leagues' },
        { href: '/profile', label: '👤 Profile' },
    ];

    if (user?.role === 'premium' || user?.role === 'admin') {
        links.splice(1, 0, { href: '/premium', label: '⚡ Dashboard' });
    }

    const roleLabel =
        user?.role === 'admin' ? 'Admin' :
            user?.role === 'premium' ? 'Premium' : null;

    return (
        <nav className="app-nav">
            <div className="container app-nav-inner">
                {/* Logo */}
                <Link href="/" className="app-nav-logo">
                    <span>⚽</span>
                    <span className="app-nav-logo-text">SportPredict</span>
                </Link>

                {/* Links */}
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

                {/* User area */}
                <div className="app-nav-user">
                    {roleLabel && (
                        <span className={`app-nav-role-badge ${user?.role === 'admin' ? 'badge-admin' : 'badge-premium'}`}>
                            {user?.role === 'admin' ? '🛡️' : '💎'} {roleLabel}
                        </span>
                    )}
                    <span className="app-nav-username">{user?.name || user?.username}</span>
                    <button className="app-nav-signout btn btn-secondary btn-sm" onClick={() => signOut({ callbackUrl: '/' })}>
                        Sign Out
                    </button>
                </div>
            </div>
        </nav>
    );
}
