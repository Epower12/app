import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: 'admin' | 'premium' | 'user';
            isPaid: boolean;
        } & DefaultSession["user"];
    }

    interface User extends DefaultUser {
        role?: 'admin' | 'premium' | 'user';
        isPaid?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT extends DefaultJWT {
        id?: string;
        role?: 'admin' | 'premium' | 'user';
        isPaid?: boolean;
    }
}
