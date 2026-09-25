/**
 * SoftwareApplication + Offer structured data — emitted on the landing page.
 * Eligible for app-card style rich results in Google Search and the
 * "Free / Subscription" badge in product listings.
 */
export default function SoftwareApplicationJsonLd() {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'YourFriendsLeague',
        operatingSystem: 'Web',
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'Sports Prediction',
        url: 'https://yourfriendleague.com',
        image: 'https://yourfriendleague.com/og.png',
        description:
            'Predict match scorelines for football, ice hockey, tennis, basketball and more. Compete with friends in private leagues, earn points for accuracy, and climb the live leaderboard.',
        author: {
            '@type': 'Organization',
            name: 'SIA EGATRI',
        },
        // Free tier plus paid options — list both
        offers: [
            {
                '@type': 'Offer',
                name: 'Free',
                price: '0',
                priceCurrency: 'EUR',
                category: 'free',
            },
            {
                '@type': 'Offer',
                name: 'Premium Monthly',
                price: '4.99',
                priceCurrency: 'EUR',
                category: 'subscription',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: '4.99',
                    priceCurrency: 'EUR',
                    unitCode: 'MON',
                    unitText: 'month',
                },
                url: 'https://yourfriendleague.com/#pricing',
            },
            {
                '@type': 'Offer',
                name: 'Premium Yearly',
                price: '49.99',
                priceCurrency: 'EUR',
                category: 'subscription',
                priceSpecification: {
                    '@type': 'UnitPriceSpecification',
                    price: '49.99',
                    priceCurrency: 'EUR',
                    unitCode: 'ANN',
                    unitText: 'year',
                },
                url: 'https://yourfriendleague.com/#pricing',
            },
        ],
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
