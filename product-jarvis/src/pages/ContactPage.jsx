import React from 'react';
import DomainLink from '../components/DomainLink';
import { SURFACES } from '../lib/domainRoutes';
import './LegalPage.css';

const ContactPage = () => {
  return (
    <div className="legal-page">
      <nav className="legal-nav">
        <DomainLink surface={SURFACES.WWW} path="/" className="legal-nav__logo">
          <span className="legal-nav__logo-icon">J</span>
          <span>ProductJarvis</span>
        </DomainLink>
        <div className="legal-nav__links">
          <DomainLink surface={SURFACES.DOCS} path="/">Docs</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/pricing">Pricing</DomainLink>
          <DomainLink surface={SURFACES.WWW} path="/about">About</DomainLink>
        </div>
      </nav>

      <main className="legal-content">
        <header className="legal-header">
          <h1>Contact Us</h1>
          <p className="legal-subtitle">
            Get in touch with the ProductJarvis team
          </p>
        </header>

        <article className="legal-body">
          <section>
            <h2>Support</h2>
            <p>
              For product support, bug reports, or feature requests:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:support@productjarvis.com">support@productjarvis.com</a></li>
              <li><strong>Response Time:</strong> Within 24 hours (Pro/Team/Enterprise get priority)</li>
            </ul>
          </section>

          <section>
            <h2>Sales & Partnerships</h2>
            <p>
              Interested in ProductJarvis for your team or exploring partnerships?
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:sales@productjarvis.com">sales@productjarvis.com</a></li>
              <li><strong>Enterprise:</strong> <a href="mailto:enterprise@productjarvis.com">enterprise@productjarvis.com</a></li>
            </ul>
          </section>

          <section>
            <h2>Security</h2>
            <p>
              To report security vulnerabilities:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:security@productjarvis.com">security@productjarvis.com</a></li>
              <li><strong>Response Time:</strong> Within 24 hours</li>
              <li>See our <DomainLink surface={SURFACES.WWW} path="/security">Security Page</DomainLink> for more details</li>
            </ul>
          </section>

          <section>
            <h2>General Inquiries</h2>
            <p>
              For press, media, or other inquiries:
            </p>
            <ul>
              <li><strong>Email:</strong> <a href="mailto:hello@productjarvis.com">hello@productjarvis.com</a></li>
            </ul>
          </section>

          <section>
            <h2>Social Media</h2>
            <ul>
              <li><strong>Twitter:</strong> <a href="https://twitter.com/productjarvis" target="_blank" rel="noopener noreferrer">@productjarvis</a></li>
              <li><strong>LinkedIn:</strong> <a href="https://linkedin.com/company/productjarvis" target="_blank" rel="noopener noreferrer">ProductJarvis</a></li>
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

export default ContactPage;
