import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const ChangelogPage = () => {
  const releases = [
    {
      version: 'v1.0.0',
      date: 'March 7, 2026',
      changes: [
        { type: 'feature', text: 'Initial public release' },
        { type: 'feature', text: 'AI-powered PRD generation with Claude' },
        { type: 'feature', text: 'Decision Memory with citation search' },
        { type: 'feature', text: 'Daily Digest with risk tracking' },
        { type: 'feature', text: 'Jira and Linear integrations' },
        { type: 'feature', text: 'Command Bar for natural language control' },
        { type: 'feature', text: 'Support for 30+ product methodologies' },
      ],
    },
  ];

  const getTypeColor = (type) => {
    switch (type) {
      case 'feature':
        return '#4caf50';
      case 'improvement':
        return '#2196f3';
      case 'fix':
        return '#ff9800';
      default:
        return 'var(--color-text-tertiary)';
    }
  };

  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
          <DomainLink surface={SURFACES.DOCS} path="/api-docs">API</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/status">Status</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>Changelog</h1>
          <p className="legal-subtitle">
            Latest updates and improvements to ProductJarvis
          </p>
        </header>

        <article className="legal-body">
          {releases.map((release) => (
            <section key={release.version}>
              <h2>{release.version}</h2>
              <p style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>
                {release.date}
              </p>
              <ul>
                {release.changes.map((change, idx) => (
                  <li key={idx}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        background: `${getTypeColor(change.type)}20`,
                        color: getTypeColor(change.type),
                        borderRadius: '4px',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)',
                        marginRight: 'var(--space-2)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {change.type}
                    </span>
                    {change.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2>Coming Soon</h2>
            <ul>
              <li>Notion integration</li>
              <li>Team collaboration features</li>
              <li>Custom methodology builder</li>
              <li>API access for Pro plans</li>
              <li>Slack integration</li>
              <li>Advanced analytics dashboard</li>
            </ul>
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

export default ChangelogPage;
