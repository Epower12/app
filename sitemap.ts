import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';

const SITE_URL = 'https://yourfriendleague.com';

/**
 * Public sitemap. Only marketing/content pages on the root domain.
 * App subdomain pages are session-gated and intentionally excluded.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const today = new Date();
    const posts = await getAllPosts();

    const blogPostEntries: MetadataRoute.Sitemap = posts.map(post => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: 'yearly',
        priority: 0.6,
    }));

    return [
        {
            url: `${SITE_URL}/`,
            lastModified: today,
            changeFrequency: 'monthly',
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/blog`,
            lastModified: today,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/news`,
            lastModified: today,
            changeFrequency: 'hourly',
            priority: 0.7,
        },
        ...blogPostEntries,
        {
            url: `${SITE_URL}/legal`,
            lastModified: today,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${SITE_URL}/terms`,
            lastModified: today,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
        {
            url: `${SITE_URL}/privacy`,
            lastModified: today,
            changeFrequency: 'yearly',
            priority: 0.4,
        },
    ];
}
