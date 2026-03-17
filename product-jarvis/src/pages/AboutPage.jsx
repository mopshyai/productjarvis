import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const AboutPage = () => {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.WWW} path="/pricing">Pricing</DomainLink>
          <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/contact">Contact</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>About ProductJarvis</h1>
          <p className="legal-subtitle">
            Building the AI Product Operating System for modern PM teams
          </p>
        </header>

        <article className="legal-body">
          <section>
            <h2>Our Mission</h2>
            <p>
              ProductJarvis exists to eliminate the busywork that keeps product managers from doing their best work.
              We believe PMs should spend their time understanding users, making strategic decisions, and shipping
              great products — not wrestling with documentation, searching for past decisions, or manually creating tickets.
            </p>
          </section>

          <section>
            <h2>The Problem We're Solving</h2>
            <p>
              Product management has become increasingly complex. PMs juggle multiple tools, methodologies, and
              stakeholders while trying to maintain context across dozens of decisions and initiatives. Critical
              information gets lost in Slack threads, Google Docs, and meeting notes. Writing PRDs takes hours.
              Creating sprint tickets is tedious. Finding past decisions requires archaeology.
            </p>
            <p>
              We built ProductJarvis to change that.
            </p>
          </section>

          <section>
            <h2>Our Approach</h2>
            <p>
              ProductJarvis combines AI with proven product management methodologies to create a system that:
            </p>
            <ul>
              <li><strong>Understands context:</strong> Integrates with your existing tools to build a complete picture of your product</li>
              <li><strong>Generates artifacts:</strong> Creates PRDs, tickets, and documentation in minutes, not hours</li>
              <li><strong>Preserves decisions:</strong> Makes every decision searchable with citations back to source material</li>
              <li><strong>Surfaces risks:</strong> Proactively identifies issues before they become problems</li>
              <li><strong>Stays transparent:</strong> Every output includes citations or explicit "no source found" markers</li>
            </ul>
          </section>

          <section>
            <h2>Built for Founder-PMs</h2>
            <p>
              We designed ProductJarvis specifically for founder-PMs and lean product teams who need to move fast
              without sacrificing quality. If you're wearing multiple hats, managing a small team, and need to ship
              quickly while maintaining rigor, ProductJarvis is for you.
            </p>
          </section>

          <section>
            <h2>Our Values</h2>
            <ul>
              <li><strong>Speed with rigor:</strong> Move fast without cutting corners</li>
              <li><strong>Transparency:</strong> Always show sources, never hide uncertainty</li>
              <li><strong>PM-first:</strong> Built by PMs, for PMs</li>
              <li><strong>Integration-native:</strong> Work with your existing tools, not against them</li>
              <li><strong>Privacy-focused:</strong> Your data is yours, period</li>
            </ul>
          </section>

          <section>
            <h2>Get in Touch</h2>
            <p>
              We're always looking to connect with product leaders and teams. Whether you have feedback,
              want to share your PM workflow, or are interested in partnering, we'd love to hear from you.
            </p>
            <p>
              <DomainLink surface={SURFACES.WWW} path="/contact">Contact us</DomainLink> or email <a href="mailto:hello@productjarvis.com">hello@productjarvis.com</a>
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

export default AboutPage;
