/**
 * Organization + WebSite structured data — emitted globally from root layout.
 * Helps Google understand the brand entity and link it to SIA EGATRI.
 *
 * Server component — pure markup, no client JS needed.
 */
export default function OrganizationJsonLd() {
    const data = [
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'YourFriendsLeague',
            legalName: 'SIA EGATRI',
            url: 'https://yourfriendleague.com',
            logo: 'https://yourfriendleague.com/logo.png',
            email: 'contact@yourfriendleague.com',
            foundingDate: '2026',
            description:
                'Free sports score prediction platform. Predict scorelines, compete with friends, climb the leaderboard.',
            address: {
                '@type': 'PostalAddress',
                streetAddress: 'Codes pag., "Vaidelotes"',
                addressRegion: 'Bauskas nov.',
                postalCode: 'LV-3901',
                addressCountry: 'LV',
            },
            contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'customer support',
                email: 'contact@yourfriendleague.com',
                availableLanguage: ['English', 'Latvian'],
            },
            identifier: '50203368661',
        },
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'YourFriendsLeague',
            url: 'https://yourfriendleague.com',
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: 'https://app.yourfriendleague.com/tournaments?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
            },
        },
    ];

    return (
        <script
            type="application/ld+json"
            // Stringify on the server — no client JS, no XSS risk because we control the input
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
