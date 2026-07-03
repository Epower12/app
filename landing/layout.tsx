import type { Metadata } from 'next';

/**
 * /landing renders the same content as /. To avoid duplicate-content penalties,
 * point the canonical at / and tell crawlers not to index this URL.
 */
export const metadata: Metadata = {
    title: 'YourFriendsLeague',
    alternates: {
        canonical: 'https://yourfriendleague.com/',
    },
    robots: {
        index: false,
        follow: true,
    },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
