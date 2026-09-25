'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FadeIn } from '../motion';

type Billing = 'monthly' | 'yearly';

const FREE_FEATURES = [
    'Join any league you\'re invited to, as many as you like',
    'Predict every match in football, hockey, basketball, F1 and tennis',
    'Full scoring and live leaderboards',
    'Your own player profile',
    'Sports news feed',
];

const PREMIUM_FEATURES = [
    'Everything in Free',
    'Create your own private leagues with invite codes',
    'Import fixtures in one click: football, NHL, F1 race weekends and more',
    'Add matches, enter results and set player limits',
    'F1 setup: drivers, sessions and bonus questions',
    'Community stats: see how everyone predicted before kick-off',
];

const PRICES: Record<Billing, { amount: string; per: string; note: string }> = {
    monthly: { amount: '€4.99', per: '/month', note: 'Billed monthly. Cancel anytime.' },
    yearly: { amount: '€49.99', per: '/year', note: '≈ €4.17/month. 2 months free, you save €9.89.' },
};

export default function Pricing() {
    const [billing, setBilling] = useState<Billing>('yearly');
    const price = PRICES[billing];

    return (
        <section id="pricing" className="ld-section ld-pricing">
            <div className="ld-wrap">
                <FadeIn className="ld-section-head">
                    <span className="ld-kicker">Pricing</span>
                    <h2 className="ld-display ld-h2">Free to play. Premium to run the show.</h2>
                    <p className="ld-sub">
                        Playing is free, forever. Only the person who <strong>organises</strong> a league needs
                        Premium. Everyone they invite plays for free.
                    </p>
                </FadeIn>

                <div className="ld-billing" role="group" aria-label="Billing period">
                    <button type="button" aria-pressed={billing === 'monthly'} onClick={() => setBilling('monthly')}>
                        Monthly
                    </button>
                    <button type="button" aria-pressed={billing === 'yearly'} onClick={() => setBilling('yearly')}>
                        Yearly <span className="ld-save">2 months free</span>
                    </button>
                </div>

                <div className="ld-plans">
                    <FadeIn className="ld-plan">
                        <div className="ld-plan-head">
                            <h3>Free</h3>
                            <p>For players</p>
                        </div>
                        <div className="ld-price"><strong>€0</strong><span>/forever</span></div>
                        <p className="ld-price-note">No credit card needed.</p>
                        <ul className="ld-features">
                            {FREE_FEATURES.map(f => <li key={f}>{f}</li>)}
                        </ul>
                        <Link href="/signup" className="ld-btn ld-btn-ghost ld-btn-block">Start playing free</Link>
                    </FadeIn>

                    <FadeIn delay={0.12} className="ld-plan is-featured">
                        <span className="ld-plan-badge">For league organisers</span>
                        <div className="ld-plan-head">
                            <h3>Premium</h3>
                            <p>Run your own leagues</p>
                        </div>
                        <div className="ld-price"><strong>{price.amount}</strong><span>{price.per}</span></div>
                        <p className="ld-price-note">{price.note}</p>
                        <ul className="ld-features">
                            {PREMIUM_FEATURES.map(f => <li key={f}>{f}</li>)}
                        </ul>
                        <Link href={`/signup?intent=premium&plan=${billing}`} className="ld-btn ld-btn-block">
                            Go Premium {billing === 'yearly' ? 'yearly' : 'monthly'}
                        </Link>
                    </FadeIn>
                </div>

                <p className="ld-pricing-foot">
                    Secure checkout by Stripe · Cancel anytime · Premium never affects scoring
                </p>
            </div>
        </section>
    );
}
