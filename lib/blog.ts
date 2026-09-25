/**
 * Blog loader — reads MDX files from /content/blog at build/request time.
 *
 * Each post is a .mdx file at /content/blog/<slug>.mdx with frontmatter:
 *
 *   ---
 *   title: "How scoring works"
 *   description: "+5/+3/+2/+0 — why precision matters."
 *   date: "2026-05-25"
 *   author: "YourFriendsLeague Team"
 *   category: "Game design"          # optional
 *   tags: ["scoring", "rules"]       # optional
 *   image: "/blog/scoring-hero.png"  # optional
 *   featured: true                   # optional — promotes to hero
 *   ---
 *
 *   # Markdown body here...
 */

import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPostMeta {
    slug: string;
    title: string;
    description: string;
    date: string;          // ISO date
    author: string;
    category?: string;
    tags?: string[];
    image?: string;
    featured?: boolean;
    readMinutes: number;   // derived from word count
}

export interface BlogPost extends BlogPostMeta {
    content: string;       // raw MDX source
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

/** Approximate reading time at 220 wpm. */
function estimateReadMinutes(body: string): number {
    const words = body.replace(/[#`*_~>\-\[\]()!]/g, ' ').trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 220));
}

async function listSlugs(): Promise<string[]> {
    try {
        const files = await fs.readdir(BLOG_DIR);
        return files
            .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
            .map(f => f.replace(/\.(mdx?|md)$/, ''));
    } catch {
        return []; // dir doesn't exist yet
    }
}

async function readPostFile(slug: string): Promise<BlogPost | null> {
    const exts = ['.mdx', '.md'];
    for (const ext of exts) {
        try {
            const raw = await fs.readFile(path.join(BLOG_DIR, slug + ext), 'utf8');
            const { data, content } = matter(raw);
            if (!data.title || !data.date) {
                console.warn(`[blog] ${slug}${ext} missing required frontmatter (title/date)`);
                continue;
            }
            return {
                slug,
                title: data.title,
                description: data.description ?? '',
                date: typeof data.date === 'string' ? data.date : new Date(data.date).toISOString().slice(0, 10),
                author: data.author ?? 'YourFriendsLeague',
                category: data.category,
                tags: Array.isArray(data.tags) ? data.tags : undefined,
                image: data.image,
                featured: data.featured === true,
                readMinutes: estimateReadMinutes(content),
                content,
            };
        } catch { /* try next ext */ }
    }
    return null;
}

/** All posts, sorted newest first. */
export async function getAllPosts(): Promise<BlogPostMeta[]> {
    const slugs = await listSlugs();
    const posts = (await Promise.all(slugs.map(readPostFile)))
        .filter((p): p is BlogPost => p !== null)
        .sort((a, b) => b.date.localeCompare(a.date));
    return posts.map(({ content, ...meta }) => meta);
}

export async function getPost(slug: string): Promise<BlogPost | null> {
    return readPostFile(slug);
}

/** Featured post if any (most recent with featured:true), else most recent overall. */
export async function getFeaturedPost(): Promise<BlogPostMeta | null> {
    const posts = await getAllPosts();
    if (!posts.length) return null;
    return posts.find(p => p.featured) ?? posts[0];
}

export function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}
