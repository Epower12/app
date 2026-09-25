import type { Metadata, Viewport } from 'next';
import HomeRouter from './HomeRouter';
import SoftwareApplicationJsonLd from './components/SoftwareApplicationJsonLd';
import { getVisitorRegion } from './landing/region';

export const metadata: Metadata = {
    title: 'YourFriendsLeague — Predict. Compete. Dominate.',
    description:
        'Free sports score prediction platform. Predict scorelines for football, ice hockey, tennis, basketball and more. Compete with friends in private leagues, earn points for accuracy.',
    alternates: {
        canonical: 'https://yourfriendleague.com/',
    },
    openGraph: {
        title: 'YourFriendsLeague — Predict. Compete. Dominate.',
        description:
            'Free sports score prediction platform. Predict scorelines, compete with friends, climb the leaderboard.',
        url: 'https://yourfriendleague.com/',
    },
};

// The landing page is light; match the mobile browser chrome to it.
export const viewport: Viewport = {
    themeColor: '#fff7ec',
    colorScheme: 'light',
};

export default async function Home() {
    const region = await getVisitorRegion();
    return (
        <>
            <SoftwareApplicationJsonLd />
            <HomeRouter region={region} />
        </>
    );
}
