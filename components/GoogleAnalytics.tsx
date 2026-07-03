import Script from 'next/script';

/**
 * Google Analytics 4 + Consent Mode v2.
 *
 * Loads gtag.js after the page becomes interactive (non-blocking) and
 * initialises Consent Mode v2 with all storage DENIED by default.
 *
 * Why "denied" first:
 *   - EU ePrivacy Directive requires prior consent before non-essential cookies fire.
 *   - With Consent Mode v2, GA still receives modelled (anonymous) "consent-mode pings"
 *     so you keep some signal in the dashboard even without user consent.
 *   - When you ship a cookie banner and the user clicks Accept, the banner calls:
 *       gtag('consent', 'update', { analytics_storage: 'granted', ad_user_data: 'granted', ... })
 *     and full tracking begins.
 *
 * Until a real banner exists, this loads safely with zero personal-data tracking.
 */
const GA_ID = 'G-77L22ZDCPN';

export default function GoogleAnalytics() {
    return (
        <>
            {/* Consent Mode v2 — initialise BEFORE gtag.js loads, denied by default */}
            <Script id="ga-consent-default" strategy="beforeInteractive">{`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('consent', 'default', {
                    'ad_storage':           'denied',
                    'ad_user_data':         'denied',
                    'ad_personalization':   'denied',
                    'analytics_storage':    'denied',
                    'functionality_storage':'granted',
                    'security_storage':     'granted',
                    'wait_for_update':       500
                });
            `}</Script>

            {/* Load gtag.js asynchronously */}
            <Script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />

            {/* Initialise GA4 with anonymised IPs by default */}
            <Script id="ga-init" strategy="afterInteractive">{`
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                    'anonymize_ip': true,
                    'allow_google_signals': false,
                    'allow_ad_personalization_signals': false
                });
            `}</Script>
        </>
    );
}
