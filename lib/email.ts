import nodemailer from 'nodemailer';

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? 'https://app.yourfriendleague.com';
const FROM_NAME = 'YourFriendsLeague';
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'contact@yourfriendleague.com';

// Initialised lazily — env vars aren't available at Next.js build time
function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: FROM_EMAIL,
            pass: process.env.EMAIL_PASSWORD, // Gmail App Password (no spaces)
        },
    });
}

// ── Shared HTML wrapper ──────────────────────────────────────────────────────
function htmlWrapper(content: string) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YourFriendsLeague</title>
</head>
<body style="margin:0;padding:0;background:#06090f;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06090f;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#0f172a;border-radius:16px;border:1px solid #1e293b;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a5f,#0f172a);padding:28px 40px;text-align:center;border-bottom:1px solid #1e293b;">
            <img src="${APP_URL}/logo.png" alt="YourFriendsLeague" style="height:90px;width:auto;display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;color:#94a3b8;font-size:15px;line-height:1.7;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;text-align:center;border-top:1px solid #1e293b;">
            <p style="margin:0;font-size:12px;color:#475569;">
              YourFriendsLeague · You're receiving this because you have an account with us.<br/>
              <a href="${APP_URL}" style="color:#38bdf8;text-decoration:none;">Visit YourFriendsLeague</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string) {
    return `<div style="text-align:center;margin:28px 0;">
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#38bdf8,#818cf8);color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;letter-spacing:0.3px;">${text}</a>
    </div>`;
}

// ── Welcome email ────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, username: string) {
    const html = htmlWrapper(`
        <h2 style="margin:0 0 16px;font-size:1.4rem;font-weight:800;color:#ffffff;">
          Welcome to YourFriendsLeague, ${username}! 🎉
        </h2>
        <p>You're all set. Start predicting match scores, compete with friends, and climb the leaderboard.</p>

        <div style="background:#0f2040;border:1px solid #1e3a5f;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 12px;font-weight:700;color:#ffffff;font-size:14px;">🏅 HOW SCORING WORKS</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
            <tr>
              <td style="padding:5px 0;color:#38bdf8;font-weight:700;width:70px;">+5 pts</td>
              <td style="padding:5px 0;color:#94a3b8;">Exact score (e.g. you said 3–1, it's 3–1)</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#48bb78;font-weight:700;">+3 pts</td>
              <td style="padding:5px 0;color:#94a3b8;">Correct winner &amp; exact goal difference</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#818cf8;font-weight:700;">+2 pts</td>
              <td style="padding:5px 0;color:#94a3b8;">Correct winner, wrong margin</td>
            </tr>
            <tr>
              <td style="padding:5px 0;color:#475569;font-weight:700;">+0 pts</td>
              <td style="padding:5px 0;color:#94a3b8;">Wrong winner</td>
            </tr>
          </table>
        </div>

        <p>Join or create a league and make your first prediction — good luck!</p>
        ${btn('Go to YourFriendsLeague →', APP_URL + '/tournaments')}
        <p style="font-size:13px;color:#475569;">Questions? Just reply to this email.</p>
    `);

    return getTransporter().sendMail({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: '⚡ Welcome to YourFriendsLeague!',
        html,
    });
}

// ── Password reset email ─────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, username: string, token: string) {
    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    const html = htmlWrapper(`
        <h2 style="margin:0 0 16px;font-size:1.4rem;font-weight:800;color:#ffffff;">
          Password reset request 🔑
        </h2>
        <p>Hi <strong style="color:#ffffff;">${username}</strong>, we received a request to reset your YourFriendsLeague password.</p>
        <p>Click the button below — this link expires in <strong style="color:#f97316;">1 hour</strong>.</p>

        ${btn('Reset my password →', resetUrl)}

        <div style="background:#1e293b;border-radius:8px;padding:14px 18px;margin:20px 0;font-size:13px;">
          <p style="margin:0;color:#64748b;">Or paste this link into your browser:</p>
          <p style="margin:6px 0 0;word-break:break-all;color:#38bdf8;">${resetUrl}</p>
        </div>

        <p style="font-size:13px;color:#475569;">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
    `);

    return getTransporter().sendMail({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: '🔑 Reset your YourFriendsLeague password',
        html,
    });
}

