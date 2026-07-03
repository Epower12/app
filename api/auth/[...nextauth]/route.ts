import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import db from '../../../../lib/db';
import { User } from '../../../../lib/types';

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
                const user = rows[0] as (User & { password: string, email: string, is_paid: boolean }) | undefined;

                if (!user) {
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
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role as 'admin' | 'premium' | 'user';
                token.isPaid = (user as any).isPaid;
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
