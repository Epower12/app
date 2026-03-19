'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandingPage() {
    const router = useRouter();

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="container landing-nav-inner">
                    <div className="landing-logo">
                        <span className="landing-logo-icon">⚽</span>
                        <span className="landing-logo-text">SportPredict</span>
                    </div>
                    <div className="landing-nav-links">
                        <a href="#features">Features</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#how-it-works">How it works</a>
                    </div>
                    <div className="landing-nav-actions">
                        <Link href="/login" className="btn btn-secondary btn-sm">Login</Link>
                        <Link href="/signup" className="btn btn-primary btn-sm">Get Started Free</Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-orbs">
                    <div className="hero-orb hero-orb-1"></div>
                    <div className="hero-orb hero-orb-2"></div>
                    <div className="hero-orb hero-orb-3"></div>
                </div>
                <div className="container hero-content">
                    <div className="hero-badge">
                        <span>🏆</span> The #1 Sport Predictions Platform
                    </div>
                    <h1 className="hero-title">
                        Predict. Compete.<br />
                        <span className="gradient-text">Dominate the Leaderboard.</span>
                    </h1>
                    <p className="hero-subtitle">
                        Make predictions on your favorite sports, earn points for accuracy,
                        climb the leaderboard, and challenge thousands of fans worldwide.
                        Football, Hockey, Tennis — all in one place.
                    </p>
                    <div className="hero-cta">
                        <Link href="/signup" className="btn btn-primary btn-lg">
                            Start Predicting Free
                            <span className="btn-arrow">→</span>
                        </Link>
                        <Link href="/login" className="btn btn-ghost btn-lg">
                            I have an account
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <strong>10K+</strong>
                            <span>Active Players</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat">
                            <strong>50+</strong>
                            <span>Tournaments</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat">
                            <strong>3</strong>
                            <span>Sports</span>
                        </div>
                        <div className="hero-stat-divider"></div>
                        <div className="hero-stat">
                            <strong>Daily</strong>
                            <span>New Matches</span>
                        </div>
                    </div>
                </div>
                {/* Scroll indicator */}
                <div className="scroll-indicator">
                    <div className="scroll-dot"></div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="features">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge">✨ Features</div>
                        <h2 className="section-title">Everything you need to win</h2>
                        <p className="section-subtitle">
                            A complete predictions platform built for real sports fans
                        </p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon feature-icon-blue">🌍</div>
                            <h3>Multi-Sport Coverage</h3>
                            <p>Football, Ice Hockey, Tennis — predict matches across all major sports and tournaments worldwide.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon feature-icon-purple">📊</div>
                            <h3>Smart Scoring System</h3>
                            <p>Points for correct outcomes, exact scores, and goal totals. Our system rewards deep knowledge, not just luck.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon feature-icon-cyan">🏅</div>
                            <h3>Live Leaderboard</h3>
                            <p>See where you rank in real-time against other players. Filter by sport, tournament, or overall standing.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon feature-icon-green">🎯</div>
                            <h3>Prediction History</h3>
                            <p>Track every prediction you've made. Analyze your accuracy, identify patterns, and improve over time.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon feature-icon-orange">⚡</div>
                            <h3>Real-Time Updates</h3>
                            <p>Match results are updated as they happen. Points are calculated and leaderboards refresh automatically.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon feature-icon-pink">🔔</div>
                            <h3>Tournament Tracking</h3>
                            <p>Follow your favorite tournaments from group stage to final. Never miss a match to predict on.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="how-section" id="how-it-works">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge">🚀 How It Works</div>
                        <h2 className="section-title">Simple. Fun. Competitive.</h2>
                        <p className="section-subtitle">Get started in minutes and make your first prediction today</p>
                    </div>

                    <div className="steps-grid">
                        <div className="step-card">
                            <div className="step-number">01</div>
                            <h3>Create Account</h3>
                            <p>Sign up in seconds. Choose your username and start exploring upcoming matches immediately.</p>
                        </div>
                        <div className="step-connector">→</div>
                        <div className="step-card">
                            <div className="step-number">02</div>
                            <h3>Make Predictions</h3>
                            <p>Browse open matches, select your predicted score or outcome before kick-off, and lock it in.</p>
                        </div>
                        <div className="step-connector">→</div>
                        <div className="step-card">
                            <div className="step-number">03</div>
                            <h3>Earn Points</h3>
                            <p>Get points for correct outcomes, bonus points for exact scores. The more precise, the more you earn.</p>
                        </div>
                        <div className="step-connector">→</div>
                        <div className="step-card">
                            <div className="step-number">04</div>
                            <h3>Climb the Ranks</h3>
                            <p>Watch your rank rise on the leaderboard as your predictions come true. Dominate every tournament.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing / Comparison */}
            <section className="pricing-section" id="pricing">
                <div className="container">
                    <div className="section-header">
                        <div className="section-badge">💎 Plans</div>
                        <h2 className="section-title">Free vs Premium</h2>
                        <p className="section-subtitle">Start free, upgrade when you want the edge</p>
                    </div>

                    <div className="pricing-grid">
                        {/* Free Plan */}
                        <div className="pricing-card">
                            <div className="pricing-card-header">
                                <div className="plan-icon">🎮</div>
                                <h3 className="plan-name">Free</h3>
                                <div className="plan-price">
                                    <span className="price-amount">€0</span>
                                    <span className="price-period">forever</span>
                                </div>
                                <p className="plan-tagline">Perfect for casual fans</p>
                            </div>
                            <ul className="plan-features">
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check">✓</span>
                                    Access to all sports & tournaments
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check">✓</span>
                                    Make predictions on upcoming matches
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check">✓</span>
                                    View global leaderboard
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check">✓</span>
                                    Basic prediction history
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check">✓</span>
                                    Standard scoring system
                                </li>
                                <li className="feature-item feature-excluded">
                                    <span className="feature-icon-x">✗</span>
                                    Advanced analytics & stats
                                </li>
                                <li className="feature-item feature-excluded">
                                    <span className="feature-icon-x">✗</span>
                                    Premium leaderboard filters
                                </li>
                                <li className="feature-item feature-excluded">
                                    <span className="feature-icon-x">✗</span>
                                    Early access to new features
                                </li>
                                <li className="feature-item feature-excluded">
                                    <span className="feature-icon-x">✗</span>
                                    Premium badge & profile flair
                                </li>
                                <li className="feature-item feature-excluded">
                                    <span className="feature-icon-x">✗</span>
                                    Priority support
                                </li>
                            </ul>
                            <Link href="/signup" className="btn btn-secondary plan-cta">
                                Get Started Free
                            </Link>
                        </div>

                        {/* Premium Plan */}
                        <div className="pricing-card pricing-card-premium">
                            <div className="premium-popular-badge">Most Popular</div>
                            <div className="pricing-card-header">
                                <div className="plan-icon">💎</div>
                                <h3 className="plan-name">Premium</h3>
                                <div className="plan-price">
                                    <span className="price-amount">€9.99</span>
                                    <span className="price-period">/ month</span>
                                </div>
                                <p className="plan-tagline">For serious competitors</p>
                            </div>
                            <ul className="plan-features">
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check">✓</span>
                                    Everything in Free
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Advanced analytics & accuracy stats
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Premium-only leaderboard views
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Early access to new sports
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    💎 Premium badge on profile
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Priority email support
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Double points on special events
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Detailed match insight reports
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Tournament prediction streaks
                                </li>
                                <li className="feature-item feature-included">
                                    <span className="feature-icon-check feature-gold">✓</span>
                                    Monthly prizes for top predictors
                                </li>
                            </ul>
                            <Link href="/signup" className="btn btn-primary plan-cta">
                                Go Premium
                            </Link>
                        </div>
                    </div>

                    {/* Comparison table */}
                    <div className="comparison-table">
                        <h3 className="comparison-title">Full Feature Comparison</h3>
                        <div className="comparison-grid">
                            <div className="comparison-header">Feature</div>
                            <div className="comparison-header">Free</div>
                            <div className="comparison-header comparison-premium-col">Premium</div>

                            {[
                                ['All sports & tournaments', '✓', '✓'],
                                ['Match predictions', '✓', '✓'],
                                ['Leaderboard access', 'Global only', 'Global + Filtered'],
                                ['Prediction history', 'Last 30 days', 'Full history'],
                                ['Accuracy statistics', '✗', '✓'],
                                ['Points per correct outcome', '3 pts', '3 pts'],
                                ['Points per exact score', '5 pts', '10 pts'],
                                ['Special event bonus', '✗', '2x multiplier'],
                                ['Premium profile badge', '✗', '💎 Badge'],
                                ['Early feature access', '✗', '✓'],
                                ['Priority support', '✗', '✓'],
                                ['Monthly prizes', '✗', 'Top 3 winners'],
                            ].map(([feature, free, premium], i) => (
                                <div key={i} className="comparison-row-group">
                                    <div className="comparison-cell comparison-feature">{feature}</div>
                                    <div className={`comparison-cell ${free === '✗' ? 'comparison-no' : 'comparison-yes'}`}>{free}</div>
                                    <div className={`comparison-cell comparison-premium-col ${premium === '✗' ? 'comparison-no' : 'comparison-yes'}`}>{premium}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Proof / CTA */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-orb cta-orb-1"></div>
                        <div className="cta-orb cta-orb-2"></div>
                        <h2 className="cta-title">Ready to start predicting?</h2>
                        <p className="cta-subtitle">
                            Join thousands of sports fans. It's free to get started — no credit card required.
                        </p>
                        <div className="cta-buttons">
                            <Link href="/signup" className="btn btn-primary btn-lg">
                                Create Free Account
                            </Link>
                            <Link href="/login" className="btn btn-ghost btn-lg">
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="container landing-footer-inner">
                    <div className="footer-brand">
                        <span className="landing-logo-icon">⚽</span>
                        <span className="landing-logo-text">SportPredict</span>
                        <p className="footer-tagline">The smarter way to follow sport.</p>
                    </div>
                    <div className="footer-links">
                        <div className="footer-col">
                            <h4>App</h4>
                            <Link href="/login">Login</Link>
                            <Link href="/signup">Sign Up</Link>
                            <Link href="/tournaments">Tournaments</Link>
                            <Link href="/leaderboard">Leaderboard</Link>
                        </div>
                        <div className="footer-col">
                            <h4>Legal</h4>
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                            <a href="#">Cookie Policy</a>
                        </div>
                        <div className="footer-col">
                            <h4>Contact</h4>
                            <a href="mailto:hello@sportpredict.app">hello@sportpredict.app</a>
                            <a href="#">Support</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© 2026 SportPredict. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
