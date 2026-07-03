/**
 * BreadcrumbList structured data for legal pages.
 * Helps Google show breadcrumbs in search results and aids site-structure understanding.
 */
export default function BreadcrumbJsonLd({
    items,
}: {
    items: { name: string; url: string }[];
}) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
