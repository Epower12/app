import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import AppleProvider from 'next-auth/providers/apple';
import DiscordProvider from 'next-auth/providers/discord';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../../../lib/db';
import { User } from '../../../../lib/types';
import { buildAppleClientSecret } from '../../../../lib/appleClientSecret';
import { sendWelcomeEmail } from '../../../../lib/email';

// Each OAuth provider is only registered once its credentials are actually
// configured, so the app keeps working with just email/password until each
// one is set up on Cloud Run.
const oauthProviders: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    oauthProviders.push(GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }));
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    oauthProviders.push(FacebookProvider({
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }));
}

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    oauthProviders.push(DiscordProvider({
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
    }));
}

const appleClientSecret = buildAppleClientSecret();
if (process.env.APPLE_CLIENT_ID && appleClientSecret) {
    oauthProviders.push(AppleProvider({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: appleClientSecret,
    }));
}

/** Derive a unique username from an OAuth display name / email, retrying on collision. */
async function generateUniqueUsername(seed: string): Promise<string> {
    const base = seed.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40) || 'player';
    let candidate = base;
    for (let attempt = 0; attempt < 20; attempt++) {
        const { rows } = await db.query('SELECT id FROM users WHERE username = $1', [candidate]);
        if (rows.length === 0) return candidate;
        candidate = `${base}${Math.floor(Math.random() * 100000)}`;
    }
    return `${base}${uuidv4().slice(0, 8)}`;
}

/** Find the existing account for this email, or create one for a first-time OAuth sign-in. */
async function findOrCreateOAuthUser(email: string, name: string | null | undefined, image: string | null | undefined, provider: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const { rows } = await db.query('SELECT id, role, is_paid FROM users WHERE email = $1', [normalizedEmail]);
    if (rows[0]) return rows[0];

    const username = await generateUniqueUsername(name || normalizedEmail.split('@')[0]);
    const id = uuidv4();
    try {
        await db.query(
            'INSERT INTO users (id, username, email, password, role, avatar_url, oauth_provider) VALUES ($1, $2, $3, NULL, $4, $5, $6)',
            [id, username, normalizedEmail, 'user', image ?? null, provider]
        );
        sendWelcomeEmail(normalizedEmail, username).catch(err => console.error('Welcome email failed:', err));
        return { id, role: 'user', is_paid: false };
    } catch (err: unknown) {
        // Unique-violation race: another request created the same email concurrently.
        if ((err as { code?: string }).code === '23505') {
            const { rows: retryRows } = await db.query('SELECT id, role, is_paid FROM users WHERE email = $1', [normalizedEmail]);
            if (retryRows[0]) return retryRows[0];
        }
        throw err;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                username: { label: 'Email', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    return null;
                }

                const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [credentials.username]);
                const user = rows[0] as (User & { password: string | null, email: string, is_paid: boolean }) | undefined;

                if (!user || !user.password) {
                    // No account, or an OAuth-only account with no password set.
                    return null;
                }

                const isValid = await bcrypt.compare(credentials.password, user.password);
                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    name: user.username,
                    email: user.email,
                    role: user.role,
                    isPaid: Boolean(user.is_paid)
                } as any;
            },
        }),
        ...oauthProviders,
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (!account || account.provider === 'credentials') return true;
            // Provider didn't share a (verified) email — can't link or create an account without one.
            return Boolean(user.email);
        },
        async jwt({ token, user, account, trigger, session }) {
            if (user) {
                if (account && account.provider !== 'credentials') {
                    // `user` here is the provider profile, not our own row — look up our DB user by email.
                    const dbUser = await findOrCreateOAuthUser(user.email as string, user.name, user.image, account.provider);
                    token.id = dbUser.id;
                    token.role = dbUser.role as 'admin' | 'premium' | 'user';
                    token.isPaid = Boolean(dbUser.is_paid);
                } else {
                    token.id = user.id;
                    token.role = (user as any).role as 'admin' | 'premium' | 'user';
                    token.isPaid = (user as any).isPaid;
                }
            }
            if (trigger === "update" && session) {
                token.role = session.role;
                token.isPaid = session.isPaid;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                const sessionUser = session.user as any;
                sessionUser.id = token.id as string;
                sessionUser.role = token.role as 'admin' | 'premium' | 'user';
                sessionUser.isPaid = token.isPaid as boolean;
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
