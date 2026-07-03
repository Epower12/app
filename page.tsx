import type { Metadata } from 'next';
import HomeRouter from './HomeRouter';
import SoftwareApplicationJsonLd from './components/SoftwareApplicationJsonLd';

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

export default function Home() {
    return (
        <>
            <SoftwareApplicationJsonLd />
            <HomeRouter />
        </>
    );
}
