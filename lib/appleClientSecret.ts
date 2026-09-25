import jwt from 'jsonwebtoken';

/**
 * "Sign in with Apple" doesn't take a static client secret — it takes a JWT
 * you sign yourself with your Apple private key. Apple caps its lifetime at
 * 6 months, so we generate a fresh one (valid ~5 months) each time the
 * server process starts rather than trying to persist/rotate one.
 */
export function buildAppleClientSecret(): string | null {
    const teamId = process.env.APPLE_TEAM_ID;
    const clientId = process.env.APPLE_CLIENT_ID;
    const keyId = process.env.APPLE_KEY_ID;
    const privateKey = process.env.APPLE_PRIVATE_KEY;

    if (!teamId || !clientId || !keyId || !privateKey) return null;

    return jwt.sign({}, privateKey.replace(/\\n/g, '\n'), {
        algorithm: 'ES256',
        expiresIn: '150d',
        issuer: teamId,
        audience: 'https://appleid.apple.com',
        subject: clientId,
        keyid: keyId,
    });
}
