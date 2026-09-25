import type { Metadata } from 'next';
import LegalPageLayout from '../components/LegalPageLayout';
import BreadcrumbJsonLd from '../components/BreadcrumbJsonLd';

export const metadata: Metadata = {
    title: 'Terms of Service',
    description: 'Terms and conditions for using YourFriendsLeague — subscription terms, cancellation, refunds, and acceptable use.',
    alternates: {
        canonical: 'https://yourfriendleague.com/terms',
    },
    openGraph: {
        title: 'Terms of Service · YourFriendsLeague',
        description: 'Subscription terms, cancellation, refunds, and acceptable use.',
        url: 'https://yourfriendleague.com/terms',
    },
};

export default function TermsPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', url: 'https://yourfriendleague.com/' },
                    { name: 'Terms of Service', url: 'https://yourfriendleague.com/terms' },
                ]}
            />
            <LegalPageLayout
                title="Terms of Service"
                subtitle="The agreement between you and SIA EGATRI when you use YourFriendsLeague."
                lastUpdated="12 May 2026"
            >
            <h2>1. Agreement</h2>
            <p>
                These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the YourFriendsLeague
                website and service (the &ldquo;Service&rdquo;), operated by <strong>SIA EGATRI</strong>, a Latvian
                limited liability company (registration nr. 50203368661), with registered office at Bauskas nov.,
                Codes pag., &ldquo;Vaidelotes&rdquo;, LV-3901, Latvia (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
                &ldquo;our&rdquo;).
            </p>
            <p>
                By creating an account or using the Service, you (&ldquo;you&rdquo;, &ldquo;User&rdquo;) accept these
                Terms. If you do not agree, do not use the Service.
            </p>

            <h2>2. What we provide</h2>
            <p>
                YourFriendsLeague is a <strong>free-to-play, skill-based sports score prediction platform</strong>.
                Users predict match scorelines, earn points for accurate predictions, and compete on leaderboards
                within leagues created or joined by them or their friends.
            </p>
            <p>
                The Service is <strong>not gambling</strong>: no real money is wagered, no monetary prizes are awarded,
                and outcomes are based on user skill in predicting public sports results.
            </p>

            <h2>3. Eligibility</h2>
            <p>You must be at least <strong>13 years old</strong> to use the Service. By using the Service you confirm:</p>
            <ul>
                <li>You meet the minimum age requirement.</li>
                <li>You have legal capacity to enter into these Terms (or have parental consent).</li>
                <li>The information you provide at signup is accurate.</li>
            </ul>

            <h2>4. Accounts</h2>
            <p>To use most features you must create an account. You agree to:</p>
            <ul>
                <li>Provide accurate signup information and keep it up to date.</li>
                <li>Keep your password confidential and not share account access with others.</li>
                <li>Notify us promptly at <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a> if you suspect unauthorised access to your account.</li>
            </ul>
            <p>You are responsible for activity under your account.</p>

            <h2>5. Free plan</h2>
            <p>
                The core Service is free to use. With a free account you can join leagues, make predictions, view
                leaderboards, see your prediction history, customise your profile, and receive result notifications.
            </p>

            <h2>6. Premium subscription</h2>
            <h3>6.1 What Premium unlocks</h3>
            <p>Premium adds organisational tools: creating private and public leagues, importing tournament presets
                (e.g. IIHF, FIFA), adding matches, entering final scores, and seeing community prediction breakdowns.</p>
            <p>
                <strong>Premium does not give any scoring advantage.</strong> All users — free or Premium — earn the
                same points (+5 exact / +3 winner &amp; gap / +2 winner / +0 wrong).
            </p>

            <h3>6.2 Pricing</h3>
            <table className="legal-table">
                <thead>
                    <tr>
                        <th>Plan</th>
                        <th>Price</th>
                        <th>Billing</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Premium Monthly</td>
                        <td>€4.99</td>
                        <td>Every month, auto-renewing</td>
                    </tr>
                    <tr>
                        <td>Premium Yearly</td>
                        <td>€49.99 (2 months free)</td>
                        <td>Every 12 months, auto-renewing</td>
                    </tr>
                </tbody>
            </table>
            <p>
                Prices are in EUR and exclusive of any applicable taxes. SIA EGATRI is currently not VAT-registered.
                Prices may change with at least 30 days&rsquo; prior notice via email; price changes take effect at your
                next renewal.
            </p>

            <h3>6.3 Payment processing</h3>
            <p>
                Payments are processed by <strong>Stripe Payments Europe, Ltd.</strong> We do not store or have direct
                access to your full payment card details — only the limited information Stripe shares with us (last 4
                digits, brand, expiry). Stripe&rsquo;s terms also apply to payment processing.
            </p>

            <h3>6.4 Auto-renewal</h3>
            <p>
                Premium subscriptions automatically renew at the end of each billing period using the payment method on
                file, unless cancelled before the renewal date. You can cancel anytime through your account settings.
            </p>

            <h3>6.5 Cancellation</h3>
            <p>
                You can cancel your subscription at any time. After cancellation you keep Premium access until the end
                of the current billing period; you are not charged again.
            </p>

            <h3>6.6 Right of withdrawal (EU consumers)</h3>
            <p>
                Under the EU Consumer Rights Directive, EU consumers normally have a <strong>14-day right of withdrawal</strong>
                from distance contracts.
            </p>
            <div className="callout">
                ⚠️ <strong>Important:</strong> By starting to use Premium features immediately after purchase, you
                expressly request immediate performance of the service and acknowledge that you <strong>lose the right
                of withdrawal</strong> once we begin to provide the service. This is permitted under Directive
                2011/83/EU Art. 16(m). If you have not used any Premium feature, you may request a refund within 14
                days by emailing us.
            </div>

            <h3>6.7 Refunds</h3>
            <p>
                Outside the 14-day withdrawal window described above, subscription fees are generally non-refundable.
                We may grant refunds at our discretion in cases of technical failure, billing error, or other
                exceptional circumstances. To request a refund email{' '}
                <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a>.
            </p>

            <h2>7. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul>
                <li>Use the Service for any illegal activity.</li>
                <li>Harass, threaten, or abuse other users.</li>
                <li>Post or transmit hateful, harmful, defamatory, sexually explicit, or unlawful content.</li>
                <li>Attempt to gain unauthorised access to the Service, other accounts, or our infrastructure.</li>
                <li>Reverse engineer, decompile, or scrape the Service except as permitted by law.</li>
                <li>Use bots or automated tools to make predictions, manipulate leaderboards, or create accounts.</li>
                <li>Resell, sublicense, or commercially exploit the Service without our written permission.</li>
            </ul>
            <p>We may suspend or terminate accounts that violate these rules.</p>

            <h2>8. User content</h2>
            <p>
                You retain ownership of any content you submit (predictions, usernames, bios, avatars). You grant us a
                worldwide, non-exclusive, royalty-free licence to host, display, and process your content as needed to
                operate the Service.
            </p>
            <p>
                You are responsible for ensuring your content does not infringe third-party rights and complies with
                these Terms.
            </p>

            <h2>9. Intellectual property</h2>
            <p>
                All rights to the Service&rsquo;s code, design, branding, and original content are owned by SIA EGATRI
                or its licensors. Names and trademarks of sports organisations, teams, or events belong to their
                respective owners; we are not affiliated with or endorsed by them.
            </p>

            <h2>10. Service availability</h2>
            <p>
                We aim to keep the Service available 24/7 but cannot guarantee uninterrupted access. We may temporarily
                suspend the Service for maintenance, security, or operational reasons. We are not liable for downtime
                or data loss outside our reasonable control.
            </p>

            <h2>11. Disclaimers</h2>
            <p>
                The Service is provided <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as available&rdquo;</strong>.
                We make no warranties of any kind, express or implied, including merchantability, fitness for a
                particular purpose, or non-infringement, except as required by mandatory consumer protection law.
            </p>

            <h2>12. Limitation of liability</h2>
            <p>
                To the maximum extent permitted by law, SIA EGATRI&rsquo;s aggregate liability for any claim relating
                to the Service is limited to the total amount you paid us in the 12 months preceding the claim, or
                €50, whichever is greater. We are not liable for indirect, incidental, or consequential damages.
            </p>
            <p>
                <strong>Nothing in these Terms limits or excludes liability that cannot be limited or excluded under
                applicable law</strong> (e.g. gross negligence, intentional misconduct, statutory consumer rights).
            </p>

            <h2>13. Termination</h2>
            <p>
                You may delete your account at any time by emailing{' '}
                <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a>. We may terminate or
                suspend your account if you breach these Terms or for security/operational reasons. Provisions that by
                their nature should survive termination (e.g. liability, IP, governing law) will continue to apply.
            </p>

            <h2>14. Changes to these Terms</h2>
            <p>
                We may update these Terms from time to time. Material changes will be notified via email or an in-app
                notice at least 14 days before they take effect. Continued use of the Service after the effective date
                constitutes acceptance of the updated Terms.
            </p>

            <h2>15. Governing law &amp; jurisdiction</h2>
            <p>
                These Terms are governed by the laws of the <strong>Republic of Latvia</strong>, without regard to
                conflict-of-law principles. Disputes will be resolved by the competent courts of Latvia, without
                prejudice to the mandatory consumer protection rights you may have in your country of residence.
            </p>

            <h2>16. Contact</h2>
            <p>
                Questions about these Terms? Email{' '}
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