// ── Premium welcome email ────────────────────────────────────────────────────
export async function sendPremiumWelcomeEmail(
    to: string,
    username: string,
    plan: 'monthly' | 'yearly',
    renewsAt: number | null,
) {
    const planLabel = plan === 'yearly' ? 'Yearly (€49.99/year)' : 'Monthly (€4.99/month)';
    const renewsLine = renewsAt
        ? `<p>Next renewal: <strong style="color:#ffffff;">${new Date(renewsAt * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>`
        : '';

    const html = htmlWrapper(`
        <h2 style="margin:0 0 16px;font-size:1.4rem;font-weight:800;color:#ffffff;">
          Welcome to Premium, ${username}! 💎
        </h2>
        <p>Thanks for upgrading — your subscription is active and all Premium features are unlocked.</p>

        <div style="background:#0f2040;border:1px solid #1e3a5f;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 12px;font-weight:700;color:#ffffff;font-size:14px;">📋 SUBSCRIPTION DETAILS</p>
          <p style="margin:6px 0;color:#94a3b8;">Plan: <strong style="color:#ffffff;">${planLabel}</strong></p>
          ${renewsLine}
          <p style="margin:6px 0;color:#94a3b8;">Manage anytime from your profile or via the Stripe customer portal.</p>
        </div>

        <div style="background:#0f2040;border:1px solid #1e3a5f;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 12px;font-weight:700;color:#ffffff;font-size:14px;">⚡ WHAT'S UNLOCKED</p>
          <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">
            <tr><td style="padding:5px 0;color:#48bb78;font-weight:700;width:24px;">✓</td><td style="padding:5px 0;color:#94a3b8;">Create private &amp; public leagues</td></tr>
            <tr><td style="padding:5px 0;color:#48bb78;font-weight:700;">✓</td><td style="padding:5px 0;color:#94a3b8;">One-click tournament preset import (IIHF, FIFA, etc.)</td></tr>
            <tr><td style="padding:5px 0;color:#48bb78;font-weight:700;">✓</td><td style="padding:5px 0;color:#94a3b8;">Community prediction breakdowns before kick-off</td></tr>
            <tr><td style="padding:5px 0;color:#48bb78;font-weight:700;">✓</td><td style="padding:5px 0;color:#94a3b8;">Add matches manually, enter final scores</td></tr>
            <tr><td style="padding:5px 0;color:#48bb78;font-weight:700;">✓</td><td style="padding:5px 0;color:#94a3b8;">💎 Premium badge on your profile</td></tr>
          </table>
        </div>

        ${btn('Go to my Premium dashboard →', APP_URL + '/premium')}

        <p style="font-size:13px;color:#475569;">
          Stripe will email you a receipt for this payment separately.
          Questions about your subscription? Just reply to this email.
        </p>
    `);

    return getTransporter().sendMail({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: '💎 Welcome to YourFriendsLeague Premium',
        html,
    });
}

// ── Subscription canceled email ──────────────────────────────────────────────
export async function sendSubscriptionCanceledEmail(
    to: string,
    username: string,
    endDate: number | null,
) {
    const endLine = endDate
        ? `<p>Your Premium access continues until <strong style="color:#ffffff;">${new Date(endDate * 1000).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>. After that you'll be moved back to the free plan.</p>`
        : '<p>Your Premium access has ended and your account is now on the free plan.</p>';

    const html = htmlWrapper(`
        <h2 style="margin:0 0 16px;font-size:1.4rem;font-weight:800;color:#ffffff;">
          Sorry to see you go, ${username}
        </h2>
        <p>Your YourFriendsLeague Premium subscription has been canceled. You won't be charged again.</p>
        ${endLine}

        <div style="background:#0f2040;border:1px solid #1e3a5f;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 8px;font-weight:700;color:#ffffff;font-size:14px;">🎯 WHAT STAYS</p>
          <p style="margin:6px 0;color:#94a3b8;">All your predictions, history, and league memberships are kept. You can still play in any league you've joined — Premium was about organising leagues, not gaining a scoring advantage.</p>
        </div>

        <p>If you change your mind, you can resubscribe anytime from your profile.</p>
        ${btn('Visit my profile →', APP_URL + '/profile')}

        <p style="font-size:13px;color:#475569;">
          Was there a problem we could have fixed? Reply to this email — we'd love to hear your feedback.
        </p>
    `);

    return getTransporter().sendMail({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to,
        subject: 'Your YourFriendsLeague Premium has been canceled',
        html,
    });
}
