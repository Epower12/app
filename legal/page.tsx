import type { Metadata } from 'next';
import LegalPageLayout from '../components/LegalPageLayout';
import BreadcrumbJsonLd from '../components/BreadcrumbJsonLd';

export const metadata: Metadata = {
    title: 'Legal & Imprint',
    description: 'Legal information and company details for YourFriendsLeague (SIA EGATRI).',
    alternates: {
        canonical: 'https://yourfriendleague.com/legal',
    },
    openGraph: {
        title: 'Legal & Imprint · YourFriendsLeague',
        description: 'Company information, contact details, and legal disclosures.',
        url: 'https://yourfriendleague.com/legal',
    },
};

export default function LegalPage() {
    return (
        <>
            <BreadcrumbJsonLd
                items={[
                    { name: 'Home', url: 'https://yourfriendleague.com/' },
                    { name: 'Legal & Imprint', url: 'https://yourfriendleague.com/legal' },
                ]}
            />
            <LegalPageLayout
                title="Legal information & Imprint"
                subtitle="Company information, contact details, and legal disclosures for YourFriendsLeague, as required under EU and Latvian law."
                lastUpdated="12 May 2026"
            >
            <h2>Service operator</h2>
            <p>
                YourFriendsLeague is a sports-prediction platform operated by:
            </p>
            <table className="legal-table">
                <tbody>
                    <tr>
                        <th style={{ width: '40%' }}>Legal name</th>
                        <td>SIA EGATRI</td>
                    </tr>
                    <tr>
                        <th>Legal form</th>
                        <td>Sabiedrība ar ierobežotu atbildību (Limited Liability Company)</td>
                    </tr>
                    <tr>
                        <th>Registration number</th>
                        <td><code>50203368661</code></td>
                    </tr>
                    <tr>
                        <th>Register</th>
                        <td>Latvian Register of Enterprises (<em>Latvijas Republikas Uzņēmumu reģistrs</em>)</td>
                    </tr>
                    <tr>
                        <th>Registered office</th>
                        <td>Bauskas nov., Codes pag., &ldquo;Vaidelotes&rdquo;, LV-3901, Latvia</td>
                    </tr>
                    <tr>
                        <th>VAT status</th>
                        <td>Not VAT-registered</td>
                    </tr>
                    <tr>
                        <th>Trading name</th>
                        <td>YourFriendsLeague</td>
                    </tr>
                    <tr>
                        <th>Website</th>
                        <td><a href="https://yourfriendleague.com">https://yourfriendleague.com</a></td>
                    </tr>
                </tbody>
            </table>

            <h2>Contact</h2>
            <p>
                For all inquiries — support, billing, legal, data protection — please contact us at:
            </p>
            <p>
                📧 <a href="mailto:contact@yourfriendleague.com">contact@yourfriendleague.com</a>
            </p>
            <p>
                Postal correspondence may be sent to the registered office address above. We respond to inquiries
                within 5 business days, in English or Latvian.
            </p>

            <h2>Responsible for content</h2>
            <p>
                The content published on this website is the responsibility of SIA EGATRI. All trademarks, brand names,
                and content related to specific sports leagues (e.g. IIHF, FIFA, NBA, etc.) belong to their respective
                owners; YourFriendsLeague is not affiliated with or endorsed by any of these organisations.
            </p>

            <h2>Hosting & infrastructure</h2>
            <p>The service is technically hosted on the following infrastructure:</p>
            <ul>
                <li><strong>Application hosting:</strong> Google Cloud Run (Google LLC, USA — EU region)</li>
                <li><strong>Database:</strong> Neon (Neon Inc.)</li>
                <li><strong>Payment processing (when enabled):</strong> Stripe Payments Europe, Ltd. (Ireland)</li>
                <li><strong>Transactional email:</strong> Google Workspace / Gmail SMTP</li>
            </ul>

            <h2>Online dispute resolution</h2>
            <p>
                The European Commission provides a platform for online dispute resolution (ODR) at{' '}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                    ec.europa.eu/consumers/odr
                </a>. We are not obliged to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>

            <h2>Regulatory note</h2>
            <p>
                YourFriendsLeague is a free-to-play <strong>skill-based prediction game</strong>. We do not operate any form
                of real-money gambling, lottery, or betting. No real-money wagers are placed, and no monetary prizes are
                awarded. Predictions are purely for entertainment and friendly competition. The optional Premium
                subscription only unlocks organisational tools (creating leagues, importing match presets) — it does not
                change scoring or grant any in-game advantage.
            </p>

            <h2>Disclaimer</h2>
            <p>
                While we make reasonable efforts to keep the information on this website accurate and up to date, we make
                no warranties or representations as to its accuracy or completeness. Use of the service is at your own
                risk and subject to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.
            </p>

            <h2>Applicable law</h2>
            <p>
                These pages and the operation of YourFriendsLeague are subject to the laws of the Republic of Latvia and
                applicable EU legislation, including the GDPR, the EU E-Commerce Directive (2000/31/EC), and the EU
                Consumer Rights Directive (2011/83/EU).
            </p>
            </LegalPageLayout>
        </>
    );
}
