import type { Metadata } from 'next';
import LegalPageLayout from '../components/LegalPageLayout';
import BreadcrumbJsonLd from '../components/BreadcrumbJsonLd';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How YourFriendsLeague (SIA EGATRI) collects, uses, and protects your personal data — GDPR-compliant.',
    alternates: {
        canonical: 'https://yourfriendleague.com/privacy',
    },
    openGraph: {
        title: 'Privacy Policy · YourFriendsLeague',
        description: 'How we collect, use, and protect your personal data. GDPR-compliant, written in plain English.',
        url: 'https://yourfriendleague.com/privacy',
    },
};

const LAST_UPDATED = '27 May 2026';

export default function PrivacyPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', url: 'https://yourfriendleague.com/' },
                    { name: 'Privacy Policy', url: 'https://yourfriendleague.com/privacy' },
                ]}
            />
            <LegalPageLayout
                title="Privacy Policy"
                subtitle="How we collect, use, and protect your personal data — written in plain English, GDPR-compliant."
                lastUpdated={LAST_UPDATED}
            >
            <h2>1. Who we are</h2>
            <p>
                YourFriendsLeague is operated by <strong>SIA EGATRI</strong> (registration nr. 50203368661), a Latvian
                limited liability company with registered office at Bauskas nov., Codes pag., &ldquo;Vaidelotes&rdquo;,
                LV-3901, Latvia. We are the <strong>data controller</strong> for personal data processed through the
                Service.
            </p>
            <p>
                Contact: <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a>
            </p>

            <h2>2. What data we collect</h2>
            <p>We collect only what we need to run the Service. Specifically:</p>
            <table className="legal-table">
                <thead>
                    <tr><th>Category</th><th>Examples</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Account data</strong></td>
                        <td>Email, username, password (stored hashed with bcrypt), role (free/premium), creation date</td>
                    </tr>
                    <tr>
                        <td><strong>Profile data</strong></td>
                        <td>Optional bio, avatar (emoji or URL)</td>
                    </tr>
                    <tr>
                        <td><strong>Game data</strong></td>
                        <td>League memberships, predictions you make, points, achievements, prediction history</td>
                    </tr>
                    <tr>
                        <td><strong>Communication data</strong></td>
                        <td>Emails you send us, your notification preferences</td>
                    </tr>
                    <tr>
                        <td><strong>Technical data</strong></td>
                        <td>IP address (for rate limiting and security), browser user-agent, log entries with error stacks</td>
                    </tr>
                    <tr>
                        <td><strong>Payment data</strong></td>
                        <td>Limited info from Stripe (subscription status, card brand, last 4 digits, expiry). We <strong>do not</strong> store full card numbers.</td>
                    </tr>
                </tbody>
            </table>

            <h2>3. Why we process your data (and the legal basis)</h2>
            <table className="legal-table">
                <thead>
                    <tr><th>Purpose</th><th>Legal basis (GDPR Art. 6)</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Provide and operate the Service (account, predictions, leaderboards)</td>
                        <td>Contract — Art. 6(1)(b)</td>
                    </tr>
                    <tr>
                        <td>Process Premium subscriptions</td>
                        <td>Contract — Art. 6(1)(b)</td>
                    </tr>
                    <tr>
                        <td>Send transactional emails (welcome, password reset, billing notices)</td>
                        <td>Contract — Art. 6(1)(b)</td>
                    </tr>
                    <tr>
                        <td>Prevent fraud, abuse, brute-force attacks (rate limiting, security logs)</td>
                        <td>Legitimate interest — Art. 6(1)(f)</td>
                    </tr>
                    <tr>
                        <td>Comply with legal obligations (e.g. tax, accounting if applicable)</td>
                        <td>Legal obligation — Art. 6(1)(c)</td>
                    </tr>
                    <tr>
                        <td>Send optional marketing emails (only if you opt in — currently no marketing emails are sent)</td>
                        <td>Consent — Art. 6(1)(a)</td>
                    </tr>
                </tbody>
            </table>

            <h2>4. Who we share data with</h2>
            <p>We share personal data only with these <strong>processors</strong>, under written data processing agreements:</p>
            <table className="legal-table">
                <thead>
                    <tr><th>Processor</th><th>Purpose</th><th>Location</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Google LLC</strong> (Cloud Run, Gmail)</td>
                        <td>Application hosting, transactional email delivery</td>
                        <td>EU (us-central1 region for app)</td>
                    </tr>
                    <tr>
                        <td><strong>Neon, Inc.</strong></td>
                        <td>Managed PostgreSQL database</td>
                        <td>EU region (Azure West Europe)</td>
                    </tr>
                    <tr>
                        <td><strong>Stripe Payments Europe, Ltd.</strong></td>
                        <td>Payment processing for Premium subscriptions</td>
                        <td>Ireland (EU)</td>
                    </tr>
                    <tr>
                        <td><strong>Google LLC</strong> (Google Analytics 4)</td>
                        <td>Anonymous traffic measurement — page views, geography (country-level), device type, referral sources. IP addresses are anonymised before storage. We do not enable Google Signals or ad personalisation.</td>
                        <td>EU (regional servers)</td>
                    </tr>
                </tbody>
            </table>
            <p>
                We do <strong>not</strong> sell your data to third parties. We do <strong>not</strong> use third-party
                advertising trackers or analytics SDKs that profile you (e.g. Facebook Pixel, Google Analytics).
            </p>

            <h2>5. International transfers</h2>
            <p>
                Our processors may store or process data on servers operated by US-headquartered companies (Google,
                Neon, Stripe). Where this involves transfers outside the EEA, we rely on <strong>EU Standard
                Contractual Clauses</strong> (SCCs) and additional safeguards offered by the relevant processor.
            </p>

            <h2>6. How long we keep your data</h2>
            <ul>
                <li><strong>Active accounts:</strong> for as long as your account exists.</li>
                <li><strong>Deleted accounts:</strong> personal identifiers are deleted within 30 days of account deletion. Aggregate, anonymised statistics may be retained.</li>
                <li><strong>Billing records:</strong> 7 years from the end of the financial year, as required by Latvian tax law.</li>
                <li><strong>Server logs:</strong> rotated after 30 days unless needed for security investigation.</li>
                <li><strong>Password reset tokens:</strong> 1 hour after issue, then deleted.</li>
            </ul>

            <h2>7. Your rights under GDPR</h2>
            <p>You have the right to:</p>
            <ul>
                <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
                <li><strong>Rectification</strong> — correct inaccurate or incomplete data.</li>
                <li><strong>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) — request deletion of your account and data.</li>
                <li><strong>Restriction</strong> — limit how we process your data.</li>
                <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
                <li><strong>Objection</strong> — object to processing based on legitimate interest.</li>
                <li><strong>Withdraw consent</strong> — where processing is based on consent, withdraw it at any time.</li>
            </ul>
            <p>
                To exercise these rights, email <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a>.
                We will respond within 30 days. We may ask you to verify your identity before processing the request.
            </p>
            <p>
                You also have the right to lodge a complaint with the Latvian supervisory authority, the{' '}
                <strong>Data State Inspectorate</strong> (<em>Datu valsts inspekcija</em>, DVI):{' '}
                <a href="https://www.dvi.gov.lv" target="_blank" rel="noopener noreferrer">www.dvi.gov.lv</a>.
            </p>

            <h2>8. Cookies &amp; similar tracking</h2>
            <p>We use the following cookies and storage on this site:</p>
            <table className="legal-table">
                <thead>
                    <tr><th>Category</th><th>Purpose</th><th>Consent</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Strictly necessary</strong> (NextAuth session cookie)</td>
                        <td>Keeps you signed in across requests. Essential for the Service to function.</td>
                        <td>No consent required (essential, per EU ePrivacy law).</td>
                    </tr>
                    <tr>
                        <td><strong>Analytics</strong> (Google Analytics 4: <code>_ga</code>, <code>_ga_*</code>)</td>
                        <td>Anonymous traffic measurement: page views, country-level geography, device type, referral source. Enables us to understand which content is useful and improve the Service.</td>
                        <td>Loaded with <strong>Google Consent Mode v2</strong> in &ldquo;denied&rdquo; mode by default — no personal data is sent to Google until you grant consent via our cookie banner. Until consent is granted, Google receives only modelled, fully anonymous pings.</td>
                    </tr>
                </tbody>
            </table>
            <p>
                We do <strong>not</strong> use advertising cookies, retargeting trackers, social-media pixels, or any
                cross-site profiling. Google Signals and ad personalisation are explicitly disabled in our GA4
                configuration. We anonymise IP addresses before they are stored.
            </p>
            <p>
                You can withdraw analytics consent at any time by clearing cookies for this site or by emailing{' '}
                <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a>.
            </p>

            <h2>9. Security</h2>
            <p>We protect your data with industry-standard measures including:</p>
            <ul>
                <li>HTTPS/TLS for all traffic</li>
                <li>Passwords hashed with bcrypt (never stored in plain text)</li>
                <li>Password reset tokens hashed with SHA-256</li>
                <li>Rate limiting on authentication endpoints</li>
                <li>HTTP security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)</li>
                <li>Database access restricted to the application; credentials stored in encrypted secrets</li>
                <li>Regular dependency updates</li>
            </ul>
            <p>
                No system is 100% secure. If we become aware of a personal data breach likely to result in risk to
                your rights, we will notify the DVI within 72 hours and, where required, notify you directly.
            </p>

            <h2>10. Children</h2>
            <p>
                The Service is not directed at children under 13. We do not knowingly collect personal data from
                children under 13. If you believe a child has provided us with data, please email us and we will
                delete it.
            </p>

            <h2>11. Automated decision-making</h2>
            <p>
                We do <strong>not</strong> use automated decision-making, profiling, or AI systems that produce legal
                effects concerning you.
            </p>

            <h2>12. Changes to this policy</h2>
            <p>
                We may update this Privacy Policy from time to time. Material changes will be communicated via email
                or an in-app notice. The &ldquo;Last updated&rdquo; date at the top reflects the current version.
            </p>

            <h2>13. Contact</h2>
            <p>
                Questions, concerns, or requests about your data? Email{' '}
                <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a> or write to:
            </p>
            <p>
                SIA EGATRI<br />
                Bauskas nov., Codes pag., &ldquo;Vaidelotes&rdquo;<br />
                LV-3901, Latvia
            </p>
            </LegalPageLayout>
        </>
    );
}
