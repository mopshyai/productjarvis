import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const PricingPage = () => {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '3 PRDs per month',
        'Basic decision search',
        'Daily digest',
        'Community support',
      ],
      cta: 'Start Free',
      ctaSurface: SURFACES.AUTH,
      ctaPath: '/',
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      features: [
        'Unlimited PRDs',
        'Advanced decision memory',
        'Priority support',
        'All integrations',
        'Custom methodologies',
        'API access',
      ],
      cta: 'Start Pro Trial',
      ctaSurface: SURFACES.AUTH,
      ctaPath: '/',
      popular: true,
    },
    {
      name: 'Team',
      price: '$99',
      period: 'per month',
      features: [
        'Everything in Pro',
        'Up to 10 team members',
        'Shared workspaces',
        'Team analytics',
        'Admin controls',
        'SSO (coming soon)',
      ],
      cta: 'Start Team Trial',
      ctaSurface: SURFACES.AUTH,
      ctaPath: '/',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      features: [
        'Everything in Team',
        'Unlimited team members',
        'Dedicated support',
        'SLA guarantee',
        'Custom integrations',
        'On-premise option',
      ],
      cta: 'Contact Sales',
      ctaSurface: SURFACES.WWW,
      ctaPath: '/contact',
    },
  ];

  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/about">About</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content" style={{ maxWidth: '1200px' }}>
        <header className="legal-header" style={{ textAlign: 'center' }}>
          <h1>Simple, Transparent Pricing</h1>
          <p className="legal-subtitle">
            Choose the plan that fits your team. All plans include 14-day free trial.
          </p>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'var(--space-6)',
            marginBottom: 'var(--space-12)',
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: 'var(--color-background-elevated)',
                border: plan.popular ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                position: 'relative',
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--color-accent)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: 'var(--font-size-xs)',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <h3 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--space-2)' }}>
                {plan.name}
              </h3>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-bold)' }}>
                  {plan.price}
                </span>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                  {' '}/ {plan.period}
                </span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 'var(--space-6)' }}>
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      padding: 'var(--space-2) 0',
                      color: 'var(--color-text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                    }}
                  >
                    ✓ {feature}
                  </li>
                ))}
              </ul>
              <DomainLink
                surface={plan.ctaSurface}
                path={plan.ctaPath}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: 'var(--space-3)',
                  background: plan.popular ? 'var(--color-accent)' : 'var(--color-background)',
                  color: plan.popular ? 'white' : 'var(--color-text-primary)',
                  border: plan.popular ? 'none' : '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontWeight: 'var(--font-weight-medium)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {plan.cta}
              </DomainLink>
            </div>
          ))}
        </div>

        <article className="legal-body">
          <section>
            <h2>Frequently Asked Questions</h2>
            <h3>Can I change plans later?</h3>
            <p>Yes, you can upgrade or downgrade at any time. Changes take effect immediately.</p>

            <h3>What payment methods do you accept?</h3>
            <p>We accept all major credit cards and can invoice Enterprise customers.</p>

            <h3>Is there a free trial?</h3>
            <p>Yes, all paid plans include a 14-day free trial. No credit card required.</p>

            <h3>What happens if I exceed my PRD limit?</h3>
            <p>On the Free plan, you'll need to upgrade to generate more PRDs. Paid plans have unlimited PRDs.</p>

            <h3>Can I cancel anytime?</h3>
            <p>Yes, you can cancel anytime. Your access continues until the end of your billing period.</p>
          </section>
        </article>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer__links">
          <DomainLink surface={SURFACES.WWW} path="/privacy">Privacy</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/terms">Terms</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/security">Security</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/status">Status</DomainLink>
        </div>
        <p>&copy; {new Date().getFullYear()} ProductJarvis. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PricingPage;
