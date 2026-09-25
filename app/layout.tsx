import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from './providers';
import OrganizationJsonLd from './components/OrganizationJsonLd';
import GoogleAnalytics from './components/GoogleAnalytics';
import CookieConsent from './components/CookieConsent';

const SITE_URL = 'https://yourfriendleague.com';

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'YourFriendsLeague — Predict. Compete. Dominate.',
        template: '%s · YourFriendsLeague',
    },
    description:
        'Free sports score prediction platform — pick scorelines for football, ice hockey, tennis, basketball and more. Compete with friends in private leagues. Earn +5 points for an exact score.',
    keywords: [
        'sports prediction',
        'score prediction',
        'football prediction game',
        'ice hockey predictions',
        'IIHF 2026 prediction',
        'predict the score',
        'private league',
        'friends league',
        'fantasy sports',
    ],
    authors: [{ name: 'SIA EGATRI' }],
    creator: 'SIA EGATRI',
    publisher: 'SIA EGATRI',
    applicationName: 'YourFriendsLeague',
    referrer: 'strict-origin-when-cross-origin',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    icons: {
        icon: '/logo.png',
        apple: '/logo.png',
    },
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: SITE_URL,
        siteName: 'YourFriendsLeague',
        title: 'YourFriendsLeague — Predict. Compete. Dominate.',
        description:
            'Free sports score prediction platform. Predict scorelines, compete with friends, climb the leaderboard.',
        images: [
            {
                url: '/og.png',
                width: 1200,
                height: 630,
                alt: 'YourFriendsLeague — sports score prediction platform',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'YourFriendsLeague — Predict. Compete. Dominate.',
        description:
            'Free sports score prediction platform. Predict scorelines, compete with friends, climb the leaderboard.',
        images: ['/og.png'],
    },
    robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
        },
    },
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    themeColor: '#050a14',
    colorScheme: 'dark',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <GoogleAnalytics />
                <OrganizationJsonLd />
                <Providers>{children}</Providers>
                <CookieConsent />
            </body>
        </html>
    );
}
