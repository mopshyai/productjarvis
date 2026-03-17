import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const StatusPage = () => {
  const services = [
    { name: 'API', status: 'operational', uptime: '99.98%' },
    { name: 'Web App', status: 'operational', uptime: '99.99%' },
    { name: 'AI Processing', status: 'operational', uptime: '99.95%' },
    { name: 'Database', status: 'operational', uptime: '99.99%' },
    { name: 'Integrations', status: 'operational', uptime: '99.97%' },
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
          <DomainLink surface={SURFACES.DOCS} path="/changelog">Changelog</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>System Status</h1>
          <p className="legal-subtitle">
            Current operational status of ProductJarvis services
          </p>
        </header>

        <article className="legal-body">
          <section>
            <h2>All Systems Operational</h2>
            <p>All ProductJarvis services are currently running normally.</p>
          </section>

          <section>
            <h2>Service Status</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {services.map((service) => (
                <div
                  key={service.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-4)',
                    background: 'var(--color-background-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <strong>{service.name}</strong>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-tertiary)' }}>
                      {service.uptime} uptime (30 days)
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 12px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      color: '#4caf50',
                      borderRadius: '12px',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>Incident History</h2>
            <p>No incidents reported in the last 90 days.</p>
          </section>

          <section>
            <h2>Subscribe to Updates</h2>
            <p>
              Get notified about service disruptions and maintenance windows.
              Email <a href="mailto:status@productjarvis.com">status@productjarvis.com</a> to subscribe.
            </p>
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

export default StatusPage;
